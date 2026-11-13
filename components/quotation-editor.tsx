"use client";

import { useState, useEffect } from "react";
import { ExportOrder, Incoterm } from "@/types";
import {
  calculateOrderTotals,
  formatMoney,
  minorToDecimalString,
  decimalToMinor,
} from "@/lib/money";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  DollarSign,
  ShieldCheck,
  Ship,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface QuotationEditorProps {
  order: ExportOrder;
  onApprove?: (updatedOrder: ExportOrder) => void;
  readOnly?: boolean;
}

interface EditableItem {
  id?: string;
  description: string;
  sku: string;
  quantity: number;
  unitPriceDecimal: string; // "35.00"
}

const INCOTERMS: Incoterm[] = [
  "FOB",
  "CIF",
  "EXW",
  "CIP",
  "FCA",
  "CPT",
  "DAP",
  "DPU",
  "DDP",
  "CFR",
  "FAS",
];

export function QuotationEditor({ order, onApprove, readOnly = false }: QuotationEditorProps) {
  // Initialize editable state
  const [items, setItems] = useState<EditableItem[]>(() => {
    if (order.items && order.items.length > 0) {
      return order.items.map((it) => ({
        id: it.id,
        description: it.description,
        sku: it.sku || "",
        quantity: it.quantity,
        unitPriceDecimal: it.unit_price_minor ? minorToDecimalString(it.unit_price_minor) : "0.00",
      }));
    }
    // Fallback from AI extraction items
    if (order.ai_extraction?.items && order.ai_extraction.items.length > 0) {
      return order.ai_extraction.items.map((it, idx) => ({
        id: `temp-item-${idx}`,
        description: it.description,
        sku: it.sku || "",
        quantity: it.quantity,
        unitPriceDecimal: it.unit_price_minor ? minorToDecimalString(it.unit_price_minor) : "0.00",
      }));
    }
    return [
      {
        description: "Handcrafted genuine leather wallets (Item code: HW-WL-01)",
        sku: "HW-WL-01",
        quantity: 100,
        unitPriceDecimal: "35.00",
      },
    ];
  });

  const [shippingDecimal, setShippingDecimal] = useState<string>(() =>
    order.shipping_minor ? minorToDecimalString(order.shipping_minor) : "150.00"
  );
  const [incoterm, setIncoterm] = useState<Incoterm>(order.incoterm || "FOB");
  const [sellerNotes, setSellerNotes] = useState<string>(
    order.seller_notes || "Approved export batch quotation for air cargo delivery to DXB."
  );
  const [taxBasisPoints, setTaxBasisPoints] = useState<number>(0);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recalculate totals in integer minor units
  const shippingMinor = Math.max(0, decimalToMinor(shippingDecimal || "0"));

  const lineItemsPrice = items.map((it) => {
    let unitMinor = 0;
    try {
      unitMinor = Math.max(0, decimalToMinor(it.unitPriceDecimal || "0"));
    } catch {
      unitMinor = 0;
    }
    return {
      quantity: Math.max(1, it.quantity || 1),
      unit_price_minor: unitMinor,
    };
  });

  const totals = calculateOrderTotals(lineItemsPrice, shippingMinor, taxBasisPoints);

  // Validate missing fields
  const hasZeroPriceItem = lineItemsPrice.some((it) => it.unit_price_minor <= 0);

  const handleItemChange = (index: number, field: keyof EditableItem, value: any) => {
    if (readOnly) return;
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleAddItem = () => {
    if (readOnly) return;
    setItems([
      ...items,
      {
        description: "Additional Export Item",
        sku: "",
        quantity: 1,
        unitPriceDecimal: "10.00",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (readOnly || items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleApprove = () => {
    if (hasZeroPriceItem) {
      setErrorMessage("All line items must have a valid unit price greater than $0.00");
      return;
    }
    if (totals.total_minor <= 0) {
      setErrorMessage("Total order amount must be greater than $0.00");
      return;
    }

    setErrorMessage(null);
    setIsApproving(true);

    const updatedOrder: ExportOrder = {
      ...order,
      status: "quoted",
      incoterm,
      subtotal_minor: totals.subtotal_minor,
      shipping_minor: totals.shipping_minor,
      tax_minor: totals.tax_minor,
      total_minor: totals.total_minor,
      seller_notes: sellerNotes,
      seller_approved_at: new Date().toISOString(),
      items: items.map((it, idx) => {
        const uMinor = decimalToMinor(it.unitPriceDecimal);
        return {
          id: it.id || `i1000000-0000-4000-a000-${Date.now()}-${idx}`,
          order_id: order.id,
          description: it.description,
          sku: it.sku || null,
          quantity: it.quantity,
          unit_price_minor: uMinor,
          line_total_minor: it.quantity * uMinor,
          created_at: new Date().toISOString(),
        };
      }),
    };

    setTimeout(() => {
      setIsApproving(false);
      if (onApprove) {
        onApprove(updatedOrder);
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Missing Price Warning Alert */}
      {hasZeroPriceItem && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-950/40 backdrop-blur-md text-amber-300 flex items-start gap-3 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.2)]">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-200">Missing Price Detected by AI Guardrail</p>
            <p className="text-amber-300/90 leading-relaxed">
              The buyer's raw enquiry did not specify a unit price. As an exporter, you must review and
              enter your approved unit price before this quotation can be locked and sent to PayPal.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/40 backdrop-blur-md text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Line Items Table Card */}
      <Card className="border-white/[0.08] shadow-rim-135">
        <CardHeader className="pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-white">Line Items Breakdown</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Unit prices are stored and calculated in integer minor units ($1.00 = 100 cents)
              </CardDescription>
            </div>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="text-xs h-8 border-white/[0.08] bg-slate-900/40 text-slate-300 hover:text-white hover:bg-slate-800/60 backdrop-blur-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="pb-2.5">Item Description</th>
                <th className="pb-2.5 w-28">SKU</th>
                <th className="pb-2.5 w-24">Qty</th>
                <th className="pb-2.5 w-32">Unit Price ($)</th>
                <th className="pb-2.5 w-32 text-right">Line Total</th>
                {!readOnly && <th className="pb-2.5 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {items.map((item, idx) => {
                let unitMinor = 0;
                try {
                  unitMinor = decimalToMinor(item.unitPriceDecimal || "0");
                } catch {}
                const lineTotalMinor = item.quantity * unitMinor;
                const isZero = unitMinor <= 0;

                return (
                  <tr key={idx} className="group hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 pr-2">
                      {readOnly ? (
                        <span className="font-medium text-slate-200">{item.description}</span>
                      ) : (
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          className="h-8 text-xs bg-slate-950/70 border-white/[0.08]"
                        />
                      )}
                    </td>
                    <td className="py-2.5 pr-2">
                      {readOnly ? (
                        <span className="font-mono tabular-nums text-slate-400">{item.sku || "—"}</span>
                      ) : (
                        <Input
                          value={item.sku}
                          placeholder="e.g. HW-01"
                          onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                          className="h-8 text-xs font-mono tabular-nums bg-slate-950/70 border-white/[0.08]"
                        />
                      )}
                    </td>
                    <td className="py-2.5 pr-2">
                      {readOnly ? (
                        <span className="font-mono tabular-nums text-slate-200">{item.quantity}</span>
                      ) : (
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)
                          }
                          className="h-8 text-xs font-mono tabular-nums bg-slate-950/70 border-white/[0.08]"
                        />
                      )}
                    </td>
                    <td className="py-2.5 pr-2">
                      {readOnly ? (
                        <span className="font-mono tabular-nums text-slate-200">${item.unitPriceDecimal}</span>
                      ) : (
                        <div className="relative">
                          <Input
                            type="text"
                            value={item.unitPriceDecimal}
                            onChange={(e) =>
                              handleItemChange(idx, "unitPriceDecimal", e.target.value)
                            }
                            className={`h-8 text-xs font-mono tabular-nums bg-slate-950/70 pl-6 ${
                              isZero ? "border-amber-500/80 focus-visible:ring-amber-500" : "border-white/[0.08]"
                            }`}
                          />
                          <span className="absolute left-2.5 top-2 text-slate-500 font-mono text-xs">$</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-100">
                      {formatMoney(lineTotalMinor, order.currency)}
                    </td>
                    {!readOnly && (
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length <= 1}
                          className="text-slate-500 hover:text-rose-400 disabled:opacity-30 transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Export Logistics, Incoterms, & Shipping Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-white/[0.08] shadow-rim-135">
          <CardHeader className="pb-3 border-b border-white/[0.06]">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Ship className="h-4 w-4 text-emerald-400" />
              Logistics & Incoterm Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">
                International Commercial Term (Incoterm)
              </label>
              {readOnly ? (
                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/[0.08] font-mono tabular-nums text-emerald-400">
                  {incoterm}
                </div>
              ) : (
                <select
                  value={incoterm}
                  onChange={(e) => setIncoterm(e.target.value as Incoterm)}
                  className="w-full h-9 rounded-xl border border-white/[0.08] bg-slate-950/70 px-3 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono tabular-nums"
                >
                  {INCOTERMS.map((term) => (
                    <option key={term} value={term}>
                      {term} — {term === "FOB" ? "Free On Board (Seller covers loading)" : term === "CIF" ? "Cost, Insurance & Freight" : term}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Air Freight / Shipping Fee (USD)
              </label>
              {readOnly ? (
                <div className="p-2 rounded-xl bg-slate-950/70 border border-white/[0.08] font-mono tabular-nums text-slate-200">
                  {formatMoney(totals.shipping_minor, order.currency)}
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="text"
                    value={shippingDecimal}
                    onChange={(e) => setShippingDecimal(e.target.value)}
                    className="h-9 text-xs font-mono tabular-nums bg-slate-950/70 border-white/[0.08] pl-6 text-slate-100"
                    placeholder="150.00"
                  />
                  <span className="absolute left-2.5 top-2.5 text-slate-500 font-mono text-xs">$</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Seller Quotation Notes & Delivery Terms
              </label>
              {readOnly ? (
                <p className="p-2 rounded-xl bg-slate-950/70 border border-white/[0.08] text-slate-300">
                  {sellerNotes || "No notes"}
                </p>
              ) : (
                <textarea
                  rows={2}
                  value={sellerNotes}
                  onChange={(e) => setSellerNotes(e.target.value)}
                  placeholder="Specify delivery timeline, packing specifications, port of discharge..."
                  className="w-full rounded-xl border border-white/[0.08] bg-slate-950/70 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Authoritative Totals Recalculation Card */}
        <Card className="border-white/[0.08] shadow-rim-135 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-white/[0.06]">
              <CardTitle className="text-sm text-white flex items-center justify-between">
                <span>Quotation Totals</span>
                <span className="text-[10px] font-mono tabular-nums text-emerald-400 uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Server Minor Units
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Subtotal ({items.length} line items)</span>
                <span className="font-mono tabular-nums text-slate-200 font-medium">
                  {formatMoney(totals.subtotal_minor, order.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Air Freight Shipping ({incoterm})</span>
                <span className="font-mono tabular-nums text-slate-200 font-medium">
                  {formatMoney(totals.shipping_minor, order.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Export Tax / Duties (0.00% Export Exemption)</span>
                <span className="font-mono tabular-nums text-slate-200 font-medium">
                  {formatMoney(totals.tax_minor, order.currency)}
                </span>
              </div>

              <div className="border-t border-white/[0.06] pt-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-sm">Grand Total</p>
                  <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {totals.total_minor} cents ({order.currency})
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xl font-bold text-emerald-400">
                  {formatMoney(totals.total_minor, order.currency)}
                </span>
              </div>
            </CardContent>
          </div>

          {/* Action Footer */}
          {!readOnly && (
            <div className="p-4 border-t border-white/[0.06] bg-slate-950/50 backdrop-blur-md rounded-b-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Locks pricing and enables buyer checkout</span>
              </div>

              <Button
                onClick={handleApprove}
                isLoading={isApproving}
                disabled={hasZeroPriceItem || totals.total_minor <= 0}
                className="font-semibold shadow-md shadow-emerald-500/20"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve Quotation
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
