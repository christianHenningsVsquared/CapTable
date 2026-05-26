import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { CapTable, EngineError } from "@shared/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatPercent } from "@/lib/utils";

interface Props {
  companyId: number;
  captable: CapTable | EngineError | null;
}

const COLORS = [
  "url(#bar-gradient-0)",
  "url(#bar-gradient-1)",
  "url(#bar-gradient-2)",
  "url(#bar-gradient-3)",
  "url(#bar-gradient-4)",
  "url(#bar-gradient-5)",
  "url(#bar-gradient-6)",
  "url(#bar-gradient-7)",
];

// Distinct hue pairs for each bar's gradient (top -> bottom)
const GRADIENT_STOPS: Array<[string, string]> = [
  ["#818cf8", "#4f46e5"], // indigo
  ["#a78bfa", "#7c3aed"], // violet
  ["#c084fc", "#9333ea"], // purple
  ["#e879f9", "#c026d3"], // fuchsia
  ["#f0abfc", "#d946ef"], // pink-fuchsia
  ["#f9a8d4", "#db2777"], // pink
  ["#fb7185", "#e11d48"], // rose
  ["#60a5fa", "#2563eb"], // blue
];

export function WaterfallSection({ companyId, captable }: Props) {
  const totalInvested = useMemo(() => {
    if (!captable || "error" in captable) return 0;
    return captable.shareClasses.reduce(
      (sum, c) => sum + c.shares * c.pricePerShare,
      0,
    );
  }, [captable]);

  const max = useMemo(() => Math.max(totalInvested * 10, 50_000_000), [totalInvested]);
  const [exitValue, setExitValue] = useState(0);
  // Debounced copy of exitValue used for the network query. Slider input updates
  // exitValue every pixel; we only refire the waterfall computation once the
  // user pauses, which prevents the chart from thrashing during a drag.
  const [debouncedExit, setDebouncedExit] = useState(0);

  useEffect(() => {
    setExitValue(Math.max(totalInvested * 2, 0));
  }, [totalInvested]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedExit(exitValue), 120);
    return () => clearTimeout(t);
  }, [exitValue]);

  const { data, isFetching } = useQuery({
    queryKey: ["waterfall", companyId, debouncedExit],
    queryFn: () => api.runWaterfall(companyId, debouncedExit),
    enabled: captable != null && !("error" in (captable ?? {})) && debouncedExit >= 0,
    // Keep the previous waterfall visible while the next one is in flight so
    // the chart and table don't unmount on every slider step.
    placeholderData: keepPreviousData,
  });

  if (!captable || "error" in captable) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-6 text-sm text-muted-foreground">
        The waterfall becomes available once the cap table is computable.
      </div>
    );
  }

  const waterfall = data?.waterfall;
  const rows = waterfall?.rows ?? [];

  const chartData = rows.map((r) => ({
    holder: r.holder,
    payout: r.payout,
    multiple: r.multiple,
    shareClass: r.shareClass,
  }));

  const moic = totalInvested > 0 && waterfall ? waterfall.totalPayout / totalInvested : 0;

  return (
    <div className="space-y-6">
      {/* Big gradient exit-value display */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-brand-gradient-radial opacity-40" />
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Exit value
            </p>
            <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-gradient">
              {formatMoney(exitValue)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Total invested:{" "}
              <span className="font-medium text-foreground">{formatMoney(totalInvested)}</span>{" "}
              · drag slider or enter a value
            </p>
          </div>
          <div className="flex md:justify-end">
            <div className="rounded-lg border border-border/60 bg-card/60 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Blended MOIC
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {moic > 0 ? `${moic.toFixed(2)}×` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="relative mt-6 space-y-2">
          <input
            type="range"
            min={0}
            max={max}
            step={Math.max(1, Math.round(max / 1000))}
            value={Math.min(exitValue, max)}
            onChange={(e) => setExitValue(Number(e.target.value))}
            className="slider"
          />
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>$0</span>
            <span>{formatMoney(max, { compact: true })}</span>
          </div>
        </div>

        <div className="relative mt-4 flex items-center gap-3">
          <label className="text-xs text-muted-foreground">Exact value</label>
          <input
            type="number"
            value={exitValue}
            min={0}
            step={100_000}
            onChange={(e) => setExitValue(Math.max(0, Number(e.target.value)))}
            className="h-9 w-48 rounded-md border border-input bg-card/60 px-3 text-sm tabular-nums backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          />
          {isFetching && (
            <span className="text-xs text-muted-foreground">Computing…</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {isFetching ? "Computing…" : "Move the slider to compute payouts."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 40 }}>
              <defs>
                {GRADIENT_STOPS.map(([top, bottom], i) => (
                  <linearGradient
                    key={i}
                    id={`bar-gradient-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={top} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={bottom} stopOpacity={0.8} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
              <XAxis
                dataKey="holder"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
                stroke="hsl(var(--border))"
              />
              <YAxis
                tickFormatter={(v) => formatMoney(v, { compact: true })}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  background: "hsl(var(--card) / 0.95)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  backdropFilter: "blur(8px)",
                  fontSize: 12,
                }}
                formatter={(value, _name, item) => {
                  const v = Number(value);
                  const payload =
                    (item as { payload?: { holder?: string; shareClass?: string; multiple?: number } })
                      .payload ?? {};
                  const tag = payload.shareClass ? ` · ${payload.shareClass}` : "";
                  const mult = payload.multiple ?? 1;
                  return [formatMoney(v), `${payload.holder ?? ""}${tag} (${mult.toFixed(2)}×)`];
                }}
              />
              <Bar dataKey="payout" radius={[6, 6, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Payout table */}
      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Holder</TableHead>
              <TableHead>Share class</TableHead>
              <TableHead className="text-right">Payout</TableHead>
              <TableHead className="text-right">Multiple</TableHead>
              <TableHead className="text-right">Share of exit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.holder}</TableCell>
                <TableCell>
                  <Badge variant={r.shareClass === "Common" ? "outline" : "secondary"}>
                    {r.shareClass}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(r.payout)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      r.multiple >= 1
                        ? "text-emerald-300"
                        : r.multiple === 0
                        ? "text-rose-300"
                        : "text-amber-300"
                    }
                  >
                    {r.multiple.toFixed(2)}×
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {debouncedExit > 0 ? formatPercent(r.payout / debouncedExit, 2) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {waterfall && (
              <TableRow className="border-t-2 border-border/80 bg-muted/30 font-medium">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(waterfall.totalPayout)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moic > 0 && `${moic.toFixed(2)}×`}
                </TableCell>
                <TableCell className="text-right tabular-nums">100.00%</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
