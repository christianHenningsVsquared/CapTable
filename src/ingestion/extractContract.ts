import type { Extraction } from "../shared/types.js";

/**
 * Calls the Claude API to extract Cap Table data from a contract text.
 *
 * Contract for the LLM:
 *   - Extract ONLY what is literally written in the contract.
 *   - No inference. No math. No derived values (no shares, no ownership %).
 *   - If a value is not present in the text, return null. Do not guess.
 *   - Output must conform exactly to the Extraction type.
 *
 * Implementation notes:
 *   - Use Anthropic tool-use / structured output to force valid JSON.
 *   - Pass the Extraction TS type or an equivalent JSON Schema in the prompt
 *     so the model knows the exact shape it must produce.
 *   - Stream A owns this file. See docs/stream-a-ingestion.md.
 */
export async function extractContract(text: string): Promise<Extraction> {
  throw new Error("Not implemented");
}
