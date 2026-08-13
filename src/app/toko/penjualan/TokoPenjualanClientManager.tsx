"use client";

import { useState } from "react";
import {
  Receipt,
  Search,
  Printer,
  ShoppingBag,
  UserCheck,
  CalendarDays,
  Banknote,
  CreditCard,
  Eye,
  Store,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";

export type TokoSaleRow = {
  id: string;
  invoice_no: string;
  sale_date: string;
  payment_method: string;
  total_amount: number;
  discount_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  notes: string | null;
  created_at: string;
  members: {
    full_name: string;
    member_no: string;
  } | null;
  toko_sale_items?: {
    product_name: string;
    qty: number;
    unit_name: string;
    sell_price: number;
    subtotal: number;
  }[];
};

type TokoPenjualanClientManagerProps = {
  salesRows: TokoSaleRow[];
  totalSalesCount: number;
  totalOmset: number;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

const paymentMethodLabels: Record<string, string> = {
  cash: "Tunai (Cash)",
  bank: "Bank / QRIS",
  credit: "Potong Gaji Anggota",
};

export function TokoPenjualanClientManager({
  salesRows,
  totalSalesCount,
  totalOmset,
}: TokoPenjualanClientManagerProps) {
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [selectedSale, setSelectedSale] = useState<TokoSaleRow | null>(null);

  const filteredSales = salesRows.filter((s) => {
    const matchesSearch =
      !search ||
      s.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      (s.members && s.members.full_name.toLowerCase().includes(search.toLowerCase()));

    const matchesPayment = !paymentFilter || s.payment_method === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <CrudHeader
        title="Riwayat Penjualan Waserda Toko"
        subtitle="Daftar faktur transaksi kasir POS Toko, rekapitulasi omset, dan rincian struk belanja."
        countBadge={`${totalSalesCount} Faktur`}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={paymentFilter}
        onStatusFilterChange={setPaymentFilter}
        statusOptions={[
          { value: "cash", label: "Tunai (Cash)" },
          { value: "bank", label: "Bank / QRIS" },
          { value: "credit", label: "Potong Gaji Anggota" },
        ]}
      />

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Receipt className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Transaksi POS</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{totalSalesCount} Faktur</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Store className="size-5 text-emerald-600" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Omset Penjualan</p>
          <p className="mt-0.5 text-xl font-black text-emerald-600">{formatRupiah(totalOmset)}</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <ShoppingBag className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Faktur Ditampilkan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{filteredSales.length} Faktur</p>
        </article>
      </section>

      {/* Sales Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-3 font-bold">No. Faktur POS</th>
                <th className="px-3 py-3 font-bold">Tanggal</th>
                <th className="px-3 py-3 font-bold">Pembeli / Anggota</th>
                <th className="px-3 py-3 font-bold">Metode Bayar</th>
                <th className="px-3 py-3 font-bold text-right">Grand Total</th>
                <th className="px-3 py-3 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredSales.length ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#f8fbff] transition-colors">
                    <td className="px-3 py-3 font-bold text-[#2563eb]">{sale.invoice_no}</td>
                    <td className="px-3 py-3 font-semibold text-[#64748b]">{sale.sale_date}</td>
                    <td className="px-3 py-3 font-bold text-[#0b1220]">
                      {sale.members ? (
                        <div className="flex items-center gap-1.5 text-[#1d4ed8]">
                          <UserCheck className="size-3.5" />
                          <span>
                            {sale.members.full_name} ({sale.members.member_no})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#64748b] font-normal">Umum / Pembeli Biasa</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[11px] font-bold text-[#475569]">
                        {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-black text-right text-[#0b1220]">
                      {formatRupiah(sale.grand_total)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
                      >
                        <Eye className="size-3 text-[#2563eb]" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center font-bold text-[#64748b]">
                    Belum ada riwayat transaksi penjualan kasir toko.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Detail & Struk Faktur */}
      {selectedSale ? (
        <CrudModal isOpen={true} title={`Detail Faktur ${selectedSale.invoice_no}`} onClose={() => setSelectedSale(null)}>
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Tanggal Transaksi:</span>
                <span className="font-bold">{selectedSale.sale_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Pembeli:</span>
                <span className="font-bold text-[#2563eb]">
                  {selectedSale.members ? selectedSale.members.full_name : "Umum / Non-Anggota"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Metode Pembayaran:</span>
                <span className="font-bold">{paymentMethodLabels[selectedSale.payment_method]}</span>
              </div>
            </div>

            {/* Itemized List */}
            <div className="rounded-xl border border-[#dbe5f1] overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                  <tr>
                    <th className="px-3 py-2 font-bold">Barang</th>
                    <th className="px-3 py-2 font-bold text-center">Qty</th>
                    <th className="px-3 py-2 font-bold text-right">Harga</th>
                    <th className="px-3 py-2 font-bold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {selectedSale.toko_sale_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-bold text-[#0b1220]">{item.product_name}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        {item.qty} {item.unit_name}
                      </td>
                      <td className="px-3 py-2 text-right">{formatRupiah(item.sell_price)}</td>
                      <td className="px-3 py-2 text-right font-black">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="rounded-xl bg-[#0b1220] p-3 text-white space-y-1">
              <div className="flex justify-between font-black text-sm">
                <span>TOTAL TRANSAKSI</span>
                <span className="text-emerald-400">{formatRupiah(selectedSale.grand_total)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]"
              >
                <Printer className="size-4" />
                <span>Cetak Struk POS</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="h-10 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
              >
                Tutup
              </button>
            </div>
          </div>
        </CrudModal>
      ) : null}
    </div>
  );
}
