import { Sparkles, FileText, GitMerge, BarChart3 } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center px-8">
      <div className="relative max-w-2xl text-center">
        <div className="pointer-events-none absolute -inset-x-32 -inset-y-24 -z-10 rounded-[6rem] bg-brand-gradient-radial blur-2xl" />

        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-[0_12px_40px_-12px_rgba(99,102,241,0.8)]">
          <Sparkles className="h-6 w-6 text-white" />
        </div>

        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-gradient">CapTable</span> for VCs
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Drop term sheets and SHAs, watch the cap table assemble itself, and model exits in real
          time.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-3 text-left">
          <FeatureTile
            icon={<FileText className="h-4 w-4" />}
            title="Ingest"
            body="PDF, DOCX, XLSX, text — drop them in."
          />
          <FeatureTile
            icon={<GitMerge className="h-4 w-4" />}
            title="Merge"
            body="Reconcile values across docs into one truth."
          />
          <FeatureTile
            icon={<BarChart3 className="h-4 w-4" />}
            title="Model"
            body="Waterfall returns at any exit value."
          />
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Pick a company from the sidebar, or create a new fund to begin.
        </p>
      </div>
    </div>
  );
}

function FeatureTile({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl glass p-4">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-gradient-soft text-brand-300 ring-1 ring-brand-400/30">
        {icon}
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
