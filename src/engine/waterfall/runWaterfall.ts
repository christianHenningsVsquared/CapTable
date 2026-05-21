import { Decimal } from "decimal.js";
import type {
  CapTable,
  ShareClass,
  WaterfallResult,
  WaterfallRow,
} from "../../shared/types.js";

const ZERO = new Decimal(0);

export function runWaterfall(
  capTable: CapTable,
  exitValue: number,
): WaterfallResult {
  const exit = new Decimal(exitValue);
  const classes = capTable.shareClasses;
  const classByName = new Map(classes.map((c) => [c.name, c]));

  const isPreferred = (c: ShareClass) => c.liqPref > 0;
  const canConvert = (c: ShareClass) =>
    isPreferred(c) && (c.participation === "none" || c.participation === "capped");

  const candidates = classes.filter(canConvert);

  let converters = new Set<string>();
  for (let iter = 0; iter < 16; iter++) {
    const current = classPayouts(capTable, exit, converters);

    let changed = false;
    const next = new Set(converters);

    for (const c of candidates) {
      if (converters.has(c.name)) {
        const altSet = new Set(converters);
        altSet.delete(c.name);
        const alt = classPayouts(capTable, exit, altSet);
        if (alt.get(c.name)!.gt(current.get(c.name)!)) {
          next.delete(c.name);
          changed = true;
        }
      } else {
        const altSet = new Set(converters);
        altSet.add(c.name);
        const alt = classPayouts(capTable, exit, altSet);
        if (alt.get(c.name)!.gt(current.get(c.name)!)) {
          next.add(c.name);
          changed = true;
        }
      }
    }

    if (!changed) break;
    converters = next;
  }

  const finalPayouts = classPayouts(capTable, exit, converters);
  const { rows, exactPayouts } = buildRows(capTable, finalPayouts, classByName);
  reconcileToExactExit(rows, exactPayouts, capTable, classByName, exit);

  const totalPayout = rows
    .reduce((acc, r) => acc.plus(r.payout), ZERO)
    .toNumber();

  return {
    exitValue,
    rows,
    totalPayout,
  };
}

function classPayouts(
  capTable: CapTable,
  exit: Decimal,
  converters: Set<string>,
): Map<string, Decimal> {
  const payouts = new Map<string, Decimal>();
  for (const c of capTable.shareClasses) {
    payouts.set(c.name, ZERO);
  }

  let remaining = exit;

  const preferredStuck = capTable.shareClasses.filter(
    (c) => c.liqPref > 0 && !converters.has(c.name),
  );

  const bySen = new Map<number, ShareClass[]>();
  for (const c of preferredStuck) {
    const arr = bySen.get(c.seniority) ?? [];
    arr.push(c);
    bySen.set(c.seniority, arr);
  }
  const sortedSeniorities = [...bySen.keys()].sort((a, b) => b - a);

  for (const sen of sortedSeniorities) {
    if (remaining.lte(0)) break;
    const group = bySen.get(sen)!;
    const claims = new Map<string, Decimal>();
    let totalClaim = ZERO;
    for (const c of group) {
      const claim = new Decimal(c.shares).times(c.pricePerShare).times(c.liqPref);
      claims.set(c.name, claim);
      totalClaim = totalClaim.plus(claim);
    }
    if (totalClaim.isZero()) continue;

    if (remaining.gte(totalClaim)) {
      for (const [name, claim] of claims) {
        payouts.set(name, payouts.get(name)!.plus(claim));
      }
      remaining = remaining.minus(totalClaim);
    } else {
      for (const [name, claim] of claims) {
        const share = remaining.times(claim).div(totalClaim);
        payouts.set(name, payouts.get(name)!.plus(share));
      }
      remaining = ZERO;
    }
  }

  if (remaining.gt(0)) {
    distributeResidual(capTable, remaining, payouts, converters);
  }

  return payouts;
}

function distributeResidual(
  capTable: CapTable,
  startRemaining: Decimal,
  payouts: Map<string, Decimal>,
  converters: Set<string>,
): void {
  let remaining = startRemaining;

  const isResidualParticipant = (c: ShareClass): boolean => {
    if (c.liqPref === 0) return true;
    if (converters.has(c.name)) return true;
    if (c.participation === "full" || c.participation === "capped") return true;
    return false;
  };

  const cap = (c: ShareClass): Decimal | null => {
    if (c.participation === "capped" && c.participationCap != null && !converters.has(c.name)) {
      return new Decimal(c.shares)
        .times(c.pricePerShare)
        .times(c.participationCap);
    }
    return null;
  };

  const participants = capTable.shareClasses.filter(isResidualParticipant);

  for (let iter = 0; iter < 32; iter++) {
    if (remaining.lte(0)) break;

    const active = participants.filter((c) => {
      if (c.shares <= 0) return false;
      const cp = cap(c);
      if (cp == null) return true;
      return payouts.get(c.name)!.lt(cp);
    });

    if (active.length === 0) break;

    const totalActiveShares = active.reduce(
      (acc, c) => acc.plus(c.shares),
      ZERO,
    );
    if (totalActiveShares.isZero()) break;

    let anyCapped = false;
    let distributedThisPass = ZERO;
    const snapshot = remaining;

    for (const c of active) {
      const proRata = snapshot.times(c.shares).div(totalActiveShares);
      const cp = cap(c);
      let give = proRata;
      if (cp != null) {
        const room = cp.minus(payouts.get(c.name)!);
        if (give.gt(room)) {
          give = room;
          anyCapped = true;
        }
      }
      payouts.set(c.name, payouts.get(c.name)!.plus(give));
      distributedThisPass = distributedThisPass.plus(give);
    }

    remaining = remaining.minus(distributedThisPass);
    if (!anyCapped) break;
  }
}

function buildRows(
  capTable: CapTable,
  classPayouts: Map<string, Decimal>,
  classByName: Map<string, ShareClass>,
): { rows: WaterfallRow[]; exactPayouts: Decimal[] } {
  const rows: WaterfallRow[] = [];
  const exactPayouts: Decimal[] = [];

  for (const h of capTable.holdings) {
    const cls = classByName.get(h.shareClass);
    if (!cls) {
      rows.push({
        holder: h.holder,
        shareClass: h.shareClass,
        payout: 0,
        multiple: 1,
      });
      exactPayouts.push(ZERO);
      continue;
    }

    const classPayout = classPayouts.get(h.shareClass) ?? ZERO;
    const totalClassShares = new Decimal(cls.shares);
    const holderPayout = totalClassShares.isZero()
      ? ZERO
      : classPayout.times(h.shares).div(totalClassShares);

    const invested = new Decimal(h.shares).times(cls.pricePerShare);
    const rounded = holderPayout.toDecimalPlaces(2);
    const multiple = invested.isZero()
      ? 1
      : rounded.div(invested).toDecimalPlaces(10).toNumber();

    rows.push({
      holder: h.holder,
      shareClass: h.shareClass,
      payout: rounded.toNumber(),
      multiple,
    });
    exactPayouts.push(holderPayout);
  }

  return { rows, exactPayouts };
}

function reconcileToExactExit(
  rows: WaterfallRow[],
  exactPayouts: Decimal[],
  capTable: CapTable,
  classByName: Map<string, ShareClass>,
  exit: Decimal,
): void {
  const exitCents = exit.times(100).round();
  let sumCents = ZERO;
  for (const r of rows) {
    sumCents = sumCents.plus(new Decimal(r.payout).times(100).round());
  }
  let diffCents = exitCents.minus(sumCents);
  if (diffCents.isZero()) return;

  const order = rows
    .map((_, i) => {
      const exactCents = exactPayouts[i]!.times(100);
      const rounded = new Decimal(rows[i]!.payout).times(100).round();
      const frac = exactCents.minus(rounded);
      return { i, frac };
    })
    .sort((a, b) => {
      const c = b.frac.comparedTo(a.frac);
      if (c !== 0) return c;
      return a.i - b.i;
    });

  const step = diffCents.gt(0) ? new Decimal(0.01) : new Decimal(-0.01);
  let remaining = diffCents.abs();
  let idx = 0;
  while (remaining.gt(0)) {
    const target = order[idx % order.length]!;
    const row = rows[target.i]!;
    row.payout = new Decimal(row.payout).plus(step).toDecimalPlaces(2).toNumber();

    const holding = capTable.holdings[target.i]!;
    const cls = classByName.get(holding.shareClass);
    if (cls) {
      const invested = new Decimal(holding.shares).times(cls.pricePerShare);
      if (!invested.isZero()) {
        row.multiple = new Decimal(row.payout)
          .div(invested)
          .toDecimalPlaces(10)
          .toNumber();
      }
    }
    remaining = remaining.minus(1);
    idx += 1;
  }
}
