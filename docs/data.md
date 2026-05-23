# Data layer

Code: `src/data/`. SQLite via `better-sqlite3`. Default DB path:
`~/.captable/captable.db` (configurable via `--db <path>` on the CLI).

## Schema

`SCHEMA` in `src/data/db.ts`. `user_version` is bumped on schema changes; on
version mismatch all tables are dropped and recreated (acceptable since this is
a local tool and the DB is rebuildable from source documents).

```sql
funds               (id, name, created_at)
companies           (id, fund_id, name, created_at)
documents           (id, company_id, filename, mime_type, size_bytes,
                     content_text, created_at)
extractions         (id, company_id, document_id, raw_json, created_at)
merged_extractions  (company_id PRIMARY KEY, raw_json, updated_at)
waterfall_runs      (id, company_id, exit_value, result_json, created_at)
```

`PRAGMA foreign_keys = ON` is set on open, so cascading deletes work: dropping
a fund removes its companies → documents → extractions → waterfall runs.

## Store

`src/data/store.ts` is the only thing that talks to the database. Both the CLI
and the server construct a `Store` via `createStore(dbPath, extractor)`. The
`extractor` is injected (the CLI wires `extractContract` with the resolved
config; tests can plug in a fake).

### Two layers of extraction

- `extractions` — one row per `(document, LLM call)`. Append-only; lets the UI
  show "what did the model originally produce".
- `merged_extractions` — the **curated** extraction (one per company). What the
  engine actually reads. Updated by the merge view (`PUT /api/companies/:id/merged`)
  and by `captable patch`.

The first extraction for a company auto-populates `merged_extractions`, so the
happy path (single document, no edits) needs no UI interaction.

### CLI-mode compatibility

The headless CLI predates the funds/companies model. `Store.ingest(text)`,
`Store.patchExtraction`, and `Store.getExtraction` are thin wrappers that
auto-create a "CLI" fund and one company per ingest, then forward to the same
underlying tables. Companies created via the CLI are visible in the web UI
under that fund.

## Test seam

`tests/ingestion/store.test.ts` opens an in-memory DB (`openDb(":memory:")`) and
swaps in a fake extractor — fast, no LLM, no temp files.
