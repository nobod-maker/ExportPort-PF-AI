"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  Printer,
  FileCheck2,
  Building2,
  Globe2,
  CheckCircle2,
  Package,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportOrder } from "@/types";
import { formatMoney } from "@/lib/money";
import { PayPalCheckoutButton } from "@/components/paypal-checkout-button";
import { OrderTimeline } from "@/components/order-timeline";
import {
  getStoredOrderById,
  recordPayPalCapture,
} from "@/components/orders-store";

export default function OrderPaymentCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ExportOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!orderId) return;
    const found = getStoredOrderById(orderId);
    if (found) {
      setOrder(found);
    }
    setLoading(false);
  }, [orderId]);

  const handlePaymentSuccess = (captureId: string, paypalOrderId: string) => {
    if (!order) return;
    const updated = recordPayPalCapture(
      order.id,
      paypalOrderId,
      captureId,
      order.buyer?.email || undefined
    );
    setOrder(updated);
  };

  const handlePrintInvoice = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 text-slate-400">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-xs">Loading PayPal checkout session...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center space-y-4 text-slate-400">
        <p className="text-lg font-bold text-white">Order Not Found</p>
        <p className="text-xs text-slate-500">Order ID "{orderId}" does not exist in local store.</p>
        <Link href="/orders">
          <Button variant="secondary" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const isPaid = order.status === "paid";

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/orders" className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Orders
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href={`/orders/${order.id}/quote`}
              className="font-mono text-xs text-slate-400 hover:text-emerald-400"
            >
              {order.order_number}
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-emerald-400 font-semibold">
              Checkout & Payment
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
            {isPaid ? "Export Payment Receipt" : "Buyer PayPal Checkout"}
            <Badge
              variant={isPaid ? "success" : "warning"}
              className="text-[10px] uppercase font-mono"
            >
              {isPaid ? "Paid & Reconciled" : "Sandbox Checkout"}
            </Badge>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintInvoice}
              className="text-xs border-slate-700/80 text-slate-300 hover:text-white"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Commercial Invoice
            </Button>
          )}

          <Link href={`/orders/${order.id}/quote`}>
            <Button variant="secondary" size="sm" className="text-xs">
              <FileCheck2 className="h-3.5 w-3.5 mr-1.5" />
              View Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid: Payment Button & Quotation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: PayPal Buttons & Verification */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    {isPaid ? "Payment Confirmation" : "PayPal Sandbox Gateway"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isPaid
                      ? "Funds securely captured and verified via 4-way webhook guardrail"
                      : "Server-side order creation with strict minor-unit total verification"}
                  </CardDescription>
                </div>
                <Badge variant={isPaid ? "success" : "warning"} className="font-mono text-[10px]">
                  {isPaid ? "CAPTURED" : "INTENT: CAPTURE"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              <PayPalCheckoutButton
                order={order}
                onPaymentSuccess={handlePaymentSuccess}
              />
            </CardContent>
          </Card>

          {/* 4-Way Reconciliation Explainer Card */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="pt-4 space-y-2 text-xs">
              <p className="font-semibold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                4-Way Cryptographic Payment Reconciliation
              </p>
              <p className="text-slate-400 leading-relaxed">
                Before marking this export order as paid, ExportPilot validates:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                <li>Order Identity: internal export_order UUID matching PayPal custom_id</li>
                <li>Gateway Order Identity: PayPal capture parent order match</li>
                <li>Currency Invariant: exact ISO-4217 code match ({order.currency})</li>
                <li>Amount Invariant: integer cents ({order.total_minor}) exactly matching server calculation</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Commercial Quotation Invoice Summary */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white">Commercial Quotation</CardTitle>
                  <CardDescription className="text-xs">
                    Invoice #{order.order_number} • Incoterm: {order.incoterm || "FOB"}
                  </CardDescription>
                </div>
                <span className="font-mono text-xl font-bold text-emerald-400">
                  {formatMoney(order.total_minor, order.currency)}
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              {/* Buyer & Consignee Box */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  Consignee / Importer
                </span>
                <p className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                  {order.buyer?.company_name || order.buyer?.name}
                </p>
                <p className="text-slate-400">
                  Contact: {order.buyer?.name} ({order.buyer?.email})
                </p>
                <p className="text-slate-400 flex items-center gap-1.5">
                  <Globe2 className="h-3.5 w-3.5 text-slate-500" />
                  Port of Discharge: Dubai Air Cargo Terminal (DXB), United Arab Emirates
                </p>
              </div>

              {/* Items Breakdown Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 w-16 text-center">Qty</th>
                      <th className="py-2 px-3 w-24 text-right">Unit Price</th>
                      <th className="py-2 px-3 w-28 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {order.items?.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-slate-200">{it.description}</p>
                          {it.sku && <p className="font-mono text-[10px] text-slate-500">{it.sku}</p>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {formatMoney(it.unit_price_minor, order.currency)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-200">
                          {formatMoney(it.line_total_minor, order.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">Subtotal Goods:</span>
                  <span>{formatMoney(order.subtotal_minor, order.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">Air Freight ({order.incoterm}):</span>
                  <span>{formatMoney(order.shipping_minor, order.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-sans">Export Duty / Tax:</span>
                  <span>{formatMoney(order.tax_minor, order.currency)}</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between items-center font-bold text-white text-sm">
                  <span className="font-sans">Total Due:</span>
                  <span className="text-emerald-400">{formatMoney(order.total_minor, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chronological Activity Timeline */}
      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-base font-bold text-white mb-4">
          Order Activity & Audit Trail
        </h3>
        <OrderTimeline events={order.activity_events} />
      </div>
    </div>
  );
}
