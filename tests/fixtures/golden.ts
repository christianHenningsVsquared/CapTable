// The shared golden fixture — a made-up 3-round company.
//
// Stream A owns `contractText` + the expected `extraction` (what extractContract
// must produce). Stream B should extend this file with the expected `capTable`
// and `waterfall` results computed by hand from these numbers, and Stream C
// renders them. Keep the numbers clean so the hand-computed waterfall is exact.
//
// Designed so shares come out round (Stream B):
//   Founders (common):            4,000,000 shares  (= Seed preMoney 4,000,000 / 1.00)
//   Seed preferred @ $1.00:       1,000,000 shares  (= 1,000,000 / 1.00)
//   Series A preferred @ $2.00:   2,000,000 shares  (= 4,000,000 / 2.00)
//   Series B preferred @ $4.00:   2,000,000 shares  (= 8,000,000 / 4.00)
//   Total fully diluted:          9,000,000 shares

import type { Extraction } from "../../src/shared/types.js";

export const contractText = `HELIOS ROBOTICS — INVESTMENT & SHAREHOLDERS' SUMMARY

This summary consolidates the key economic terms of the priced financing rounds of Helios Robotics.
The founders hold ordinary (common) shares issued at incorporation. The following preferred financing
rounds have closed:

1. SEED ROUND
   Closing date: 2021-02-01.
   Pre-money valuation: $4,000,000. Total amount invested in this round: $1,000,000.
   Issue price per preferred share: $1.00.
   Liquidation preference: 1.0x, non-participating.
   Ranking: junior to all later preferred (seniority rank 1).
   Investors in the Seed round:
     - Seedcamp Ventures invested $700,000.
     - Angel Collective invested $300,000.

2. SERIES A
   Closing date: 2022-05-01.
   Pre-money valuation: $10,000,000. Total amount invested: $4,000,000.
   Issue price per preferred share: $2.00.
   Liquidation preference: 1.0x, non-participating.
   Ranking: senior to Seed, junior to Series B (seniority rank 2).
   Investor: Northstar Capital invested $4,000,000.

3. SERIES B
   Closing date: 2023-09-01.
   Pre-money valuation: $28,000,000. Total amount invested: $8,000,000.
   Issue price per preferred share: $4.00.
   Liquidation preference: 1.0x, participating, capped at 2.0x of the original investment.
   Ranking: most senior preferred (seniority rank 3).
   Investor: Meridian Growth invested $8,000,000.

For reference only (not part of the cap table inputs): the founders' ordinary shares and any future
option pool are governed by separate agreements.`;

export const extraction: Extraction = {
  company: { name: "Helios Robotics" },
  rounds: [
    {
      name: "Seed",
      date: "2021-02-01",
      preMoney: 4_000_000,
      investment: 1_000_000,
      pricePerShare: 1.0,
      liqPref: 1.0,
      participation: "none",
      participationCap: null,
      seniority: 1,
    },
    {
      name: "Series A",
      date: "2022-05-01",
      preMoney: 10_000_000,
      investment: 4_000_000,
      pricePerShare: 2.0,
      liqPref: 1.0,
      participation: "none",
      participationCap: null,
      seniority: 2,
    },
    {
      name: "Series B",
      date: "2023-09-01",
      preMoney: 28_000_000,
      investment: 8_000_000,
      pricePerShare: 4.0,
      liqPref: 1.0,
      participation: "capped",
      participationCap: 2.0,
      seniority: 3,
    },
  ],
  investors: [
    { name: "Seedcamp Ventures", round: "Seed", amount: 700_000 },
    { name: "Angel Collective", round: "Seed", amount: 300_000 },
    { name: "Northstar Capital", round: "Series A", amount: 4_000_000 },
    { name: "Meridian Growth", round: "Series B", amount: 8_000_000 },
  ],
};

export const golden = { contractText, extraction };
