import { DurableObject } from "cloudflare:workers";

const BOARD = 1000;
const BYTES = BOARD * BOARD * 3;

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

function parseHexToRgb(hex: string): [number, number, number] | null {
  const norm = normalizeColour(hex);
  if (!norm) return null;
  const h = norm.slice(2);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export class MosaicBoard extends DurableObject<MosaicBoardEnv> {
  private board = new Uint8Array(BYTES);
  private hydratePromise: Promise<void> | null = null;
  private hydrated = false;

  constructor(ctx: DurableObjectState, env: MosaicBoardEnv) {
    super(ctx, env);
  }

  private async hydrate(): Promise<void> {
    const { results } = await this.env.DB.prepare("SELECT id, colour FROM tile").all<{
      id: number;
      colour: string;
    }>();
    for (const row of results ?? []) {
      const id = Number(row.id);
      if (!Number.isInteger(id) || id < 0 || id >= BOARD * BOARD) continue;
      const rgb = parseHexToRgb(String(row.colour));
      if (!rgb) continue;
      const o = id * 3;
      this.board[o] = rgb[0];
      this.board[o + 1] = rgb[1];
      this.board[o + 2] = rgb[2];
    }
    this.hydrated = true;
  }

  private async ensureHydrated(): Promise<void> {
    if (this.hydrated) return;
    if (!this.hydratePromise) {
      this.hydratePromise = this.hydrate();
    }
    await this.hydratePromise;
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
    await this.ensureHydrated();
    const text =
      typeof message === "string" ? message : new TextDecoder().decode(message);
    let msg: { t?: string; x?: number; y?: number; c?: string };
    try {
      msg = JSON.parse(text) as typeof msg;
    } catch {
      return;
    }

    if (msg.t === "ping") {
      ws.send(JSON.stringify({ t: "pong" }));
      return;
    }

    if (msg.t !== "draw") return;

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
    if (!rgb) return;

    const id = y * BOARD + x;
    const o = id * 3;
    this.board[o] = rgb[0];
    this.board[o + 1] = rgb[1];
    this.board[o + 2] = rgb[2];

    await this.env.DB.prepare(
      "INSERT INTO tile (id, colour) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET colour = excluded.colour"
    )
      .bind(id, colourNorm)
      .run();

    const out = JSON.stringify({ t: "tile", x, y, c: colourNorm });
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws) {
        try {
          other.send(out);
        } catch {
          /* closed */
        }
      }
    }
  }
}
