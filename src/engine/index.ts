import type {
  CapTable,
  EngineError,
  Extraction,
  WaterfallResult,
} from "../shared/types.js";

/**
 * Build a deterministic Cap Table from an LLM Extraction.
 *
 *   - shares per investor = investment / pricePerShare (per round).
 *   - One ShareClass per round, named after the round, carrying that round's
 *     liq-pref terms (liqPref, participation, participationCap, seniority).
 *   - Founders ("Common"): derived from the first round's
 *     preMoney / pricePerShare, minus the shares of other holders in that round.
 *   - If any required field is null, return EngineError with the list of missing
 *     fields formatted as "<RoundName>.<fieldName>".
 *
 * Stream B owns this. See docs/stream-b-engine.md.
 */
export function buildCapTable(extraction: Extraction): CapTable | EngineError {
  throw new Error("Not implemented");
}

/**
 * Run the liquidation waterfall against a CapTable for a given exit value.
 *
 *   - Walk ShareClasses by seniority (high → low).
 *   - Apply liq prefs first, then distribute residual pro-rata.
 *   - participation = "none":  conversion fixpoint (max of pref vs pro-rata).
 *   - participation = "full":  pref + pro-rata share of residual.
 *   - participation = "capped": full participation up to participationCap × investment.
 *
 * Invariant (must hold in tests):
 *   sum(result.rows.payout) === result.exitValue, to the cent.
 *   Use decimal.js for all money math; round only at the end.
 *
 * Stream B owns this. See docs/stream-b-engine.md.
 */
export function runWaterfall(
  capTable: CapTable,
  exitValue: number,
): WaterfallResult {
  throw new Error("Not implemented");
}
