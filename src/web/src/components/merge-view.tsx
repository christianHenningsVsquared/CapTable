import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, GitMerge } from "lucide-react";
import { api, type DocumentRow, type ExtractionRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Extraction, ExtractedRound, ExtractedInvestor } from "@shared/types";

interface Props {
  companyId: number;
  documents: DocumentRow[];
  merged: Extraction | null;
}

const ROUND_FIELDS = [
  "preMoney",
  "investment",
  "pricePerShare",
  "liqPref",
  "participation",
  "participationCap",
  "seniority",
  "date",
] as const;
type RoundField = (typeof ROUND_FIELDS)[number];

/**
 * Manual merge UI. Shows every per-document extraction side-by-side with the
 * curated "merged" extraction. The user picks (or types) the value for each
 * cell; saving writes the merged view to the engine.
 */
export function MergeView({ companyId, documents, merged }: Props) {
  const queryClient = useQueryClient();
  const { data: extractions = [] } = useQuery({
    queryKey: ["extractions", companyId],
    queryFn: () => api.listExtractions(companyId),
  });

  const [draft, setDraft] = useState<Extraction | null>(merged);
  useEffect(() => {
    setDraft(merged);
  }, [merged]);

  const save = useMutation({
    mutationFn: (e: Extraction) => api.saveMerged(companyId, e),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
    },
  });

  const docNamesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of documents) m.set(d.id, d.filename);
    return m;
  }, [documents]);

  // The union of round names across all per-doc extractions and the merged view.
  const allRoundNames = useMemo(() => {
    const set = new Set<string>();
    for (const e of extractions) for (const r of e.extraction.rounds) set.add(r.name);
    if (draft) for (const r of draft.rounds) set.add(r.name);
    return [...set];
  }, [extractions, draft]);

  if (extractions.length === 0 || !draft) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Extract at least one document to start merging.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Manual merge</h3>
          <p className="text-xs text-muted-foreground">
            Click a cell to copy that value into the merged view. The merged extraction is what
            feeds the cap table and waterfall.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => save.mutate(draft)}
          disabled={save.isPending}
        >
          <Save className="h-3.5 w-3.5" />
          {save.isPending ? "Saving…" : "Save merged view"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Company name</CardTitle>
          <CardDescription>
            Picked from one of the extracted documents, or edit directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyMerge
            draft={draft}
            extractions={extractions}
            docNamesById={docNamesById}
            onChange={(v) =>
              setDraft({ ...draft, company: { ...draft.company, name: v } })
            }
          />
        </CardContent>
      </Card>

      {allRoundNames.map((roundName) => (
        <Card key={roundName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Round: {roundName}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoundMergeTable
              roundName={roundName}
              draft={draft}
              extractions={extractions}
              docNamesById={docNamesById}
              onPatchRound={(patch) =>
                setDraft({
                  ...draft,
                  rounds: upsertRound(draft.rounds, roundName, patch),
                })
              }
              onPatchInvestors={(investors) =>
                setDraft({ ...draft, investors: setInvestorsForRound(draft.investors, roundName, investors) })
              }
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CompanyMerge({
  draft,
  extractions,
  docNamesById,
  onChange,
}: {
  draft: Extraction;
  extractions: ExtractionRow[];
  docNamesById: Map<number, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <input
        value={draft.company.name}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap gap-2">
        {extractions.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onChange(row.extraction.company.name)}
            className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs hover:bg-accent"
          >
            <span className="text-muted-foreground">
              {docNamesById.get(row.document_id ?? -1) ?? "extraction"}:
            </span>{" "}
            <span className="font-medium">{row.extraction.company.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RoundMergeTable({
  roundName,
  draft,
  extractions,
  docNamesById,
  onPatchRound,
  onPatchInvestors,
}: {
  roundName: string;
  draft: Extraction;
  extractions: ExtractionRow[];
  docNamesById: Map<number, string>;
  onPatchRound: (patch: Partial<ExtractedRound>) => void;
  onPatchInvestors: (investors: ExtractedInvestor[]) => void;
}) {
  const draftRound = draft.rounds.find((r) => r.name === roundName) ?? blankRound(roundName);
  const candidates = extractions
    .map((e) => ({
      row: e,
      round: e.extraction.rounds.find((r) => r.name === roundName) ?? null,
    }))
    .filter((c) => c.round !== null) as Array<{ row: ExtractionRow; round: ExtractedRound }>;

  const investorsInDraft = draft.investors.filter((i) => i.round === roundName);
  const investorCandidates = new Map<string, Array<{ docName: string; amount: number | null }>>();
  for (const e of extractions) {
    for (const inv of e.extraction.investors) {
      if (inv.round !== roundName) continue;
      const arr = investorCandidates.get(inv.name) ?? [];
      arr.push({ docName: docNamesById.get(e.document_id ?? -1) ?? "extraction", amount: inv.amount });
      investorCandidates.set(inv.name, arr);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3">Field</th>
            <th className="py-2 pr-3">Merged value</th>
            {candidates.map(({ row }) => (
              <th key={row.id} className="py-2 pr-3 font-normal">
                <Badge variant="outline">{docNamesById.get(row.document_id ?? -1) ?? "extraction"}</Badge>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROUND_FIELDS.map((field) => (
            <tr key={field} className="border-b border-border/60 align-top">
              <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{field}</td>
              <td className="py-2 pr-3">
                <input
                  value={cellValue(draftRound[field])}
                  onChange={(e) => onPatchRound({ [field]: coerce(field, e.target.value) } as Partial<ExtractedRound>)}
                  className="flex h-8 w-40 rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="(null)"
                />
              </td>
              {candidates.map(({ row, round }) => {
                const v = round[field];
                const display = cellValue(v);
                return (
                  <td key={row.id} className="py-2 pr-3">
                    <button
                      type="button"
                      disabled={v == null}
                      onClick={() => onPatchRound({ [field]: v } as Partial<ExtractedRound>)}
                      className="rounded-md border border-border bg-muted/30 px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
                    >
                      {v == null ? "—" : display}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Investors
        </h4>
        {investorCandidates.size === 0 ? (
          <p className="text-xs text-muted-foreground">No investors named for this round.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Investor</th>
                <th className="py-2 pr-3">Merged amount</th>
                <th className="py-2 pr-3">From docs</th>
              </tr>
            </thead>
            <tbody>
              {[...investorCandidates.entries()].map(([name, options]) => {
                const draftInv = investorsInDraft.find((i) => i.name === name);
                return (
                  <tr key={name} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{name}</td>
                    <td className="py-2 pr-3">
                      <input
                        value={draftInv?.amount == null ? "" : String(draftInv.amount)}
                        onChange={(e) => {
                          const amount = e.target.value === "" ? null : Number(e.target.value);
                          const others = investorsInDraft.filter((i) => i.name !== name);
                          const next = [...others, { name, round: roundName, amount: Number.isFinite(amount as number) ? (amount as number | null) : null }];
                          onPatchInvestors(next);
                        }}
                        className="flex h-8 w-40 rounded-md border border-input bg-background px-2 text-xs"
                        placeholder="(null)"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {options.map((o, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={o.amount == null}
                            onClick={() => {
                              const others = investorsInDraft.filter((i) => i.name !== name);
                              const next = [...others, { name, round: roundName, amount: o.amount }];
                              onPatchInvestors(next);
                            }}
                            className="rounded border border-border bg-muted/30 px-2 py-0.5 text-xs hover:bg-accent disabled:opacity-40"
                          >
                            {o.docName}: {o.amount == null ? "—" : o.amount.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function blankRound(name: string): ExtractedRound {
  return {
    name,
    date: null,
    preMoney: null,
    investment: null,
    pricePerShare: null,
    liqPref: null,
    participation: null,
    participationCap: null,
    seniority: null,
  };
}

function upsertRound(rounds: ExtractedRound[], name: string, patch: Partial<ExtractedRound>): ExtractedRound[] {
  const idx = rounds.findIndex((r) => r.name === name);
  if (idx === -1) return [...rounds, { ...blankRound(name), ...patch }];
  const next = [...rounds];
  next[idx] = { ...next[idx]!, ...patch };
  return next;
}

function setInvestorsForRound(
  investors: ExtractedInvestor[],
  round: string,
  next: ExtractedInvestor[],
): ExtractedInvestor[] {
  const others = investors.filter((i) => i.round !== round);
  return [...others, ...next];
}

function cellValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") return String(v);
  return String(v);
}

function coerce(field: RoundField, raw: string): unknown {
  if (raw === "") return null;
  if (field === "participation") {
    return raw === "none" || raw === "full" || raw === "capped" ? raw : null;
  }
  if (field === "date") return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
