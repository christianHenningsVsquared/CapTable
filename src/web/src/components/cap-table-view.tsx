import { AlertCircle } from "lucide-react";
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
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

interface Props {
  captable: CapTable | EngineError | null;
}

export function CapTableView({ captable }: Props) {
  if (!captable) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
        No cap table yet — save a merged view to compute one.
      </div>
    );
  }

  if ("error" in captable) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4" />
          Missing data — engine can't compute cap table yet
        </div>
        <ul className="ml-6 list-disc text-xs">
          {captable.missing.map((m) => (
            <li key={m} className="font-mono">
              {m}
            </li>
          ))}
        </ul>
        <p className="text-xs">Fill those fields in the merge view above and save.</p>
      </div>
    );
  }

  const totalInvested = captable.shareClasses.reduce(
    (s, c) => s + c.shares * c.pricePerShare,
    0,
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Holder</TableHead>
          <TableHead>Share class</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="w-[32%]">Ownership</TableHead>
          <TableHead className="text-right">Invested</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {captable.holdings.map((h, i) => {
          const cls = captable.shareClasses.find((c) => c.name === h.shareClass);
          const invested = (cls?.pricePerShare ?? 0) * h.shares;
          const ownership = captable.totalShares > 0 ? h.shares / captable.totalShares : 0;
          return (
            <TableRow key={`${h.holder}-${h.shareClass}-${i}`}>
              <TableCell className="font-medium">{h.holder}</TableCell>
              <TableCell>
                <Badge variant={h.shareClass === "Common" ? "outline" : "secondary"}>
                  {h.shareClass}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(h.shares)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-gradient"
                      style={{ width: `${Math.max(0.5, ownership * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">
                    {formatPercent(ownership, 2)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {invested === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  formatMoney(invested)
                )}
              </TableCell>
            </TableRow>
          );
        })}
        <TableRow className="border-t-2 border-border/80 bg-muted/30 font-medium">
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right tabular-nums">
            {formatNumber(captable.totalShares)}
          </TableCell>
          <TableCell>
            <div className="h-2 rounded-full bg-brand-gradient" />
          </TableCell>
          <TableCell className="text-right tabular-nums">
            {formatMoney(totalInvested)}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
