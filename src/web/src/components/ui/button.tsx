import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default:
    "relative bg-brand-gradient text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7)] hover:brightness-110 hover:shadow-[0_10px_28px_-6px_rgba(217,70,239,0.6)] focus-visible:ring-brand-400",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_8px_24px_-10px_rgba(239,68,68,0.6)]",
  outline:
    "border border-border bg-card/40 backdrop-blur-sm text-foreground hover:bg-accent hover:border-brand-400/40",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
  ghost: "text-foreground/80 hover:bg-accent hover:text-foreground",
  link: "text-primary underline-offset-4 hover:underline",
} as const;

const sizes = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-11 rounded-lg px-6 text-base",
  icon: "h-9 w-9",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
