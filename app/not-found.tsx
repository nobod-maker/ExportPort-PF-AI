import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-sm font-semibold">
        404 • Resource Not Found
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">Export Order or Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-md">
        The international order record, invoice, or route you are searching for does not exist in the database.
      </p>
      <Link href="/dashboard">
        <Button className="mt-2 font-semibold">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
