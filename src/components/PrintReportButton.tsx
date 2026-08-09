"use client";

import { Printer } from "lucide-react";

export function PrintReportButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#dbe5f1] bg-white px-4 text-sm font-bold shadow-sm hover:bg-slate-50 print:hidden"
      type="button"
    >
      <Printer className="size-4 text-[#2563eb]" />
      Cetak / PDF
    </button>
  );
}
