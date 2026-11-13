import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  FileCheck2,
  CreditCard,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MOCK_EXPORT_ORDERS } from "@/lib/mock-data";
import { formatMoney } from "@/lib/money";

export default function HomePage() {
  const primaryOrder = MOCK_EXPORT_ORDERS[0]; // UAE 100 leather wallets

  return (
    <main className="flex-1 flex flex-col justify-between p-6 md:p-12 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-8 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="h-5 w-5 text-navy-950 font-bold" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              ExportPilot <span className="text-emerald-400 font-mono tabular-nums text-sm">PayFlow AI</span>
            </span>
            <p className="text-xs text-slate-400">PayPal AI Hackathon 2026 Submission</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="warning" className="uppercase font-mono tabular-nums text-[10px] tracking-wider">
            PayPal Sandbox
          </Badge>
          <Link href="/dashboard">
            <Button size="sm" className="hidden sm:inline-flex">
              Open Dashboard
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md text-emerald-300 text-xs font-medium">
            <Bot className="h-3.5 w-3.5 text-emerald-400" />
            Zero-Hallucination AI Order Extraction + PayPal Sandbox Checkout
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.1]">
            Turn Foreign Enquiries Into{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              Paid PayPal Orders
            </span>{" "}
            in Minutes.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            From raw email inquiries to seller-approved quotations, PayPal Sandbox checkout,
            and 4-way cryptographically reconciled webhooks. Built for small exporters worldwide.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/orders/new">
              <Button size="lg" className="shadow-lg shadow-emerald-500/25">
                Paste Buyer Enquiry
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="lg">
                View Orders Grid
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.08] text-left">
            <div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">$3,650.00</p>
              <p className="text-xs text-slate-400 mt-0.5">Authoritative UAE Demo Order</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">Integer Minor Units (No Drift)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white font-mono tabular-nums">4-Way</p>
              <p className="text-xs text-slate-400 mt-0.5">Cryptographic Reconciliation</p>
            </div>
          </div>
        </div>

        {/* Live Authoritative Order Preview Card */}
        <div className="lg:col-span-5">
          <Card className="border-white/[0.1] bg-slate-900/65 backdrop-blur-spatial backdrop-saturate-spatial shadow-rim-135 relative overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono tabular-nums text-[11px] border-white/[0.1]">
                  {primaryOrder.order_number}
                </Badge>
                <Badge variant="warning" className="capitalize font-mono tabular-nums">
                  {primaryOrder.status}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2 text-white">
                {primaryOrder.buyer?.company_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe2 className="h-3 w-3 text-emerald-400" />
                Dubai, United Arab Emirates (DXB) • Incoterm: {primaryOrder.incoterm}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950/50 backdrop-blur-md border border-white/[0.06] text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span>Item</span>
                  <span>Qty × Price</span>
                </div>
                {primaryOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-slate-400">
                    <span className="truncate max-w-[200px]">{item.description}</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {item.quantity} × {formatMoney(item.unit_price_minor)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-white/[0.06] pt-2 flex justify-between items-center text-slate-400">
                  <span>Air Freight Shipping</span>
                  <span className="font-mono tabular-nums text-slate-200">{formatMoney(primaryOrder.shipping_minor)}</span>
                </div>
                <div className="border-t border-white/[0.06] pt-2 flex justify-between items-center font-bold text-white">
                  <span>Grand Total</span>
                  <span className="font-mono tabular-nums text-emerald-400 text-sm">{formatMoney(primaryOrder.total_minor)}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Double-Approval Gate: Seller Quote Approved</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CreditCard className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Ready for PayPal Sandbox checkout</span>
                </div>
              </div>

              <div className="pt-2">
                <Link href={`/orders/${primaryOrder.id}/pay`}>
                  <Button className="w-full shadow-md shadow-emerald-500/20">
                    Proceed to PayPal Sandbox Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Pillar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/[0.08]">
        <Card className="border-white/[0.08] bg-slate-900/50 backdrop-blur-md shadow-rim-135 rounded-2xl">
          <CardContent className="pt-6 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
              <Bot className="h-4 w-4 text-emerald-400" />
            </div>
            <h4 className="font-semibold text-slate-100">Zero-Hallucination AI</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Strictly extracts buyer specifications without fabricating prices or shipping. Automatically flags missing fields.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-slate-900/50 backdrop-blur-md shadow-rim-135 rounded-2xl">
          <CardContent className="pt-6 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-sky-950/80 border border-sky-500/30 flex items-center justify-center">
              <FileCheck2 className="h-4 w-4 text-sky-400" />
            </div>
            <h4 className="font-semibold text-slate-100">Seller Approval Gate</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exporters control pricing, Incoterms, and air/sea shipping rates before any PayPal payment link is created.
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-slate-900/50 backdrop-blur-md shadow-rim-135 rounded-2xl">
          <CardContent className="pt-6 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <h4 className="font-semibold text-slate-100">Verified Reconciliation</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cryptographic webhook signature verification and 4-way matching of order ID, capture ID, currency, and amount.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
