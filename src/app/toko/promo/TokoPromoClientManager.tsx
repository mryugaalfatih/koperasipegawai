"use client";

import { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Gift,
  ShoppingBag,
  Percent,
  ToggleLeft,
  ToggleRight,
  Copy,
  Sparkles,
  UserCheck,
  RotateCcw,
  Trash2,
  DollarSign,
  AlertCircle,
  Clock,
} from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { TokoPromo } from "@/lib/tokoPromos";

type TokoPromoClientManagerProps = {
  initialPromos: TokoPromo[];
};

const formatRupiah = (val: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

export function TokoPromoClientManager({ initialPromos }: TokoPromoClientManagerProps) {
  const [promos, setPromos] = useState<TokoPromo[]>(initialPromos);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State for new promo
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"discount_flat" | "discount_percent" | "bundling">("discount_flat");
  const [newValue, setNewValue] = useState("10000");
  const [newMinSpend, setNewMinSpend] = useState("50000");
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState("2026-12-31");
  const [newIsMemberOnly, setNewIsMemberOnly] = useState(false);
  const [newDescription, setNewDescription] = useState("");

  const togglePromoStatus = (id: string) => {
    setPromos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const deletePromo = (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus promo ini?")) return;
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) return;

    const promoItem: TokoPromo = {
      id: `promo_${Date.now()}`,
      title: newTitle.trim(),
      code: newCode.trim().toUpperCase(),
      type: newType,
      value: Number(newValue) || 0,
      min_spend: Number(newMinSpend) || 0,
      start_date: newStartDate,
      end_date: newEndDate,
      is_member_only: newIsMemberOnly,
      is_active: true,
      description: newDescription.trim() || `Promo ${newTitle.trim()}`,
    };

    setPromos((prev) => [promoItem, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setNewTitle("");
    setNewCode("");
    setNewType("discount_flat");
    setNewValue("10000");
    setNewMinSpend("50000");
    setNewDescription("");
    setNewIsMemberOnly(false);
  };

  // Filtered promos
  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      if (typeFilter === "member_only" && !p.is_member_only) return false;
      if (typeFilter === "active_only" && !p.is_active) return false;
      if (typeFilter !== "all" && typeFilter !== "member_only" && typeFilter !== "active_only" && p.type !== typeFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchDesc) return false;
      }
      return true;
    });
  }, [promos, typeFilter, search]);

  const activeCount = promos.filter((p) => p.is_active).length;
  const memberOnlyCount = promos.filter((p) => p.is_member_only).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Tag className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#0b1220]">Promo, Diskon & Voucher Waserda Toko</h1>
            <p className="text-xs font-bold text-[#64748b]">
              Kelola voucher belanja sembako, promo diskon khusus anggota, dan kupon potongan harga kasir POS.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm transition-all cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Buat Promo / Voucher Baru</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Tag className="size-5 text-[#2563eb]" />
            <span className="text-[10px] font-bold text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-full">
              Total Kupon
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-[#0b1220]">{promos.length} Promo</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Semua voucher terdaftar</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Aktif di Kasir
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-emerald-600">{activeCount} Promo Aktif</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Bisa digunakan saat transaksi POS</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Sparkles className="size-5 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Member Exclusive
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-amber-600">{memberOnlyCount} Promo Anggota</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Khusus divalidasi anggota koperasi</p>
        </article>

        <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
          <div className="flex items-center justify-between">
            <Percent className="size-5 text-indigo-600" />
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
              Dukungan POS
            </span>
          </div>
          <p className="mt-2 text-xl font-black text-indigo-700">100% Otomatis</p>
          <p className="text-[11px] text-[#64748b] mt-0.5">Potong total belanja & cetak struk</p>
        </article>
      </section>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Semua Promo" },
              { id: "active_only", label: "● Aktif Saja" },
              { id: "discount_flat", label: "🏷️ Potongan Rp" },
              { id: "discount_percent", label: "% Diskon Persen" },
              { id: "member_only", label: "⭐ Khusus Anggota" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                  typeFilter === f.id
                    ? "bg-[#2563eb] text-white shadow-sm"
                    : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {(typeFilter !== "all" || search) && (
            <button
              type="button"
              onClick={() => {
                setTypeFilter("all");
                setSearch("");
              }}
              className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-[#64748b] hover:bg-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative pt-1">
          <Search className="absolute left-3 top-3.5 size-3.5 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Cari nama promo, kode voucher (SEMBAKO10), atau syarat ketentuan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-8 pr-3 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
          />
        </div>
      </div>

      {/* Promo Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPromos.length ? (
          filteredPromos.map((promo) => {
            const isDiscountPercent = promo.type === "discount_percent";

            return (
              <article
                key={promo.id}
                className={`rounded-2xl bg-white p-4 shadow-sm ring-1 transition-all flex flex-col justify-between ${
                  promo.is_active ? "ring-[#dbe5f1]" : "ring-slate-200 opacity-60 bg-slate-50"
                }`}
              >
                <div>
                  {/* Card Top Badges & Toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isDiscountPercent
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {isDiscountPercent ? "% Diskon Persen" : "🏷️ Potongan Rp"}
                      </span>

                      {promo.is_member_only ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800 flex items-center gap-0.5">
                          <Sparkles className="size-2.5" />
                          <span>Khusus Anggota</span>
                        </span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePromoStatus(promo.id)}
                      className="cursor-pointer text-[#2563eb] hover:opacity-80 transition-opacity"
                      title={promo.is_active ? "Nonaktifkan Promo" : "Aktifkan Promo"}
                    >
                      {promo.is_active ? (
                        <ToggleRight className="size-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="size-6 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <h3 className="mt-3 text-sm font-black text-[#0b1220] leading-snug">{promo.title}</h3>
                  <p className="mt-1 text-xs text-[#64748b] leading-relaxed">{promo.description}</p>
                </div>

                {/* Card Bottom Details */}
                <div className="mt-4 space-y-3 pt-3 border-t border-[#f1f5f9]">
                  {/* Voucher Code Box */}
                  <div className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-2.5 border border-[#dbe5f1]">
                    <div>
                      <p className="text-[10px] font-bold text-[#64748b]">KODE VOUCHER:</p>
                      <p className="font-mono text-sm font-black text-[#2563eb] uppercase tracking-wider">{promo.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-[#64748b]">NILAI HEMAT:</p>
                      <p className="text-sm font-black text-[#0b1220]">
                        {isDiscountPercent ? `${promo.value}%` : formatRupiah(promo.value)}
                      </p>
                    </div>
                  </div>

                  {/* Min Spend & Expiry */}
                  <div className="space-y-1 text-[11px] text-[#64748b]">
                    <div className="flex justify-between">
                      <span>Syarat Min. Belanja:</span>
                      <strong className="text-[#0b1220]">
                        {promo.min_spend > 0 ? formatRupiah(promo.min_spend) : "Tanpa Minimum"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Masa Berlaku:</span>
                      <span>s/d {promo.end_date}</span>
                    </div>
                  </div>

                  {/* Actions (Copy Code & Delete) */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(promo.code)}
                      className="flex-1 inline-flex h-8 items-center justify-center gap-1.5 rounded-xl bg-[#eff6ff] text-xs font-bold text-[#2563eb] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-all cursor-pointer"
                    >
                      <Copy className="size-3" />
                      <span>{copiedCode === promo.code ? "Tersalin! ✅" : "Salin Kode"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePromo(promo.id)}
                      className="inline-flex h-8 items-center justify-center rounded-xl bg-slate-50 px-2.5 text-xs font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer border border-slate-200"
                      title="Hapus Promo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-[#dbe5f1]">
            <Tag className="mx-auto size-8 text-[#94a3b8]" />
            <p className="mt-3 text-sm font-bold text-[#64748b]">Tidak ada promo yang sesuai dengan filter.</p>
          </div>
        )}
      </div>

      {/* Modal Buat Promo Baru */}
      {isAddModalOpen ? (
        <CrudModal
          isOpen={true}
          maxWidth="max-w-lg"
          title="Buat Promo / Kupon Voucher Baru"
          onClose={() => setIsAddModalOpen(false)}
        >
          <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
            <label className="block">
              <span className="font-bold text-[#475569]">Judul Promo / Nama Voucher *</span>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Contoh: Diskon Sembako Merdeka Rp 10.000"
                className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold text-[#475569]">Kode Voucher Kupon *</span>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: MERDEKA10"
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 font-mono text-xs font-black uppercase outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">Tipe Potongan *</span>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                >
                  <option value="discount_flat">🏷️ Potongan Nominal (Rp)</option>
                  <option value="discount_percent">% Diskon Persentase</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold text-[#475569]">
                  {newType === "discount_percent" ? "Besar Diskon (%) *" : "Nominal Potongan (Rp) *"}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={newType === "discount_percent" ? "Contoh: 5" : "Contoh: 10000"}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">Syarat Min. Belanja (Rp)</span>
                <input
                  type="number"
                  min="0"
                  value={newMinSpend}
                  onChange={(e) => setNewMinSpend(e.target.value)}
                  placeholder="Contoh: 100000 (0 jika tanpa min)"
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-bold text-[#475569]">Mulai Berlaku Tanggal</span>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="block">
                <span className="font-bold text-[#475569]">Berlaku Sampai Tanggal</span>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2.5 text-xs font-bold outline-none focus:border-[#2563eb]"
                />
              </label>
            </div>

            {/* Checkbox Khusus Anggota */}
            <label className="flex items-center gap-2 rounded-xl bg-[#f8fbff] p-3 border border-[#dbe5f1] cursor-pointer">
              <input
                type="checkbox"
                checked={newIsMemberOnly}
                onChange={(e) => setNewIsMemberOnly(e.target.checked)}
                className="size-4 rounded text-[#2563eb]"
              />
              <div>
                <p className="font-bold text-[#0b1220]">⭐ Promo Khusus Anggota Koperasi Saja</p>
                <p className="text-[10px] text-[#64748b]">Hanya aktif jika pembeli yang dipilih di Kasir adalah Anggota Koperasi.</p>
              </div>
            </label>

            <label className="block">
              <span className="font-bold text-[#475569]">Deskripsi / Syarat Ketentuan</span>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Contoh: Potongan langsung Rp 10.000 dengan minimal belanja Rp 100.000"
                className="mt-1 h-11 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold outline-none focus:border-[#2563eb]"
              />
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-[#2563eb] text-xs font-black text-white hover:bg-[#1d4ed8] shadow-sm cursor-pointer"
              >
                Terbitkan Promo Baru
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-11 rounded-xl bg-[#f1f5f9] px-4 text-xs font-bold text-[#0b1220] hover:bg-[#e2e8f0] cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        </CrudModal>
      ) : null}
    </div>
  );
}
