"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import {
  ColDef,
  ModuleRegistry,
  AllCommunityModule,
  ICellRendererParams,
  GridApi,
  GridReadyEvent,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { ExportOrder, OrderStatus } from "@/types";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  ArrowRight,
  CreditCard,
  FileCheck2,
  Receipt,
  RotateCcw,
  Plus,
} from "lucide-react";
import { resetOrdersToDefault } from "@/components/orders-store";

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface OrdersGridProps {
  orders: ExportOrder[];
  onRefresh?: () => void;
}

export function OrdersGrid({ orders, onRefresh }: OrdersGridProps) {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  };

  // Filter orders based on status tab
  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Update quick filter text when search term changes
  useEffect(() => {
    if (gridApi) {
      gridApi.setGridOption("quickFilterText", searchTerm);
    }
  }, [searchTerm, gridApi]);

  const handleExportCsv = () => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `exportpilot-orders-${new Date().toISOString().split("T")[0]}.csv`,
      });
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid & Reconciled</Badge>;
      case "quoted":
        return <Badge variant="info">Seller Quoted</Badge>;
      case "awaiting_payment":
        return <Badge variant="warning">Awaiting Payment</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft Enquiry</Badge>;
      case "needs_review":
        return <Badge variant="destructive">Needs Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columnDefs: ColDef<ExportOrder>[] = useMemo(
    () => [
      {
        headerName: "Order #",
        field: "order_number",
        width: 140,
        pinned: "left",
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          if (!params.data) return null;
          return (
            <Link
              href={
                params.data.status === "paid" || params.data.status === "awaiting_payment"
                  ? `/orders/${params.data.id}/pay`
                  : `/orders/${params.data.id}/quote`
              }
              className="font-mono text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5"
            >
              <span>{params.value}</span>
            </Link>
          );
        },
      },
      {
        headerName: "Buyer / Importer",
        field: "buyer",
        width: 220,
        valueGetter: (params) => {
          const b = params.data?.buyer;
          return b?.company_name || b?.name || "Direct Enquiry";
        },
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          const b = params.data?.buyer;
          const company = b?.company_name || b?.name || "Direct Enquiry";
          const email = b?.email || params.data?.ai_extraction?.buyer_email;

          return (
            <div className="flex flex-col justify-center leading-tight py-1">
              <span className="font-medium text-slate-200 truncate">{company}</span>
              {email && <span className="text-[11px] text-slate-400 truncate">{email}</span>}
            </div>
          );
        },
      },
      {
        headerName: "Dest.",
        field: "destination_country",
        width: 85,
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          const code = params.value || "—";
          return (
            <span className="font-mono font-medium text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 text-xs">
              {code}
            </span>
          );
        },
      },
      {
        headerName: "Incoterm",
        field: "incoterm",
        width: 105,
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          const term = params.value || "FOB";
          return (
            <span className="font-mono text-xs text-sky-400 font-medium">
              {term}
            </span>
          );
        },
      },
      {
        headerName: "Items Summary",
        field: "items",
        width: 240,
        valueGetter: (params) => {
          const items = params.data?.items;
          if (!items || items.length === 0) return "No items";
          return items.map((i) => `${i.quantity}x ${i.description}`).join(", ");
        },
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          const items = params.data?.items;
          if (!items || items.length === 0) return <span className="text-slate-500">None</span>;
          const first = items[0];
          const extra = items.length > 1 ? ` +${items.length - 1} more` : "";

          return (
            <span className="text-xs text-slate-300 truncate block">
              <strong className="text-slate-100 font-mono">{first.quantity}x</strong>{" "}
              {first.description}
              {extra && <span className="text-slate-400 text-[11px]">{extra}</span>}
            </span>
          );
        },
      },
      {
        headerName: "Total Amount",
        field: "total_minor",
        width: 140,
        sort: "desc",
        valueGetter: (params) => params.data?.total_minor || 0,
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          if (!params.data) return null;
          return (
            <span className="font-mono font-bold text-white text-sm">
              {formatMoney(params.data.total_minor, params.data.currency)}
            </span>
          );
        },
      },
      {
        headerName: "Status",
        field: "status",
        width: 160,
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          if (!params.value) return null;
          return getStatusBadge(params.value as OrderStatus);
        },
      },
      {
        headerName: "Created",
        field: "created_at",
        width: 120,
        valueFormatter: (params) => {
          if (!params.value) return "—";
          try {
            return new Date(params.value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          } catch {
            return params.value;
          }
        },
      },
      {
        headerName: "Actions",
        width: 180,
        pinned: "right",
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ExportOrder>) => {
          const order = params.data;
          if (!order) return null;

          if (order.status === "paid") {
            return (
              <Link href={`/orders/${order.id}/pay`}>
                <Button variant="emerald-outline" size="sm" className="h-7 text-xs px-2.5">
                  <Receipt className="h-3 w-3 mr-1" />
                  Receipt
                </Button>
              </Link>
            );
          }

          if (order.status === "quoted" || order.status === "awaiting_payment") {
            return (
              <div className="flex items-center gap-1.5 py-1">
                <Link href={`/orders/${order.id}/pay`}>
                  <Button size="sm" className="h-7 text-xs px-2.5 shadow-sm shadow-emerald-500/20">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Pay ($)
                  </Button>
                </Link>
                <Link href={`/orders/${order.id}/quote`}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-slate-400 hover:text-white">
                    Quote
                  </Button>
                </Link>
              </div>
            );
          }

          return (
            <Link href={`/orders/${order.id}/quote`}>
              <Button size="sm" variant="secondary" className="h-7 text-xs px-2.5">
                <FileCheck2 className="h-3 w-3 mr-1" />
                Review Quote
              </Button>
            </Link>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Status Filter Tabs, and Export */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Orders", count: orders.length },
            { id: "draft", label: "Drafts", count: orders.filter((o) => o.status === "draft").length },
            { id: "quoted", label: "Quoted", count: orders.filter((o) => o.status === "quoted").length },
            { id: "awaiting_payment", label: "Awaiting", count: orders.filter((o) => o.status === "awaiting_payment").length },
            { id: "paid", label: "Paid", count: orders.filter((o) => o.status === "paid").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & CSV Export */}
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              placeholder="Search orders, buyer, items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs bg-slate-950/80 border-slate-800 pl-8 pr-3 text-slate-200 placeholder:text-slate-500 w-full"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs border-slate-700/80 text-slate-300 hover:text-white shrink-0"
            title="Export orders to CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="ag-theme-quartz-dark rounded-xl border border-slate-800 overflow-hidden shadow-xl" style={{ height: 480, width: "100%" }}>
        <AgGridReact
          rowData={filteredOrders}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          onGridReady={onGridReady}
          rowHeight={48}
          headerHeight={40}
        />
      </div>

      {/* Grid Sub-footer Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Showing {filteredOrders.length} of {orders.length} export orders • AG Grid Community Edition
        </span>
        <span className="font-mono text-[11px] text-slate-400">
          Double-click any row to view details
        </span>
      </div>
    </div>
  );
}
