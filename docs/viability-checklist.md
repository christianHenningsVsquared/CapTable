# Viability Checklist — Streams A + B, No UI

Stream C isn't built yet, so the goal here is: a usable headless app that runs
end-to-end on a contract text using Streams A + B, with a user-supplied
Anthropic *or* OpenAI key. MVP only — no polish.

**Status: ✅ shipped on `feat/headless-cli-ai-sdk`** (this file kept as the
record of what "viable" meant for this slice).

## 1. Provider-agnostic extraction (replace direct Anthropic SDK)

- [x] Replaced `@anthropic-ai/sdk` with the Vercel AI SDK (`ai`,
      `@ai-sdk/anthropic`, `@ai-sdk/openai`) + `zod`.
- [x] `extractContract` now calls `generateObject({ model, schema, system,
      prompt })`.
- [x] `EXTRACTION_JSON_SCHEMA` → `ExtractionInputSchema` (Zod). The
      defensive `parseExtraction` normalizer is still the last line of
      defence.
- [x] `modelFor(config)` in `src/ingestion/providers.ts` is the only place
      that decides between `createAnthropic` / `createOpenAI`.
- [x] Tests inject a raw result via the `__testRawResult` seam — no more
      Anthropic-client mock.

## 2. Runtime API key + provider config

- [x] `RuntimeConfig = { provider, apiKey, model? }` in `src/config/`.
- [x] Resolution order: explicit overrides → env (`CAPTABLE_PROVIDER`,
      `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CAPTABLE_MODEL`) →
      `~/.captable/config.json`.
- [x] `captable config set` writes the JSON with mode `0600` and masks the
      key in echoed output (`maskKey`).
- [x] Defaults: `claude-opus-4-7` (Anthropic) and `gpt-4o` (OpenAI).
- [x] `loadConfig` throws a typed `ConfigError` on missing required fields;
      the CLI translates that into a friendly exit-code-2 message.

## 3. CLI entrypoint

- [x] `package.json` exposes the `captable` bin → `dist/cli/index.js`.
- [x] Subcommands:
  - `captable config set --provider <p> --api-key <k> [--model <m>]`
  - `captable config show`
  - `captable ingest <path>`
  - `captable captable <companyId>`
  - `captable patch <companyId> --field … --value …` (repeatable)
  - `captable waterfall <companyId> --exit <amount> [--save]`
  - `captable run <path> [--exit <amount>]`
- [x] `--json` on the root program for machine-readable output.
- [x] `--db <path>` lets you point at a custom SQLite file.
- [x] EngineError surfaced as a clear `Missing data` block, with the patch
      command pre-filled for the first missing field.

## 4. Persistence wiring

- [x] Default DB path: `~/.captable/captable.db`; `openDb` mkdirs the parent.
- [x] One company per ingest; `companyId` is the handle across commands.

## 5. End-to-end smoke test

- [x] `tests/e2e/headless.test.ts` exercises the handlers exactly as the CLI
      does, with the golden fixture wired in via a fake extractor.
- [x] All four flows covered: `run` (default & custom exit), `waterfall`
      with/without `--save`, and the missing-field → patch → success loop.
- [x] Existing engine + ingestion + store unit tests still green.
- [x] Manual CLI smoke against `demo/helios-robotics.txt` produces the
      hand-computed payouts (Series B caps at $100M exit; Series B
      participates at the $26M default).

## 6. Docs

- [x] README quickstart updated for both providers.
- [x] `.env.example` lists every CAPTABLE_* and provider key.
- [x] Headless-mode note added to `docs/MVP.md`.

## 7. Nice-to-have

Deferred — none of these blocked the DoD:

- [ ] `--dry-run` on `ingest` (extract + print, don't persist).
- [ ] Cache the last-used model per provider in the config file.
- [ ] `captable show <companyId>` that prints stored extraction JSON.

## Explicitly NOT in this checklist

- Electron / React UI (Stream C — separate workstream).
- PDF / Excel / Drive ingestion.
- Multi-company portfolio view.
- Provenance, confidence levels, source highlighting.
- Auth, packaging, installer, encryption.

## Definition of Done (achieved)

A new user can:

1. `npm install && npx captable config set …` with their own Anthropic *or*
   OpenAI key. ✅
2. `npx captable run demo/helios-robotics.txt` and see the cap table + a
   waterfall at a default exit value, all from Streams A + B. ✅
3. Swap providers by re-running `config set` — no code changes. ✅
