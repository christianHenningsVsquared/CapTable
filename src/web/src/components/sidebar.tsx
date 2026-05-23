import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Settings,
  Building2,
  Briefcase,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { api, type Fund, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsDialog } from "@/components/settings-dialog";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: funds = [] } = useQuery({
    queryKey: ["funds"],
    queryFn: api.listFunds,
  });
  const { data: status } = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
  });

  return (
    <aside className="relative flex h-full w-72 flex-shrink-0 flex-col border-r border-border/60 bg-card/40 backdrop-blur-xl">
      <div className="absolute inset-y-0 right-0 w-px hairline-gradient opacity-60" />

      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <Link to="/" className="group flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-[0_4px_20px_-4px_rgba(99,102,241,0.7)]">
            <Sparkles className="h-4 w-4 text-white" />
            <div className="absolute inset-0 rounded-lg bg-brand-gradient opacity-50 blur-md transition-opacity group-hover:opacity-80" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">CapTable</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Local
            </p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Portfolio
        </p>
        <FundList funds={funds} />
      </div>

      <NewFundForm />

      {/* API key status footer */}
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="flex items-center gap-3 border-t border-border/60 px-5 py-3 text-left text-xs transition-colors hover:bg-accent/40"
      >
        {status?.hasKey ? (
          <>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <p className="font-medium text-foreground">Key configured</p>
              <p className="text-muted-foreground">
                {status.provider} · <span className="font-mono">{status.maskedKey}</span>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <p className="font-medium text-foreground">No API key</p>
              <p className="text-muted-foreground">Click to configure</p>
            </div>
          </>
        )}
      </button>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </aside>
  );
}

function FundList({ funds }: { funds: Fund[] }) {
  if (funds.length === 0) {
    return (
      <div className="mx-2 rounded-lg border border-dashed border-border/60 bg-card/30 px-3 py-6 text-center text-xs text-muted-foreground">
        No funds yet.<br />
        Create one below.
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {funds.map((f) => (
        <FundItem key={f.id} fund={f} />
      ))}
    </ul>
  );
}

function FundItem({ fund }: { fund: Fund }) {
  const params = useParams();
  const queryClient = useQueryClient();
  const isActive = String(fund.id) === params.fundId;

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", fund.id],
    queryFn: () => api.listCompanies(fund.id),
  });

  const deleteFund = useMutation({
    mutationFn: () => api.deleteFund(fund.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["funds"] }),
  });

  return (
    <li>
      <div
        className={cn(
          "group flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors",
          isActive ? "bg-accent/60" : "hover:bg-accent/40",
        )}
      >
        <Link
          to={`/funds/${fund.id}`}
          className="flex flex-1 items-center gap-2 text-sm font-medium"
        >
          <Briefcase
            className={cn(
              "h-4 w-4",
              isActive ? "text-brand-300" : "text-muted-foreground",
            )}
          />
          <span className="truncate">{fund.name}</span>
        </Link>
        <span className="mr-1 text-[10px] tabular-nums text-muted-foreground">
          {companies.length}
        </span>
        <button
          type="button"
          className="invisible rounded p-1 text-muted-foreground transition-colors hover:text-rose-400 group-hover:visible"
          onClick={() => {
            if (confirm(`Delete fund "${fund.name}" and all its companies?`)) {
              deleteFund.mutate();
            }
          }}
          aria-label={`Delete ${fund.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <ul className="ml-4 mt-1 space-y-0.5 border-l border-border/60 pl-3">
        {companies.map((c) => (
          <CompanyItem key={c.id} fund={fund} company={c} />
        ))}
        <NewCompanyForm fundId={fund.id} />
      </ul>
    </li>
  );
}

function CompanyItem({ fund, company }: { fund: Fund; company: Company }) {
  const params = useParams();
  const isActive = String(company.id) === params.companyId;
  return (
    <li>
      <Link
        to={`/funds/${fund.id}/companies/${company.id}`}
        className={cn(
          "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-brand-gradient-soft font-medium text-foreground"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-gradient" />
        )}
        <Building2
          className={cn(
            "h-3.5 w-3.5",
            isActive ? "text-brand-300" : "text-muted-foreground",
          )}
        />
        <span className="truncate">{company.name}</span>
      </Link>
    </li>
  );
}

function NewCompanyForm({ fundId }: { fundId: number }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (n: string) => api.createCompany(fundId, n),
    onSuccess: () => {
      setName("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["companies", fundId] });
    },
  });

  if (!open) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add company
        </button>
      </li>
    );
  }
  return (
    <li className="py-1">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate(name.trim());
        }}
        className="flex gap-1"
      >
        <Input
          autoFocus
          placeholder="Company name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => !name && setOpen(false)}
          className="h-7 text-xs"
        />
        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!name.trim()}>
          Add
        </Button>
      </form>
    </li>
  );
}

function NewFundForm() {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (n: string) => api.createFund(n),
    onSuccess: () => {
      setName("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["funds"] });
    },
  });

  return (
    <div className="border-t border-border/60 p-3">
      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim());
          }}
          className="flex gap-1"
        >
          <Input
            autoFocus
            placeholder="Fund name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => !name && setOpen(false)}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={!name.trim()}>
            Add
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Fund
        </Button>
      )}
    </div>
  );
}
