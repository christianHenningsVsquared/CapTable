import type { Extraction, WaterfallResult } from "../shared/types.js";
import { extractContract } from "../ingestion/extractContract.js";
import { openDb, type DB } from "./db.js";

/** A function that turns contract text into an `Extraction` (the LLM call, or a fake in tests). */
export type Extractor = (text: string) => Promise<Extraction>;

/**
 * The thin data API the rest of the app (Stream C) calls. Wraps the three
 * SQLite tables. SQLite access is synchronous (better-sqlite3) but the public
 * methods are async to match the contract Stream C expects.
 */
export class Store {
  constructor(
    private readonly db: DB,
    private readonly extractor: Extractor = extractContract,
  ) {}

  /** Extract a contract via the LLM and persist it. Returns the new ids. */
  async ingest(text: string): Promise<{ companyId: number; extractionId: number }> {
    const extraction = await this.extractor(text);
    return this.persist(extraction);
  }

  /**
   * Persist a ready-made `Extraction` (used by `ingest`, and directly by tests
   * and seeding). One company + one extraction per call — MVP keeps a single
   * extraction per company.
   */
  persist(extraction: Extraction): { companyId: number; extractionId: number } {
    const now = new Date().toISOString();
    const companyId = Number(
      this.db.prepare("INSERT INTO companies (name) VALUES (?)").run(extraction.company.name)
        .lastInsertRowid,
    );
    const extractionId = Number(
      this.db
        .prepare("INSERT INTO extractions (company_id, raw_json, created_at) VALUES (?, ?, ?)")
        .run(companyId, JSON.stringify(extraction), now).lastInsertRowid,
    );
    return { companyId, extractionId };
  }

  /** Read the latest extraction for a company. Throws if there is none. */
  async getExtraction(companyId: number): Promise<Extraction> {
    const row = this.db
      .prepare("SELECT raw_json FROM extractions WHERE company_id = ? ORDER BY id DESC LIMIT 1")
      .get(companyId) as { raw_json: string } | undefined;
    if (!row) throw new Error(`No extraction found for company ${companyId}`);
    return JSON.parse(row.raw_json) as Extraction;
  }

  /**
   * Merge a patch into the stored extraction and write it back — no re-LLM call.
   * This is how the UI fixes the fields the engine reported as missing.
   * `company` is shallow-merged; `rounds`/`investors` are replaced wholesale when
   * present (the UI sends the full corrected array).
   */
  async patchExtraction(companyId: number, patch: Partial<Extraction>): Promise<void> {
    const row = this.db
      .prepare("SELECT id, raw_json FROM extractions WHERE company_id = ? ORDER BY id DESC LIMIT 1")
      .get(companyId) as { id: number; raw_json: string } | undefined;
    if (!row) throw new Error(`No extraction found for company ${companyId}`);

    const current = JSON.parse(row.raw_json) as Extraction;
    const merged: Extraction = {
      company: { ...current.company, ...(patch.company ?? {}) },
      rounds: patch.rounds ?? current.rounds,
      investors: patch.investors ?? current.investors,
    };
    this.db
      .prepare("UPDATE extractions SET raw_json = ? WHERE id = ?")
      .run(JSON.stringify(merged), row.id);
  }

  /** Persist a computed waterfall run. Returns its id. */
  async saveWaterfall(companyId: number, run: WaterfallResult): Promise<number> {
    const now = new Date().toISOString();
    return Number(
      this.db
        .prepare(
          "INSERT INTO waterfall_runs (company_id, exit_value, result_json, created_at) VALUES (?, ?, ?, ?)",
        )
        .run(companyId, run.exitValue, JSON.stringify(run), now).lastInsertRowid,
    );
  }

  /** Most recent waterfall run for a company at a given exit value, or null. */
  async getWaterfall(companyId: number, exitValue: number): Promise<WaterfallResult | null> {
    const row = this.db
      .prepare(
        "SELECT result_json FROM waterfall_runs WHERE company_id = ? AND exit_value = ? ORDER BY id DESC LIMIT 1",
      )
      .get(companyId, exitValue) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as WaterfallResult) : null;
  }
}

/** Convenience factory: open a DB (in-memory by default) and wrap it in a Store. */
export function createStore(dbPath?: string, extractor?: Extractor): Store {
  return new Store(openDb(dbPath), extractor);
}
