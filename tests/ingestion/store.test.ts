import { describe, it, expect } from "vitest";
import { Store } from "../../src/data/store.js";
import { openDb } from "../../src/data/db.js";
import { golden } from "../fixtures/golden.js";
import type { WaterfallResult } from "../../src/shared/types.js";

// A fake extractor so the DB tests never touch the network / LLM.
const fakeExtractor = async () => golden.extraction;

function freshStore() {
  return new Store(openDb(), fakeExtractor);
}

describe("Store — persistence + API surface", () => {
  it("ingests via the extractor and reads the extraction back", async () => {
    const store = freshStore();
    const { companyId, extractionId } = await store.ingest(golden.contractText);
    expect(companyId).toBeGreaterThan(0);
    expect(extractionId).toBeGreaterThan(0);

    const got = await store.getExtraction(companyId);
    expect(got).toEqual(golden.extraction);
  });

  it("patchExtraction merges a corrected field without an LLM call (missing-value flow)", async () => {
    const store = freshStore();
    const { companyId } = await store.ingest(golden.contractText);

    // Simulate the UI fixing a field the engine reported missing.
    const rounds = (await store.getExtraction(companyId)).rounds.map((r) =>
      r.name === "Series A" ? { ...r, pricePerShare: 2.5 } : r,
    );
    await store.patchExtraction(companyId, { rounds });

    const got = await store.getExtraction(companyId);
    expect(got.rounds.find((r) => r.name === "Series A")?.pricePerShare).toBe(2.5);
    // Unrelated data is untouched.
    expect(got.investors).toEqual(golden.extraction.investors);
    expect(got.company).toEqual(golden.extraction.company);
  });

  it("saves and retrieves a waterfall run by exit value", async () => {
    const store = freshStore();
    const { companyId } = await store.ingest(golden.contractText);

    const run: WaterfallResult = {
      exitValue: 50_000_000,
      rows: [{ holder: "Founders", shareClass: "Common", payout: 12_000_000, multiple: 1 }],
      totalPayout: 50_000_000,
    };
    const id = await store.saveWaterfall(companyId, run);
    expect(id).toBeGreaterThan(0);

    expect(await store.getWaterfall(companyId, 50_000_000)).toEqual(run);
  });

  it("returns null for a waterfall that was never computed", async () => {
    const store = freshStore();
    const { companyId } = await store.ingest(golden.contractText);
    expect(await store.getWaterfall(companyId, 999)).toBeNull();
  });

  it("throws when reading an extraction for an unknown company", async () => {
    const store = freshStore();
    await expect(store.getExtraction(12_345)).rejects.toThrow();
  });
});
