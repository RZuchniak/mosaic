import { DurableObject } from "cloudflare:workers";

const BOARD = 1000;
const BYTES = BOARD * BOARD * 3;
const FLUSH_DELAY_MS = 250;
const FLUSH_BATCH_SIZE = 500;
const FLUSH_RETRY_DELAY_MS = 5_000;
const BROADCAST_DELAY_MS = 50;
const BROADCAST_BATCH_SIZE = 100;

type Tile = { id: number; colour: string };
type TileChange = { x: number; y: number; c: string };

export interface MosaicBoardEnv {
  DB: D1Database;
  MOSAIC_BOARD: DurableObjectNamespace<MosaicBoard>;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function normalizeColour(c: string): string | null {
  const t = c.trim();
  const m = t.match(/^0x([0-9a-fA-F]{6})$/i);
  if (!m) return null;
  return `0x${m[1].toLowerCase()}`;
}

function parseHexToRgb(colour: string): [number, number, number] {
  const rgb = Number(colour);
  return [rgb >> 16, (rgb >> 8) & 0xff, rgb & 0xff];
}

export class MosaicBoard extends DurableObject<MosaicBoardEnv> {
  private board = new Uint8Array(BYTES);
  private hydratePromise: Promise<void> | null = null;
  private flushScheduled: boolean | undefined;
  private broadcastChanges = new Map<number, { tile: TileChange; sender: WebSocket }>();
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: MosaicBoardEnv) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS pending_tile (
        id INTEGER PRIMARY KEY,
        colour TEXT NOT NULL
      )
    `);
  }

  private async hydrate(): Promise<void> {
    // An alarm can flush and remove queued rows while the D1 read is in flight.
    const pending = this.ctx.storage.sql.exec<Tile>("SELECT id, colour FROM pending_tile").toArray();
    const { results } = await this.env.DB.prepare("SELECT id, colour FROM tile").all<Tile>();
    for (const rows of [results ?? [], pending]) {
      for (const row of rows) {
        const id = Number(row.id);
        if (!Number.isInteger(id) || id < 0 || id >= BOARD * BOARD) continue;
        const colour = normalizeColour(String(row.colour));
        if (colour) this.board.set(parseHexToRgb(colour), id * 3);
      }
    }
  }

  private ensureHydrated(): Promise<void> {
    this.hydratePromise ??= this.hydrate().catch((error) => {
      this.hydratePromise = null;
      throw error;
    });
    return this.hydratePromise;
  }

  private scheduleFlush(delay: number): Promise<void> {
    this.flushScheduled = true;
    return this.ctx.storage.setAlarm(Date.now() + delay);
  }

  async alarm(): Promise<void> {
    this.flushScheduled = false;
    const { sql } = this.ctx.storage;
    const pending = sql.exec<Tile>(
      "SELECT id, colour FROM pending_tile ORDER BY id LIMIT ?",
      FLUSH_BATCH_SIZE
    ).toArray();
    if (pending.length === 0) return;

    const batch = JSON.stringify(Object.fromEntries(pending.map(({ id, colour }) => [id, colour])));
    try {
      await this.env.DB.prepare(`
        INSERT INTO tile (id, colour)
        SELECT CAST(key AS INTEGER), value FROM json_each(?) WHERE true
        ON CONFLICT(id) DO UPDATE SET colour = excluded.colour
        WHERE tile.colour IS NOT excluded.colour
      `).bind(batch).run();
    } catch (error) {
      console.error("Failed to flush pending tiles to D1", error);
      await this.scheduleFlush(FLUSH_RETRY_DELAY_MS);
      return;
    }

    // A draw can change a queued tile during the D1 write. Clear only what was written.
    sql.exec(`
      DELETE FROM pending_tile
      WHERE (id, colour) IN (SELECT CAST(key AS INTEGER), value FROM json_each(?))
    `, batch);

    if (
      !this.flushScheduled &&
      sql.exec("SELECT id FROM pending_tile LIMIT 1").toArray().length > 0
    ) {
      await this.scheduleFlush(pending.length === FLUSH_BATCH_SIZE ? 0 : FLUSH_DELAY_MS);
    }
  }

  private queueBroadcast(id: number, tile: TileChange, sender: WebSocket): void {
    this.broadcastChanges.set(id, { tile, sender });
    if (this.broadcastChanges.size >= BROADCAST_BATCH_SIZE) {
      this.broadcast();
    } else {
      this.broadcastTimer ??= setTimeout(() => this.broadcast(), BROADCAST_DELAY_MS);
    }
  }

  private broadcast(): void {
    clearTimeout(this.broadcastTimer);
    this.broadcastTimer = null;
    const changes = Array.from(this.broadcastChanges.values());
    this.broadcastChanges.clear();

    const batch = JSON.stringify({ t: "tiles", tiles: changes.map(({ tile }) => tile) });
    let legacyMessages: string[] | undefined;
    for (const socket of this.ctx.getWebSockets()) {
      try {
        if (socket.deserializeAttachment() === "batch") {
          socket.send(batch);
        } else {
          legacyMessages ??= changes.map(({ tile }) => JSON.stringify({ t: "tile", ...tile }));
          for (let i = 0; i < changes.length; i++) {
            if (changes[i].sender !== socket) socket.send(legacyMessages[i]);
          }
        }
      } catch {
        /* closed */
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/board") {
      await this.ensureHydrated();
      return new Response(this.board, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Cache-Control": "no-store",
          ...corsHeaders(request),
        },
      });
    }

    if (request.headers.get("Upgrade") === "websocket" && url.pathname === "/ws") {
      await this.ensureHydrated();
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);
      this.ctx.acceptWebSocket(server);
      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    let msg: { t?: string; x?: number; y?: number; c?: string } | null;
    try {
      msg = JSON.parse(text) as typeof msg;
    } catch {
      return;
    }

    if (msg?.t === "ping") {
      ws.send(JSON.stringify({ t: "pong" }));
      return;
    }

    if (msg?.t === "subscribe-batch") {
      ws.serializeAttachment("batch");
      return;
    }

    if (msg?.t !== "draw") return;

    const x = msg.x;
    const y = msg.y;
    const c = msg.c;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof c !== "string" ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= BOARD ||
      y < 0 ||
      y >= BOARD
    ) {
      return;
    }

    const colourNorm = normalizeColour(c);
    if (!colourNorm) return;
    const rgb = parseHexToRgb(colourNorm);

    await this.ensureHydrated();
    const storage = this.ctx.storage;
    this.flushScheduled ??= (await storage.getAlarm()) !== null;
    const id = y * BOARD + x;
    const o = id * 3;
    if (this.board[o] === rgb[0] && this.board[o + 1] === rgb[1] && this.board[o + 2] === rgb[2]) {
      return;
    }

    // Queue the alarm and the tile together in the same Durable Object storage commit.
    const scheduled = this.flushScheduled ? undefined : this.scheduleFlush(FLUSH_DELAY_MS);
    storage.sql.exec(`
      INSERT INTO pending_tile (id, colour) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET colour = excluded.colour
    `, id, colourNorm);
    this.board.set(rgb, o);

    this.queueBroadcast(id, { x, y, c: colourNorm }, ws);
    await scheduled;
  }
}
