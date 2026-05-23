# Configuration

All implemented in `src/config/index.ts`.

## Resolution order

For each field (`provider`, `apiKey`, `model`, `baseURL`), the first source wins:

1. **Explicit overrides** — `loadConfig({ overrides: … })`. The CLI passes parsed
   flags this way, so `--provider …` always beats env or file.
2. **Environment variables** — see below.
3. **`~/.captable/config.json`** — what `captable config set` and the web settings
   dialog write.

If neither `provider` nor `apiKey` ends up set, `loadConfig` throws `ConfigError`
with a hint on how to fix it.

## Environment variables

| Variable               | Effect                                                    |
|------------------------|-----------------------------------------------------------|
| `CAPTABLE_PROVIDER`    | Pin the provider (`anthropic` / `openai` / `langdock`).   |
| `ANTHROPIC_API_KEY`    | Key for Anthropic. Inferred as provider if no pin.        |
| `OPENAI_API_KEY`       | Key for OpenAI. Inferred as provider if no pin.           |
| `LANGDOCK_API_KEY`     | Key for Langdock. Inferred as provider if no pin.         |
| `CAPTABLE_MODEL`       | Override the model id (e.g. `gpt-4o-mini`).               |
| `CAPTABLE_BASE_URL`    | Override the base URL (any provider).                     |
| `LANGDOCK_BASE_URL`    | Langdock-only base URL override (US region, dedicated…).  |
| `CAPTABLE_PORT`        | Server port (default `3001`).                             |

When no `CAPTABLE_PROVIDER` is set, the first existing key wins in this order:
Anthropic → OpenAI → Langdock.

## The config file

```
~/.captable/config.json     # mode 0600
~/.captable/captable.db     # SQLite database
```

Shape:

```json
{
  "provider": "anthropic",
  "apiKey": "sk-ant-…",
  "model": "claude-opus-4-7",
  "baseURL": "https://api.langdock.com/openai/us/v1"
}
```

`model` and `baseURL` are optional. Writes always chmod `0600` to keep the key off
other users on the machine.

## Default models

From `src/ingestion/providers.ts`:

| Provider   | Default model         | Notes                                                     |
|------------|-----------------------|-----------------------------------------------------------|
| anthropic  | `claude-opus-4-7`     | Native Anthropic SDK.                                     |
| openai     | `gpt-4o`              | Native OpenAI SDK.                                        |
| langdock   | `gpt-4o`              | OpenAI-compatible gateway; default base URL = EU region.  |

Langdock default base URL: `https://api.langdock.com/openai/eu/v1`. Override via
`baseURL` for the US region or a dedicated deployment.

## CLI

```bash
captable config set --provider anthropic --api-key sk-ant-…
captable config set --provider langdock  --api-key ld-… \
  --base-url https://api.langdock.com/openai/us/v1 --model gpt-4o
captable config show              # prints resolved config (key masked)
```

Per-command override (no persistence):

```bash
captable run contract.txt --provider openai --api-key sk-… --model gpt-4o-mini
```

## Web app

The settings dialog (`src/web/src/components/settings-dialog.tsx`) hits the
server's `POST /api/config`. The server validates and persists the same
`~/.captable/config.json`. `GET /api/config` only returns `{ hasKey, provider,
maskedKey, model, baseURL }` — never the raw key.
