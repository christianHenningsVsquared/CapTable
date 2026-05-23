# Engine

Code: `src/engine/`. Tests: `tests/engine/`. Deterministic, no LLM, all money in
`decimal.js`.

## `buildCapTable(extraction)`

Input: `Extraction` (from the LLM, possibly with `null` fields).
Output: `CapTable` or `EngineError { error: "missing_data", missing: string[] }`.

What it does:

1. **Validate** — collects every required field that's `null` and returns
   `EngineError` listing them (e.g. `["Series B.pricePerShare", "Seed.liqPref"]`).
   This is what drives the CLI's `patch` command and the web merge view.
2. **Per-round share class** — `shares = sum(investor.amount) / round.pricePerShare`.
   Preserves liq pref, participation, participation cap, and seniority for the
   waterfall.
3. **Founders' Common** — derived from the first round's pre-money:
   `founderShares = firstRound.preMoney / firstRound.pricePerShare`. Common gets
   `pricePerShare = 0`, `liqPref = 0`, `seniority = 0`.
4. **Holdings** — one row per `(investor, round)` pair, plus one for Founders.

The total `shareClasses[].shares` sums to `totalShares`. Ownership = shares ÷
totalShares.

## `runWaterfall(capTable, exitValue)`

Models a liquidation waterfall with seniority stacking, non-participating
conversion, and capped participation.

### Algorithm

1. **Conversion optimization** (fixed-point, up to 16 iterations). For each
   preferred class that *can* convert (non-participating or capped), check
   whether flipping its converted-state increases its own payout. Continue until
   the converter set is stable.
2. **`classPayouts(capTable, exit, converters)`** computes per-class payouts for
   a given converter set:
   - **Liq prefs first**, highest seniority first. Each class claims
     `shares × pricePerShare × liqPref`. If a seniority tier exceeds remaining
     proceeds, claims are paid pro-rata within that tier and the waterfall
     stops.
   - **Residual** goes to Common, converters, and participating classes
     (capped + full) pro-rata by shares, iterating to respect participation
     caps (`shares × pricePerShare × participationCap` is the ceiling). Up to
     32 passes — caps are applied each pass, freed capacity redistributes.
3. **Per-holder payouts** = class payout × holder shares ÷ class shares.
   Rounded to cents; per-holder multiple = payout ÷ invested.
4. **Reconciliation** — distributes any rounding drift (in 1¢ steps, biggest
   fractional part first) so `sum(rows.payout) === exitValue` exactly.

### Invariants (tested)

- `sum(rows.payout) === exitValue` for every run.
- Capped participating classes never exceed their cap.
- Above the conversion-optimal exit value, every non-participating preferred
  converts to Common.

See `tests/engine/waterfallInvariant.test.ts` (property test across exit values)
and `tests/engine/runWaterfall.test.ts` (scenario tests against the Helios
fixture — see `tests/fixtures/golden.ts`).

## Why decimal.js

Float arithmetic accumulates rounding error fast in waterfall logic, especially
in the participation-cap iteration. All math runs in `Decimal` and only converts
to `number` at the boundary, just before returning to callers.

## Worked example

`demo/helios-robotics-walkthrough.md` walks through every step (extraction, cap
table, waterfall at three exit values) for the contract in
`demo/helios-robotics.txt`. The numbers there are also the test fixture in
`tests/fixtures/golden.ts`, so "tested" and "demonstrated" stay in sync.
