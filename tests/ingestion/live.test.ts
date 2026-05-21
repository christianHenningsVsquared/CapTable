import { describe, it, expect } from "vitest";
import { extractContract } from "../../src/ingestion/extractContract.js";
import { golden } from "../fixtures/golden.js";

// Real Claude API call. Skipped unless ANTHROPIC_API_KEY is set so CI / offline
// runs stay green. Run it with a key to validate the prompt end-to-end:
//   ANTHROPIC_API_KEY=sk-... npx vitest run tests/ingestion/live.test.ts
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!hasKey)("extractContract — live Claude API", () => {
  it(
    "extracts the golden contract to match the expected structure and key numbers",
    async () => {
      const result = await extractContract(golden.contractText);

      expect(result.company.name).toMatch(/Helios Robotics/i);
      expect(result.rounds.map((r) => r.name)).toEqual(["Seed", "Series A", "Series B"]);

      const seed = result.rounds.find((r) => r.name === "Seed");
      expect(seed?.preMoney).toBe(4_000_000);
      expect(seed?.investment).toBe(1_000_000);
      expect(seed?.pricePerShare).toBe(1);

      const seriesB = result.rounds.find((r) => r.name === "Series B");
      expect(seriesB?.participation).toBe("capped");
      expect(seriesB?.participationCap).toBe(2);

      // Founders must NOT be hallucinated as an investor; every investor has an amount.
      expect(result.investors.length).toBe(4);
      expect(result.investors.every((i) => i.amount !== null)).toBe(true);
    },
    60_000,
  );
});
