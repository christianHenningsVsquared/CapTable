# Ingestion

Code: `src/ingestion/`. Tests: `tests/ingestion/`.

## The contract

`extractContract(text, options)` makes **one** LLM call via the Vercel AI SDK's
`generateObject` with a Zod schema (`ExtractionInputSchema`). The result is a
strict `Extraction`:

```ts
type Extraction = {
  company:   { name: string };
  rounds:    ExtractedRound[];
  investors: ExtractedInvestor[];
};
```

Rule the system prompt enforces: **extract only values literally present in the
contract**. Anything missing is `null`. The engine deals with the gaps later.

The Zod schema is the source of truth for the LLM's structured output. See
`src/ingestion/extractionSchema.ts` for the prompt and field-level guidance.

## Providers

`modelFor(config)` returns an AI SDK `LanguageModel`. Switching providers means
changing config — no code changes.

| Provider   | SDK                  | Default model        |
|------------|----------------------|----------------------|
| anthropic  | `@ai-sdk/anthropic`  | `claude-opus-4-7`    |
| openai     | `@ai-sdk/openai`     | `gpt-4o`             |
| langdock   | `@ai-sdk/openai` (OpenAI-compatible against `baseURL`) | `gpt-4o` |

Langdock fronts multiple model families (OpenAI, Anthropic, Google, Mistral)
through a single OpenAI-compatible API. Default base URL is the EU region; see
[configuration.md](configuration.md).

## Document parsing (server only)

Before reaching the LLM, uploaded files go through `src/server/docParsers.ts`,
which produces plain text from:

| Extension | Library        |
|-----------|----------------|
| `.txt`, `.md`, `text/*` | utf-8 decode |
| `.pdf`    | `pdf-parse`    |
| `.docx`   | `mammoth`      |
| `.xlsx`   | `xlsx` (SheetJS) — each sheet as TSV |

Unknown formats throw, and the server returns `400`. The CLI's `ingest` and
`run` commands take a path and read it as utf-8 — no PDF/DOCX support there,
since the headless flow assumes you already have text.

## Tests

- `tests/ingestion/extractContract.test.ts` — round-trips the parser using
  `__testRawResult` (a test seam that bypasses the LLM).
- `tests/ingestion/providers.test.ts` — provider selection logic.
- `tests/ingestion/store.test.ts` — extraction flow through the `Store`.
- `tests/ingestion/live.test.ts` — opt-in live LLM call. Skipped unless
  `ANTHROPIC_API_KEY` is set in the environment.

## Adding a provider

1. Add a case to `modelFor` in `src/ingestion/providers.ts`.
2. Add it to `PROVIDERS` and `Provider` in `src/config/index.ts`.
3. Add an env-var inference branch in `fromEnv` (also `src/config/index.ts`).
4. Update the default-models table here and in [configuration.md](configuration.md).
