import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, KeyRound, Trash2, Lock } from "lucide-react";
import { api, type Provider } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  langdock: "Langdock",
};

const PROVIDER_PLACEHOLDERS: Record<Provider, string> = {
  anthropic: "sk-ant-…",
  openai: "sk-…",
  langdock: "sk-…",
};

const PROVIDERS: readonly Provider[] = ["anthropic", "openai", "langdock"] as const;

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ["config"],
    queryFn: api.getConfig,
    enabled: open,
  });

  const [provider, setProvider] = useState<Provider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [baseURL, setBaseURL] = useState("");

  useEffect(() => {
    if (status?.provider) setProvider(status.provider);
    if (status?.baseURL) setBaseURL(status.baseURL);
  }, [status?.provider, status?.baseURL]);

  const save = useMutation({
    mutationFn: () =>
      api.saveConfig(provider, apiKey, {
        ...(provider === "langdock" && baseURL.trim() ? { baseURL: baseURL.trim() } : {}),
      }),
    onSuccess: () => {
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const clear = useMutation({
    mutationFn: api.clearConfig,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["config"] }),
  });

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-gradient shadow-[0_4px_14px_-4px_rgba(99,102,241,0.7)]">
            <KeyRound className="h-3.5 w-3.5 text-white" />
          </div>
          API key
        </DialogTitle>
        <DialogDescription className="flex items-start gap-1.5">
          <Lock className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <span>
            Stored locally in{" "}
            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[11px]">
              ~/.captable/config.json
            </code>{" "}
            with mode 0600. The key is never sent back to this browser — the dialog only shows a
            masked preview.
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm backdrop-blur-sm">
          {status?.hasKey ? (
            <>
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>
                Key configured ({status.provider}):{" "}
                <span className="font-mono text-xs">{status.maskedKey}</span>
              </span>
              <Badge variant="success" className="ml-auto">
                active
              </Badge>
            </>
          ) : (
            <span className="text-muted-foreground">No key configured.</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <div className="flex gap-2">
            {PROVIDERS.map((p) => (
              <Button
                key={p}
                variant={provider === p ? "default" : "outline"}
                size="sm"
                type="button"
                onClick={() => setProvider(p)}
              >
                {PROVIDER_LABELS[p]}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">{PROVIDER_LABELS[provider]} key</Label>
          <Input
            id="apiKey"
            type="password"
            autoComplete="off"
            placeholder={PROVIDER_PLACEHOLDERS[provider]}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="font-mono"
          />
        </div>

        {provider === "langdock" && (
          <div className="space-y-2">
            <Label htmlFor="baseURL">Base URL (optional)</Label>
            <Input
              id="baseURL"
              type="text"
              autoComplete="off"
              placeholder="https://api.langdock.com/openai/eu/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for the EU default. Override for US or dedicated deployments.
            </p>
          </div>
        )}

        {save.isError && (
          <p className="text-sm text-rose-300">{(save.error as Error).message}</p>
        )}
      </div>

      <DialogFooter>
        {status?.hasKey && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Remove the stored API key?")) clear.mutate();
            }}
            className="mr-auto text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove key
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={() => save.mutate()}
          disabled={!apiKey.trim() || save.isPending}
        >
          {save.isPending ? "Saving…" : "Save key"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
