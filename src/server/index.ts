// Local-only HTTP API that wraps the existing Store + ingestion + engine.
//
// Security posture (local desktop tool):
//   - Binds 127.0.0.1 only — never reachable from another machine.
//   - The API key lives in ~/.captable/config.json (mode 0600).
//   - The /api/config endpoint NEVER returns the key — only `{ hasKey, provider }`.
//   - Uploaded file buffers are kept in memory (multer memoryStorage); only the
//     extracted text gets persisted.

import { createServer } from "node:http";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import multer from "multer";

import { buildCapTable, runWaterfall } from "../engine/index.js";
import { extractContract } from "../ingestion/extractContract.js";
import {
  defaultConfigPath,
  defaultDbPath,
  loadConfig,
  saveConfig,
  maskKey,
  PROVIDERS,
  type Provider,
  type RuntimeConfig,
} from "../config/index.js";
import { createStore, type Store } from "../data/index.js";
import type { Extraction } from "../shared/types.js";
import { parseDocument } from "./docParsers.js";

const PORT = Number(process.env.CAPTABLE_PORT ?? 3001);
const HOST = "127.0.0.1";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per file
});

export function createApp(store: Store): express.Express {
  const app = express();
  app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
  app.use(express.json({ limit: "5mb" }));

  // ─── Config ──────────────────────────────────────────────────────────────
  // GET returns only whether a key is configured + which provider — never the
  // key itself. POST writes ~/.captable/config.json (0600). DELETE wipes it.

  app.get("/api/config", (_req, res) => {
    try {
      const cfg = loadConfig();
      res.json({
        hasKey: Boolean(cfg.apiKey),
        provider: cfg.provider,
        maskedKey: maskKey(cfg.apiKey),
        model: cfg.model ?? null,
        baseURL: cfg.baseURL ?? null,
      });
    } catch {
      res.json({ hasKey: false, provider: null, maskedKey: "", model: null, baseURL: null });
    }
  });

  app.post("/api/config", (req, res) => {
    const { provider, apiKey, model, baseURL } = req.body as {
      provider?: Provider;
      apiKey?: string;
      model?: string;
      baseURL?: string;
    };
    if (!provider || !PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `provider must be one of: ${PROVIDERS.join(", ")}` });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 8) {
      return res.status(400).json({ error: "apiKey is required" });
    }
    const trimmedBaseURL = typeof baseURL === "string" ? baseURL.trim() : "";
    saveConfig({
      provider,
      apiKey: apiKey.trim(),
      ...(model ? { model } : {}),
      ...(trimmedBaseURL ? { baseURL: trimmedBaseURL } : {}),
    });
    res.json({ ok: true, provider, maskedKey: maskKey(apiKey.trim()) });
  });

  app.delete("/api/config", (_req, res) => {
    saveConfig({});
    res.json({ ok: true });
  });

  // ─── Funds ───────────────────────────────────────────────────────────────

  app.get("/api/funds", (_req, res) => {
    res.json(store.listFunds());
  });

  app.post("/api/funds", (req, res) => {
    const name = (req.body?.name ?? "").toString().trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    res.json(store.createFund(name));
  });

  app.delete("/api/funds/:id", (req, res) => {
    store.deleteFund(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Companies ───────────────────────────────────────────────────────────

  app.get("/api/funds/:fundId/companies", (req, res) => {
    res.json(store.listCompanies(Number(req.params.fundId)));
  });

  app.post("/api/funds/:fundId/companies", (req, res) => {
    const name = (req.body?.name ?? "").toString().trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    res.json(store.createCompany(Number(req.params.fundId), name));
  });

  app.get("/api/companies/:id", (req, res) => {
    const id = Number(req.params.id);
    const company = store.getCompany(id);
    if (!company) return res.status(404).json({ error: "company not found" });
    const documents = store.listDocuments(id);
    const merged = store.getMerged(id);
    const captable = merged ? buildCapTable(merged) : null;
    res.json({ company, documents, merged, captable });
  });

  app.delete("/api/companies/:id", (req, res) => {
    store.deleteCompany(Number(req.params.id));
    res.json({ ok: true });
  });

  // ─── Documents ───────────────────────────────────────────────────────────

  app.post(
    "/api/companies/:id/documents",
    upload.array("files", 20),
    async (req, res, next) => {
      try {
        const companyId = Number(req.params.id);
        if (!store.getCompany(companyId)) {
          return res.status(404).json({ error: "company not found" });
        }
        const files = (req.files ?? []) as Express.Multer.File[];
        if (files.length === 0) {
          return res.status(400).json({ error: "no files uploaded" });
        }
        const created = [];
        for (const file of files) {
          const parsed = await parseDocument(file.buffer, file.originalname, file.mimetype);
          const doc = store.addDocument(
            companyId,
            file.originalname,
            parsed.mimeType,
            parsed.text,
            file.size,
          );
          created.push(doc);
        }
        res.json({ documents: created });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get("/api/documents/:id", (req, res) => {
    const doc = store.getDocument(Number(req.params.id));
    if (!doc) return res.status(404).json({ error: "document not found" });
    res.json(doc);
  });

  app.delete("/api/documents/:id", (req, res) => {
    store.deleteDocument(Number(req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/documents/:id/extract", async (req, res, next) => {
    try {
      const cfg = safeLoadConfig();
      if (!cfg) {
        return res.status(412).json({ error: "no API key configured" });
      }
      const { extraction } = await store.extractDocument(Number(req.params.id));
      res.json({ extraction });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/companies/:id/extractions", (req, res) => {
    const companyId = Number(req.params.id);
    res.json(store.listExtractions(companyId));
  });

  // ─── Merged extraction ───────────────────────────────────────────────────

  app.put("/api/companies/:id/merged", (req, res) => {
    const companyId = Number(req.params.id);
    const extraction = req.body?.extraction as Extraction | undefined;
    if (!extraction || typeof extraction !== "object") {
      return res.status(400).json({ error: "extraction is required" });
    }
    store.saveMerged(companyId, extraction);
    const captable = buildCapTable(extraction);
    res.json({ merged: extraction, captable });
  });

  // ─── Waterfall ───────────────────────────────────────────────────────────

  app.post("/api/companies/:id/waterfall", async (req, res) => {
    const companyId = Number(req.params.id);
    const exitValue = Number(req.body?.exitValue);
    if (!Number.isFinite(exitValue) || exitValue < 0) {
      return res.status(400).json({ error: "exitValue must be a non-negative number" });
    }
    const merged = store.getMerged(companyId);
    if (!merged) return res.status(404).json({ error: "no merged extraction yet" });
    const capTable = buildCapTable(merged);
    if ("error" in capTable) return res.json({ capTable });
    const waterfall = runWaterfall(capTable, exitValue);
    if (req.body?.save) await store.saveWaterfall(companyId, waterfall);
    res.json({ capTable, waterfall });
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // ─── Error handler ───────────────────────────────────────────────────────

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server]", err);
    res.status(500).json({ error: err.message ?? "internal error" });
  });

  return app;
}

function safeLoadConfig(): RuntimeConfig | null {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}

async function main() {
  const store = createStore(defaultDbPath(), async (text) => {
    // Use the user-configured provider/key at extraction time. Loading here
    // (not at server start) lets the user paste a key after the server is up.
    const cfg = loadConfig();
    return extractContract(text, { config: cfg });
  });

  const app = createApp(store);
  const server = createServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`[captable] API on http://${HOST}:${PORT}`);
    console.log(`[captable] config: ${defaultConfigPath()}`);
    console.log(`[captable] db:     ${defaultDbPath()}`);
  });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
