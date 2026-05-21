import { describe, it, expect } from "vitest";
import { extractContract } from "../../src/ingestion/extractContract.js";
import { parseExtraction } from "../../src/ingestion/extractionSchema.js";
import { golden } from "../fixtures/golden.js";

// Build a fake Anthropic client whose single message returns a tool_use block
// carrying `toolInput`. Avoids any network call.
function fakeClient(toolInput: unknown, stopReason = "tool_use") {
  return {
    messages: {
      create: async () => ({
        stop_reason: stopReason,
        content: [
          { type: "tool_use", id: "toolu_test", name: "record_extraction", input: toolInput },
        ],
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("extractContract", () => {
  it("returns the Extraction from the model's tool_use block", async () => {
    const result = await extractContract(golden.contractText, {
      client: fakeClient(golden.extraction),
    });
    expect(result).toEqual(golden.extraction);
  });

  it("normalizes messy model output (currency strings, separators, bad enum)", async () => {
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

    const r = await extractContract("ignored", { client: fakeClient(messy) });
    expect(r.company.name).toBe("Helios Robotics");
    expect(r.rounds[0]?.preMoney).toBe(4_000_000);
    expect(r.rounds[0]?.investment).toBe(1_000_000);
    expect(r.rounds[0]?.pricePerShare).toBe(1);
    expect(r.rounds[0]?.participation).toBeNull();
    expect(r.rounds[0]?.seniority).toBe(1);
    expect(r.investors[0]?.amount).toBe(700_000);
  });

  it("throws if the model returns no tool_use block", async () => {
    const noTool = {
      messages: {
        create: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: "nope" }] }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    await expect(extractContract("x", { client: noTool })).rejects.toThrow(/tool_use/);
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
