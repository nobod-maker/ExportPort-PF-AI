import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "info"
    | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variantStyles = {
    default:
      "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30",
    secondary:
      "bg-slate-800 text-slate-300 border border-slate-700/60",
    outline:
      "text-slate-300 border border-slate-700 bg-transparent",
    success:
      "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40",
    warning:
      "bg-amber-950/80 text-amber-300 border border-amber-500/40",
    info:
      "bg-sky-950/80 text-sky-300 border border-sky-500/40",
    destructive:
      "bg-rose-950/80 text-rose-300 border border-rose-500/40",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
