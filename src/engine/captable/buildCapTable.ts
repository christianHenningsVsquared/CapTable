import Decimal from "decimal.js";
import type {
  CapTable,
  EngineError,
  Extraction,
  Holding,
  ShareClass,
} from "../../shared/types.js";

export function buildCapTable(extraction: Extraction): CapTable | EngineError {
  const missing: string[] = [];

  const firstRound = extraction.rounds[0];
  if (!firstRound) {
    return { error: "missing_data", missing: ["rounds"] };
  }

  for (const round of extraction.rounds) {
    if (round.pricePerShare == null) missing.push(`${round.name}.pricePerShare`);
    if (round.liqPref == null) missing.push(`${round.name}.liqPref`);
    if (round.participation == null) missing.push(`${round.name}.participation`);
    if (round.seniority == null) missing.push(`${round.name}.seniority`);
    if (round.participation === "capped" && round.participationCap == null) {
      missing.push(`${round.name}.participationCap`);
    }
  }
  if (firstRound.preMoney == null) missing.push(`${firstRound.name}.preMoney`);

  for (const inv of extraction.investors) {
    if (inv.amount == null) {
      missing.push(`${inv.round}.investors.${inv.name}.amount`);
    }
  }

  if (missing.length > 0) {
    return { error: "missing_data", missing };
  }

  const shareClasses: ShareClass[] = [];
  const holdings: Holding[] = [];

  for (const round of extraction.rounds) {
    const pps = new Decimal(round.pricePerShare!);
    let classShares = new Decimal(0);

    for (const inv of extraction.investors.filter((i) => i.round === round.name)) {
      const shares = new Decimal(inv.amount!).div(pps);
      classShares = classShares.plus(shares);
      holdings.push({
        holder: inv.name,
        shareClass: round.name,
        shares: shares.toNumber(),
      });
    }

    shareClasses.push({
      name: round.name,
      shares: classShares.toNumber(),
      pricePerShare: round.pricePerShare!,
      liqPref: round.liqPref!,
      participation: round.participation!,
      participationCap: round.participationCap,
      seniority: round.seniority!,
    });
  }

  const firstRoundPps = new Decimal(firstRound.pricePerShare!);
  let founderShares = new Decimal(firstRound.preMoney!).div(firstRoundPps);
  if (founderShares.lt(0)) founderShares = new Decimal(0);

  shareClasses.push({
    name: "Common",
    shares: founderShares.toNumber(),
    pricePerShare: 0,
    liqPref: 0,
    participation: "none",
    participationCap: null,
    seniority: 0,
  });
  holdings.push({
    holder: "Founders",
    shareClass: "Common",
    shares: founderShares.toNumber(),
  });

  const totalShares = shareClasses.reduce(
    (acc, sc) => acc.plus(sc.shares),
    new Decimal(0),
  ).toNumber();

  return { shareClasses, holdings, totalShares };
}
