"use client";

import { ActivityEvent, ActivityActor } from "@/types";
import {
  Bot,
  UserCheck,
  CreditCard,
  User,
  Settings,
  ShieldCheck,
  Clock,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  events?: ActivityEvent[];
  className?: string;
}

export function OrderTimeline({ events = [], className }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className={cn("p-6 text-center text-slate-500 text-sm", className)}>
        <Clock className="h-6 w-6 mx-auto mb-2 text-slate-600" />
        No activity events recorded yet.
      </div>
    );
  }

  // Sort events chronologically (oldest to newest)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const getActorIcon = (actor: ActivityActor) => {
    switch (actor) {
      case "ai":
        return <Bot className="h-3.5 w-3.5 text-emerald-400" />;
      case "seller":
        return <UserCheck className="h-3.5 w-3.5 text-sky-400" />;
      case "paypal":
        return <CreditCard className="h-3.5 w-3.5 text-amber-400" />;
      case "buyer":
        return <User className="h-3.5 w-3.5 text-purple-400" />;
      case "system":
      default:
        return <Settings className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const getActorBadgeVariant = (actor: ActivityActor) => {
    switch (actor) {
      case "ai":
        return "success";
      case "seller":
        return "info";
      case "paypal":
        return "warning";
      case "buyer":
        return "secondary";
      case "system":
      default:
        return "outline";
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className={cn("relative space-y-4", className)}>
      {/* Vertical Connecting Line */}
      <div className="absolute left-4 top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-500/40 via-white/[0.08] to-slate-800" />

      {sortedEvents.map((event, index) => {
        const isLatest = index === sortedEvents.length - 1;

        return (
          <div key={event.id || index} className="relative flex items-start gap-4 group">
            {/* Timeline Node Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-slate-900/80 backdrop-blur-md shadow-md shrink-0 transition-transform group-hover:scale-110",
                isLatest
                  ? "border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/30"
                  : "border-white/[0.12]"
              )}
            >
              {getActorIcon(event.actor)}
            </div>

            {/* Event Content Card */}
            <div className="flex-1 rounded-xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-md p-3.5 text-xs shadow-rim-135">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant={getActorBadgeVariant(event.actor)} className="capitalize text-[10px] px-2 py-0 font-mono tabular-nums">
                    {event.actor}
                  </Badge>
                  <span className="font-mono tabular-nums text-[11px] text-slate-400 uppercase tracking-wider">
                    {event.event_type.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-slate-400">
                  {formatTimestamp(event.created_at)}
                </span>
              </div>

              <p className="text-slate-200 font-medium leading-relaxed">
                {event.summary}
              </p>

              {/* Event Metadata (if any) */}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap gap-2 text-[11px] font-mono tabular-nums text-slate-400">
                  {Object.entries(event.metadata).map(([k, v]) => {
                    if (v === null || v === undefined) return null;
                    const displayVal = typeof v === "object" ? JSON.stringify(v) : String(v);
                    return (
                      <span key={k} className="px-1.5 py-0.5 rounded-md bg-slate-950/60 backdrop-blur-sm border border-white/[0.06]">
                        <span className="text-slate-500">{k}:</span> {displayVal}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
