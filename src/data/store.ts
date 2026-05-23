import type { Extraction, WaterfallResult } from "../shared/types.js";
import { extractContract } from "../ingestion/extractContract.js";
import { openDb, type DB } from "./db.js";

export type Extractor = (text: string) => Promise<Extraction>;

export interface Fund {
  id: number;
  name: string;
  created_at: string;
}

export interface Company {
  id: number;
  fund_id: number;
  name: string;
  created_at: string;
}

export interface DocumentRow {
  id: number;
  company_id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  has_extraction: boolean;
}

export interface DocumentWithExtraction extends DocumentRow {
  content_text: string;
  extraction: Extraction | null;
}

export interface CLIIngestResult {
  companyId: number;
  extractionId: number;
}

export class Store {
  constructor(
    private readonly db: DB,
    private readonly extractor: Extractor = extractContract,
  ) {}

  // ─── Funds ────────────────────────────────────────────────────────────────

  listFunds(): Fund[] {
    return this.db
      .prepare("SELECT id, name, created_at FROM funds ORDER BY id ASC")
      .all() as Fund[];
  }

  createFund(name: string): Fund {
    const now = new Date().toISOString();
    const id = Number(
      this.db.prepare("INSERT INTO funds (name, created_at) VALUES (?, ?)")
        .run(name, now).lastInsertRowid,
    );
    return { id, name, created_at: now };
  }

  deleteFund(id: number): void {
    this.db.prepare("DELETE FROM funds WHERE id = ?").run(id);
  }

  // ─── Companies ────────────────────────────────────────────────────────────

  listCompanies(fundId: number): Company[] {
    return this.db
      .prepare("SELECT id, fund_id, name, created_at FROM companies WHERE fund_id = ? ORDER BY id ASC")
      .all(fundId) as Company[];
  }

  getCompany(id: number): Company | null {
    const row = this.db
      .prepare("SELECT id, fund_id, name, created_at FROM companies WHERE id = ?")
      .get(id) as Company | undefined;
    return row ?? null;
  }

  createCompany(fundId: number, name: string): Company {
    const now = new Date().toISOString();
    const id = Number(
      this.db
        .prepare("INSERT INTO companies (fund_id, name, created_at) VALUES (?, ?, ?)")
        .run(fundId, name, now).lastInsertRowid,
    );
    return { id, fund_id: fundId, name, created_at: now };
  }

  deleteCompany(id: number): void {
    this.db.prepare("DELETE FROM companies WHERE id = ?").run(id);
  }

  // ─── Documents ────────────────────────────────────────────────────────────

  addDocument(
    companyId: number,
    filename: string,
    mimeType: string,
    contentText: string,
    sizeBytes: number,
  ): DocumentRow {
    const now = new Date().toISOString();
    const id = Number(
      this.db
        .prepare(
          `INSERT INTO documents (company_id, filename, mime_type, size_bytes, content_text, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(companyId, filename, mimeType, sizeBytes, contentText, now)
        .lastInsertRowid,
    );
    return {
      id,
      company_id: companyId,
      filename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      created_at: now,
      has_extraction: false,
    };
  }

  listDocuments(companyId: number): DocumentRow[] {
    return this.db
      .prepare(
        `SELECT d.id, d.company_id, d.filename, d.mime_type, d.size_bytes, d.created_at,
                (SELECT 1 FROM extractions e WHERE e.document_id = d.id LIMIT 1) IS NOT NULL AS has_extraction
         FROM documents d
         WHERE d.company_id = ?
         ORDER BY d.id ASC`,
      )
      .all(companyId)
      .map((r): DocumentRow => {
        const row = r as DocumentRow & { has_extraction: number | boolean };
        return { ...row, has_extraction: Boolean(row.has_extraction) };
      });
  }

  getDocument(id: number): DocumentWithExtraction | null {
    const row = this.db
      .prepare(
        `SELECT id, company_id, filename, mime_type, size_bytes, content_text, created_at
         FROM documents WHERE id = ?`,
      )
      .get(id) as
      | Omit<DocumentWithExtraction, "extraction" | "has_extraction">
      | undefined;
    if (!row) return null;

    const ext = this.db
      .prepare("SELECT raw_json FROM extractions WHERE document_id = ? ORDER BY id DESC LIMIT 1")
      .get(id) as { raw_json: string } | undefined;

    return {
      ...row,
      extraction: ext ? (JSON.parse(ext.raw_json) as Extraction) : null,
      has_extraction: Boolean(ext),
    };
  }

  deleteDocument(id: number): void {
    this.db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  }

  // ─── Extractions ──────────────────────────────────────────────────────────

  async extractDocument(documentId: number): Promise<{ extraction: Extraction; extractionId: number }> {
    const doc = this.getDocument(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found`);
    const extraction = await this.extractor(doc.content_text);
    const extractionId = this.persistExtraction(doc.company_id, documentId, extraction);
    if (!this.getMerged(doc.company_id)) {
      this.saveMerged(doc.company_id, extraction);
    }
    return { extraction, extractionId };
  }

  persistExtraction(companyId: number, documentId: number | null, extraction: Extraction): number {
    const now = new Date().toISOString();
    return Number(
      this.db
        .prepare(
          `INSERT INTO extractions (company_id, document_id, raw_json, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(companyId, documentId, JSON.stringify(extraction), now).lastInsertRowid,
    );
  }

  /** All per-document extractions for a company, used by the merge UI. */
  listExtractions(companyId: number): Array<{
    id: number;
    document_id: number | null;
    extraction: Extraction;
    created_at: string;
  }> {
    const rows = this.db
      .prepare(
        `SELECT id, document_id, raw_json, created_at
         FROM extractions WHERE company_id = ? ORDER BY id ASC`,
      )
      .all(companyId) as Array<{
        id: number;
        document_id: number | null;
        raw_json: string;
        created_at: string;
      }>;
    return rows.map((r) => ({
      id: r.id,
      document_id: r.document_id,
      extraction: JSON.parse(r.raw_json) as Extraction,
      created_at: r.created_at,
    }));
  }

  // ─── Merged extraction (the curated view that feeds the engine) ───────────

  getMerged(companyId: number): Extraction | null {
    const row = this.db
      .prepare("SELECT raw_json FROM merged_extractions WHERE company_id = ?")
      .get(companyId) as { raw_json: string } | undefined;
    return row ? (JSON.parse(row.raw_json) as Extraction) : null;
  }

  saveMerged(companyId: number, extraction: Extraction): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO merged_extractions (company_id, raw_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(company_id) DO UPDATE SET raw_json = excluded.raw_json, updated_at = excluded.updated_at`,
      )
      .run(companyId, JSON.stringify(extraction), now);
  }

  // ─── Waterfall ────────────────────────────────────────────────────────────

  async saveWaterfall(companyId: number, run: WaterfallResult): Promise<number> {
    const now = new Date().toISOString();
    return Number(
      this.db
        .prepare(
          `INSERT INTO waterfall_runs (company_id, exit_value, result_json, created_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(companyId, run.exitValue, JSON.stringify(run), now).lastInsertRowid,
    );
  }

  async getWaterfall(companyId: number, exitValue: number): Promise<WaterfallResult | null> {
    const row = this.db
      .prepare(
        `SELECT result_json FROM waterfall_runs
         WHERE company_id = ? AND exit_value = ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(companyId, exitValue) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as WaterfallResult) : null;
  }

  // ─── CLI compatibility ────────────────────────────────────────────────────
  // The headless CLI predates the funds/companies/documents model. These thin
  // wrappers preserve its `ingest(text) → {companyId, extractionId}` contract
  // by auto-creating a default "CLI" fund + one company-per-ingest.

  async ingest(text: string): Promise<CLIIngestResult> {
    const fund = this.ensureCliFund();
    const company = this.createCompany(fund.id, deriveCompanyName(text));
    const doc = this.addDocument(
      company.id,
      "contract.txt",
      "text/plain",
      text,
      Buffer.byteLength(text, "utf8"),
    );
    const { extractionId } = await this.extractDocument(doc.id);
    return { companyId: company.id, extractionId };
  }

  async getExtraction(companyId: number): Promise<Extraction> {
    const merged = this.getMerged(companyId);
    if (!merged) throw new Error(`No extraction found for company ${companyId}`);
    return merged;
  }

  async patchExtraction(companyId: number, patch: Partial<Extraction> | Extraction): Promise<void> {
    const current = this.getMerged(companyId);
    if (!current) throw new Error(`No extraction found for company ${companyId}`);
    const merged: Extraction = {
      company: { ...current.company, ...(patch.company ?? {}) },
      rounds: patch.rounds ?? current.rounds,
      investors: patch.investors ?? current.investors,
    };
    this.saveMerged(companyId, merged);
  }

  private ensureCliFund(): Fund {
    const existing = this.listFunds().find((f) => f.name === "CLI");
    return existing ?? this.createFund("CLI");
  }
}

function deriveCompanyName(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "Contract";
  return firstLine.trim().slice(0, 60);
}

export function createStore(dbPath?: string, extractor?: Extractor): Store {
  return new Store(openDb(dbPath), extractor);
}
