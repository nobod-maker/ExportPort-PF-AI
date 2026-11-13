"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, RotateCcw, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrdersGrid } from "@/components/orders-grid";
import { ExportOrder } from "@/types";
import { getStoredOrders, resetOrdersToDefault } from "@/components/orders-store";

export default function OrdersPage() {
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const loadOrders = () => {
    setOrders(getStoredOrders());
  };

  useEffect(() => {
    loadOrders();
    const handleUpdate = () => loadOrders();
    window.addEventListener("exportpilot:orders-updated", handleUpdate);
    return () => {
      window.removeEventListener("exportpilot:orders-updated", handleUpdate);
    };
  }, []);

  const handleReset = () => {
    const refreshed = resetOrdersToDefault();
    setOrders(refreshed);
    setResetNotice("Orders reset to demo baseline!");
    setTimeout(() => setResetNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Export Orders Management
            <Badge variant="outline" className="text-[11px] font-mono tabular-nums border-emerald-500/40 text-emerald-400">
              AG Grid Community
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sort, filter, and track export quotations, PayPal payment states, and Incoterm logistics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {resetNotice && (
            <span className="text-xs text-emerald-400 font-medium animate-fade-in hidden sm:inline">
              ✓ {resetNotice}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs border-white/[0.08] bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm"
            title="Reset to 5 baseline demo orders"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Baseline
          </Button>

          <Link href="/orders/new">
            <Button size="sm" className="text-xs font-semibold shadow-md shadow-emerald-500/20">
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              New Enquiry Intake
            </Button>
          </Link>
        </div>
      </div>

      {/* Orders Grid Component */}
      <OrdersGrid orders={orders} onRefresh={loadOrders} />
    </div>
  );
}
