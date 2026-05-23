import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileCode } from "lucide-react";
import { api, type DocumentRow } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

interface Props {
  companyId: number;
  documents: DocumentRow[];
}

export function RawDataView({ companyId, documents }: Props) {
  const { data: extractions = [] } = useQuery({
    queryKey: ["extractions", companyId],
    queryFn: () => api.listExtractions(companyId),
  });

  if (extractions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-6 text-center text-sm text-muted-foreground">
        Upload and extract a document to see the raw structured data with its source.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {extractions.map((e) => {
        const doc = documents.find((d) => d.id === e.document_id);
        return (
          <SourceBlock
            key={e.id}
            title={doc?.filename ?? `Extraction #${e.id}`}
            data={e.extraction}
          />
        );
      })}
    </div>
  );
}

function SourceBlock({ title, data }: { title: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card/40 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-gradient-soft ring-1 ring-brand-400/20">
          <FileCode className="h-3.5 w-3.5 text-brand-300" />
        </div>
        <span className="flex-1 truncate text-sm font-medium">{title}</span>
        <Badge variant="outline">{summarize(data)}</Badge>
      </button>
      {open && (
        <pre className="max-h-96 overflow-auto border-t border-border/60 bg-background/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function summarize(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as { rounds?: unknown[]; investors?: unknown[] };
  const rounds = Array.isArray(d.rounds) ? d.rounds.length : 0;
  const investors = Array.isArray(d.investors) ? d.investors.length : 0;
  return `${formatNumber(rounds)} rd · ${formatNumber(investors)} inv`;
}
