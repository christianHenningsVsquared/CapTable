// CLI handlers — pure-ish functions the CLI shell and tests call.
//
// They take a `Store` (which already wraps the DB + extractor) and return
// shaped results. No console output here; the shell is responsible for
// formatting. Keeping it this way lets the E2E test exercise the full
// pipeline by importing these functions directly.

import { buildCapTable, runWaterfall } from "../engine/index.js";
import type { Store } from "../data/index.js";
import type {
  CapTable,
  EngineError,
  Extraction,
  Participation,
  WaterfallResult,
} from "../shared/types.js";

export interface IngestResult {
  companyId: number;
  extractionId: number;
  extraction: Extraction;
}

export interface CapTableResult {
  extraction: Extraction;
  capTable: CapTable | EngineError;
}

export interface WaterfallRunResult {
  extraction: Extraction;
  capTable: CapTable | EngineError;
  waterfall?: WaterfallResult;
  /** True iff `waterfall` was persisted via `saveWaterfall`. */
  saved: boolean;
}

export interface RunResult {
  companyId: number;
  extractionId: number;
  extraction: Extraction;
  capTable: CapTable | EngineError;
  /** Only present when capTable is a CapTable (not EngineError). */
  waterfall?: WaterfallResult;
  exitValue?: number;
}

export async function ingestHandler(store: Store, contractText: string): Promise<IngestResult> {
  const { companyId, extractionId } = await store.ingest(contractText);
  const extraction = await store.getExtraction(companyId);
  return { companyId, extractionId, extraction };
}

export async function capTableHandler(store: Store, companyId: number): Promise<CapTableResult> {
  const extraction = await store.getExtraction(companyId);
  return { extraction, capTable: buildCapTable(extraction) };
}

export async function waterfallHandler(
  store: Store,
  companyId: number,
  exitValue: number,
  options: { save?: boolean } = {},
): Promise<WaterfallRunResult> {
  const extraction = await store.getExtraction(companyId);
  const capTable = buildCapTable(extraction);
  if ("error" in capTable) {
    return { extraction, capTable, saved: false };
  }
  const waterfall = runWaterfall(capTable, exitValue);
  let saved = false;
  if (options.save) {
    await store.saveWaterfall(companyId, waterfall);
    saved = true;
  }
  return { extraction, capTable, waterfall, saved };
}

export async function patchHandler(
  store: Store,
  companyId: number,
  patches: { field: string; value: string }[],
): Promise<{ extraction: Extraction }> {
  const current = await store.getExtraction(companyId);
  const updated = patches.reduce(applyFieldPatch, current);
  await store.patchExtraction(companyId, updated);
  return { extraction: updated };
}

/**
 * Convenience: ingest → cap table → waterfall in one call. If the cap table
 * has missing data, the waterfall step is skipped (caller surfaces the
 * EngineError). Default exit value is 2× total invested.
 */
export async function runHandler(
  store: Store,
  contractText: string,
  options: { exitValue?: number } = {},
): Promise<RunResult> {
  const { companyId, extractionId, extraction } = await ingestHandler(store, contractText);
  const capTable = buildCapTable(extraction);
  if ("error" in capTable) {
    return { companyId, extractionId, extraction, capTable };
  }
  const exitValue =
    options.exitValue ?? totalInvested(extraction) * 2;
  const waterfall = runWaterfall(capTable, exitValue);
  await store.saveWaterfall(companyId, waterfall);
  return { companyId, extractionId, extraction, capTable, waterfall, exitValue };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function totalInvested(extraction: Extraction): number {
  return extraction.rounds.reduce((sum, r) => sum + (r.investment ?? 0), 0);
}

const NUMERIC_ROUND_FIELDS = new Set([
  "preMoney",
  "investment",
  "pricePerShare",
  "liqPref",
  "participationCap",
  "seniority",
]);

function parseParticipation(v: string): Participation | null {
  return v === "none" || v === "full" || v === "capped" ? v : null;
}

/**
 * Apply a single `<path>=<value>` patch to an Extraction. Supported paths:
 *   "<Round>.<field>"                            — round-level field
 *   "<Round>.investors.<Investor>.amount"        — single investor amount
 */
export function applyFieldPatch(
  extraction: Extraction,
  patch: { field: string; value: string },
): Extraction {
  const parts = patch.field.split(".");

  if (parts.length === 2) {
    const roundName = parts[0]!;
    const key = parts[1]!;
    if (!extraction.rounds.some((r) => r.name === roundName)) {
      throw new Error(`Unknown round: "${roundName}"`);
    }
    const rounds = extraction.rounds.map((r) => {
      if (r.name !== roundName) return r;
      if (NUMERIC_ROUND_FIELDS.has(key)) {
        const num = Number(patch.value);
        if (!Number.isFinite(num)) {
          throw new Error(`Value for ${patch.field} must be a number, got "${patch.value}"`);
        }
        return { ...r, [key]: num };
      }
      if (key === "participation") {
        const p = parseParticipation(patch.value);
        if (!p) {
          throw new Error(
            `participation must be one of none|full|capped, got "${patch.value}"`,
          );
        }
        return { ...r, participation: p };
      }
      if (key === "date") {
        return { ...r, date: patch.value };
      }
      throw new Error(`Unknown round field: "${key}"`);
    });
    return { ...extraction, rounds };
  }

  if (parts.length === 4 && parts[1] === "investors" && parts[3] === "amount") {
    const roundName = parts[0]!;
    const investorName = parts[2]!;
    const match = extraction.investors.find(
      (i) => i.round === roundName && i.name === investorName,
    );
    if (!match) {
      throw new Error(`Unknown investor: "${investorName}" in round "${roundName}"`);
    }
    const num = Number(patch.value);
    if (!Number.isFinite(num)) {
      throw new Error(`amount must be a number, got "${patch.value}"`);
    }
    const investors = extraction.investors.map((i) =>
      i.round === roundName && i.name === investorName ? { ...i, amount: num } : i,
    );
    return { ...extraction, investors };
  }

  throw new Error(`Unsupported field path: "${patch.field}"`);
}
