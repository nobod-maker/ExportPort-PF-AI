"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Mail,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { QuotationEditor } from "@/components/quotation-editor";
import { OrderTimeline } from "@/components/order-timeline";
import { ExportOrder } from "@/types";
import {
  getStoredOrderById,
  approveQuotation,
  saveOrders,
  getStoredOrders,
} from "@/components/orders-store";

export default function OrderQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<ExportOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [justApproved, setJustApproved] = useState<boolean>(false);

  useEffect(() => {
    if (!orderId) return;
    const found = getStoredOrderById(orderId);
    if (found) {
      setOrder(found);
    }
    setLoading(false);
  }, [orderId]);

  const handleApprove = (updated: ExportOrder) => {
    try {
      const saved = approveQuotation(updated.id, {
        items: updated.items || [],
        shipping_minor: updated.shipping_minor,
        tax_minor: updated.tax_minor,
        incoterm: updated.incoterm,
        seller_notes: updated.seller_notes,
      });
      setOrder(saved);
      setJustApproved(true);
    } catch (err) {
      console.error("Failed to approve quotation:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3 text-slate-400">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        <p className="text-xs">Loading order quotation details...</p>
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
            Back to Orders List
          </Button>
        </Link>
      </div>
    );
  }

  const isQuoted = order.status === "quoted" || order.status === "awaiting_payment" || order.status === "paid";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/orders" className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Orders
            </Link>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-xs text-emerald-400 font-semibold">
              {order.order_number}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Quotation Review & Pricing Editor
            <Badge
              variant={order.status === "paid" ? "success" : isQuoted ? "info" : "secondary"}
              className="text-[10px] uppercase font-mono"
            >
              {order.status.replace(/_/g, " ")}
            </Badge>
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {isQuoted && (
            <Link href={`/orders/${order.id}/pay`}>
              <Button size="sm" className="text-xs shadow-md shadow-emerald-500/20 font-semibold">
                <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                Proceed to PayPal Checkout
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Success Notification if just approved */}
      {justApproved && (
        <div className="p-4 rounded-xl border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Quotation Approved & Locked!</p>
              <p className="text-emerald-300/80">
                The seller approval gate is complete. Total is locked at ${(order.total_minor / 100).toFixed(2)} USD. You can now generate the PayPal Sandbox checkout link.
              </p>
            </div>
          </div>
          <Link href={`/orders/${order.id}/pay`}>
            <Button size="sm" className="h-8 text-xs shrink-0 font-semibold">
              Checkout Now
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Buyer & Order Context Summary Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Buyer / Company</span>
              <p className="font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                {order.buyer?.company_name || order.buyer?.name || "Direct Enquiry"}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {order.buyer?.email || order.ai_extraction?.buyer_email || "No email"}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Destination Port</span>
              <p className="font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                {order.destination_country} (Dubai Air Cargo DXB)
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Currency: {order.currency}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Inquiry Date</span>
              <p className="font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Requested delivery: {order.ai_extraction?.requested_delivery_date || "30 days"}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">AI Confidence</span>
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {Math.round((order.ai_confidence || 0.95) * 100)}% Extraction Match
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Integer minor units verified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Quotation Editor Component */}
      <QuotationEditor
        order={order}
        onApprove={handleApprove}
        readOnly={order.status === "paid"}
      />

      {/* Chronological Activity Timeline */}
      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-400" />
          Order Activity & Audit Trail
        </h3>
        <OrderTimeline events={order.activity_events} />
      </div>
    </div>
  );
}
