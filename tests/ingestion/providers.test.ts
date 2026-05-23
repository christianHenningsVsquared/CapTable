import { describe, it, expect } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import {
  DEFAULT_MODELS,
  LANGDOCK_DEFAULT_BASE_URL,
  modelFor,
} from "../../src/ingestion/providers.js";

// `LanguageModel` is `LanguageModelV2 | string` in AI SDK v5; our factory
// always returns the object form (we never hand back a bare string id).
function asModel(m: ReturnType<typeof modelFor>): LanguageModelV2 {
  if (typeof m === "string") throw new Error("expected built model, got string id");
  return m;
}

describe("modelFor", () => {
  it("builds an anthropic model with the default model id", () => {
    const m = asModel(modelFor({ provider: "anthropic", apiKey: "k" }));
    expect(m.modelId).toBe(DEFAULT_MODELS.anthropic);
    expect(m.provider).toMatch(/anthropic/);
  });

  it("builds an openai model with the default model id", () => {
    const m = asModel(modelFor({ provider: "openai", apiKey: "k" }));
    expect(m.modelId).toBe(DEFAULT_MODELS.openai);
    expect(m.provider).toMatch(/openai/);
  });

  it("builds a langdock model via the OpenAI-compatible client", () => {
    // Langdock is fronted by createOpenAI → AI SDK reports the wrapper as an
    // openai provider; what matters is we got a working LanguageModel back.
    const m = asModel(modelFor({ provider: "langdock", apiKey: "k" }));
    expect(m.modelId).toBe(DEFAULT_MODELS.langdock);
    expect(m.provider).toMatch(/openai/);
  });

  it("respects a model override", () => {
    const m = asModel(modelFor({ provider: "langdock", apiKey: "k", model: "gpt-4o-mini" }));
    expect(m.modelId).toBe("gpt-4o-mini");
  });

  it("exports a sane langdock default base URL", () => {
    expect(LANGDOCK_DEFAULT_BASE_URL).toMatch(/^https:\/\/api\.langdock\.com\//);
  });
});
