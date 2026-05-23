// Runtime configuration resolution + persistence.
//
// Resolution order (first hit wins, key-by-key):
//   1. Explicit overrides passed to `loadConfig`
//   2. Environment variables (CAPTABLE_*, ANTHROPIC_API_KEY, OPENAI_API_KEY)
//   3. ~/.captable/config.json
//
// The config file is the user-pasted state; CLI flags should be passed
// into `loadConfig` as overrides so a flag still wins per command.

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Provider = "anthropic" | "openai";

export interface RuntimeConfig {
  provider: Provider;
  apiKey: string;
  /** Optional model override; undefined → provider default. */
  model?: string;
}

export type PartialConfig = Partial<RuntimeConfig>;

export interface LoadConfigOptions {
  /** Explicit overrides (e.g. parsed CLI flags). */
  overrides?: PartialConfig;
  /** Custom config-file path (tests / non-default deployments). */
  configPath?: string;
  /** Custom env source (tests). */
  env?: NodeJS.ProcessEnv;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function defaultConfigDir(): string {
  return join(homedir(), ".captable");
}

export function defaultConfigPath(): string {
  return join(defaultConfigDir(), "config.json");
}

export function defaultDbPath(): string {
  return join(defaultConfigDir(), "captable.db");
}

function readConfigFile(path: string): PartialConfig {
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as PartialConfig;
    return raw && typeof raw === "object" ? raw : {};
  } catch (err) {
    throw new ConfigError(`Failed to parse ${path}: ${(err as Error).message}`);
  }
}

function fromEnv(env: NodeJS.ProcessEnv): PartialConfig {
  const provider = env.CAPTABLE_PROVIDER as Provider | undefined;
  // Pick a key matching the chosen provider; if no provider set, take whichever
  // exists (Anthropic wins when both are present, since that was Stream A's
  // historical default).
  const anthropicKey = env.ANTHROPIC_API_KEY?.trim() || undefined;
  const openaiKey = env.OPENAI_API_KEY?.trim() || undefined;
  let apiKey: string | undefined;
  let inferredProvider: Provider | undefined = provider;
  if (provider === "anthropic") apiKey = anthropicKey;
  else if (provider === "openai") apiKey = openaiKey;
  else if (anthropicKey) {
    apiKey = anthropicKey;
    inferredProvider = "anthropic";
  } else if (openaiKey) {
    apiKey = openaiKey;
    inferredProvider = "openai";
  }
  return {
    ...(inferredProvider ? { provider: inferredProvider } : {}),
    ...(apiKey ? { apiKey } : {}),
    ...(env.CAPTABLE_MODEL ? { model: env.CAPTABLE_MODEL } : {}),
  };
}

/**
 * Resolve a complete `RuntimeConfig`. Throws `ConfigError` if any required
 * field (provider or apiKey) is still missing after all sources.
 */
export function loadConfig(opts: LoadConfigOptions = {}): RuntimeConfig {
  const env = opts.env ?? process.env;
  const path = opts.configPath ?? defaultConfigPath();
  const file = readConfigFile(path);
  const envCfg = fromEnv(env);
  const merged: PartialConfig = {
    ...file,
    ...envCfg,
    ...(opts.overrides ?? {}),
  };
  if (!merged.provider) {
    throw new ConfigError(
      "No provider configured. Run `captable config set --provider anthropic|openai --api-key <key>` " +
        "or set CAPTABLE_PROVIDER and the matching *_API_KEY env var.",
    );
  }
  if (!merged.apiKey) {
    throw new ConfigError(
      `No API key configured for provider "${merged.provider}". ` +
        "Run `captable config set --api-key <key>` or set the matching *_API_KEY env var.",
    );
  }
  return {
    provider: merged.provider,
    apiKey: merged.apiKey,
    ...(merged.model ? { model: merged.model } : {}),
  };
}

/**
 * Persist a config file (creating parent dir if needed). Always writes the
 * file with mode 0600 to keep the key off other users on the same machine.
 */
export function saveConfig(config: PartialConfig, path: string = defaultConfigPath()): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  // Strip undefined keys so the file is tidy.
  const clean: PartialConfig = {};
  if (config.provider) clean.provider = config.provider;
  if (config.apiKey) clean.apiKey = config.apiKey;
  if (config.model) clean.model = config.model;
  writeFileSync(path, JSON.stringify(clean, null, 2) + "\n", { mode: 0o600 });
  // writeFileSync's mode is only applied on create; chmod to be safe on overwrite.
  try {
    chmodSync(path, 0o600);
  } catch {
    // Best-effort on platforms that don't honor POSIX perms (e.g. Windows).
  }
}

/** Mask an API key for safe display (e.g. `sk-ant…abc1`). */
export function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 5)}…${key.slice(-4)}`;
}
