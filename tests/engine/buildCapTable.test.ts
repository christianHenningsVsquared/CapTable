import { describe, expect, test } from "vitest";
import { buildCapTable } from "../../src/engine/index.js";
import type { Extraction } from "../../src/shared/types.js";

describe("buildCapTable", () => {
  test("single round: founders bootstrapped from preMoney, investor shares from amount/PPS", () => {
    const extraction: Extraction = {
      company: { name: "Acme" },
      rounds: [
        {
          name: "Seed",
          date: null,
          preMoney: 4_000_000,
          investment: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
      ],
      investors: [
        { name: "Alice", round: "Seed", amount: 1_000_000 },
      ],
    };

    const result = buildCapTable(extraction);

    expect(result).toEqual({
      shareClasses: [
        {
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
        {
          name: "Common",
          shares: 4_000_000,
          pricePerShare: 0,
          liqPref: 0,
          participation: "none",
          participationCap: null,
          seniority: 0,
        },
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    });
  });

  test("multi-round: founders bootstrapped from first round only; each round adds its own class", () => {
    const extraction: Extraction = {
      company: { name: "Acme" },
      rounds: [
        {
          name: "Seed",
          date: null,
          preMoney: 4_000_000,
          investment: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
        {
          name: "Series A",
          date: null,
          preMoney: 10_000_000,
          investment: 5_000_000,
          pricePerShare: 2,
          liqPref: 1,
          participation: "full",
          participationCap: null,
          seniority: 2,
        },
      ],
      investors: [
        { name: "Alice", round: "Seed", amount: 1_000_000 },
        { name: "Bravo Capital", round: "Series A", amount: 5_000_000 },
      ],
    };

    const result = buildCapTable(extraction);

    expect(result).toEqual({
      shareClasses: [
        {
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
        {
          name: "Series A",
          shares: 2_500_000,
          pricePerShare: 2,
          liqPref: 1,
          participation: "full",
          participationCap: null,
          seniority: 2,
        },
        {
          name: "Common",
          shares: 4_000_000,
          pricePerShare: 0,
          liqPref: 0,
          participation: "none",
          participationCap: null,
          seniority: 0,
        },
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Bravo Capital", shareClass: "Series A", shares: 2_500_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 7_500_000,
    });
  });

  test("missing required fields surface as EngineError with Round.field paths", () => {
    const extraction: Extraction = {
      company: { name: "Acme" },
      rounds: [
        {
          name: "Seed",
          date: null,
          preMoney: null,
          investment: 1_000_000,
          pricePerShare: null,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
      ],
      investors: [{ name: "Alice", round: "Seed", amount: null }],
    };

    expect(buildCapTable(extraction)).toEqual({
      error: "missing_data",
      missing: [
        "Seed.pricePerShare",
        "Seed.preMoney",
        "Seed.investors.Alice.amount",
      ],
    });
  });

  test("participationCap required only when participation is capped", () => {
    const base = {
      name: "Seed",
      date: null,
      preMoney: 4_000_000,
      investment: 1_000_000,
      pricePerShare: 1,
      liqPref: 1,
      participationCap: null,
      seniority: 1,
    } as const;

    const fullExtraction: Extraction = {
      company: { name: "Acme" },
      rounds: [{ ...base, participation: "full" }],
      investors: [{ name: "Alice", round: "Seed", amount: 1_000_000 }],
    };
    expect(buildCapTable(fullExtraction)).not.toHaveProperty("error");

    const cappedExtraction: Extraction = {
      company: { name: "Acme" },
      rounds: [{ ...base, participation: "capped" }],
      investors: [{ name: "Alice", round: "Seed", amount: 1_000_000 }],
    };
    expect(buildCapTable(cappedExtraction)).toEqual({
      error: "missing_data",
      missing: ["Seed.participationCap"],
    });
  });

  test("founders shares clamp to zero when implied negative", () => {
    const extraction: Extraction = {
      company: { name: "Acme" },
      rounds: [
        {
          name: "Seed",
          date: null,
          preMoney: 0,
          investment: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "none",
          participationCap: null,
          seniority: 1,
        },
      ],
      investors: [{ name: "Alice", round: "Seed", amount: 1_000_000 }],
    };

    const result = buildCapTable(extraction);
    expect(result).toMatchObject({
      shareClasses: expect.arrayContaining([
        expect.objectContaining({ name: "Common", shares: 0 }),
      ]),
      holdings: expect.arrayContaining([
        { holder: "Founders", shareClass: "Common", shares: 0 },
      ]),
    });
  });
});
