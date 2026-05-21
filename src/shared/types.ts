// Shared contract between Stream A (Ingestion), Stream B (Engine), and Stream C (UI).
//
// Rule: the LLM produces ONLY values literally written in the contract.
// The engine computes everything derived (shares, ownership %, waterfall).
//
// Do not invent local types in any stream — extend this file with a PR all three review.

export type Participation = "none" | "full" | "capped";

// ─── Stream A output ──────────────────────────────────────────────────────────

export type ExtractedRound = {
  name: string;                        // "Seed", "Series A", ...
  date: string | null;                 // ISO 8601
  preMoney: number | null;
  investment: number | null;           // total round size
  pricePerShare: number | null;
  liqPref: number | null;              // multiple, e.g. 1.0
  participation: Participation | null;
  participationCap: number | null;     // multiple, only if participation === "capped"
  seniority: number | null;            // higher number = paid first
};

export type ExtractedInvestor = {
  name: string;
  round: string;                       // must match an ExtractedRound.name
  amount: number | null;               // money this investor put into this round
};

export type Extraction = {
  company: { name: string };
  rounds: ExtractedRound[];
  investors: ExtractedInvestor[];
};

// ─── Stream B output ──────────────────────────────────────────────────────────

export type ShareClass = {
  name: string;                        // matches round name; "Common" for founders
  shares: number;
  pricePerShare: number;               // round's PPS; 0 for Common. needed so the
                                       // waterfall can compute liq-pref payouts
                                       // (invested = shares × PPS) and per-holder
                                       // multiple without re-reading the Extraction.
  liqPref: number;                     // 0 for Common
  participation: Participation;        // "none" for Common
  participationCap: number | null;
  seniority: number;                   // 0 for Common
};

export type Holding = {
  holder: string;                      // investor name or "Founders"
  shareClass: string;
  shares: number;
};

export type CapTable = {
  shareClasses: ShareClass[];
  holdings: Holding[];
  totalShares: number;
};

export type WaterfallRow = {
  holder: string;
  shareClass: string;
  payout: number;
  multiple: number;                    // payout / amount invested (1 if Common with no invested $)
};

export type WaterfallResult = {
  exitValue: number;
  rows: WaterfallRow[];
  totalPayout: number;                 // must equal exitValue (invariant)
};

export type EngineError = {
  error: "missing_data";
  missing: string[];                   // e.g. ["Series B.pricePerShare", "Seed.liqPref"]
};
