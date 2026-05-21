# Stream A — Ingestion + DB

**One sentence:** Turn a contract text into structured JSON via an LLM
call, save it, and expose read/write APIs the rest of the app uses.

Read [MVP.md](MVP.md) first.

## What you own

- `src/ingestion/extractContract.ts` — the LLM call.
- `src/data/**` — SQLite schema, migrations, the three tables.
- A thin API the UI calls: `ingest`, `getCompany`, `saveWaterfall`,
  `getWaterfall`, `patchExtraction`.

## What you build

### 1. `extractContract(text: string) → Promise<Extraction>`

Single Claude API call. Use tool-use / structured output to force JSON
that matches the `Extraction` type from `src/shared/types.ts` exactly.

**Prompt rules (non-negotiable):**
- Extract ONLY what's literally written in the contract.
- No inference, no math. If a value isn't present, return `null`.
- Do not compute shares, ownership %, or any derived value. The engine
  does that.

What the LLM is allowed to produce:
- `rounds[]`: name, date, preMoney, investment, pricePerShare, liqPref,
  participation, participationCap, seniority.
- `investors[]`: name, the round they invested in, the amount.

That's it. Anything else and it's hallucinating.

### 2. SQLite schema

Three tables. No more.

```sql
CREATE TABLE companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE extractions (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  raw_json TEXT NOT NULL,        -- full Extraction object
  created_at TEXT NOT NULL
);

CREATE TABLE waterfall_runs (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  exit_value REAL NOT NULL,
  result_json TEXT NOT NULL,     -- full WaterfallResult object
  created_at TEXT NOT NULL
);
```

Rounds and investors do NOT get their own tables. They live inside
`extractions.raw_json`. When the engine needs them, parse the JSON.

### 3. API surface (what Stream C calls)

```ts
ingest(text: string): Promise<{ companyId: number; extractionId: number }>
getExtraction(companyId: number): Promise<Extraction>
patchExtraction(companyId: number, patch: Partial<Extraction>): Promise<void>
saveWaterfall(companyId: number, run: WaterfallResult): Promise<number>
getWaterfall(companyId: number, exitValue: number): Promise<WaterfallResult | null>
```

`patchExtraction` is how the UI fixes missing fields after the engine
returned `EngineError`. Just merge into `raw_json` and write back. No
re-LLM call.

## What to skip

- Provenance, source mapping, document highlighting.
- PDF, Excel, Drive, data-room connectors.
- Confidence scores.
- Multiple extractions per company (one is enough for MVP — overwrite).
- Reconciliation between sources (there's only one source).

## Done when

- Drop the golden fixture's contract text in → `Extraction` matches what
  the engine expects, written to SQLite.
- A missing field in the contract round-trips: LLM returns `null` → UI
  patches → `patchExtraction` updates `raw_json` → engine re-runs OK.
