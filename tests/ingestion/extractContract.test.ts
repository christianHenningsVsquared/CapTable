import { describe, it, expect } from "vitest";
import { extractContract } from "../../src/ingestion/extractContract.js";
import { parseExtraction } from "../../src/ingestion/extractionSchema.js";
import { golden } from "../fixtures/golden.js";

describe("extractContract", () => {
  it("returns the Extraction after running raw input through the normalizer", async () => {
    // `__testRawResult` bypasses the AI SDK call and feeds the raw object
    // through the same defensive normalizer the real call uses.
    const result = await extractContract(golden.contractText, {
      __testRawResult: golden.extraction,
    });
    expect(result).toEqual(golden.extraction);
  });

  it("normalizes messy raw output (currency strings, separators, bad enum)", async () => {
    const messy = {
      company: { name: "  Helios Robotics  " },
      rounds: [
        {
          name: "Seed",
          date: "2021-02-01",
          preMoney: "$4,000,000",
          investment: "1,000,000",
          pricePerShare: "1.00",
          liqPref: 1,
          participation: "non-participating", // not a valid enum value -> null
          participationCap: null,
          seniority: "1",
        },
      ],
      investors: [{ name: "Seedcamp Ventures", round: "Seed", amount: "700000" }],
    };

    const r = await extractContract("ignored", { __testRawResult: messy });
    expect(r.company.name).toBe("Helios Robotics");
    expect(r.rounds[0]?.preMoney).toBe(4_000_000);
    expect(r.rounds[0]?.investment).toBe(1_000_000);
    expect(r.rounds[0]?.pricePerShare).toBe(1);
    expect(r.rounds[0]?.participation).toBeNull();
    expect(r.rounds[0]?.seniority).toBe(1);
    expect(r.investors[0]?.amount).toBe(700_000);
  });
});

describe("parseExtraction (normalizer)", () => {
  it("defaults missing top-level fields safely", () => {
    const e = parseExtraction({});
    expect(e.company.name).toBe("Unknown Company");
    expect(e.rounds).toEqual([]);
    expect(e.investors).toEqual([]);
  });

  it("drops entries with empty names", () => {
    const e = parseExtraction({
      company: { name: "X" },
      rounds: [{ name: "" }, { name: "Seed" }],
      investors: [{ name: "", round: "Seed", amount: 1 }],
    });
    expect(e.rounds.map((r) => r.name)).toEqual(["Seed"]);
    expect(e.investors).toEqual([]);
  });

  it("coerces non-numeric junk to null rather than NaN", () => {
    const e = parseExtraction({
      company: { name: "X" },
      rounds: [{ name: "Seed", preMoney: "n/a", investment: "TBD" }],
      investors: [],
    });
    expect(e.rounds[0]?.preMoney).toBeNull();
    expect(e.rounds[0]?.investment).toBeNull();
  });
});
