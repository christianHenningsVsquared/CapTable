# Web app

Code: `src/web/`. Vite + React 19 + Tailwind + react-router + react-query.

## Boot

```bash
npm run dev    # server + web together (recommended)
npm run web    # web only — needs the server running separately
```

Dev server: `http://localhost:5173`. The Vite proxy in `src/web/vite.config.ts`
forwards `/api/*` to `http://127.0.0.1:3001`, so the frontend can use relative
URLs without CORS gymnastics.

## Layout

```
src/web/
  index.html
  vite.config.ts        Proxy /api → :3001. Build outDir: ../../dist-web.
  tsconfig.json
  tailwind.config.js
  postcss.config.js
  src/
    main.tsx            ReactDOM root. Wraps BrowserRouter + QueryClientProvider.
    App.tsx             Sidebar + main route outlet.
    index.css           Tailwind layers + animations.
    lib/
      api.ts            Thin fetch wrappers for every server endpoint.
      utils.ts          formatMoney, cn (clsx + tailwind-merge).
    pages/
      empty.tsx         Landing / fund-selected-but-no-company.
      company.tsx       Main screen: docs, merge view, cap table, waterfall.
    components/
      sidebar.tsx           Funds + companies tree, create/delete.
      settings-dialog.tsx   Provider + API key (talks to /api/config).
      drop-zone.tsx         Multi-file upload → /api/companies/:id/documents.
      merge-view.tsx        Edit the merged Extraction in place.
      cap-table-view.tsx    Share classes + holdings table.
      waterfall-section.tsx Exit-value slider + waterfall table.
      raw-data-view.tsx     Inspect raw per-document extractions.
      ui/                   Generic primitives: Button, Card, Dialog, Input, Table, …
```

## Data fetching

Everything goes through react-query. Default options in `src/web/src/main.tsx`:
`refetchOnWindowFocus: false`, `staleTime: 30s`. The company view also polls
every 5s so extractions running in the background show up without a manual
refresh.

API queries:

- `["config"]` — provider/key status.
- `["funds"]` / `["companies", fundId]` — sidebar.
- `["company", companyId]` — the main view: company, documents, merged, captable.
- `["extractions", companyId]` — raw per-document extractions for the merge view.

## Routing

```
/                                          → EmptyState
/funds/:fundId                             → EmptyState (fund selected)
/funds/:fundId/companies/:companyId        → CompanyView
*                                          → redirect to /
```

## Build

`npm run build` builds the TS server/CLI to `dist/`. The web app is **not** part
of the default build; build it separately if you need static assets:

```bash
npx vite build src/web    # writes to dist-web/
```

The web app is currently only used in dev (`npm run dev`).
