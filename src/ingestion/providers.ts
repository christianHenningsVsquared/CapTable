// Provider-agnostic LLM factory. The rest of Stream A talks to an AI SDK
// `LanguageModel`; this file is the only place that decides which provider
// (Anthropic vs. OpenAI) backs it.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { RuntimeConfig } from "../config/index.js";

export const DEFAULT_MODELS = {
  anthropic: "claude-opus-4-7",
  openai: "gpt-4o",
} as const;

export function modelFor(config: RuntimeConfig): LanguageModel {
  const modelId = config.model ?? DEFAULT_MODELS[config.provider];
  switch (config.provider) {
    case "anthropic": {
      const provider = createAnthropic({ apiKey: config.apiKey });
      return provider(modelId);
    }
    case "openai": {
      const provider = createOpenAI({ apiKey: config.apiKey });
      return provider(modelId);
    }
  }
}
