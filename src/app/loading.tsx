import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#f4f7fb]">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-[#dbe5f1]">
        <Loader2 className="size-8 animate-spin text-[#2563eb]" />
        <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Memuat data...</p>
      </div>
    </div>
  );
}
