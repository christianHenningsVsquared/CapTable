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
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o-mini",
  langdock: "claude-sonnet-4-6-default",
} as const;

// Langdock model IDs use a workspace-specific `-default` suffix. The two below
// are what a probe of the EU workspace returns; if your workspace exposes a
// different set, query `GET /anthropic/eu/v1/models` (or `/openai/.../models`)
// and swap accordingly. "Bidirectional" fallback: whichever model the user
// picks, the *other* is the fallback.
export const LANGDOCK_FALLBACK_CHAIN = [
  "claude-sonnet-4-6-default",
  "gpt-5.5-default",
] as const;

// Backwards-compatible export (existing UI / tests reference this). Langdock
// actually has two compat endpoints (OpenAI + Anthropic); see buildLangdockModel.
export const LANGDOCK_DEFAULT_BASE_URL = "https://api.langdock.com/openai/eu/v1";
export const LANGDOCK_ANTHROPIC_DEFAULT_BASE_URL = "https://api.langdock.com/anthropic/eu/v1";

function isClaudeModelId(id: string): boolean {
  return id.toLowerCase().startsWith("claude");
}

/**
 * Derive the Anthropic-compat base URL from a user-supplied OpenAI-compat one
 * by swapping the path segment. Lets a single "baseURL" setting (e.g. US region)
 * apply to both families. Falls back to the EU default if no swap is possible.
 */
function deriveAnthropicBase(openaiBase: string | undefined): string {
  if (!openaiBase) return LANGDOCK_ANTHROPIC_DEFAULT_BASE_URL;
  if (openaiBase.includes("/openai/")) return openaiBase.replace("/openai/", "/anthropic/");
  return openaiBase;
}

function buildLangdockModel(config: RuntimeConfig, modelId: string): LanguageModel {
  // Langdock exposes two OpenAI/Anthropic-compat surfaces under different paths:
  //   /openai/{region}/v1/chat/completions   — GPT family
  //   /anthropic/{region}/v1/messages        — Claude family
  // Route to the right one based on the model id. Without this, Claude models
  // 404 against the OpenAI path even when they're enabled on the workspace.
  if (isClaudeModelId(modelId)) {
    return createAnthropic({
      apiKey: config.apiKey,
      baseURL: deriveAnthropicBase(config.baseURL),
    })(modelId);
  }
  // The AI SDK's default `provider(id)` call now targets `/v1/responses`, which
  // Langdock doesn't implement. `.chat()` pins it to `/v1/chat/completions`.
  return createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL ?? LANGDOCK_DEFAULT_BASE_URL,
  }).chat(modelId);
}

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
    case "langdock":
      return buildLangdockModel(config, modelId);
  }
}

/**
 * Ordered list of models to try. For Langdock, returns the user's chosen model
 * (or default) first, then any remaining entries in LANGDOCK_FALLBACK_CHAIN as
 * fallbacks. For Anthropic/OpenAI, returns a single model — the native providers
 * fail loudly enough that retrying with a different model id wouldn't help.
 */
export function modelsFor(config: RuntimeConfig): LanguageModel[] {
  if (config.provider !== "langdock") return [modelFor(config)];
  const preferred = config.model ?? DEFAULT_MODELS.langdock;
  const fallbacks = LANGDOCK_FALLBACK_CHAIN.filter((m) => m !== preferred);
  return [
    buildLangdockModel(config, preferred),
    ...fallbacks.map((m) => buildLangdockModel(config, m)),
  ];
}
