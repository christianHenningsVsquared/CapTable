import Anthropic from "@anthropic-ai/sdk";
import type { Extraction } from "../shared/types.js";
import {
  EXTRACTION_JSON_SCHEMA,
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_TOOL_DESCRIPTION,
  EXTRACTION_TOOL_NAME,
  parseExtraction,
} from "./extractionSchema.js";

/**
 * Default extraction model. Per the Anthropic guidance we default to the most
 * capable model; override per call or via the EXTRACTION_MODEL env var.
 */
export const DEFAULT_MODEL = "claude-opus-4-7";

export interface ExtractContractOptions {
  /** Inject a client (used by tests). Defaults to `new Anthropic()` reading ANTHROPIC_API_KEY. */
  client?: Anthropic;
  /** Override the model. Defaults to EXTRACTION_MODEL env var, then DEFAULT_MODEL. */
  model?: string;
  /** Max output tokens for the tool call. Extraction output is small; default is generous. */
  maxTokens?: number;
}

/**
 * Calls Claude once to extract cap-table data from a contract text.
 *
 * Contract for the LLM (enforced by the system prompt + a forced tool call):
 *   - Extract ONLY what is literally written. No inference, no math, no derived values.
 *   - Anything not present in the text becomes null. The engine (Stream B) computes
 *     shares, ownership %, and the waterfall from this raw data.
 *
 * The static system prompt + tool schema are cached (`cache_control: ephemeral`)
 * so repeated extractions only pay full price for the (volatile) contract text.
 *
 * Stream A owns this file. See docs/stream-a-ingestion.md.
 */
export async function extractContract(
  text: string,
  options: ExtractContractOptions = {},
): Promise<Extraction> {
  const client = options.client ?? new Anthropic();
  const model = options.model ?? process.env.EXTRACTION_MODEL ?? DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens ?? 8192,
    // Cached prefix: stable instructions. The volatile contract text goes in
    // `messages` (after the cache breakpoint) so the cache stays warm across calls.
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: EXTRACTION_TOOL_NAME,
        description: EXTRACTION_TOOL_DESCRIPTION,
        input_schema: EXTRACTION_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    // Force the model to answer by filling the tool — guarantees structured output.
    tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
    messages: [{ role: "user", content: `<contract>\n${text}\n</contract>` }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "extractContract: model did not return a tool_use block (stop_reason: " +
        `${response.stop_reason}).`,
    );
  }

  return parseExtraction(toolUse.input);
}
