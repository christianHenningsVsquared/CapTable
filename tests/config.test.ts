import { describe, expect, test, beforeEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigError, loadConfig, maskKey, saveConfig } from "../src/config/index.js";

function tmpFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "captable-cfg-"));
  return join(dir, "config.json");
}

describe("loadConfig", () => {
  let configPath: string;
  beforeEach(() => {
    configPath = tmpFile();
  });

  test("overrides win over env and file", () => {
    writeFileSync(
      configPath,
      JSON.stringify({ provider: "openai", apiKey: "file-key" }),
    );
    const cfg = loadConfig({
      configPath,
      env: { CAPTABLE_PROVIDER: "openai", OPENAI_API_KEY: "env-key" },
      overrides: { apiKey: "override-key" },
    });
    expect(cfg.apiKey).toBe("override-key");
  });

  test("env wins over file when both set", () => {
    writeFileSync(
      configPath,
      JSON.stringify({ provider: "anthropic", apiKey: "file-key" }),
    );
    const cfg = loadConfig({
      configPath,
      env: { ANTHROPIC_API_KEY: "env-key" },
    });
    expect(cfg.apiKey).toBe("env-key");
    expect(cfg.provider).toBe("anthropic");
  });

  test("file used when env is empty", () => {
    writeFileSync(
      configPath,
      JSON.stringify({ provider: "openai", apiKey: "file-key", model: "gpt-5" }),
    );
    const cfg = loadConfig({ configPath, env: {} });
    expect(cfg).toEqual({ provider: "openai", apiKey: "file-key", model: "gpt-5" });
  });

  test("infers provider from whichever *_API_KEY is set", () => {
    const anth = loadConfig({
      configPath,
      env: { ANTHROPIC_API_KEY: "k" },
    });
    expect(anth.provider).toBe("anthropic");

    const oai = loadConfig({
      configPath,
      env: { OPENAI_API_KEY: "k" },
    });
    expect(oai.provider).toBe("openai");
  });

  test("throws ConfigError when nothing resolves a key", () => {
    expect(() => loadConfig({ configPath, env: {} })).toThrow(ConfigError);
  });
});

describe("saveConfig + maskKey", () => {
  test("saveConfig writes JSON we can read back", () => {
    const p = tmpFile();
    saveConfig({ provider: "anthropic", apiKey: "sk-abc-12345" }, p);
    const cfg = loadConfig({ configPath: p, env: {} });
    expect(cfg.provider).toBe("anthropic");
    expect(cfg.apiKey).toBe("sk-abc-12345");
    rmSync(p, { force: true });
  });

  test("maskKey shows prefix/suffix only", () => {
    expect(maskKey("sk-ant-abcdefghijklmno")).toMatch(/^sk-an…/);
    expect(maskKey("short")).toBe("•".repeat(5));
    expect(maskKey("")).toBe("");
  });
});
