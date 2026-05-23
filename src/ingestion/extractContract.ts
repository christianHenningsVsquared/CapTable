import { generateObject, type LanguageModel } from "ai";
import type { Extraction } from "../shared/types.js";
import { loadConfig, type RuntimeConfig } from "../config/index.js";
import { modelFor } from "./providers.js";
import {
  EXTRACTION_SYSTEM_PROMPT,
  ExtractionInputSchema,
  parseExtraction,
} from "./extractionSchema.js";

export interface ExtractContractOptions {
  /** Resolved runtime config. If absent, loaded via `loadConfig()`. */
  config?: RuntimeConfig;
  /** Pre-built AI SDK model — wins over `config`. */
  model?: LanguageModel;
  /** Max output tokens (extraction output is small; default is generous). */
  maxTokens?: number;
  /**
   * Test seam: when set, skip the AI SDK call and feed this object through
   * the normalizer. Used by unit tests; not part of the public surface.
   * @internal
   */
  __testRawResult?: unknown;
}

/**
 * Single LLM call that extracts cap-table data from a contract text using the
 * Vercel AI SDK's `generateObject`. The provider is chosen via the resolved
 * `RuntimeConfig` (Anthropic or OpenAI today).
 *
 * Contract for the LLM (enforced by the system prompt + the structured-output schema):
 *   - Extract ONLY what is literally written. No inference, no math, no derived values.
 *   - Anything not present in the text becomes null. The engine (Stream B) computes
 *     shares, ownership %, and the waterfall from this raw data.
 *
 * Stream A owns this file. See docs/stream-a-ingestion.md.
 */
export async function extractContract(
  text: string,
  options: ExtractContractOptions = {},
): Promise<Extraction> {
  if (options.__testRawResult !== undefined) {
    return parseExtraction(options.__testRawResult);
  }

  const model = options.model ?? modelFor(options.config ?? loadConfig());

  const { object } = await generateObject({
    model,
    schema: ExtractionInputSchema,
    schemaName: "Extraction",
    schemaDescription:
      "Cap-table data extracted verbatim from a contract. Missing values are null.",
    system: EXTRACTION_SYSTEM_PROMPT,
    prompt: `<contract>\n${text}\n</contract>`,
    maxOutputTokens: options.maxTokens ?? 8192,
  });

  return parseExtraction(object);
}
