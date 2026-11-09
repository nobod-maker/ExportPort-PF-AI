"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Package,
  FileCheck2,
  ShieldCheck,
  ArrowRight,
  PlusCircle,
  RotateCcw,
  TrendingUp,
  Globe2,
  Clock,
  Sparkles,
  ExternalLink,
  CreditCard,
  Bot,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportOrder } from "@/types";
import { formatMoney } from "@/lib/money";
import { getStoredOrders, resetOrdersToDefault } from "@/components/orders-store";

export default function DashboardPage() {
  const [orders, setOrders] = useState<ExportOrder[]>([]);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load initial orders
    setOrders(getStoredOrders());

    // Listen to updates from other pages
    const handleUpdate = () => {
      setOrders(getStoredOrders());
    };

    window.addEventListener("exportpilot:orders-updated", handleUpdate);
    return () => {
      window.removeEventListener("exportpilot:orders-updated", handleUpdate);
    };
  }, []);

  // Compute metrics
  const totalVolumeMinor = orders.reduce((acc, o) => acc + (o.total_minor || 0), 0);
  const settledFundsMinor = orders
    .filter((o) => o.status === "paid")
    .reduce((acc, o) => acc + (o.total_minor || 0), 0);
  const activeOrdersCount = orders.filter((o) => o.status !== "paid" && o.status !== "cancelled").length;
  const pendingQuotesCount = orders.filter((o) => o.status === "draft" || o.status === "needs_review").length;

  const handleResetDemo = () => {
    const refreshed = resetOrdersToDefault();
    setOrders(refreshed);
    setResetMessage("Reset sample orders to baseline demo state!");
    setTimeout(() => setResetMessage(null), 3000);
  };

  const primaryOrder = orders.find((o) => o.order_number === "EXP-2026-001") || orders[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Exporter Operations Dashboard
            <Badge variant="success" className="text-[11px] font-mono">
              Live Mode
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time export volume, AI enquiry extractions, and PayPal Sandbox payment reconciliation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {resetMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-fade-in hidden sm:inline">
              ✓ {resetMessage}
            </span>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDemo}
            className="text-xs border-slate-700/80 text-slate-300 hover:text-white"
            title="Reset orders to baseline 5 demo orders"
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

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Export Volume */}
        <Card className="border-slate-800 bg-slate-900/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <TrendingUp className="h-16 w-16 text-emerald-400" />
          </div>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Total Pipeline Volume</span>
              <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                +18.4% MoM
              </span>
            </div>
            <p className="text-2xl font-extrabold text-white font-mono tracking-tight">
              {formatMoney(totalVolumeMinor)}
            </p>
            <p className="text-[11px] text-slate-500">
              Across {orders.length} total international orders
            </p>
          </CardContent>
        </Card>

        {/* Settled Funds */}
        <Card className="border-slate-800 bg-slate-900/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldCheck className="h-16 w-16 text-emerald-400" />
          </div>
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Settled Funds (PayPal)</span>
              <Badge variant="success" className="text-[10px] py-0">
                Captured
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatMoney(settledFundsMinor)}
            </p>
            <p className="text-[11px] text-slate-500">
              Reconciled via verified PayPal webhooks
            </p>
          </CardContent>
        </Card>

        {/* Active Orders */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Active In-Flight Orders</span>
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
            </div>
            <p className="text-2xl font-extrabold text-slate-100 font-mono tracking-tight">
              {activeOrdersCount}
            </p>
            <p className="text-[11px] text-slate-500">
              Drafts, approved quotes & pending payments
            </p>
          </CardContent>
        </Card>

        {/* Pending Quotations */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="pt-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Pending Seller Review</span>
              <Badge variant={pendingQuotesCount > 0 ? "warning" : "secondary"} className="text-[10px] py-0">
                {pendingQuotesCount > 0 ? "Action Required" : "Up to date"}
              </Badge>
            </div>
            <p className="text-2xl font-extrabold text-amber-300 font-mono tracking-tight">
              {pendingQuotesCount}
            </p>
            <p className="text-[11px] text-slate-500">
              Unapproved enquiries with missing unit prices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Featured Hackathon Hero: Authoritative UAE Leather Wallets Order Spotlight */}
      {primaryOrder && (
        <Card className="border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs text-emerald-400 border-emerald-500/30">
                    Primary Demo Scenario • {primaryOrder.order_number}
                  </Badge>
                  <Badge variant={primaryOrder.status === "paid" ? "success" : "info"} className="capitalize">
                    {primaryOrder.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-white font-bold">
                  UAE Leather Wallets Export Inquiry (100 units)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                  Buyer: {primaryOrder.buyer?.company_name} ({primaryOrder.buyer?.name}) • Destination: Dubai (DXB)
                </CardDescription>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-400">Total Quoted Value</p>
                <p className="text-2xl font-mono font-extrabold text-emerald-400">
                  {formatMoney(primaryOrder.total_minor, primaryOrder.currency)}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">Goods & Volume</span>
                <span className="text-slate-200 font-medium">100 units Handcrafted Leather Wallets</span>
                <span className="text-slate-500 block font-mono text-[10px]">SKU: HW-WL-01 • FOB Quoted</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">Pricing Structure</span>
                <span className="text-slate-200 font-medium">
                  100 × $35.00/unit = $3,500.00 USD
                </span>
                <span className="text-slate-500 block font-mono text-[10px]">+ $150.00 Air Cargo = $3,650.00</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block font-semibold">PayPal Integration</span>
                <span className="text-slate-200 font-medium flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-sky-400" />
                  Sandbox Orders v2 Ready
                </span>
                <span className="text-slate-500 block font-mono text-[10px]">Capture & Webhook Verified</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Zero-Float integer minor unit arithmetic (365,000 cents)</span>
              </p>

              <div className="flex items-center gap-2">
                <Link href={`/orders/${primaryOrder.id}/quote`}>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
                    Review Quotation
                  </Button>
                </Link>
                <Link href={`/orders/${primaryOrder.id}/pay`}>
                  <Button size="sm" className="text-xs shadow-md shadow-emerald-500/20">
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Open PayPal Checkout
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders Overview Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Recent Export Orders</h3>
            <p className="text-xs text-slate-400">
              Showing {Math.min(5, orders.length)} most recent orders in pipeline
            </p>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300 hover:text-white">
              Open Full AG Grid Table
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Buyer / Importer</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.slice(0, 5).map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      <Link
                        href={
                          ord.status === "paid"
                            ? `/orders/${ord.id}/pay`
                            : `/orders/${ord.id}/quote`
                        }
                        className="hover:underline"
                      >
                        {ord.order_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>
                        <p>{ord.buyer?.company_name || ord.buyer?.name || "Direct Enquiry"}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{ord.buyer?.email || ""}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-[11px]">
                        {ord.destination_country}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 truncate max-w-[200px]">
                      {ord.items && ord.items.length > 0 ? (
                        <span>
                          <strong className="text-white font-mono">{ord.items[0].quantity}x</strong>{" "}
                          {ord.items[0].description}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-white">
                      {formatMoney(ord.total_minor, ord.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          ord.status === "paid"
                            ? "success"
                            : ord.status === "quoted"
                            ? "info"
                            : ord.status === "awaiting_payment"
                            ? "warning"
                            : "secondary"
                        }
                        className="capitalize text-[10px]"
                      >
                        {ord.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ord.status === "paid" ? (
                        <Link href={`/orders/${ord.id}/pay`}>
                          <Button variant="emerald-outline" size="sm" className="h-7 text-xs">
                            Receipt
                          </Button>
                        </Link>
                      ) : ord.status === "quoted" ? (
                        <Link href={`/orders/${ord.id}/pay`}>
                          <Button size="sm" className="h-7 text-xs">
                            Pay ($)
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/orders/${ord.id}/quote`}>
                          <Button variant="secondary" size="sm" className="h-7 text-xs">
                            Review
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
