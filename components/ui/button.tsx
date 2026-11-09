import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "destructive"
    | "emerald-outline";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 disabled:pointer-events-none disabled:opacity-50 select-none rounded-lg cursor-pointer";

    const variantStyles = {
      default:
        "bg-emerald-500 text-navy-950 font-semibold hover:bg-emerald-400 active:bg-emerald-600 shadow-sm shadow-emerald-950/40",
      secondary:
        "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-850 border border-slate-700/60",
      outline:
        "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800/80 hover:text-white",
      "emerald-outline":
        "border border-emerald-500/60 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-400",
      ghost:
        "bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-slate-100",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-lg px-6 text-base font-medium",
      icon: "h-10 w-10 p-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
