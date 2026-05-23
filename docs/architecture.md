# Architecture

Three things matter:

1. **The LLM only extracts literal values.** It never computes shares, ownership
   percentages, or waterfall payouts. Anything missing from the document is `null`.
2. **The engine is deterministic.** `src/engine/` takes the structured extraction and
   computes the cap table + waterfall in pure TypeScript using `decimal.js`. The
   invariants (ownership sums to 100%, waterfall payouts sum to exit value) are
   covered by vitest.
3. **State lives in SQLite.** Both the CLI and the server share the same `Store`
   (`src/data/store.ts`). The default database is `~/.captable/captable.db`.

## Layout

```
src/
  shared/types.ts       The contract between extraction, engine, and UI.
  config/index.ts       Resolves provider + key from flags → env → ~/.captable/config.json.
  ingestion/            LLM extraction (Vercel AI SDK + Zod schema). Provider-agnostic.
    extractContract.ts  The single LLM call: contract text → structured Extraction.
    extractionSchema.ts Zod schema + system prompt.
    providers.ts        Anthropic / OpenAI / Langdock factory.
  engine/
    captable/buildCapTable.ts    Extraction → CapTable (shares, classes, holdings).
    waterfall/runWaterfall.ts    CapTable + exitValue → WaterfallResult.
    index.ts            Re-exports buildCapTable + runWaterfall.
  data/
    db.ts               SQLite schema, opens better-sqlite3 with FK + WAL.
    store.ts            All persistence (funds, companies, documents, extractions,
                        merged extractions, waterfall runs).
  cli/                  Commander CLI. Wraps Store + engine for headless use.
  server/index.ts       Local Express API on 127.0.0.1:3001. Wraps Store + engine.
  server/docParsers.ts  PDF / DOCX / XLSX / TXT → plain text for the LLM.
  web/                  Vite + React frontend. Talks to the server over /api.
```

## Data flow

```
                     ┌───────────────────┐
   contract file ──▶ │ docParsers (PDF,  │ ──▶ plain text ──▶ extractContract()
                     │ DOCX, XLSX, TXT)  │                     (LLM, one call)
                     └───────────────────┘                              │
                                                                        ▼
                                                                Extraction (JSON)
                                                                        │
                                                                        ▼
                                                              Store.persistExtraction
                                                                        │
                                                              merge UI / patch CLI
                                                                        │
                                                                        ▼
                                                              merged Extraction
                                                                        │
                                                                        ▼
                                                              buildCapTable()
                                                                        │
                                                                        ▼
                                                                   CapTable
                                                                        │
                                                                        ▼
                                                              runWaterfall(exitValue)
                                                                        │
                                                                        ▼
                                                                WaterfallResult
```

Three caller surfaces — CLI, HTTP server, and web app — share the same store and
engine. The web app talks to the server; the CLI uses the store directly.

## Provenance & confidence

The shared `Extraction` type intentionally carries `null` for any value not found
in the document. `buildCapTable` returns a structured `EngineError` listing exactly
which fields are missing (e.g. `["Series B.pricePerShare"]`), which the CLI's
`patch` command and the web merge view can use to drive corrections.

## Privacy posture

- Server binds `127.0.0.1` — never reachable from another machine.
- API key lives in `~/.captable/config.json` at mode `0600`.
- `GET /api/config` returns `{ hasKey, provider, maskedKey, model, baseURL }` —
  never the raw key.
- Uploaded files are kept in memory (`multer.memoryStorage()`); only the extracted
  plain text is persisted to SQLite.
- The LLM call is the only thing that leaves the machine.
