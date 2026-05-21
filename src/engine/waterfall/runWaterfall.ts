import Decimal from "decimal.js";
import type {
  CapTable,
  WaterfallResult,
  WaterfallRow,
} from "../../shared/types.js";

export function runWaterfall(
  capTable: CapTable,
  exitValue: number,
): WaterfallResult {
  const exit = new Decimal(exitValue);
  const totalShares = new Decimal(capTable.totalShares);
  const rows: WaterfallRow[] = [];

  for (const holding of capTable.holdings) {
    const payout = totalShares.isZero()
      ? new Decimal(0)
      : exit.times(holding.shares).div(totalShares);
    rows.push({
      holder: holding.holder,
      shareClass: holding.shareClass,
      payout: payout.toNumber(),
      multiple: 1,
    });
  }

  const totalPayout = rows
    .reduce((acc, r) => acc.plus(r.payout), new Decimal(0))
    .toNumber();

  return { exitValue, rows, totalPayout };
}
