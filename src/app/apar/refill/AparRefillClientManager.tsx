"use client";

import { useState } from "react";
import {
  Flame,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  Building,
  ShieldCheck,
  CalendarDays,
  FileCheck2,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { SubmitButton } from "@/components/SubmitButton";
import { createAparRefillOrder, processAparRefillComplete } from "../actions";

export type AparRefillOrderRow = {
  id: string;
  order_no: string;
  order_date: string;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  total_cylinders: number;
  total_amount: number;
  payment_status: "unpaid" | "paid";
  status: "process" | "completed" | "delivered";
  notes: string | null;
  created_at: string;
  apar_refill_items?: {
    serial_no: string;
    media_type: string;
    capacity_kg: number;
    location_tag: string;
    expired_date: string;
    price: number;
  }[];
};

type AparRefillClientManagerProps = {
  orderRows: AparRefillOrderRow[];
  totalOrderCount: number;
  processOrderCount: number;
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

type RefillItemInput = {
  serial_no: string;
  media_type: string;
  capacity_kg: number;
  location_tag: string;
  price: number;
};

export function AparRefillClientManager({
  orderRows,
  totalOrderCount,
  processOrderCount,
}: AparRefillClientManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AparRefillOrderRow | null>(null);

  // Form states for Refill items
  const [serialNo, setSerialNo] = useState("");
  const [mediaType, setMediaType] = useState("Powder");
  const [capacityKg, setCapacityKg] = useState("3");
  const [locationTag, setLocationTag] = useState("Lantai 1 Gedung A");
  const [itemsCart, setItemsCart] = useState<RefillItemInput[]>([]);

  const addItemToCart = () => {
    const cap = Number(capacityKg) || 3.0;
    // Price calculation estimate: Powder Rp 45.000/kg, CO2 Rp 60.000/kg
    const rate = mediaType === "CO2" ? 60000 : 45000;
    const estPrice = cap * rate;

    setItemsCart((prev) => [
      ...prev,
      {
        serial_no: serialNo || `APAR-${Math.floor(100000 + Math.random() * 900000)}`,
        media_type: mediaType,
        capacity_kg: cap,
        location_tag: locationTag || "Gedung Utama",
        price: estPrice,
      },
    ]);

    setSerialNo("");
    setCapacityKg("3");
  };

  const removeItemFromCart = (index: number) => {
    setItemsCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  const filteredOrders = orderRows.filter((o) => {
    const matchesSearch =
      !search ||
      o.order_no.toLowerCase().includes(search.toLowerCase()) ||
      o.client_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const cartTotal = itemsCart.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="space-y-6">
      <CrudHeader
        title="Unit Jasa Refill & Inspeksi APAR Damkar"
        subtitle="Modul spesialis Koperasi Damkar untuk penerimaan order isi ulang, pengujian hydrotest, dan sertifikasi kelayakan tabung."
        countBadge={`${totalOrderCount} Transaksi Refill`}
        addButtonLabel="Terima Order Refill APAR"
        onAddClick={() => setIsAddModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={[
          { value: "process", label: "Dalam Proses Pengisian" },
          { value: "completed", label: "Selesai & Teruji (Sertifikat)" },
        ]}
      />

      {/* KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Flame className="size-5 text-[#be123c]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Total Order Refill APAR</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{totalOrderCount} Order</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <Clock className={`size-5 ${processOrderCount > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Dalam Pengisian / Pengecekan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{processOrderCount} Pekerjaan</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <ShieldCheck className="size-5 text-[#2563eb]" />
          <p className="mt-3 text-xs font-bold text-[#64748b]">Data Ditampilkan</p>
          <p className="mt-0.5 text-xl font-black text-[#0b1220]">{filteredOrders.length} Order</p>
        </article>
      </section>

      {/* Order Table */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
              <tr>
                <th className="px-3 py-3 font-bold">No. Refill Order</th>
                <th className="px-3 py-3 font-bold">Tanggal Terima</th>
                <th className="px-3 py-3 font-bold">Nama Klien Gedung / PT</th>
                <th className="px-3 py-3 font-bold text-center">Jumlah Tabung</th>
                <th className="px-3 py-3 font-bold text-right">Total Biaya Refill</th>
                <th className="px-3 py-3 font-bold text-center">Status Pengecekan</th>
                <th className="px-3 py-3 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {filteredOrders.length ? (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#f8fbff] transition-colors">
                    <td className="px-3 py-3 font-bold text-[#be123c]">{o.order_no}</td>
                    <td className="px-3 py-3 font-semibold text-[#64748b]">{o.order_date}</td>
                    <td className="px-3 py-3 font-bold text-[#0b1220]">{o.client_name}</td>
                    <td className="px-3 py-3 text-center font-bold">{o.total_cylinders} Tabung</td>
                    <td className="px-3 py-3 font-black text-right text-[#0b1220]">
                      {formatRupiah(o.total_amount)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          o.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {o.status === "completed" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {o.status === "completed" ? "Selesai & Teruji" : "Dalam Pengisian"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(o)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
                      >
                        <Eye className="size-3 text-[#2563eb]" />
                        <span>Rincian Tabung</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center font-bold text-[#64748b]">
                    Belum ada order refill APAR. Klik "+ Terima Order Refill APAR" untuk mendaftarkan pekerjaan baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Terima Order Refill Baru */}
      {isAddModalOpen ? (
        <CrudModal isOpen={true} maxWidth="max-w-2xl" title="Terima Order Refill & Inspeksi APAR Damkar" onClose={() => setIsAddModalOpen(false)}>
          <form action={createAparRefillOrder} className="space-y-4 text-xs">
            <input type="hidden" name="items_json" value={JSON.stringify(itemsCart)} />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold uppercase text-[#475569]">Nama Gedung / PT / Klien *</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 font-bold outline-none"
                  name="client_name"
                  placeholder="Contoh: PT Wisma Nusantara / RS Medika"
                  required
                />
              </label>

              <label className="block">
                <span className="font-bold uppercase text-[#475569]">No. Telepon / Penganggung Jawab</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 font-bold outline-none"
                  name="client_phone"
                  placeholder="Contoh: 0812-9988-7766"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-bold uppercase text-[#475569]">Alamat Gedung Klien</span>
              <input
                className="mt-1.5 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-4 font-bold outline-none"
                name="client_address"
                placeholder="Contoh: Jl. Sudirman No. 45 Jakarta Pusat"
              />
            </label>

            {/* Input Detail Tabung APAR */}
            <div className="rounded-2xl border border-[#cbd5e1] bg-[#f8fbff] p-3.5 space-y-3">
              <span className="font-black uppercase tracking-wider text-[#0b1220] flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[#be123c]" />
                Daftar Tabung APAR Yang Di-Refill ({itemsCart.length} Tabung)
              </span>

              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                <input
                  type="text"
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="No. Seri Tabung (Barcode)"
                  className="h-10 rounded-xl border border-[#dbe5f1] bg-white px-3 font-bold outline-none"
                />

                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                  className="h-10 rounded-xl border border-[#dbe5f1] bg-white px-3 font-bold outline-none"
                >
                  <option value="Powder">Powder (Serbuk)</option>
                  <option value="CO2">CO2 (Gas)</option>
                  <option value="Foam">Foam (Busa AFFF)</option>
                  <option value="Halotron">Clean Agent Halotron</option>
                </select>

                <input
                  type="number"
                  step="any"
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(e.target.value)}
                  placeholder="Kapasitas (Kg)"
                  className="h-10 rounded-xl border border-[#dbe5f1] bg-white px-3 font-bold outline-none"
                />

                <button
                  type="button"
                  onClick={addItemToCart}
                  className="h-10 rounded-xl bg-[#be123c] font-bold text-white hover:bg-[#9f1239] flex items-center justify-center gap-1"
                >
                  <Plus className="size-4" />
                  <span>+ Tabung</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 pt-1">
                {itemsCart.length ? (
                  itemsCart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-white p-2.5 border border-[#dbe5f1]"
                    >
                      <div>
                        <p className="font-bold text-[#0b1220]">
                          {item.serial_no} · <span className="text-[#be123c]">{item.media_type} {item.capacity_kg} Kg</span>
                        </p>
                        <p className="text-[11px] text-[#64748b]">Posisi: {item.location_tag}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-[#0b1220]">{formatRupiah(item.price)}</span>
                        <button
                          type="button"
                          onClick={() => removeItemFromCart(idx)}
                          className="text-[#94a3b8] hover:text-[#be123c]"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-xs font-semibold text-[#94a3b8]">
                    Belum ada tabung ditambahkan ke daftar pekerjaan refill.
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#dbe5f1] font-bold">
                <span>TOTAL BIAYA REFILL:</span>
                <span className="text-sm font-black text-[#be123c]">{formatRupiah(cartTotal)}</span>
              </div>
            </div>

            <SubmitButton className="h-12 w-full rounded-xl bg-[#be123c] font-black text-white hover:bg-[#9f1239]">
              Terima Order Pekerjaan Refill APAR
            </SubmitButton>
          </form>
        </CrudModal>
      ) : null}

      {/* Modal Detail Order & Complete Refill */}
      {selectedOrder ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-2xl"
          title={`Detail Order Refill: ${selectedOrder.order_no}`}
          onClose={() => setSelectedOrder(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-[#f8fbff] p-3.5 border border-[#dbe5f1] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Gedung / Klien:</span>
                <span className="font-bold text-[#0b1220]">{selectedOrder.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Tanggal Terima:</span>
                <span className="font-bold">{selectedOrder.order_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Jumlah Tabung:</span>
                <span className="font-bold">{selectedOrder.total_cylinders} Tabung</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b] font-semibold">Status Pengecekan Damkar:</span>
                <span
                  className={`font-bold ${
                    selectedOrder.status === "completed" ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {selectedOrder.status === "completed"
                    ? "Selesai & Sertifikat Damkar Terbit"
                    : "Dalam Pengisian Powder / Hydrotest"}
                </span>
              </div>
            </div>

            {/* Cylinder Items Table */}
            <div className="rounded-xl border border-[#dbe5f1] overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                  <tr>
                    <th className="px-3 py-2 font-bold">No. Seri Tabung</th>
                    <th className="px-3 py-2 font-bold">Media & Ukuran</th>
                    <th className="px-3 py-2 font-bold">Posisi Gedung</th>
                    <th className="px-3 py-2 font-bold text-center">Masa Berlaku</th>
                    <th className="px-3 py-2 font-bold text-right">Biaya Refill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {selectedOrder.apar_refill_items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 font-mono font-bold text-[#be123c]">{item.serial_no}</td>
                      <td className="px-3 py-2 font-bold">
                        {item.media_type} {item.capacity_kg} Kg
                      </td>
                      <td className="px-3 py-2 text-[#64748b]">{item.location_tag}</td>
                      <td className="px-3 py-2 text-center font-bold text-emerald-600">
                        {item.expired_date}
                      </td>
                      <td className="px-3 py-2 text-right font-black">{formatRupiah(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-[#0b1220] p-3 text-white flex justify-between items-center font-black">
              <span>TOTAL VALUE BIAYA REFILL:</span>
              <span className="text-emerald-400 text-sm">{formatRupiah(selectedOrder.total_amount)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              {selectedOrder.status !== "completed" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Selesaikan proses pengisian APAR & terbitkan Sertifikat Kelayakan Damkar?")) {
                      processAparRefillComplete(selectedOrder.id);
                    }
                  }}
                  className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white hover:bg-emerald-700 shadow-sm"
                >
                  <FileCheck2 className="size-4" />
                  <span>SELESAIKAN PEKERJAAN & TERBITKAN SERTIFIKAT DAMKAR</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="h-11 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0]"
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
