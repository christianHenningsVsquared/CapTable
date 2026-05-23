// Tiny fetch wrapper for our local Express backend.

import type {
  CapTable,
  EngineError,
  Extraction,
  WaterfallResult,
} from "@shared/types";

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

export interface ExtractionRow {
  id: number;
  document_id: number | null;
  extraction: Extraction;
  created_at: string;
}

export interface CompanyDetail {
  company: Company;
  documents: DocumentRow[];
  merged: Extraction | null;
  captable: CapTable | EngineError | null;
}

export type Provider = "anthropic" | "openai" | "langdock";

export interface ConfigStatus {
  hasKey: boolean;
  provider: Provider | null;
  maskedKey: string;
  model: string | null;
  baseURL: string | null;
}

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // Config
  getConfig: () => request<ConfigStatus>("/config"),
  saveConfig: (
    provider: Provider,
    apiKey: string,
    opts: { model?: string; baseURL?: string } = {},
  ) =>
    request<{ ok: true; provider: string; maskedKey: string }>("/config", {
      method: "POST",
      body: JSON.stringify({
        provider,
        apiKey,
        ...(opts.model ? { model: opts.model } : {}),
        ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
      }),
    }),
  clearConfig: () => request<{ ok: true }>("/config", { method: "DELETE" }),

  // Funds
  listFunds: () => request<Fund[]>("/funds"),
  createFund: (name: string) =>
    request<Fund>("/funds", { method: "POST", body: JSON.stringify({ name }) }),
  deleteFund: (id: number) =>
    request<{ ok: true }>(`/funds/${id}`, { method: "DELETE" }),

  // Companies
  listCompanies: (fundId: number) =>
    request<Company[]>(`/funds/${fundId}/companies`),
  createCompany: (fundId: number, name: string) =>
    request<Company>(`/funds/${fundId}/companies`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getCompany: (id: number) => request<CompanyDetail>(`/companies/${id}`),
  deleteCompany: (id: number) =>
    request<{ ok: true }>(`/companies/${id}`, { method: "DELETE" }),

  // Documents
  uploadDocuments: async (companyId: number, files: File[]) => {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    const res = await fetch(`${BASE}/companies/${companyId}/documents`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<{ documents: DocumentRow[] }>;
  },
  deleteDocument: (id: number) =>
    request<{ ok: true }>(`/documents/${id}`, { method: "DELETE" }),
  extractDocument: (id: number) =>
    request<{ extraction: Extraction }>(`/documents/${id}/extract`, { method: "POST" }),

  listExtractions: (companyId: number) =>
    request<ExtractionRow[]>(`/companies/${companyId}/extractions`),

  // Merged
  saveMerged: (companyId: number, extraction: Extraction) =>
    request<{ merged: Extraction; captable: CapTable | EngineError }>(
      `/companies/${companyId}/merged`,
      { method: "PUT", body: JSON.stringify({ extraction }) },
    ),

  // Waterfall
  runWaterfall: (companyId: number, exitValue: number, save = false) =>
    request<{ capTable: CapTable | EngineError; waterfall?: WaterfallResult }>(
      `/companies/${companyId}/waterfall`,
      { method: "POST", body: JSON.stringify({ exitValue, save }) },
    ),
};
