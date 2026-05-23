# CLI

Code: `src/cli/`. Commander v14. Entry point: `dist/cli/index.js` (built from
`src/cli/index.ts` and exposed as `bin: { captable: … }` in `package.json`).

Run from source (no build needed): `npm run cli -- <args>`.
Run built: `npx captable <args>` (after `npm run build`).

## Global flags

| Flag               | Default                       | Effect                                     |
|--------------------|-------------------------------|--------------------------------------------|
| `--db <path>`      | `~/.captable/captable.db`     | Override SQLite path.                      |
| `--json`           | off                           | Emit results as JSON.                      |

## Subcommands

### `config set`

Persist provider + key to `~/.captable/config.json` (mode `0600`).

```bash
captable config set --provider anthropic --api-key sk-ant-…
captable config set --provider openai    --api-key sk-…
captable config set --provider langdock  --api-key ld-… \
  [--base-url https://api.langdock.com/openai/us/v1] [--model gpt-4o]
```

### `config show`

```bash
captable config show
captable --json config show
```

Prints the resolved config with the API key masked.

### `ingest <path>`

Extract a contract text and persist the extraction. Auto-creates a "CLI" fund
and a company (one company per ingest).

```bash
captable ingest demo/helios-robotics.txt
```

Output: `companyId` (you'll need this for subsequent commands).

### `captable <companyId>`

Print the computed cap table for a company. Read-only — no LLM call.

```bash
captable captable 1
```

If the extraction has missing required fields, prints a `missing_data` error
listing them and exits `3`.

### `patch <companyId>`

Patch fields in the merged extraction. Repeat `--field` / `--value` pairs:

```bash
captable patch 1 \
  --field "Series B.pricePerShare" --value 4.0 \
  --field "Seed.liqPref"           --value 1.0
```

Field paths follow the shape returned by `EngineError.missing`:
- `"<round>.<field>"` for round fields
- `"<round>.investors.<name>.amount"` for investor amounts
- `"company.name"` for the company name

### `waterfall <companyId> --exit <amount>`

Run the waterfall at a given exit value. Read-only unless `--save` is passed.

```bash
captable waterfall 1 --exit 51000000
captable waterfall 1 --exit 51000000 --save     # persist to waterfall_runs
```

### `run <path>`

Full pipeline: ingest → cap table → waterfall in one go. Default exit value is
`2× total invested`; override with `--exit`.

```bash
captable run demo/helios-robotics.txt
captable run contract.txt --exit 100000000
```

Also takes per-command provider overrides: `--provider`, `--api-key`, `--model`,
`--base-url`. These do **not** persist to the config file.

## Exit codes

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 0    | OK                                                   |
| 1    | Generic failure (file read error, unexpected throw)  |
| 2    | Config error (missing provider or key)               |
| 3    | Engine `missing_data` — the patch hint is printed    |

## Test seam

`CAPTABLE_TEST_FAKE_EXTRACTION=<path>` makes `ingest` and `run` read that file as
the extraction instead of calling the LLM. Used by the CI smoke test in
`tests/e2e/headless.test.ts`.
