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
      <body className="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
