import { APICallError, generateObject, NoSuchModelError, type LanguageModel } from "ai";
import type { Extraction } from "../shared/types.js";
import { loadConfig, type RuntimeConfig } from "../config/index.js";
import { modelsFor } from "./providers.js";
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
 * `RuntimeConfig` (Anthropic, OpenAI, or Langdock).
 *
 * Contract for the LLM (enforced by the system prompt + the structured-output schema):
 *   - Extract ONLY what is literally written. No inference, no math, no derived values.
 *   - Anything not present in the text becomes null. The engine computes shares,
 *     ownership %, and the waterfall from this raw data.
 *
 * See docs/ingestion.md.
 */
export async function extractContract(
  text: string,
  options: ExtractContractOptions = {},
): Promise<Extraction> {
  if (options.__testRawResult !== undefined) {
    return parseExtraction(options.__testRawResult);
  }

  // Explicit `options.model` skips the fallback chain — caller asked for that
  // exact model and we don't want to silently substitute.
  const candidates: LanguageModel[] = options.model
    ? [options.model]
    : modelsFor(options.config ?? loadConfig());

  let lastErr: unknown;
  for (let i = 0; i < candidates.length; i++) {
    try {
      const { object } = await generateObject({
        model: candidates[i]!,
        schema: ExtractionInputSchema,
        schemaName: "Extraction",
        schemaDescription:
          "Cap-table data extracted verbatim from a contract. Missing values are null.",
        system: EXTRACTION_SYSTEM_PROMPT,
        prompt: `<contract>\n${text}\n</contract>`,
        maxOutputTokens: options.maxTokens ?? 8192,
      });
      return parseExtraction(object);
    } catch (err) {
      lastErr = err;
      if (i === candidates.length - 1 || !isModelUnavailable(err)) throw err;
    }
  }
  throw lastErr;
}

// Treat "this model id is not enabled here" as a fallback trigger. Auth errors,
// rate limits, and bad payloads still propagate — retrying with a different
// model wouldn't fix those.
//
// Gateways disagree on the status code for a missing model: OpenAI/Anthropic
// return 404, Langdock returns 400 with "Invalid model" in the body. We sniff
// both the code and the message body to catch both shapes.
function isModelUnavailable(err: unknown): boolean {
  if (NoSuchModelError.isInstance(err)) return true;
  if (APICallError.isInstance(err)) {
    if (err.statusCode === 404) return true;
    if (err.statusCode === 400 && /invalid model|available models are/i.test(err.responseBody ?? "")) {
      return true;
    }
  }
  const msg = err instanceof Error ? err.message : "";
  return /\bnot found\b|does not exist|model_not_found|unknown model|invalid model/i.test(msg);
}
