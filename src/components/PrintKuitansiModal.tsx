"use client";

import { Printer, X } from "lucide-react";

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
    <>
      {/* Reliable Print Isolation CSS */}
      <style>{`
        @media print {
          /* Hide everything on the page */
          body * {
            visibility: hidden !important;
          }

          /* Show ONLY the receipt container and its children */
          .printable-kuitansi-area,
          .printable-kuitansi-area * {
            visibility: visible !important;
          }

          /* Position the receipt at the top left of the printed page */
          .printable-kuitansi-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            border: 2px solid #000 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Hide action buttons on printed page */
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        {/* Printable Receipt Container */}
        <div className="printable-kuitansi-area relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
          {/* Action Buttons (Hidden on Print) */}
          <div className="print-hide flex items-center justify-between border-b border-[#dbe5f1] pb-4">
            <h3 className="text-lg font-black text-[#0b1220]">Cetak Kuitansi Resmi Teller</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-95 transition-all"
              >
                <Printer className="size-4" />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] text-[#64748b] hover:bg-slate-100 active:scale-95 transition-all"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Printable Kuitansi Body */}
          <div className="mt-4">
            {/* Header Kuitansi */}
            <div className="flex items-start justify-between border-b-2 border-[#0b1220] pb-4">
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider text-[#0b1220]">KOPERASI SIMPAN PINJAM</h1>
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
                <span className="font-bold text-[#64748b]">Tanggal Transaksi</span>
                <span className="font-semibold text-[#0b1220]">{data.tanggal}</span>
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
                <span className="font-semibold text-[#0b1220]">{data.keterangan || "-"}</span>
              </div>
            </div>

            {/* Jumlah / Nominal Box */}
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#f8fbff] p-4 ring-1 ring-[#dbe5f1]">
              <span className="text-xs font-black uppercase text-[#64748b]">JUMLAH</span>
              <span className="text-2xl font-black text-[#2563eb]">{currency.format(data.nominal)}</span>
            </div>

            {/* Tanda Tangan Section */}
            <div className="mt-8 grid grid-cols-2 text-center text-xs font-bold">
              <div>
                <p className="text-[#64748b]">Penyetor / Anggota</p>
                <div className="mt-14 border-b border-slate-400 mx-auto w-36"></div>
                <p className="mt-1 text-[#0b1220]">{data.diterimaDari.split("(")[0].trim()}</p>
              </div>
              <div>
                <p className="text-[#64748b]">Kasir / Petugas Koperasi</p>
                <div className="mt-14 border-b border-slate-400 mx-auto w-36"></div>
                <p className="mt-1 text-[#0b1220]">{data.petugas || "Teller Kasir"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
