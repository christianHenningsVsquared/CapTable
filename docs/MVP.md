# MVP — What We're Actually Building

One screen. One contract file in, one waterfall chart out.

## The Pipeline

```
contract.txt
    │
    ▼
[Stream A] extractContract()  ──►  SQLite (extractions.raw_json)
    │
    ▼
[Stream B] buildCapTable()  +  runWaterfall(exitValue)
    │
    ▼
[Stream C] React UI: cap table, waterfall chart, exit-value slider
```

That's the whole product. Three vertical slices, one shared types file,
one screen.

## Hard Scope Rules

**In scope:**
- A single text contract as input (paste or upload `.txt`).
- An LLM call that extracts only what is **literally written** in the
  contract — no inference, no math.
- A deterministic TS engine that computes the cap table and waterfall
  from the extracted data.
- One screen showing: cap table (plain table), waterfall chart, exit-value
  slider that re-runs the waterfall live.
- One company, ~3 rounds, single share class per round.
- SQLite for persistence (raw extraction + computed waterfall runs).

**Out of scope (do not build for MVP):**
- PDF parsing, Excel parsing, Google Drive, data-room connectors.
- Multiple companies / portfolio view.
- Provenance hover, confidence levels, source highlighting.
- Scenarios, follow-on modelling, red flags, investor ranking,
  competitor benchmarking.
- Anti-dilution, SAFE/convertible conversion.
- Auth, packaging/installer, encryption, audit log.

If you find yourself building something not in the "in scope" list, stop
and ask. The earlier phase docs (`01-…` through `11-…`) are for v2.

## Streams

Each colleague owns one stream end-to-end. All three depend only on
`src/shared/types.ts` — once that file is agreed, the streams run in
parallel and only meet at the integration step.

| Stream | Owner | Spec | Owns |
|---|---|---|---|
| A — Ingestion + DB | TBD | [stream-a-ingestion.md](stream-a-ingestion.md) | `src/ingestion/**`, `src/data/**` |
| B — Engine | TBD | [stream-b-engine.md](stream-b-engine.md) | `src/engine/**`, `tests/engine/**` |
| C — UI | TBD | [stream-c-ui.md](stream-c-ui.md) | `src/ui/**`, app shell |

## Shared Contract

`src/shared/types.ts` is the source of truth. Both the LLM output schema
and the engine's input/output types live there. **Do not invent local
types in any stream — extend the shared file with a PR all three review.**

Key types:
- `Extraction` — what the LLM produces (literal-only contract data).
- `CapTable` — what the engine builds from an `Extraction`.
- `WaterfallResult` — what `runWaterfall(capTable, exitValue)` returns.
- `EngineError` — `{ error: "missing_data", missing: ["Series B.pricePerShare"] }`
  when required fields are null.

## Data Model (3 SQLite tables, that's it)

```
companies(id, name)
extractions(id, company_id, raw_json, created_at)
waterfall_runs(id, company_id, exit_value, result_json, created_at)
```

Rounds and investors live inside `extractions.raw_json` — do NOT
normalize them into their own tables. One source of truth, no sync bugs.

## Missing-Value Flow

The LLM returns `null` for anything not literally in the contract. The
engine refuses to compute if a required field is null and returns
`EngineError` with the list of missing fields. The UI surfaces those as
editable rows; the user types the value; we patch the JSON in
`extractions.raw_json` (no re-LLM call) and re-run the engine.

## Definition of Done (MVP)

1. Upload a contract text → see the extracted rounds saved.
2. See the resulting cap table rendered.
3. Move the exit-value slider → see the waterfall chart update live.
4. The hand-crafted 3-round golden test case in `tests/engine/` passes
   cent-exactly.

Ship that. Everything else is v2.

## Day-0 Joint Tasks (before parallel work)

1. Lock `src/shared/types.ts` — all three review and sign off.
2. Stack: **Electron + React + TypeScript**, `better-sqlite3`, `decimal.js`,
   `recharts`, Vitest. No further debate.
3. Build the golden fixture: one made-up 3-round company, hand-compute
   cap table + waterfall numbers, commit to `tests/fixtures/golden.ts`.
   Stream A ingests the matching contract text, Stream B targets the
   numbers in tests, Stream C renders the result.
