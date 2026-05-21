import { describe, expect, test } from "vitest";
import { runWaterfall } from "../../src/engine/index.js";
import type { CapTable } from "../../src/shared/types.js";

const commonClass = {
  name: "Common",
  shares: 0,
  liqPref: 0,
  participation: "none" as const,
  participationCap: null,
  seniority: 0,
};

describe("runWaterfall", () => {
  test("common-only cap table: exit distributes pro-rata, multiple = 1", () => {
    const capTable: CapTable = {
      shareClasses: [{ ...commonClass, shares: 1000 }],
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
});
