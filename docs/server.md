# Server

Code: `src/server/`. Express app on `127.0.0.1:3001` (port via `CAPTABLE_PORT`).
Binds localhost only — never reachable from another machine.

## Boot

`npm run server` (one-shot) or `npm run server:watch` (tsx watch mode). `npm run
dev` starts the server in watch mode plus Vite together.

Startup logs the config + DB paths:

```
[captable] API on http://127.0.0.1:3001
[captable] config: /Users/you/.captable/config.json
[captable] db:     /Users/you/.captable/captable.db
```

The server does **not** require a configured API key to boot. The key is read on
each extraction call, so you can start the server and paste the key into the
settings dialog after.

## Endpoints

### Config

| Method   | Path                  | Body / Notes                                                                                       |
|----------|-----------------------|----------------------------------------------------------------------------------------------------|
| `GET`    | `/api/config`         | `{ hasKey, provider, maskedKey, model, baseURL }`. **Never returns the raw key.**                  |
| `POST`   | `/api/config`         | `{ provider, apiKey, model?, baseURL? }`. Writes `~/.captable/config.json` (mode `0600`).          |
| `DELETE` | `/api/config`         | Wipes the config file.                                                                             |

### Funds

| Method   | Path                            | Notes                                |
|----------|---------------------------------|--------------------------------------|
| `GET`    | `/api/funds`                    | List.                                |
| `POST`   | `/api/funds`                    | `{ name }`.                          |
| `DELETE` | `/api/funds/:id`                | Cascades to companies / docs / etc.  |

### Companies

| Method   | Path                                     | Notes                                                                  |
|----------|------------------------------------------|------------------------------------------------------------------------|
| `GET`    | `/api/funds/:fundId/companies`           | List companies in a fund.                                              |
| `POST`   | `/api/funds/:fundId/companies`           | `{ name }`.                                                            |
| `GET`    | `/api/companies/:id`                     | `{ company, documents, merged, captable }`. `captable` may be `EngineError`. |
| `DELETE` | `/api/companies/:id`                     | Cascades.                                                              |

### Documents

| Method   | Path                                          | Notes                                                                                 |
|----------|-----------------------------------------------|---------------------------------------------------------------------------------------|
| `POST`   | `/api/companies/:id/documents`                | `multipart/form-data`, field `files` (max 20, 25 MB each). Parses + stores text.      |
| `GET`    | `/api/documents/:id`                          | Doc row + latest extraction.                                                          |
| `DELETE` | `/api/documents/:id`                          | Removes doc + its extractions.                                                        |
| `POST`   | `/api/documents/:id/extract`                  | Runs LLM extraction for the document. `412` if no key configured.                     |
| `GET`    | `/api/companies/:id/extractions`              | All per-document extractions (for the merge UI).                                      |

### Merged extraction & waterfall

| Method   | Path                                  | Notes                                                                                  |
|----------|---------------------------------------|----------------------------------------------------------------------------------------|
| `PUT`    | `/api/companies/:id/merged`           | `{ extraction }`. Saves the curated `Extraction` and returns `{ merged, captable }`.   |
| `POST`   | `/api/companies/:id/waterfall`        | `{ exitValue, save? }`. Returns `{ capTable, waterfall }`. Persists if `save: true`.   |

### Health

`GET /api/health` → `{ ok: true }`.

## Errors

The error middleware returns `500 { error: <message> }` for unhandled throws and
logs to stderr (`[server]`). Validation failures use `400`, missing rows `404`,
"no API key" returns `412 Precondition Failed`.

## Security posture

- Localhost-bound.
- CORS allowlist: `http://localhost:5173`, `http://127.0.0.1:5173`.
- File uploads stay in memory (`multer.memoryStorage()`); only the extracted
  text gets persisted.
- API key is never returned by the API and the file is mode `0600`.
