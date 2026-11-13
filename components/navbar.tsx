"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  Globe2,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resetOrdersToDefault } from "@/components/orders-store";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleReset = () => {
    resetOrdersToDefault();
    setResetMessage("Reset to demo baseline!");
    setTimeout(() => setResetMessage(null), 3000);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-navbar">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 text-navy-950 font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                ExportPilot{" "}
                <span className="text-emerald-400 font-mono tabular-nums text-xs bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  PayFlow AI
                </span>
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Cross-Border Export Operations & PayPal Gateway
              </span>
            </div>
          </Link>
        </div>

        {/* Center Indicators: Currency & Sandbox Notice */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/[0.08] text-xs text-slate-300">
            <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono tabular-nums text-white font-medium">USD ($)</span>
            <span className="text-slate-500">•</span>
            <span className="text-[11px] text-slate-400">Zero Float Drift</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/40 backdrop-blur-md border border-amber-500/30 text-amber-300 text-xs font-mono tabular-nums font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>PAYPAL SANDBOX</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {resetMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-fade-in hidden sm:inline">
              ✓ {resetMessage}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs h-8 text-slate-300 hover:text-white border-white/[0.08] bg-slate-900/40 hover:bg-slate-800/60 backdrop-blur-sm"
            title="Reset sample orders to baseline demo state"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </Button>

          <Link href="/orders/new">
            <Button size="sm" className="h-8 text-xs font-semibold shadow-sm shadow-emerald-500/20">
              <PlusCircle className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">New Enquiry</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
