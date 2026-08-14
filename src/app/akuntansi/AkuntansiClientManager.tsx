"use client";

import { useState, useMemo } from "react";
import {
  BookOpenCheck,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { postManualJournal, approveJournal, rejectJournal, updateJournalLines } from "./actions";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type JournalLineRow = {
  debit: number;
  credit: number;
  accounts: {
    code: string;
    name: string;
    id?: string;
  } | {
    code: string;
    name: string;
    id?: string;
  }[] | null;
};

type JournalRow = {
  id: string;
  entry_no: string;
  entry_date: string;
  memo: string | null;
  source_type: string | null;
  status: string | null;
  journal_lines: JournalLineRow[];
};

type BusinessUnitOption = {
  id: string;
  code: string;
  name: string;
};

type AkuntansiClientManagerProps = {
  accountRows: AccountRow[];
  journalRows: JournalRow[];
  businessUnits?: BusinessUnitOption[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Menunggu Review", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending_manager: { label: "Menunggu Manager (Tahap 1)", color: "bg-amber-50 text-amber-800 border-amber-300 font-bold" },
  pending_accountant: { label: "Menunggu Akuntan (Tahap 2)", color: "bg-blue-50 text-blue-800 border-blue-300 font-bold" },
  approved: { label: "Disetujui (Approved)", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  loans: "Pinjaman",
  loan_payments: "Angsuran",
  savings: "Simpanan",
  cash_transactions: "Kasir",
};

function getStartOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function getEndOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function AkuntansiClientManager({ accountRows, journalRows, businessUnits = [] }: AkuntansiClientManagerProps) {
  const [tab, setTab] = useState<"draft" | "all">("draft");
  const [periodPreset, setPeriodPreset] = useState<"this_month" | "all" | "today" | "last_month" | "this_year" | "custom">("this_month");
  const [startDate, setStartDate] = useState<string>(getStartOfMonth());
  const [endDate, setEndDate] = useState<string>(getEndOfMonth());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editingJournal, setEditingJournal] = useState<JournalRow | null>(null);
  const [editMemo, setEditMemo] = useState("");
  const [editLines, setEditLines] = useState<{ account_id: string; debit: string; credit: string }[]>([]);

  // Apply preset dates
  const handlePresetChange = (preset: "this_month" | "all" | "today" | "last_month" | "this_year" | "custom") => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === "today") {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_month") {
      setStartDate(getStartOfMonth(now));
      setEndDate(getEndOfMonth(now));
    } else if (preset === "last_month") {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      setStartDate(getStartOfMonth(lastMonthDate));
      setEndDate(getEndOfMonth(lastMonthDate));
    } else if (preset === "this_year") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  const resetFilters = () => {
    handlePresetChange("this_month");
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Filtered Journals calculation
  const filteredJournals = useMemo(() => {
    return journalRows.filter((j) => {
      // 1. Tab Filter
      if (tab === "draft") {
        const isDraftOrPending = ["draft", "pending_manager", "pending_accountant"].includes(j.status ?? "draft");
        if (!isDraftOrPending) return false;
      }

      // 2. Specific Status filter
      if (statusFilter !== "all" && (j.status ?? "draft") !== statusFilter) {
        return false;
      }

      // 3. Date range filter
      if (startDate && j.entry_date < startDate) {
        return false;
      }
      if (endDate && j.entry_date > endDate) {
        return false;
      }

      // 4. Search query (no, memo, account)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = j.entry_no.toLowerCase().includes(q);
        const matchMemo = (j.memo ?? "").toLowerCase().includes(q);
        const matchAccount = (j.journal_lines ?? []).some((l) => {
          const act = Array.isArray(l.accounts) ? l.accounts[0] : l.accounts;
          return (act?.name ?? "").toLowerCase().includes(q) || (act?.code ?? "").toLowerCase().includes(q);
        });
        if (!matchNo && !matchMemo && !matchAccount) {
          return false;
        }
      }

      return true;
    });
  }, [journalRows, tab, statusFilter, startDate, endDate, searchQuery]);

  // Total calculations for the filtered journals
  const { totalDebit, totalCredit, countPending, countApproved } = useMemo(() => {
    let deb = 0;
    let cred = 0;
    let pending = 0;
    let app = 0;

    for (const j of filteredJournals) {
      if (["draft", "pending_manager", "pending_accountant"].includes(j.status ?? "draft")) {
        pending++;
      } else if (j.status === "approved") {
        app++;
      }

      for (const line of j.journal_lines ?? []) {
        deb += Number(line.debit ?? 0);
        cred += Number(line.credit ?? 0);
      }
    }

    return { totalDebit: deb, totalCredit: cred, countPending: pending, countApproved: app };
  }, [filteredJournals]);

  const draftCountTotal = useMemo(() => {
    return journalRows.filter((j) => ["draft", "pending_manager", "pending_accountant"].includes(j.status ?? "draft")).length;
  }, [journalRows]);

  const openEdit = (journal: JournalRow) => {
    setEditingJournal(journal);
    setEditMemo(journal.memo ?? "");
    setEditLines(
      journal.journal_lines.map((l) => {
        const act = Array.isArray(l.accounts)
          ? l.accounts[0]
          : (l.accounts as unknown as { id?: string; code: string; name: string } | null);
        return {
          account_id: act?.id ?? "",
          debit: String(Number(l.debit ?? 0)),
          credit: String(Number(l.credit ?? 0)),
        };
      }),
    );
  };

  const addEditLine = () => {
    setEditLines([...editLines, { account_id: "", debit: "0", credit: "0" }]);
  };

  const removeEditLine = (index: number) => {
    setEditLines(editLines.filter((_, i) => i !== index));
  };

  const updateEditLine = (index: number, field: string, value: string) => {
    setEditLines(editLines.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const editTotalDebit = editLines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const editTotalCredit = editLines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const isBalanced = Math.abs(editTotalDebit - editTotalCredit) < 1;

  const handleSaveEdit = async (formData: FormData) => {
    formData.set("memo", editMemo);
    formData.set(
      "lines",
      JSON.stringify(
        editLines.map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
        })),
      ),
    );
    const action = updateJournalLines.bind(null, editingJournal!.id);
    await action(formData);
  };

  const renderJournalCard = (entry: JournalRow) => {
    const status = statusConfig[entry.status ?? "draft"] ?? statusConfig.draft;
    const approve = approveJournal.bind(null, entry.id);
    const reject = rejectJournal.bind(null, entry.id);

    return (
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 transition-all hover:shadow-sm" key={entry.id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm text-[#0b1220]">{entry.entry_no}</p>
            <p className="text-xs font-semibold text-[#64748b]">
              {entry.entry_date} · {entry.memo ?? "Jurnal Umum"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${status.color}`}>
              {status.label}
            </span>
            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#64748b]">
              {sourceLabels[entry.source_type ?? "manual"] ?? entry.source_type}
            </span>
          </div>
        </div>

        {/* Lines */}
        <div className="mt-3 divide-y divide-[#f1f5f9] rounded-xl bg-[#f8fbff] p-3 border border-[#e2e8f0]">
          {entry.journal_lines.map((line, idx) => {
            const act = Array.isArray(line.accounts)
              ? line.accounts[0]
              : (line.accounts as unknown as { code: string; name: string } | null);
            const isDebit = Number(line.debit ?? 0) > 0;
            return (
              <div
                className={`flex items-center justify-between py-1.5 text-xs ${idx === 0 ? "pt-0" : ""} ${idx === entry.journal_lines.length - 1 ? "pb-0" : ""}`}
                key={idx}
              >
                <div className={`flex items-center gap-2 ${isDebit ? "" : "pl-6"}`}>
                  <span className="font-mono text-[11px] text-[#2563eb]">{act?.code ?? "-"}</span>
                  <span className="font-semibold text-[#0b1220]">{act?.name ?? "-"}</span>
                </div>
                <div className="font-mono font-bold text-[#0b1220]">
                  {isDebit ? currency.format(Number(line.debit)) : currency.format(Number(line.credit))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action buttons (only for draft / pending) */}
        {["draft", "pending_manager", "pending_accountant"].includes(entry.status ?? "draft") && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-3">
            <button
              type="button"
              onClick={() => openEdit(entry)}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#f1f5f9] px-2.5 text-xs font-bold text-[#475569] hover:bg-[#e2e8f0] transition-all cursor-pointer"
            >
              <Pencil className="size-3.5" />
              <span>Edit Jurnal</span>
            </button>
            <div className="flex items-center gap-2">
              <form action={reject}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-rose-50 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200"
                >
                  <X className="size-3.5" />
                  <span>Tolak</span>
                </button>
              </form>
              <form action={approve}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="size-3.5" />
                  <span>Setujui Jurnal</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      <div className="space-y-4 px-2 py-2 md:px-2 md:py-2">
        
        {/* ============================================================ */}
        {/* FILTER BAR & PERIODE TOOLBAR                                  */}
        {/* ============================================================ */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1] space-y-3">
          {/* Preset Buttons & Tab */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
                <Calendar className="size-3.5 text-[#2563eb]" /> Periode:
              </span>
              {(
                [
                  { id: "this_month", label: "Bulan Ini" },
                  { id: "today", label: "Hari Ini" },
                  { id: "last_month", label: "Bulan Lalu" },
                  { id: "this_year", label: "Tahun Ini" },
                  { id: "all", label: "Semua" },
                  { id: "custom", label: "Kustom" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetChange(preset.id)}
                  className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                    periodPreset === preset.id
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Reset Button */}
            {(startDate || endDate || searchQuery || statusFilter !== "all" || periodPreset !== "this_month") && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-7.5 items-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-semibold text-[#64748b] hover:bg-slate-200 transition-all cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>

          {/* Date Picker Inputs (Visible always or when custom) */}
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4 pt-1 border-t border-[#f1f5f9]">
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                className="h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                className="h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Status Jurnal</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb] cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="draft">⏳ Menunggu Review (Draft)</option>
                <option value="pending_manager">⏳ Menunggu Manager (Tahap 1)</option>
                <option value="pending_accountant">⏳ Menunggu Akuntan (Tahap 2)</option>
                <option value="approved">✅ Disetujui (Approved)</option>
                <option value="rejected">❌ Ditolak (Rejected)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Cari Kata Kunci</label>
              <div className="relative">
                <Search className="size-3.5 text-[#94a3b8] absolute left-2.5 top-3" />
                <input
                  type="text"
                  placeholder="No. Jurnal / Memo / Akun..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-8 pr-2 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
                />
              </div>
            </div>
          </div>

          {/* Quick Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8fbff] px-3 py-2 border border-[#e2e8f0] text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-[#0b1220]">
                Hasil: <span className="text-[#2563eb]">{filteredJournals.length} Jurnal</span>
              </span>
              <span className="text-[#64748b]">
                Total Debit: <span className="font-bold text-[#0b1220]">{currency.format(totalDebit)}</span>
              </span>
              <span className="text-[#64748b]">
                Total Kredit: <span className="font-bold text-[#0b1220]">{currency.format(totalCredit)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ✅ Balance ({currency.format(Math.abs(totalDebit - totalCredit))})
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN 2-COLUMN LAYOUT: JOURNALS & MANUAL ENTRY                 */}
        {/* ============================================================ */}
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {/* Tab selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("draft")}
                className={`h-9 rounded-xl px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab === "draft"
                    ? "bg-[#0b1220] text-white shadow-sm"
                    : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
                }`}
              >
                <Clock className="size-3.5" />
                <span>Menunggu Review ({draftCountTotal})</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`h-9 rounded-xl px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab === "all"
                    ? "bg-[#0b1220] text-white shadow-sm"
                    : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
                }`}
              >
                <BookOpenCheck className="size-3.5" />
                <span>Semua Jurnal ({journalRows.length})</span>
              </button>
            </div>

            {/* Journal List */}
            <section className="space-y-3">
              {filteredJournals.length ? (
                filteredJournals.map(renderJournalCard)
              ) : (
                <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-[#dbe5f1]">
                  <BookOpenCheck className="mx-auto size-9 text-[#94a3b8]" />
                  <p className="mt-3 font-bold text-[#0b1220]">
                    {tab === "draft" ? "Tidak ada jurnal menunggu review pada periode ini" : "Tidak ada jurnal yang sesuai dengan filter"}
                  </p>
                  <p className="text-xs text-[#64748b] mt-1">Coba ubah tanggal periode atau filter pencarian di atas.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar: Form Posting Jurnal Manual */}
          <aside className="h-fit rounded-xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Entri Akuntansi</p>
                <h2 className="text-base font-bold text-[#0b1220]">Buat Jurnal Umum</h2>
              </div>
              <Plus className="size-5 text-[#2563eb]" />
            </div>

            <p className="mt-2 text-xs font-medium text-[#64748b]">
              Gunakan form ini untuk transaksi penyesuaian, depresiasi aset, atau koreksi pembukuan.
            </p>

            <form action={postManualJournal} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Unit Usaha Terkait</span>
                <CustomSelect name="unit_name" className="mt-1.5 h-11">
                  <option value="Pusat / Umum">🏢 Kantor Pusat / Umum</option>
                  {businessUnits.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.code} · {u.name}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Akun Debit (Dr)</span>
                <CustomSelect name="debit_account_id" required className="mt-1.5 h-11">
                  <option value="">-- Pilih Akun Debit --</option>
                  {accountRows.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} · {acc.name}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Akun Kredit (Cr)</span>
                <CustomSelect name="credit_account_id" required className="mt-1.5 h-11">
                  <option value="">-- Pilih Akun Kredit --</option>
                  {accountRows.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} · {acc.name}
                    </option>
                  ))}
                </CustomSelect>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Nominal Jurnal (Rp)</span>
                <CurrencyInput
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="amount"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Jurnal</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-xs font-bold outline-none focus:border-[#2563eb]"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  name="entry_date"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Keterangan Jurnal</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
                  name="memo"
                  placeholder="Contoh: Penyesuaian akhir bulan / depresiasi aset..."
                />
              </label>

              <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
                Posting Jurnal Umum
              </SubmitButton>
            </form>
          </aside>
        </div>
      </div>

      {/* Edit Journal Modal */}
      <CrudModal
        isOpen={!!editingJournal}
        onClose={() => setEditingJournal(null)}
        title={`Edit Jurnal: ${editingJournal?.entry_no ?? ""}`}
        subtitle="Sesuaikan akun, nominal debit/kredit, atau tambah baris jurnal sebelum disetujui."
        maxWidth="max-w-4xl"
      >
        <form action={handleSaveEdit} className="space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">Keterangan / Memo</span>
            <textarea
              className="mt-1.5 min-h-16 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3 py-2.5 text-xs font-semibold text-[#0b1220] outline-none focus:border-[#2563eb] focus:bg-white transition-all"
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              placeholder="Keterangan jurnal..."
            />
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">Baris Jurnal</span>
              <button
                type="button"
                onClick={addEditLine}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#eaf2ff] px-3 text-xs font-bold text-[#2563eb] hover:bg-[#dbeafe] transition-all cursor-pointer shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              {editLines.map((line, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl bg-[#f8fbff] p-2 border border-[#e2e8f0]"
                >
                  {/* Wide COA Searchable Select */}
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      value={line.account_id}
                      onChange={(e) => updateEditLine(index, "account_id", e.target.value)}
                      placeholder="-- Pilih Akun COA --"
                      searchPlaceholder="Ketik kode / nama akun..."
                      className="h-10 text-xs"
                      options={accountRows.map((acc) => ({
                        value: acc.id,
                        label: `${acc.code} · ${acc.name}`,
                        sublabel: `Kategori: ${acc.category}`,
                      }))}
                    />
                  </div>

                  {/* Debit Input */}
                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      className="w-full h-10 rounded-xl border border-[#dbe5f1] bg-white px-2 text-xs font-bold text-[#0b1220] outline-none text-right font-mono focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                      placeholder="0 (Debit)"
                      value={line.debit && Number(line.debit) > 0 ? Number(line.debit).toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        updateEditLine(index, "debit", raw);
                      }}
                    />
                  </div>

                  {/* Credit Input */}
                  <div className="w-28 shrink-0">
                    <input
                      type="text"
                      className="w-full h-10 rounded-xl border border-[#dbe5f1] bg-white px-2 text-xs font-bold text-[#0b1220] outline-none text-right font-mono focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                      placeholder="0 (Kredit)"
                      value={line.credit && Number(line.credit) > 0 ? Number(line.credit).toLocaleString("id-ID") : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        updateEditLine(index, "credit", raw);
                      }}
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeEditLine(index)}
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all cursor-pointer"
                    title="Hapus baris"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Balance indicator Card */}
            <div
              className={`mt-3 rounded-2xl p-3.5 text-xs font-bold border transition-all ${
                isBalanced
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    Total Debit: <span className="font-mono text-sm font-black">{currency.format(editTotalDebit)}</span>
                  </span>
                  <span>
                    Total Kredit: <span className="font-mono text-sm font-black">{currency.format(editTotalCredit)}</span>
                  </span>
                </div>
                <div>
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-800 border border-emerald-300">
                      <Check className="size-3" /> SEIMBANG (BALANCE)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-black text-rose-800 border border-rose-300">
                      ⚠️ SELISIH: {currency.format(Math.abs(editTotalDebit - editTotalCredit))}
                    </span>
                  )}
                </div>
              </div>
              {!isBalanced && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-700">
                  Total Debit dan Kredit wajib balance sebelum perubahan dapat disimpan ke pembukuan.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isBalanced}
            className={`h-12 w-full rounded-2xl text-sm font-bold text-white transition-all shadow-sm ${
              isBalanced
                ? "bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] cursor-pointer"
                : "bg-[#94a3b8] cursor-not-allowed opacity-70"
            }`}
          >
            Simpan Perubahan Jurnal
          </button>
        </form>
      </CrudModal>
    </section>
  );
}
