# Stream C — UI

**One sentence:** A one-screen Electron + React app: upload contract,
see cap table, drag exit slider, watch waterfall chart update.

Read [MVP.md](MVP.md) first.

## What you own

- The Electron shell (main + renderer).
- `src/ui/**` — React components and the single screen.
- The IPC bridge that calls Stream A's API.

## What you build

### 1. App shell

- Electron main process: window, IPC handlers that forward to Stream A's
  API (`ingest`, `getExtraction`, `patchExtraction`, `getWaterfall`,
  `saveWaterfall`).
- React renderer: one screen, no router.

### 2. The single screen

Top to bottom:

**a. Upload area**
- Drop zone or "paste contract text" textarea.
- On submit → `ingest(text)` → store `companyId` in component state.

**b. Cap table**
- Plain HTML table.
- Columns: Holder, Share Class, Shares, Ownership %.
- Data comes from calling Stream B's `buildCapTable(extraction)` in the
  renderer (the engine is pure TS, just import it).

**c. Missing-field banner (only if engine returned `EngineError`)**
- List of missing fields (e.g. `Series B.pricePerShare`).
- One input per field. Submit → `patchExtraction()` → re-render.

**d. Waterfall section**
- Exit-value slider: range from 0 to ~5× total invested. Default to total
  invested × 2.
- Bar chart of payouts per holder (recharts `<BarChart>`).
- Updates live as the slider moves — call `runWaterfall(capTable,
  exitValue)` directly in the renderer (it's a pure function, fast).
- On slider release (debounced), call `saveWaterfall()` so the run is
  persisted.

That's the entire UI.

### 3. Stack

- Electron + React + TypeScript.
- `recharts` for the chart. No visx / D3 — keep it simple.
- No state management library — `useState` and prop drilling are fine
  for one screen.
- No CSS framework needed; plain CSS modules or inline styles. Don't
  spend time on polish.

## What to skip

- Provenance hovers, document side-panel, source highlighting.
- Confidence ampel / colour coding.
- Multiple companies, portfolio view, navigation.
- Return curve over many exit values (slider is enough).
- Scenarios, follow-on UI, red-flag display.
- Dark mode, theming, animations, loading skeletons.

## Done when

- Drop the golden fixture's contract text in → cap table renders with
  the expected numbers.
- Drag the slider → bars resize live, and the chart matches what the
  golden fixture expects at that exit value.
- Patching a missing field re-renders the cap table without re-uploading.
