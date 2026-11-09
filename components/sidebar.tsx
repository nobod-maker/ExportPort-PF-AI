"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSpreadsheet,
  PlusCircle,
  Bot,
  ShieldCheck,
  CreditCard,
  Building2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SEED_PROFILE } from "@/lib/mock-data";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Orders Management",
    href: "/orders",
    icon: FileSpreadsheet,
    badge: "AG Grid",
    exact: true,
  },
  {
    name: "New Enquiry Intake",
    href: "/orders/new",
    icon: PlusCircle,
    badge: "AI Parse",
  },
  {
    name: "AI Trade Assistant",
    href: "/assistant",
    icon: Bot,
    badge: "Live",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070B16] flex flex-col justify-between shrink-0 hidden md:flex">
      {/* Navigation Links */}
      <div className="p-4 space-y-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Operations
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                    isActive
                      ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive
                          ? "text-emerald-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider",
                        isActive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-slate-800/80 text-slate-400"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Integration Status Box */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Gateway Status</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </p>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-sky-400" />
              PayPal Orders v2
            </span>
            <Badge variant="warning" className="text-[9px] px-1.5 py-0">
              Sandbox
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Webhook Reconciled
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">
              4-Way
            </span>
          </div>
        </div>
      </div>

      {/* Exporter Profile Card at Bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shrink-0">
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">
              {SEED_PROFILE.business_name}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Exporter • {SEED_PROFILE.country_code} ({SEED_PROFILE.currency_preference})
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
