import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExportPilot PayFlow AI — Export Order Extraction & PayPal Checkout",
  description:
    "AI-powered export order management, quotation approval, and PayPal Sandbox checkout with verified webhook reconciliation for exporters.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans antialiased relative selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Subtle Spatial Canvas Ambient Illumination */}
        <div
          className="fixed inset-0 pointer-events-none overflow-hidden z-0"
          aria-hidden="true"
        >
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] rounded-full bg-emerald-500/[0.06] blur-[120px] pointer-events-none" />
          <div className="absolute top-[35%] -right-[15%] w-[600px] h-[600px] rounded-full bg-cyan-500/[0.04] blur-[140px] pointer-events-none" />
          <div className="absolute top-[70%] -left-[10%] w-[550px] h-[550px] rounded-full bg-emerald-600/[0.03] blur-[130px] pointer-events-none" />
        </div>
        <div className="relative z-10 flex flex-col flex-1">
          {children}
        </div>
      </body>
    </html>
  );
}
