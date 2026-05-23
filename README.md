# CapTable

Local VC cap-table tool. Extracts cap-table data from contract documents using an LLM,
builds a deterministic cap table, and models liquidation waterfalls at any exit value.

Two ways to use it:

- **Web app** — `npm run dev` brings up a local HTTP API + React UI for uploading
  documents, browsing companies, editing extractions, and dragging the exit-value
  slider on the waterfall.
- **Headless CLI** — `npx captable run <contract.txt>` runs the full pipeline
  (extract → cap table → waterfall) and prints the result. JSON output via `--json`.

The cap-table + waterfall math is deterministic TypeScript (in `src/engine/`); the
LLM only extracts literal values from the document.

## Prerequisites

- Node 20+ (the project uses native ESM and `better-sqlite3`).
- An API key for **one** of: Anthropic, OpenAI, or Langdock (OpenAI-compatible).

## Quickstart — web app (`npm run dev`)

```bash
npm install
npm run dev
```

That runs two processes concurrently:

- **Server** on `http://127.0.0.1:3001` (`src/server/index.ts` — Express, bound to
  localhost only).
- **Web** on `http://localhost:5173` (`src/web` — Vite + React, proxies `/api/*` to
  the server).

Open `http://localhost:5173`. First time you'll see a settings dialog asking for a
provider + key — that gets persisted to `~/.captable/config.json` (mode `0600`).

Once a key is configured:

1. Create a fund in the sidebar.
2. Create a company under it.
3. Drag a contract PDF/DOCX/TXT onto the drop zone — the server parses it,
   stores the text, and runs the LLM extraction.
4. Edit any wrong fields in the merge view, then play with the exit-value slider
   on the waterfall.

The SQLite database is created on demand at `~/.captable/captable.db`. Nothing
about your deals leaves the machine except the LLM extraction call.

### For agents starting the app

`npm run dev` is the canonical entry point. It launches `concurrently` with both
the server (in watch mode) and the Vite dev server. Both bind to localhost; the
Vite proxy in `src/web/vite.config.ts` forwards `/api/*` to port 3001.

- Server logs are prefixed `[server]`, web logs are prefixed `[web]`.
- Health check: `curl http://127.0.0.1:3001/api/health` → `{"ok":true}`.
- No API key needed to start the server — the key is read on each extraction
  call, so you can boot and configure later via the settings dialog or
  `captable config set`.
- To run just one side: `npm run server:watch` or `npm run web`.

## Quickstart — CLI

```bash
npm install
npm run build       # compiles dist/cli/index.js (the bin entry)

# Save provider + key once (writes ~/.captable/config.json, mode 0600)
npx captable config set --provider anthropic --api-key sk-ant-…
# or --provider openai --api-key sk-…
# or --provider langdock --api-key ld-…

# Full pipeline on the demo contract
npx captable run demo/helios-robotics.txt
```

Env vars also work in place of `config set`:

```bash
export ANTHROPIC_API_KEY=sk-ant-…   # provider inferred from which key is set
npx captable run demo/helios-robotics.txt
```

Subcommands: `config`, `ingest`, `captable`, `patch`, `waterfall`, `run`.
Pass `--json` for machine-readable output. See `docs/cli.md` for details.

### Langdock (optional)

Langdock is an OpenAI-compatible gateway routing to GPT, Claude, Gemini, Mistral.
Defaults to the EU region (`https://api.langdock.com/openai/eu/v1`); override
with `--base-url` or `LANGDOCK_BASE_URL`. See `docs/configuration.md`.

## Scripts

| Script               | What it does                                     |
|----------------------|--------------------------------------------------|
| `npm run dev`        | Server (watch) + web (Vite) in parallel.         |
| `npm run server`     | Server only, no watch.                           |
| `npm run server:watch` | Server only, watches source.                   |
| `npm run web`        | Vite dev server only.                            |
| `npm run cli -- …`   | Run the CLI from source (no build needed).       |
| `npm run build`      | `tsc -p tsconfig.build.json` → `dist/`.          |
| `npm run typecheck`  | `tsc --noEmit`.                                  |
| `npm test`           | Run vitest suite once.                           |
| `npm run test:watch` | Vitest in watch mode.                            |

## Layout

```
src/
  cli/         Commander-based CLI (config, ingest, captable, patch, waterfall, run)
  config/      Config resolution & ~/.captable/config.json (mode 0600)
  data/        SQLite schema + Store (the data layer used by CLI & server)
  engine/      Deterministic cap-table + waterfall math (no LLM, fully tested)
  ingestion/   LLM extraction via Vercel AI SDK + Zod schema
  server/      Local Express API on 127.0.0.1:3001 (wraps Store + engine)
  shared/      Types shared between extraction, engine, and UI
  web/         Vite + React frontend (Tailwind, react-query, react-router)
tests/         Vitest — engine invariants, ingestion, store, e2e CLI smoke
demo/          Sample contract + expected pipeline output
docs/          Per-area docs (architecture, cli, server, web, engine, …)
```

## Docs

| File                          | What's in it                                          |
|-------------------------------|-------------------------------------------------------|
| [docs/architecture.md](docs/architecture.md) | How the pieces fit together; data flow.   |
| [docs/configuration.md](docs/configuration.md) | Config file, env vars, provider keys.    |
| [docs/ingestion.md](docs/ingestion.md) | LLM extraction & supported providers.           |
| [docs/engine.md](docs/engine.md) | Cap-table build + waterfall algorithm + invariants. |
| [docs/data.md](docs/data.md)   | SQLite schema and the `Store` interface.             |
| [docs/server.md](docs/server.md) | HTTP API surface (used by the web app).            |
| [docs/web.md](docs/web.md)     | React app structure (pages, components, queries).    |
| [docs/cli.md](docs/cli.md)     | CLI subcommands and flags.                           |
| [demo/helios-robotics-walkthrough.md](demo/helios-robotics-walkthrough.md) | Worked example tied to the golden test fixture. |
