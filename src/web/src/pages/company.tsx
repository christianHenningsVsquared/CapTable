import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  FileText,
  Layers,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { DropZone } from "@/components/drop-zone";
import { MergeView } from "@/components/merge-view";
import { CapTableView } from "@/components/cap-table-view";
import { WaterfallSection } from "@/components/waterfall-section";
import { RawDataView } from "@/components/raw-data-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export function CompanyView() {
  const params = useParams();
  const companyId = Number(params.companyId);

  const { data: status } = useQuery({ queryKey: ["config"], queryFn: api.getConfig });
  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => api.getCompany(companyId),
    enabled: Number.isFinite(companyId),
    refetchInterval: 5_000,
  });

  const stats = useMemo(() => {
    const docs = data?.documents.length ?? 0;
    const rounds = data?.merged?.rounds.length ?? 0;
    const investors = data?.merged?.investors.length ?? 0;
    const captable = data?.captable;
    const invested =
      captable && !("error" in captable)
        ? captable.shareClasses.reduce((s, c) => s + c.shares * c.pricePerShare, 0)
        : 0;
    const latestPreMoney = data?.merged?.rounds
      .filter((r) => r.preMoney != null)
      .map((r) => r.preMoney as number)
      .pop();
    return { docs, rounds, investors, invested, latestPreMoney };
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-400">{(error as Error).message}</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-8 py-10">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl glass p-8">
        <div className="pointer-events-none absolute inset-0 bg-brand-gradient-radial opacity-70" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px hairline-gradient" />
        <div className="relative flex items-start justify-between gap-6">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Portfolio Company
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient">{data.company.name}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Ingest financing documents, reconcile them into one source of truth, and explore
              what each exit scenario means for every holder.
            </p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="relative mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile
            icon={<FileText className="h-4 w-4" />}
            label="Documents"
            value={stats.docs.toString()}
          />
          <StatTile
            icon={<Layers className="h-4 w-4" />}
            label="Rounds"
            value={stats.rounds.toString()}
            sub={`${stats.investors} investors`}
          />
          <StatTile
            icon={<DollarSign className="h-4 w-4" />}
            label="Total invested"
            value={stats.invested > 0 ? formatMoney(stats.invested, { compact: true }) : "—"}
          />
          <StatTile
            icon={<TrendingUp className="h-4 w-4" />}
            label="Last pre-money"
            value={
              stats.latestPreMoney != null
                ? formatMoney(stats.latestPreMoney, { compact: true })
                : "—"
            }
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            Drop term sheets, SHAs, side letters, or cap-table workbooks. Each file produces its
            own extraction; merge them below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            companyId={companyId}
            documents={data.documents}
            hasApiKey={Boolean(status?.hasKey)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Raw data · with sources</CardTitle>
          <CardDescription>
            Per-document extractions exactly as the LLM produced them. Numbers come straight from
            the contract — nothing inferred.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RawDataView companyId={companyId} documents={data.documents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merge</CardTitle>
          <CardDescription>
            Reconcile conflicting values across documents into one curated extraction. This is
            what the cap-table engine consumes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MergeView companyId={companyId} documents={data.documents} merged={data.merged} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cap table</CardTitle>
          <CardDescription>
            Computed by the engine from the merged extraction. Founders' Common is derived from
            the first round's pre-money and price per share.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CapTableView captable={data.captable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waterfall · returns by exit value</CardTitle>
          <CardDescription>
            Drag the slider to model exit scenarios. Preferred liquidation preferences are
            evaluated; capped-participating preferred convert when conversion pays more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaterfallSection companyId={companyId} captable={data.captable} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-brand-gradient-soft text-brand-300 ring-1 ring-brand-400/30">
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
