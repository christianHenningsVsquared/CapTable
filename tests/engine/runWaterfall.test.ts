import { describe, expect, test } from "vitest";
import { runWaterfall } from "../../src/engine/index.js";
import type { CapTable, ShareClass } from "../../src/shared/types.js";

const common = (shares: number): ShareClass => ({
  name: "Common",
  shares,
  pricePerShare: 0,
  liqPref: 0,
  participation: "none",
  participationCap: null,
  seniority: 0,
});

const pref = (overrides: Partial<ShareClass> & { name: string; shares: number; pricePerShare: number; seniority: number }): ShareClass => ({
  liqPref: 1,
  participation: "none",
  participationCap: null,
  ...overrides,
});

function sumPayouts(rows: { payout: number }[]): number {
  return rows.reduce((acc, r) => acc + r.payout, 0);
}

describe("runWaterfall", () => {
  test("common-only cap table: exit distributes pro-rata, multiple = 1", () => {
    const capTable: CapTable = {
      shareClasses: [common(1000)],
      holdings: [{ holder: "Founders", shareClass: "Common", shares: 1000 }],
      totalShares: 1000,
    };

    const result = runWaterfall(capTable, 1_000_000);

    expect(result).toEqual({
      exitValue: 1_000_000,
      rows: [
        { holder: "Founders", shareClass: "Common", payout: 1_000_000, multiple: 1 },
      ],
      totalPayout: 1_000_000,
    });
  });

  test("non-participating preferred: small exit pays pref, common gets residual", () => {
    // Seed: $1M invested at $1/share = 1M shares, 1x pref, non-participating
    // Common: 4M shares
    // Exit $3M: Seed takes $1M pref; pro-rata-as-common would be 3M*(1/5)=$600k. Pref wins.
    // Common gets $2M residual.
    const capTable: CapTable = {
      shareClasses: [
        pref({ name: "Seed", shares: 1_000_000, pricePerShare: 1, seniority: 1 }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    };

    const result = runWaterfall(capTable, 3_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 1_000_000, multiple: 1 },
      { holder: "Founders", shareClass: "Common", payout: 2_000_000, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(3_000_000);
  });

  test("non-participating preferred: large exit triggers conversion (pro-rata > pref)", () => {
    // Same cap table as above. Exit $50M.
    // Pref path: Seed $1M + pro-rata of $49M residual at 1/5 = $9.8M → $10.8M total. Pro-rata-as-common = $10M.
    // Wait — non-participating means choose max(pref-only, pro-rata). Pref-only = $1M. Pro-rata-as-common = $50M*1/5 = $10M. Convert.
    // Once Seed converts: full $50M is pro-rata across 5M shares. Alice gets $10M, Founders $40M.
    const capTable: CapTable = {
      shareClasses: [
        pref({ name: "Seed", shares: 1_000_000, pricePerShare: 1, seniority: 1 }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    };

    const result = runWaterfall(capTable, 50_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 10_000_000, multiple: 10 },
      { holder: "Founders", shareClass: "Common", payout: 40_000_000, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(50_000_000);
  });

  test("full participation: pref + pro-rata of residual", () => {
    // Seed: $1M invested @ $1, 1M shares, 1x pref FULL participation
    // Common: 4M shares
    // Exit $11M: Seed pref $1M; residual $10M pro-rata over 5M shares; Seed gets +$2M = $3M total; Common gets $8M.
    const capTable: CapTable = {
      shareClasses: [
        pref({
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          seniority: 1,
          participation: "full",
        }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    };

    const result = runWaterfall(capTable, 11_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 3_000_000, multiple: 3 },
      { holder: "Founders", shareClass: "Common", payout: 8_000_000, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(11_000_000);
  });

  test("capped participation: cap not reached behaves like full", () => {
    // Seed: $1M invested @ $1, 1M shares, 1x pref capped @ 2x ($2M total max)
    // Common: 4M shares
    // Exit $6M: pref $1M; residual $5M; Seed's pro-rata-of-residual = $5M * 1/5 = $1M.
    // Seed total = $1M pref + $1M residual = $2M. Exactly at cap. Common = $4M.
    const capTable: CapTable = {
      shareClasses: [
        pref({
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          seniority: 1,
          participation: "capped",
          participationCap: 2,
        }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    };

    const result = runWaterfall(capTable, 6_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 2_000_000, multiple: 2 },
      { holder: "Founders", shareClass: "Common", payout: 4_000_000, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(6_000_000);
  });

  test("capped participation: conversion preferred when pro-rata-as-common > capped", () => {
    // Seed: $1M invested @ $1, 1M shares, 1x pref capped @ 2x ($2M cap)
    // Common: 4M shares
    // Exit $20M: capped path = $2M. Pro-rata-as-common = $20M * 1/5 = $4M. Convert.
    // Once converted: all $20M pro-rata across 5M; Seed = $4M, Founders = $16M.
    const capTable: CapTable = {
      shareClasses: [
        pref({
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          seniority: 1,
          participation: "capped",
          participationCap: 2,
        }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 5_000_000,
    };

    const result = runWaterfall(capTable, 20_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 4_000_000, multiple: 4 },
      { holder: "Founders", shareClass: "Common", payout: 16_000_000, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(20_000_000);
  });

  test("seniority order: junior pref paid only after senior pref", () => {
    // Series A senior, Seed junior. Both 1x non-participating.
    // Seed $1M @ $1, 1M shares, sen 1. Series A $4M @ $2, 2M shares, sen 2.
    // Common 4M shares. Exit $4M.
    // Series A (sen 2): pref $4M, exhausts proceeds. Seed gets $0, Common $0.
    const capTable: CapTable = {
      shareClasses: [
        pref({ name: "Seed", shares: 1_000_000, pricePerShare: 1, seniority: 1 }),
        pref({ name: "Series A", shares: 2_000_000, pricePerShare: 2, seniority: 2 }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 1_000_000 },
        { holder: "Bravo", shareClass: "Series A", shares: 2_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 7_000_000,
    };

    const result = runWaterfall(capTable, 4_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "Seed", payout: 0, multiple: 0 },
      { holder: "Bravo", shareClass: "Series A", payout: 4_000_000, multiple: 1 },
      { holder: "Founders", shareClass: "Common", payout: 0, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(4_000_000);
  });

  test("seniority tie: pari passu pro-rata when proceeds insufficient", () => {
    // Two classes at same seniority, $2M total pref claim, only $1M available
    // → each gets half its claim.
    const capTable: CapTable = {
      shareClasses: [
        pref({ name: "SeedA", shares: 1_000_000, pricePerShare: 1, seniority: 1 }),
        pref({ name: "SeedB", shares: 1_000_000, pricePerShare: 1, seniority: 1 }),
        common(4_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "SeedA", shares: 1_000_000 },
        { holder: "Bravo", shareClass: "SeedB", shares: 1_000_000 },
        { holder: "Founders", shareClass: "Common", shares: 4_000_000 },
      ],
      totalShares: 6_000_000,
    };

    const result = runWaterfall(capTable, 1_000_000);

    expect(result.rows).toEqual([
      { holder: "Alice", shareClass: "SeedA", payout: 500_000, multiple: 0.5 },
      { holder: "Bravo", shareClass: "SeedB", payout: 500_000, multiple: 0.5 },
      { holder: "Founders", shareClass: "Common", payout: 0, multiple: 1 },
    ]);
    expect(result.totalPayout).toBe(1_000_000);
  });

  test("invariant: sum(payouts) === exitValue exactly across messy rounding", () => {
    // 3 holders, exit value that won't divide evenly.
    const capTable: CapTable = {
      shareClasses: [
        pref({
          name: "Seed",
          shares: 1_000_000,
          pricePerShare: 1,
          seniority: 1,
          participation: "full",
        }),
        common(2_000_000),
      ],
      holdings: [
        { holder: "Alice", shareClass: "Seed", shares: 333_333 },
        { holder: "Bravo", shareClass: "Seed", shares: 666_667 },
        { holder: "Founders", shareClass: "Common", shares: 2_000_000 },
      ],
      totalShares: 3_000_000,
    };

    const result = runWaterfall(capTable, 7_123_457);

    expect(sumPayouts(result.rows)).toBe(7_123_457);
    expect(result.totalPayout).toBe(7_123_457);
  });
});
