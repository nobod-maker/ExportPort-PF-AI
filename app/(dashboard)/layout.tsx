import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { AIAssistantWidget } from "@/components/ai-assistant-widget";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0F1D] text-slate-100">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
      <AIAssistantWidget />
    </div>
  );
}
