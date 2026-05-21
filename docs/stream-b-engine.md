# Stream B — Engine

**One sentence:** Pure TypeScript functions that turn an `Extraction`
into a `CapTable` and run a `WaterfallResult` against a given exit value.

Read [MVP.md](MVP.md) first.

## What you own

- `src/engine/captable/**` — `buildCapTable`.
- `src/engine/waterfall/**` — `runWaterfall`.
- `src/engine/index.ts` — the two exports.
- `tests/engine/**` — unit tests + golden fixture tests.

No DB. No UI. No async. No I/O. Pure functions, all input via arguments,
all output as return values. Use `decimal.js` for money — never raw
floats.

## What you build

### 1. `buildCapTable(extraction: Extraction): CapTable | EngineError`

For each round in order:
- Create one `ShareClass` named after the round, with that round's
  liq-pref terms (liqPref, participation, participationCap, seniority).
- For each investor in that round: `shares = investment / pricePerShare`,
  emit a `Holding`.

For founders / Common:
- Bootstrap from the **first round's** numbers:
  `foundersShares = (preMoney / pricePerShare) − (sum of other holders'
  shares in that round)`.
- Emit a `Common` `ShareClass` (no liq pref, seniority 0).

If any required field is `null` → return `EngineError` with the list of
missing fields, formatted `"<RoundName>.<fieldName>"`.

### 2. `runWaterfall(capTable: CapTable, exitValue: number): WaterfallResult`

Standard liquidation waterfall:
- Sort `ShareClass`es by `seniority` desc.
- For each preferred class: pay liq pref first (capped by remaining
  proceeds).
- After all prefs paid: distribute residual pro-rata across participating
  + common.
- Participation modes:
  - `none` — non-participating: conversion fixpoint. Take `max(pref,
    pro-rata)` per class; if pro-rata wins, convert that class to common
    and recompute. Iterate until stable.
  - `full` — gets pref **and** pro-rata share of residual.
  - `capped` — like `full` but total payout capped at
    `participationCap × investment`. If cap reached, convert to common.
- Common: pro-rata of whatever is left.

**Invariant (must hold in tests):** `sum(rows.payout) === exitValue`
to the cent. Use `decimal.js` and round at the very end.

### 3. Golden test

`tests/fixtures/golden.ts` contains one hand-built 3-round Extraction
with hand-computed expected `CapTable` and `WaterfallResult` numbers
(for ≥ 2 different exit values, including one where conversion flips).

Your tests assert:
- `buildCapTable(golden.extraction)` deep-equals `golden.capTable`.
- `runWaterfall(golden.capTable, exit)` deep-equals
  `golden.waterfalls[exit]` for each exit value.
- Invariants: ownership sums to 100%, waterfall sums to exit value.

## What to skip

- SAFEs / convertibles / notes.
- Anti-dilution (full ratchet, weighted average).
- Pre-money option pool shuffle.
- Multiple share classes per round.
- Snapshots / time travel / event sourcing.
- Returns curve over many exit values (the UI just calls `runWaterfall`
  in a loop).

## Done when

- Both functions exported from `src/engine/index.ts`.
- Golden test passes cent-exactly.
- Property test: for 20 random exit values 0 ≤ E ≤ 10× total invested,
  `sum(payouts) === E`.
