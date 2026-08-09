"use client";

import { Printer, X } from "lucide-react";
import { useState } from "react";

type KuitansiData = {
  noKuitansi: string;
  tanggal: string;
  diterimaDari: string;
  tipeTransaksi: string;
  nominal: number;
  terbilang?: string;
  keterangan: string;
  petugas: string;
};

type PrintKuitansiModalProps = {
  data: KuitansiData;
  onClose: () => void;
};

export function PrintKuitansiModal({ data, onClose }: PrintKuitansiModalProps) {
  const currency = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0">
      {/* Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl print:shadow-none print:w-full print:p-0">
        {/* Action Buttons (Hidden on Print) */}
        <div className="flex items-center justify-between border-b border-[#dbe5f1] pb-4 print:hidden">
          <h3 className="text-lg font-black">Kuitansi Transaksi</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8]"
            >
              <Printer className="size-4" />
              Cetak / PDF
            </button>
            <button
              onClick={onClose}
              className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] hover:bg-slate-100"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Printable Kuitansi Body */}
        <div className="mt-4 print:mt-0 print:border print:border-slate-800 print:p-6 print:rounded-none">
          {/* Header Kuitansi */}
          <div className="flex items-start justify-between border-b-2 border-[#0b1220] pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-[#0b1220]">Koperasi Simpan Pinjam</h1>
              <p className="text-xs font-semibold text-[#64748b]">Kuitansi Bukti Transaksi Resmi</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-[#64748b]">No. Kuitansi</p>
              <p className="font-mono text-sm font-black text-[#2563eb]">{data.noKuitansi}</p>
            </div>
          </div>

          {/* Details Table */}
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="font-bold text-[#64748b]">Tanggal</span>
              <span className="font-semibold">{data.tanggal}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="font-bold text-[#64748b]">Nama / Anggota</span>
              <span className="font-bold text-[#0b1220]">{data.diterimaDari}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="font-bold text-[#64748b]">Tipe Transaksi</span>
              <span className="font-bold text-[#2563eb]">{data.tipeTransaksi}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="font-bold text-[#64748b]">Keterangan</span>
              <span className="font-semibold">{data.keterangan || "-"}</span>
            </div>
          </div>

          {/* Jumlah / Nominal Box */}
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe5f1] print:ring-1 print:ring-slate-800">
            <span className="text-xs font-black uppercase text-[#64748b]">Jumlah</span>
            <span className="text-2xl font-black text-[#2563eb]">{currency.format(data.nominal)}</span>
          </div>

          {/* Tanda Tangan Section */}
          <div className="mt-8 grid grid-cols-2 text-center text-xs font-bold">
            <div>
              <p className="text-[#64748b]">Penyetor / Anggota</p>
              <div className="mt-14 border-b border-slate-400 mx-auto w-32"></div>
              <p className="mt-1 text-[#0b1220]">{data.diterimaDari}</p>
            </div>
            <div>
              <p className="text-[#64748b]">Kasir / Petugas Koperasi</p>
              <div className="mt-14 border-b border-slate-400 mx-auto w-32"></div>
              <p className="mt-1 text-[#0b1220]">{data.petugas || "Teller Koperasi"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
