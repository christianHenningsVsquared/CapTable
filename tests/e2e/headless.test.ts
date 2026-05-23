// End-to-end smoke test for the headless CLI handlers.
//
// Exercises the full ingest → cap table → waterfall pipeline without spawning
// the CLI process: build a Store with a fake extractor that returns the golden
// Extraction, then call the same handlers the CLI calls.

import { describe, expect, test } from "vitest";
import { Store } from "../../src/data/store.js";
import { openDb } from "../../src/data/db.js";
import {
  applyFieldPatch,
  capTableHandler,
  ingestHandler,
  patchHandler,
  runHandler,
  totalInvested,
  waterfallHandler,
} from "../../src/cli/handlers.js";
import { golden } from "../fixtures/golden.js";
import type { Extraction } from "../../src/shared/types.js";

const goldenExtractor = async () => golden.extraction;

function freshStore(extractor = goldenExtractor) {
  return new Store(openDb(), extractor);
}

const TOTAL_INVESTED = 1_000_000 + 4_000_000 + 8_000_000; // 13M

describe("headless CLI pipeline", () => {
  test("run: ingest → captable → waterfall, with cent-exact total", async () => {
    const store = freshStore();
    const exitValue = 100_000_000;

    const result = await runHandler(store, golden.contractText, { exitValue });

    expect("error" in result.capTable).toBe(false);
    if ("error" in result.capTable) return;

    expect(result.extraction.company.name).toBe("Helios Robotics");
    expect(result.capTable.totalShares).toBe(9_000_000);
    expect(result.waterfall).toBeDefined();
    expect(result.waterfall!.exitValue).toBe(exitValue);
    expect(result.waterfall!.totalPayout).toBe(exitValue);
    // Saved to DB during run.
    const persisted = await store.getWaterfall(result.companyId, exitValue);
    expect(persisted).toEqual(result.waterfall);
  });

  test("run: default exit is 2× total invested when --exit omitted", async () => {
    const store = freshStore();
    const result = await runHandler(store, golden.contractText);
    expect(result.exitValue).toBe(TOTAL_INVESTED * 2);
    expect(result.waterfall!.totalPayout).toBe(TOTAL_INVESTED * 2);
  });

  test("waterfallHandler with --save persists; without --save does not", async () => {
    const store = freshStore();
    const { companyId } = await ingestHandler(store, golden.contractText);

    await waterfallHandler(store, companyId, 50_000_000); // no save
    expect(await store.getWaterfall(companyId, 50_000_000)).toBeNull();

    await waterfallHandler(store, companyId, 50_000_000, { save: true });
    const got = await store.getWaterfall(companyId, 50_000_000);
    expect(got?.totalPayout).toBe(50_000_000);
  });

  test("EngineError: missing field surfaces, patch fixes it, captable then succeeds", async () => {
    // A copy of the golden extraction with pricePerShare missing on Series B.
    const broken: Extraction = {
      ...golden.extraction,
      rounds: golden.extraction.rounds.map((r) =>
        r.name === "Series B" ? { ...r, pricePerShare: null } : r,
      ),
    };
    const store = new Store(openDb(), async () => broken);
    const { companyId } = await ingestHandler(store, golden.contractText);

    const first = await capTableHandler(store, companyId);
    expect("error" in first.capTable).toBe(true);
    if (!("error" in first.capTable)) return;
    expect(first.capTable.missing).toContain("Series B.pricePerShare");

    await patchHandler(store, companyId, [
      { field: "Series B.pricePerShare", value: "4.0" },
    ]);

    const second = await capTableHandler(store, companyId);
    expect("error" in second.capTable).toBe(false);
    if ("error" in second.capTable) return;
    expect(second.capTable.totalShares).toBe(9_000_000);
  });

  test("totalInvested sums round investments and skips null", () => {
    expect(totalInvested(golden.extraction)).toBe(TOTAL_INVESTED);
    const partial: Extraction = {
      ...golden.extraction,
      rounds: golden.extraction.rounds.map((r) =>
        r.name === "Series A" ? { ...r, investment: null } : r,
      ),
    };
    expect(totalInvested(partial)).toBe(1_000_000 + 8_000_000);
  });
});

describe("applyFieldPatch", () => {
  test("round-level numeric field", () => {
    const out = applyFieldPatch(golden.extraction, {
      field: "Series A.pricePerShare",
      value: "2.5",
    });
    expect(out.rounds.find((r) => r.name === "Series A")?.pricePerShare).toBe(2.5);
  });

  test("round-level participation enum (rejects bad value)", () => {
    expect(() =>
      applyFieldPatch(golden.extraction, {
        field: "Seed.participation",
        value: "garbage",
      }),
    ).toThrow(/participation/);
  });

  test("investor amount patch", () => {
    const out = applyFieldPatch(golden.extraction, {
      field: "Seed.investors.Seedcamp Ventures.amount",
      value: "750000",
    });
    expect(
      out.investors.find((i) => i.name === "Seedcamp Ventures")?.amount,
    ).toBe(750_000);
  });

  test("unknown round rejected", () => {
    expect(() =>
      applyFieldPatch(golden.extraction, { field: "Series Q.preMoney", value: "1" }),
    ).toThrow(/Unknown round/);
  });

  test("unknown investor rejected", () => {
    expect(() =>
      applyFieldPatch(golden.extraction, {
        field: "Seed.investors.Nobody.amount",
        value: "1",
      }),
    ).toThrow(/Unknown investor/);
  });

  test("non-numeric value for numeric field rejected", () => {
    expect(() =>
      applyFieldPatch(golden.extraction, {
        field: "Seed.preMoney",
        value: "n/a",
      }),
    ).toThrow(/number/);
  });
});
