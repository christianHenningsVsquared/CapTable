import { describe, it, expect } from "vitest";
import type { LanguageModelV2 } from "@ai-sdk/provider";
import {
  DEFAULT_MODELS,
  LANGDOCK_DEFAULT_BASE_URL,
  LANGDOCK_FALLBACK_CHAIN,
  modelFor,
  modelsFor,
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

  it("routes a langdock Claude model through the Anthropic-compat endpoint", () => {
    // Langdock has separate compat surfaces for OpenAI and Anthropic models.
    // The default for langdock is a Claude model, so we expect createAnthropic
    // to back it.
    const m = asModel(modelFor({ provider: "langdock", apiKey: "k" }));
    expect(m.modelId).toBe(DEFAULT_MODELS.langdock);
    expect(m.provider).toMatch(/anthropic/);
  });

  it("routes a langdock GPT model through the OpenAI-compat endpoint", () => {
    const m = asModel(modelFor({ provider: "langdock", apiKey: "k", model: "gpt-4o-mini" }));
    expect(m.modelId).toBe("gpt-4o-mini");
    expect(m.provider).toMatch(/openai/);
  });

  it("exports a sane langdock default base URL", () => {
    expect(LANGDOCK_DEFAULT_BASE_URL).toMatch(/^https:\/\/api\.langdock\.com\//);
  });
});

describe("modelsFor", () => {
  it("returns a single model for anthropic", () => {
    const ms = modelsFor({ provider: "anthropic", apiKey: "k" });
    expect(ms).toHaveLength(1);
  });

  it("returns a single model for openai", () => {
    const ms = modelsFor({ provider: "openai", apiKey: "k" });
    expect(ms).toHaveLength(1);
  });

  it("returns the langdock fallback chain with the preferred model first", () => {
    const ms = modelsFor({ provider: "langdock", apiKey: "k" }).map(asModel);
    expect(ms.map((m) => m.modelId)).toEqual([
      DEFAULT_MODELS.langdock,
      ...LANGDOCK_FALLBACK_CHAIN.filter((m) => m !== DEFAULT_MODELS.langdock),
    ]);
  });

  it("flips the langdock chain when the user picks the other model", () => {
    const other = LANGDOCK_FALLBACK_CHAIN.find((m) => m !== DEFAULT_MODELS.langdock)!;
    const ms = modelsFor({ provider: "langdock", apiKey: "k", model: other }).map(asModel);
    expect(ms[0]!.modelId).toBe(other);
    expect(ms[1]!.modelId).toBe(DEFAULT_MODELS.langdock);
  });
});
