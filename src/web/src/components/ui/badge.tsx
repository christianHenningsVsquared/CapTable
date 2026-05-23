import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "bg-brand-gradient text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.6)]",
  secondary:
    "bg-secondary text-secondary-foreground border border-border/60",
  outline: "border border-border/70 bg-card/40 text-foreground/80",
  destructive:
    "bg-destructive/15 text-rose-300 border border-rose-500/30",
  success:
    "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  warning:
    "bg-amber-500/15 text-amber-300 border border-amber-500/30",
} as const;

export type BadgeVariant = keyof typeof variants;

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
