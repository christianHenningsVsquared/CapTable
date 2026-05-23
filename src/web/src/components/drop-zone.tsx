import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { api, type DocumentRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  companyId: number;
  documents: DocumentRow[];
  hasApiKey: boolean;
}

const ACCEPT = ".txt,.md,.pdf,.docx,.xlsx";

export function DropZone({ companyId, documents, hasApiKey }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (files: File[]) => api.uploadDocuments(companyId, files),
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      if (hasApiKey) {
        for (const doc of result.documents) {
          await api.extractDocument(doc.id).catch(() => {});
        }
        queryClient.invalidateQueries({ queryKey: ["company", companyId] });
        queryClient.invalidateQueries({ queryKey: ["extractions", companyId] });
      }
    },
  });

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) upload.mutate(files);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-border/70 bg-card/30 p-10 transition-all",
          "hover:border-brand-400/50 hover:bg-card/50",
          isDragging && "border-brand-400/80 bg-card/60 shadow-glow",
          upload.isPending && "pointer-events-none opacity-60",
        )}
      >
        {/* gradient halo on hover/drag */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity",
            (isDragging || upload.isPending) && "opacity-100",
            "group-hover:opacity-60",
          )}
          style={{
            background:
              "radial-gradient(420px 220px at 50% 50%, rgba(139,92,246,0.18), transparent 70%)",
          }}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) upload.mutate(files);
            e.target.value = "";
          }}
          className="hidden"
        />

        {upload.isPending ? (
          <>
            <Loader2 className="h-7 w-7 animate-spin text-brand-300" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </>
        ) : (
          <>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient-soft ring-1 ring-brand-400/30">
              <UploadCloud className="h-5 w-5 text-brand-300" />
              <div className="absolute inset-0 rounded-xl bg-brand-gradient opacity-0 blur-xl transition-opacity group-hover:opacity-30" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drop term sheets, SHAs, side letters here
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-mono">.txt</span> ·{" "}
                <span className="font-mono">.md</span> ·{" "}
                <span className="font-mono">.pdf</span> ·{" "}
                <span className="font-mono">.docx</span> ·{" "}
                <span className="font-mono">.xlsx</span> — multiple files supported
              </p>
            </div>
          </>
        )}
      </div>

      {!hasApiKey && documents.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Configure your API key in Settings to extract data from these documents.
        </div>
      )}

      {upload.isError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {(upload.error as Error).message}
        </div>
      )}

      {documents.length > 0 && (
        <ul className="space-y-1.5">
          {documents.map((d) => (
            <DocItem key={d.id} doc={d} companyId={companyId} hasApiKey={hasApiKey} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocItem({
  doc,
  companyId,
  hasApiKey,
}: {
  doc: DocumentRow;
  companyId: number;
  hasApiKey: boolean;
}) {
  const queryClient = useQueryClient();
  const extract = useMutation({
    mutationFn: () => api.extractDocument(doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["extractions", companyId] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.deleteDocument(doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", companyId] });
      queryClient.invalidateQueries({ queryKey: ["extractions", companyId] });
    },
  });

  const ext = doc.filename.split(".").pop()?.toLowerCase() ?? doc.mime_type.split("/").pop();

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-3 py-2.5 backdrop-blur-sm transition-colors hover:border-border">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-gradient-soft ring-1 ring-brand-400/20">
        <FileText className="h-4 w-4 text-brand-300" />
      </div>
      <div className="flex-1 truncate">
        <p className="truncate text-sm font-medium">{doc.filename}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono uppercase">{ext}</span> ·{" "}
          {Math.max(1, Math.round(doc.size_bytes / 1024))} KB
        </p>
      </div>
      {doc.has_extraction ? (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          extracted
        </Badge>
      ) : extract.isPending ? (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          extracting
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          disabled={!hasApiKey || extract.isPending}
          onClick={() => extract.mutate()}
        >
          Extract
        </Button>
      )}
      <button
        type="button"
        aria-label="Delete document"
        onClick={() => {
          if (confirm(`Delete "${doc.filename}"?`)) remove.mutate();
        }}
        className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {extract.isError && (
        <span className="ml-2 text-xs text-rose-300">{(extract.error as Error).message}</span>
      )}
    </li>
  );
}
