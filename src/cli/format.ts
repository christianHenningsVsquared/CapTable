// Tiny formatters for the CLI. Pure functions — easy to unit-test if needed.

import type { CapTable, WaterfallResult } from "../shared/types.js";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});
const mul = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function money(n: number): string {
  return usd.format(n);
}
export function shares(n: number): string {
  return int.format(n);
}
export function percent(n: number): string {
  return pct.format(n);
}
export function multiple(n: number): string {
  return `${mul.format(n)}x`;
}

/** Render a 2D array of strings as a fixed-width table (header in row 0). */
export function table(rows: string[][]): string {
  const header = rows[0];
  if (!header) return "";
  const widths = header.map((_, col) =>
    Math.max(...rows.map((r) => (r[col] ?? "").length)),
  );
  const line = (r: string[]) =>
    r.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ").trimEnd();
  const sep = widths.map((w) => "─".repeat(w)).join("  ");
  return [line(header), sep, ...rows.slice(1).map(line)].join("\n");
}

export function formatCapTable(cap: CapTable): string {
  const rows: string[][] = [["Holder", "Share Class", "Shares", "Ownership"]];
  for (const h of cap.holdings) {
    rows.push([
      h.holder,
      h.shareClass,
      shares(h.shares),
      percent(h.shares / cap.totalShares),
    ]);
  }
  rows.push(["TOTAL", "", shares(cap.totalShares), percent(1)]);
  return table(rows);
}

export function formatWaterfall(wf: WaterfallResult): string {
  const rows: string[][] = [["Holder", "Share Class", "Payout", "Multiple"]];
  for (const r of wf.rows) {
    rows.push([r.holder, r.shareClass, money(r.payout), multiple(r.multiple)]);
  }
  rows.push(["TOTAL", "", money(wf.totalPayout), ""]);
  return table(rows);
}
