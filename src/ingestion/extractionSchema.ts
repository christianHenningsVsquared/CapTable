// The contract between the LLM call and the rest of Stream A.
//
// This file is intentionally free of any SDK import so it can be unit-tested in
// isolation: it holds the prompt, the JSON Schema the model must fill, and the
// normalizer that turns the model's (possibly messy) tool output into a strict
// `Extraction` from src/shared/types.ts.

import type { Extraction, ExtractedRound, ExtractedInvestor, Participation } from "../shared/types.js";

export const EXTRACTION_TOOL_NAME = "record_extraction";

export const EXTRACTION_TOOL_DESCRIPTION =
  "Record the cap-table data extracted verbatim from the contract. Every field must come " +
  "directly from the contract text; use null for anything that is not literally stated.";

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise contract data extractor for venture-capital cap tables.

Extract ONLY information that is LITERALLY written in the contract text the user provides. Follow every rule below without exception:

- Do NOT infer, calculate, or derive any value. No math. Never compute shares, ownership percentages, post-money valuations, totals, or anything not explicitly written.
- If a value is not literally present in the text, return null for that field. Never guess or fill from outside knowledge.
- Numbers must be plain JSON numbers: no currency symbols, no thousands separators, no units. Write 2000000, never "$2,000,000" or "2M".
- Dates use ISO 8601 (YYYY-MM-DD) only when a date is literally given; otherwise null.
- "participation" must be exactly one of "none", "full", or "capped" when the liquidation-preference type is stated; otherwise null. "participationCap" (a multiple, e.g. 2.0) is set only when participation is "capped".
- "seniority" is a number where a HIGHER value is paid out first; set it only when the contract states the ranking explicitly; otherwise null.
- Each investor's "round" must exactly match one of the round names you record.
- Founders' ordinary/common shares are NOT investors. Only record investors with an associated investment amount or named participation in a round.

Record the result by calling the ${EXTRACTION_TOOL_NAME} tool exactly once. Do not write any other text.`;

// JSON Schema for the tool's input. Standard JSON Schema (no strict-mode
// restrictions) — the normalizer below is the real guarantee of shape.
export const EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    company: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", description: "Company name exactly as written in the contract." },
      },
      required: ["name"],
    },
    rounds: {
      type: "array",
      description: "One entry per priced financing round literally described in the contract.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: 'Round name, e.g. "Seed", "Series A".' },
          date: { type: ["string", "null"], description: "Closing date (YYYY-MM-DD) or null." },
          preMoney: { type: ["number", "null"], description: "Pre-money valuation or null." },
          investment: { type: ["number", "null"], description: "Total amount invested in the round or null." },
          pricePerShare: { type: ["number", "null"], description: "Issue price per share or null." },
          liqPref: { type: ["number", "null"], description: "Liquidation preference multiple (e.g. 1.0) or null." },
          participation: {
            anyOf: [{ type: "string", enum: ["none", "full", "capped"] }, { type: "null" }],
            description: "Participation type or null.",
          },
          participationCap: { type: ["number", "null"], description: "Participation cap multiple, only when capped." },
          seniority: { type: ["number", "null"], description: "Seniority rank; higher is paid first." },
        },
        required: [
          "name",
          "date",
          "preMoney",
          "investment",
          "pricePerShare",
          "liqPref",
          "participation",
          "participationCap",
          "seniority",
        ],
      },
    },
    investors: {
      type: "array",
      description: "One entry per investor in a round, as literally named in the contract.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", description: "Investor name exactly as written." },
          round: { type: "string", description: "Round name; must match a rounds[].name." },
          amount: { type: ["number", "null"], description: "Amount this investor put into the round, or null." },
        },
        required: ["name", "round", "amount"],
      },
    },
  },
  required: ["company", "rounds", "investors"],
} as const;

// ─── Normalization ──────────────────────────────────────────────────────────
// Defensive coercion: the model is instructed to emit clean values, but we never
// trust that. Anything we can't confidently coerce becomes null (per the
// "missing data" contract), and junk entries are dropped.

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    // Strip currency symbols, thousands separators, and surrounding text.
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asParticipation(v: unknown): Participation | null {
  return v === "none" || v === "full" || v === "capped" ? v : null;
}

/** Coerce arbitrary tool output into a strict `Extraction`. Never throws. */
export function parseExtraction(input: unknown): Extraction {
  const obj = (input ?? {}) as Record<string, unknown>;
  const companyObj = (obj.company ?? {}) as Record<string, unknown>;

  const rawRounds = Array.isArray(obj.rounds) ? obj.rounds : [];
  const rounds: ExtractedRound[] = rawRounds
    .map((r): ExtractedRound => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        name: asString(o.name) ?? "",
        date: asString(o.date),
        preMoney: asNumberOrNull(o.preMoney),
        investment: asNumberOrNull(o.investment),
        pricePerShare: asNumberOrNull(o.pricePerShare),
        liqPref: asNumberOrNull(o.liqPref),
        participation: asParticipation(o.participation),
        participationCap: asNumberOrNull(o.participationCap),
        seniority: asNumberOrNull(o.seniority),
      };
    })
    .filter((r) => r.name !== "");

  const rawInvestors = Array.isArray(obj.investors) ? obj.investors : [];
  const investors: ExtractedInvestor[] = rawInvestors
    .map((i): ExtractedInvestor => {
      const o = (i ?? {}) as Record<string, unknown>;
      return {
        name: asString(o.name) ?? "",
        round: asString(o.round) ?? "",
        amount: asNumberOrNull(o.amount),
      };
    })
    .filter((i) => i.name !== "");

  return {
    company: { name: asString(companyObj.name) ?? "Unknown Company" },
    rounds,
    investors,
  };
}
