# Mosaic API (Cloudflare Workers)

Workers + **Durable Object** (`MosaicBoard`) + **D1** replace the legacy Node/Socket.io/Postgres/Sharp backend.

## Endpoints

| Method / path | Description |
|---------------|-------------|
| `GET /api/board` | Raw RGB, `1000×1000×3` bytes (`application/octet-stream`). Default pixels are black (`0x000000`), matching the old in-memory buffer. |
| `WebSocket /ws` | JSON protocol: client `{"t":"draw","x":number,"y":number,"c":"0xrrggbb"}`; server to others `{"t":"tile","x","y","c"}`. Optional `{"t":"ping"}` → `{"t":"pong"}`. |

`OPTIONS` on any URL handled by the DO returns CORS headers for browser cross-origin `GET /api/board`.

## Local development

1. Install dependencies from the repo root: `pnpm install`
2. Create / migrate local D1: `pnpm --filter mosaic-worker run db:migrate:local`
3. Run the worker: `pnpm dev:worker` (or `pnpm --filter mosaic-worker dev`, default port **8787**)
4. In another terminal, run the Vite app: `pnpm dev` — it proxies `/api` and `/ws` to `127.0.0.1:8787`

## First-time Cloudflare setup

1. Log in: `pnpm --filter mosaic-worker exec wrangler login`
2. Create a D1 database: `pnpm --filter mosaic-worker exec wrangler d1 create mosaic-db`
3. Copy the printed `database_id` into [wrangler.toml](./wrangler.toml) (`database_id = "..."`).
4. Apply migrations remotely: `pnpm --filter mosaic-worker run db:migrate:remote`
5. Deploy: `pnpm --filter mosaic-worker run deploy`

## Postgres → D1 data migration

The D1 schema matches the old table: `tile(id INTEGER PRIMARY KEY, colour TEXT)` with `id = y * 1000 + x` and `colour` like `0xff0000`.

1. Export from Postgres (example):

   ```bash
   psql "$DATABASE_URL" -c "\copy (SELECT id, colour FROM tile) TO 'tiles.csv' CSV"
   ```

2. Convert CSV rows into SQL D1 can run. Example row: `12345,0xff0000` →

   ```sql
   INSERT INTO tile (id, colour) VALUES (12345, '0xff0000')
   ON CONFLICT(id) DO UPDATE SET colour = excluded.colour;
   ```

3. Batch many statements into `.sql` files (keep each file reasonably sized) and run:

   ```bash
   pnpm --filter mosaic-worker exec wrangler d1 execute mosaic-db --remote --file=./path/to/batch.sql
   ```

Normalize `colour` to lowercase `0x` + six hex digits before import if your export mixed cases.

## Frontend / Pages

- **Same hostname as the Worker:** leave `VITE_API_ORIGIN` unset; deploy the static assets behind the same zone and route `/api` and `/ws` to this Worker (or use a Worker that also serves `GET /` from Pages — see Cloudflare “Functions” / `_routes.json` patterns).
- **Separate API hostname:** build with `VITE_API_ORIGIN=https://your-worker.example.com` so the browser calls that origin for `GET /api/board` and `wss://your-worker.example.com/ws`.

## DNS and cutover

1. Deploy this worker and confirm `GET https://<worker-host>/api/board` returns exactly `3000000` bytes.
2. Point your Pages project (or static host) at the new build; set `VITE_API_ORIGIN` if the API lives on another host.
3. Move `mosaicapi` (or equivalent) DNS to the Worker route, or consolidate under one domain with path-based routing.
4. After traffic is stable, retire the DigitalOcean droplet and Postgres instance.
