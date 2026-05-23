// The contract between the LLM call and the rest of the ingestion code.
//
// Two representations of the same shape live here:
//   1. `ExtractionInputSchema` — a Zod schema used as the structured-output
//      schema for the AI SDK (`generateObject({ schema })`). This is the
//      source of truth the model is asked to fill.
//   2. `parseExtraction` — a defensive normalizer that coerces arbitrary
//      input (e.g. a model that ignored the schema, or messy values inside
//      a valid shape) into a strict `Extraction`. Used as a last-mile
//      guard after the structured-output call so we never propagate NaN
//      or unexpected enum values into the engine.

import { z } from "zod";
import type { Extraction, ExtractedRound, ExtractedInvestor, Participation } from "../shared/types.js";

export const EXTRACTION_SYSTEM_PROMPT = `You are a precise contract data extractor for venture-capital cap tables.

Extract ONLY information that is LITERALLY written in the contract text the user provides. Follow every rule below without exception:

- Do NOT infer, calculate, or derive any value. No math. Never compute shares, ownership percentages, post-money valuations, totals, or anything not explicitly written.
- If a value is not literally present in the text, return null for that field. Never guess or fill from outside knowledge.
- Numbers must be plain JSON numbers: no currency symbols, no thousands separators, no units. Write 2000000, never "$2,000,000" or "2M".
- Dates use ISO 8601 (YYYY-MM-DD) only when a date is literally given; otherwise null.
- "participation" must be exactly one of "none", "full", or "capped" when the liquidation-preference type is stated; otherwise null. "participationCap" (a multiple, e.g. 2.0) is set only when participation is "capped".
- "seniority" is a number where a HIGHER value is paid out first; set it only when the contract states the ranking explicitly; otherwise null.
- Each investor's "round" must exactly match one of the round names you record.
- Founders' ordinary/common shares are NOT investors. Only record investors with an associated investment amount or named participation in a round.`;

// ─── Zod schema (AI SDK structured-output target) ───────────────────────────

export const ExtractionInputSchema = z.object({
  company: z.object({
    name: z.string().describe("Company name exactly as written in the contract."),
  }),
  rounds: z
    .array(
      z.object({
        name: z.string().describe('Round name, e.g. "Seed", "Series A".'),
        date: z.string().nullable().describe("Closing date (YYYY-MM-DD) or null."),
        preMoney: z.number().nullable().describe("Pre-money valuation or null."),
        investment: z.number().nullable().describe("Total amount invested in the round or null."),
        pricePerShare: z.number().nullable().describe("Issue price per share or null."),
        liqPref: z.number().nullable().describe("Liquidation preference multiple (e.g. 1.0) or null."),
        participation: z
          .enum(["none", "full", "capped"])
          .nullable()
          .describe("Participation type or null."),
        participationCap: z
          .number()
          .nullable()
          .describe("Participation cap multiple, only when capped."),
        seniority: z.number().nullable().describe("Seniority rank; higher is paid first."),
      }),
    )
    .describe("One entry per priced financing round literally described in the contract."),
  investors: z
    .array(
      z.object({
        name: z.string().describe("Investor name exactly as written."),
        round: z.string().describe("Round name; must match a rounds[].name."),
        amount: z.number().nullable().describe("Amount this investor put into the round, or null."),
      }),
    )
    .describe("One entry per investor in a round, as literally named in the contract."),
});

export type ExtractionInput = z.infer<typeof ExtractionInputSchema>;

// ─── Normalization ──────────────────────────────────────────────────────────
// Defensive coercion: even with structured output, we never trust raw values.
// Anything we can't confidently coerce becomes null (per the "missing data"
// contract), and junk entries are dropped.

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
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
