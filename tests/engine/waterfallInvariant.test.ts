import { describe, expect, test } from "vitest";
import { runWaterfall } from "../../src/engine/index.js";
import type { CapTable } from "../../src/shared/types.js";

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("runWaterfall invariant", () => {
  test("sum(payouts) === exitValue for 20 random exits across mixed-participation cap table", () => {
    const capTable: CapTable = {
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
          shares: 2_000_000,
          pricePerShare: 2,
          liqPref: 1,
          participation: "full",
          participationCap: null,
          seniority: 2,
        },
        {
          name: "Series B",
          shares: 2_000_000,
          pricePerShare: 4,
          liqPref: 1,
          participation: "capped",
          participationCap: 2,
          seniority: 3,
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
        { holder: "Seedcamp", shareClass: "Seed", shares: 700_000 },
        { holder: "Angel", shareClass: "Seed", shares: 300_000 },
        { holder: "Northstar", shareClass: "Series A", shares: 2_000_000 },
        { holder: "Meridian", shareClass: "Series B", shares: 2_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 9_000_000,
    };

    const totalInvested = 1_000_000 + 4_000_000 + 8_000_000; // 13M
    const upper = totalInvested * 10;

    const rng = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const exit = Math.round(rng() * upper * 100) / 100; // cents-precise
      const result = runWaterfall(capTable, exit);

      const sumPayouts = result.rows.reduce((acc, r) => acc + r.payout, 0);
      const exitCents = Math.round(exit * 100);
      const sumCents = Math.round(sumPayouts * 100);

      expect(sumCents, `exit=${exit} sum=${sumPayouts}`).toBe(exitCents);
      expect(result.totalPayout, `exit=${exit} totalPayout`).toBe(exit);
      expect(result.exitValue).toBe(exit);
    }
  });

  test("exit of 0 pays everyone 0", () => {
    const capTable: CapTable = {
      shareClasses: [
        {
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          liqPref: 1,
          participation: "full",
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
    };

    const result = runWaterfall(capTable, 0);
    expect(result.totalPayout).toBe(0);
    for (const r of result.rows) {
      expect(r.payout).toBe(0);
    }
  });
});
