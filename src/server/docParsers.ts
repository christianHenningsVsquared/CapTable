// Text extraction from contract documents.
//
// Returns plain text that's fed verbatim into the existing LLM extractor.
// We deliberately keep formatting cheap (whitespace, no positional info) —
// the LLM is fine with messy text; the engine only sees the structured JSON.

import { extname } from "node:path";

export interface ParsedDoc {
  /** Plain text contents. */
  text: string;
  /** Normalized MIME used for storage / display. */
  mimeType: string;
}

/**
 * Parse a buffer into plain text by mime/filename. Throws on unknown formats
 * so the server can return a clean 400 to the UI.
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  uploadedMime: string,
): Promise<ParsedDoc> {
  const ext = extname(filename).toLowerCase();

  if (ext === ".txt" || ext === ".md" || uploadedMime.startsWith("text/")) {
    return { text: buffer.toString("utf8"), mimeType: "text/plain" };
  }

  if (ext === ".pdf" || uploadedMime === "application/pdf") {
    return { text: await parsePdf(buffer), mimeType: "application/pdf" };
  }

  if (
    ext === ".docx" ||
    uploadedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return {
      text: await parseDocx(buffer),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  if (
    ext === ".xlsx" ||
    uploadedMime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      text: await parseXlsx(buffer),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  throw new Error(
    `Unsupported file type "${ext || uploadedMime}". Supported: .txt, .md, .pdf, .docx, .xlsx`,
  );
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mod = await import("mammoth");
  const { value } = await mod.extractRawText({ buffer });
  return value;
}

async function parseXlsx(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const parts: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    parts.push(`=== Sheet: ${sheetName} ===`);
    parts.push(XLSX.utils.sheet_to_csv(sheet, { FS: "\t" }));
  }
  return parts.join("\n");
}
