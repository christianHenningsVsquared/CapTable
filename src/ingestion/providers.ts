// Provider-agnostic LLM factory. The rest of the ingestion code talks to an AI
// SDK `LanguageModel`; this file is the only place that decides which provider
// (Anthropic, OpenAI, or Langdock) backs it.
//
// Langdock is an OpenAI-compatible gateway that fronts multiple model
// families (OpenAI, Anthropic, Google, Mistral). We talk to it through
// `createOpenAI` with the OpenAI-compatible base URL — no extra dep needed.
// Default region is EU; override via `baseURL` in config or
// `LANGDOCK_BASE_URL` / `CAPTABLE_BASE_URL` env vars.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { RuntimeConfig } from "../config/index.js";

export const DEFAULT_MODELS = {
  anthropic: "claude-opus-4-7",
  openai: "gpt-4o",
  langdock: "gpt-4o",
} as const;

export const LANGDOCK_DEFAULT_BASE_URL = "https://api.langdock.com/openai/eu/v1";

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
    case "langdock": {
      const provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? LANGDOCK_DEFAULT_BASE_URL,
      });
      return provider(modelId);
    }
  }
}
