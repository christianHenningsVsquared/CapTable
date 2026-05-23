#!/usr/bin/env node
// Headless CLI for Streams A + B. UI (Stream C) optional.
//
// Subcommands:
//   captable config set --provider <p> --api-key <k> [--model <m>]
//   captable config show
//   captable ingest <path-to-contract>
//   captable captable <companyId>
//   captable patch <companyId> --field <Round.field> --value <v> [--field … --value … …]
//   captable waterfall <companyId> --exit <amount> [--save]
//   captable run <path-to-contract> [--exit <amount>]
//
// Global flags:
//   --db <path>           override DB path (default ~/.captable/captable.db)
//   --provider, --api-key, --model   per-command provider override
//   --json                machine-readable output

import { readFileSync } from "node:fs";
import { Command, Option } from "commander";

import {
  ConfigError,
  defaultConfigPath,
  defaultDbPath,
  loadConfig,
  maskKey,
  saveConfig,
  type PartialConfig,
  type Provider,
  type RuntimeConfig,
} from "../config/index.js";
import { createStore, type Store } from "../data/index.js";
import { extractContract } from "../ingestion/extractContract.js";
import { modelFor } from "../ingestion/providers.js";
import {
  capTableHandler,
  ingestHandler,
  patchHandler,
  runHandler,
  totalInvested,
  waterfallHandler,
} from "./handlers.js";
import { formatCapTable, formatWaterfall, money } from "./format.js";

interface GlobalFlags {
  db?: string;
  json?: boolean;
}

interface ProviderFlags {
  provider?: Provider;
  apiKey?: string;
  model?: string;
}

function getGlobals(cmd: Command): GlobalFlags {
  // Walk up to the root program so subcommands inherit --db, --json.
  let root: Command = cmd;
  while (root.parent) root = root.parent;
  return root.opts<GlobalFlags>();
}

function resolveOverrides(flags: ProviderFlags): PartialConfig {
  const out: PartialConfig = {};
  if (flags.provider) out.provider = flags.provider;
  if (flags.apiKey) out.apiKey = flags.apiKey;
  if (flags.model) out.model = flags.model;
  return out;
}

function addProviderOptions(cmd: Command): Command {
  return cmd
    .addOption(
      new Option("--provider <provider>", "Override provider").choices([
        "anthropic",
        "openai",
      ]),
    )
    .option("--api-key <key>", "Override API key")
    .option("--model <id>", "Override model id");
}

function buildStore(globals: GlobalFlags, providerOverrides: ProviderFlags): Store {
  const dbPath = globals.db ?? defaultDbPath();
  return createStore(dbPath, async (text) => {
    // Test seam: drop in a fixed Extraction JSON to bypass the LLM.
    // Used by examples and the e2e CLI smoke test in CI.
    const fakePath = process.env.CAPTABLE_TEST_FAKE_EXTRACTION;
    if (fakePath) {
      const raw = JSON.parse(readFileSync(fakePath, "utf8")) as unknown;
      return extractContract(text, { __testRawResult: raw });
    }
    const config = loadConfig({ overrides: resolveOverrides(providerOverrides) });
    return extractContract(text, { config, model: modelFor(config) });
  });
}

function fail(message: string, code = 1): never {
  process.stderr.write(`error: ${message}\n`);
  process.exit(code);
}

function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function readContract(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    fail(`could not read ${path}: ${(err as Error).message}`);
  }
}

function safeLoadConfig(provider: ProviderFlags): RuntimeConfig {
  try {
    return loadConfig({ overrides: resolveOverrides(provider) });
  } catch (err) {
    if (err instanceof ConfigError) fail(err.message, 2);
    throw err;
  }
}

const program = new Command();
program
  .name("captable")
  .description("Headless cap-table tool (Streams A + B): contract text → cap table + waterfall.")
  .option("--db <path>", `SQLite path (default: ${defaultDbPath()})`)
  .option("--json", "Emit results as JSON");

// ─── config ─────────────────────────────────────────────────────────────────

const config = program.command("config").description("Manage saved provider config");

config
  .command("set")
  .description("Persist provider + API key to ~/.captable/config.json")
  .addOption(
    new Option("--provider <provider>", "Provider (anthropic|openai)")
      .choices(["anthropic", "openai"])
      .makeOptionMandatory(true),
  )
  .requiredOption("--api-key <key>", "API key")
  .option("--model <id>", "Model id (optional; uses provider default if omitted)")
  .action((opts: { provider: Provider; apiKey: string; model?: string }, cmd: Command) => {
    const flags = getGlobals(cmd);
    saveConfig({ provider: opts.provider, apiKey: opts.apiKey, model: opts.model });
    if (flags.json) {
      printJson({
        ok: true,
        path: defaultConfigPath(),
        provider: opts.provider,
        apiKey: maskKey(opts.apiKey),
        model: opts.model,
      });
    } else {
      process.stdout.write(
        `Saved ${defaultConfigPath()}\n  provider: ${opts.provider}\n  api key:  ${maskKey(opts.apiKey)}\n${opts.model ? `  model:    ${opts.model}\n` : ""}`,
      );
    }
  });

config
  .command("show")
  .description("Print the resolved config (api key masked)")
  .action((_opts: unknown, cmd: Command) => {
    const flags = getGlobals(cmd);
    const c = safeLoadConfig({});
    if (flags.json) {
      printJson({ provider: c.provider, apiKey: maskKey(c.apiKey), model: c.model });
    } else {
      process.stdout.write(
        `provider: ${c.provider}\napi key:  ${maskKey(c.apiKey)}\nmodel:    ${c.model ?? "(provider default)"}\n`,
      );
    }
  });

// ─── ingest ─────────────────────────────────────────────────────────────────

addProviderOptions(
  program
    .command("ingest <path>")
    .description("Extract a contract text and persist the extraction"),
).action(async (path: string, providerOpts: ProviderFlags, cmd: Command) => {
    const flags = getGlobals(cmd);
    if (!process.env.CAPTABLE_TEST_FAKE_EXTRACTION) safeLoadConfig(providerOpts);
    const store = buildStore(flags, providerOpts);
    const text = readContract(path);
    const result = await ingestHandler(store, text);
    if (flags.json) {
      printJson(result);
    } else {
      process.stdout.write(
        `Ingested "${result.extraction.company.name}"\n  company id: ${result.companyId}\n  rounds:     ${result.extraction.rounds.length}\n  investors:  ${result.extraction.investors.length}\n`,
      );
    }
  });

// ─── captable ───────────────────────────────────────────────────────────────

program
  .command("captable <companyId>")
  .description("Print the computed cap table for a company")
  .action(async (companyIdStr: string, _opts: unknown, cmd: Command) => {
    const flags = getGlobals(cmd);
    // No LLM call here — read-only — so no provider config needed.
    const store = buildStore(flags, {});
    const companyId = Number(companyIdStr);
    const { capTable } = await capTableHandler(store, companyId);
    if ("error" in capTable) {
      handleEngineError(capTable.missing, flags.json);
      return;
    }
    if (flags.json) {
      printJson(capTable);
    } else {
      process.stdout.write(formatCapTable(capTable) + "\n");
    }
  });

// ─── patch ──────────────────────────────────────────────────────────────────

program
  .command("patch <companyId>")
  .description("Patch missing fields in the stored extraction (repeat --field/--value pairs)")
  .option("--field <path...>", "Field path, e.g. 'Series B.pricePerShare'")
  .option("--value <value...>", "Value(s), one per --field, in the same order")
  .action(
    async (
      companyIdStr: string,
      opts: { field?: string[]; value?: string[] },
      cmd: Command,
    ) => {
      const flags = getGlobals(cmd);
      const fields = opts.field ?? [];
      const values = opts.value ?? [];
      if (fields.length === 0) fail("at least one --field/--value pair required");
      if (fields.length !== values.length) {
        fail("--field and --value must be provided the same number of times");
      }
      const patches = fields.map((field, i) => ({ field, value: values[i]! }));
      const store = buildStore(flags, {});
      const companyId = Number(companyIdStr);
      const { extraction } = await patchHandler(store, companyId, patches);
      if (flags.json) {
        printJson({ ok: true, extraction });
      } else {
        process.stdout.write(
          `Patched ${patches.length} field${patches.length === 1 ? "" : "s"} for company ${companyId}.\n`,
        );
      }
    },
  );

// ─── waterfall ──────────────────────────────────────────────────────────────

program
  .command("waterfall <companyId>")
  .description("Run the waterfall at a given exit value")
  .requiredOption("--exit <amount>", "Exit value (USD)")
  .option("--save", "Persist the result to waterfall_runs", false)
  .action(
    async (
      companyIdStr: string,
      opts: { exit: string; save: boolean },
      cmd: Command,
    ) => {
      const flags = getGlobals(cmd);
      const exitValue = Number(opts.exit);
      if (!Number.isFinite(exitValue)) fail(`--exit must be a number, got "${opts.exit}"`);
      // No LLM call here — read-only — so no provider config needed.
      const store = buildStore(flags, {});
      const companyId = Number(companyIdStr);
      const { capTable, waterfall, saved } = await waterfallHandler(store, companyId, exitValue, {
        save: opts.save,
      });
      if ("error" in capTable) {
        handleEngineError(capTable.missing, flags.json);
        return;
      }
      if (!waterfall) fail("waterfall computation failed unexpectedly");
      if (flags.json) {
        printJson({ ...waterfall, saved });
      } else {
        process.stdout.write(formatWaterfall(waterfall) + "\n");
        if (saved) process.stdout.write("(persisted)\n");
      }
    },
  );

// ─── run ────────────────────────────────────────────────────────────────────

addProviderOptions(
  program
    .command("run <path>")
    .description("Full pipeline: ingest → cap table → waterfall (default exit = 2× total invested)")
    .option("--exit <amount>", "Exit value (USD); defaults to 2× total invested"),
).action(
    async (path: string, opts: { exit?: string } & ProviderFlags, cmd: Command) => {
      const flags = getGlobals(cmd);
      if (!process.env.CAPTABLE_TEST_FAKE_EXTRACTION) safeLoadConfig(opts);
      const store = buildStore(flags, opts);
      const text = readContract(path);
      const exitValue = opts.exit ? Number(opts.exit) : undefined;
      if (opts.exit && !Number.isFinite(exitValue)) {
        fail(`--exit must be a number, got "${opts.exit}"`);
      }
      const result = await runHandler(store, text, { exitValue });
      if ("error" in result.capTable) {
        handleEngineError(result.capTable.missing, flags.json, result.companyId);
        return;
      }
      if (flags.json) {
        printJson(result);
      } else {
        process.stdout.write(
          `Company: ${result.extraction.company.name}  (id ${result.companyId})\nTotal invested: ${money(totalInvested(result.extraction))}\n\nCAP TABLE\n${formatCapTable(result.capTable)}\n\nWATERFALL @ ${money(result.exitValue ?? 0)}\n${formatWaterfall(result.waterfall!)}\n`,
        );
      }
    },
  );

// ─── shared ────────────────────────────────────────────────────────────────

function handleEngineError(missing: string[], json?: boolean, companyId?: number): never {
  if (json) {
    process.stdout.write(
      JSON.stringify({ error: "missing_data", missing, companyId }, null, 2) + "\n",
    );
  } else {
    process.stderr.write(
      `Missing data — engine cannot compute. Fields:\n${missing.map((m) => `  - ${m}`).join("\n")}\n` +
        (companyId
          ? `\nFix with:\n  captable patch ${companyId} --field "${missing[0]}" --value <value>\n`
          : ""),
    );
  }
  process.exit(3);
}

program.parseAsync(process.argv).catch((err: unknown) => {
  fail((err as Error).message ?? String(err));
});
