"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";

type ToastProps = {
  error?: string;
  saved?: string;
};

export function ToastNotification({ error, saved }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"success" | "error">("success");

  useEffect(() => {
    if (error) {
      setMessage(decodeURIComponent(error));
      setType("error");
      setVisible(true);
    } else if (saved) {
      let text = "Data berhasil disimpan.";
      if (saved === "rekening") text = "Rekening simpanan berhasil dibuat.";
      if (saved === "transaksi") text = "Transaksi berhasil diposting.";
      if (saved === "pengajuan") text = "Pengajuan pinjaman berhasil dibuat.";
      if (saved === "approved") text = "Pengajuan pinjaman telah disetujui.";
      if (saved === "disbursed") text = "Pinjaman berhasil dicairkan.";
      if (saved === "kas") text = "Transaksi kas berhasil diposting.";
      if (saved === "approval_required") text = "Pengeluaran > Rp 1.000.000 berhasil dicatat & memerlukan persetujuan Manager Keuangan.";
      if (saved === "closing") text = "Closing Kas Sore & Cash Opname berhasil diposting.";
      if (saved === "reopened") text = "🔒 Sesi Closing Kas berhasil dibuka kembali (Reopened).";
      if (saved === "jurnal") text = "Jurnal umum berhasil disimpan.";

      setMessage(text);
      setType("success");
      setVisible(true);
    }
  }, [error, saved]);

  if (!visible || !message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-2xl bg-[#0b1220] p-4 text-white shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-5">
      {type === "success" ? (
        <CheckCircle2 className="size-6 text-[#10b981] shrink-0" />
      ) : (
        <AlertCircle className="size-6 text-[#f43f5e] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
          {type === "success" ? "Sukses" : "Pemberitahuan"}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-100 truncate">{message}</p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="grid size-8 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
