"use client";

import { useState, useMemo } from "react";
import {
  BookOpenCheck,
  Building2,
  Calculator,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Layers,
  Store,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
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
  cooperativeProfile?: {
    name: string;
    legal_number?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
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

const sourceLabels: Record<string, { label: string; icon: string }> = {
  manual: { label: "Manual", icon: "✏️" },
  loans: { label: "Pinjaman", icon: "💳" },
  loan_payments: { label: "Angsuran", icon: "📥" },
  savings: { label: "Simpanan", icon: "🏦" },
  cash_transactions: { label: "Kasir POS", icon: "🛒" },
  toko_sales: { label: "Penjualan Toko", icon: "🌾" },
  toko_purchase: { label: "Pembelian Toko", icon: "🚚" },
  toko_return: { label: "Retur Toko", icon: "🔄" },
  apar_sales: { label: "Penjualan APAR", icon: "🧯" },
  apar_refill: { label: "Refill APAR", icon: "🔄" },
};

function getStartOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function getEndOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

export function AkuntansiClientManager({
  accountRows,
  journalRows,
  businessUnits = [],
  cooperativeProfile,
}: AkuntansiClientManagerProps) {
  const [tab, setTab] = useState<"draft" | "all" | "ledger">("all");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [periodPreset, setPeriodPreset] = useState<"this_month" | "all" | "today" | "last_month" | "this_year" | "custom">("this_month");
  const [startDate, setStartDate] = useState<string>(getStartOfMonth());
  const [endDate, setEndDate] = useState<string>(getEndOfMonth());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Buku Besar (General Ledger) Selected Account
  const [selectedLedgerAccountId, setSelectedLedgerAccountId] = useState<string>(
    accountRows[0]?.id ?? ""
  );

  const [editingJournal, setEditingJournal] = useState<JournalRow | null>(null);
  const [editMemo, setEditMemo] = useState("");
  const [editLines, setEditLines] = useState<{ account_id: string; debit: string; credit: string }[]>([]);

  const isMatchUnit = (text: string | null | undefined, unitFilter: string) => {
    if (!unitFilter) return true;
    if (!text) return false;
    const t = text.toLowerCase();
    const u = unitFilter.toLowerCase();
    if (t.includes(u)) return true;
    if (u.includes("toko") || u.includes("waserda")) {
      return t.includes("toko") || t.includes("waserda") || t.includes("sembako");
    }
    if (u.includes("simpan") || u.includes("pinjam") || u.includes("usp")) {
      return t.includes("simpan") || t.includes("pinjam") || t.includes("usp") || t.includes("angsuran");
    }
    if (u.includes("apar")) {
      return t.includes("apar") || t.includes("tabung") || t.includes("refill");
    }
    return false;
  };

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
    setSelectedUnit("");
    setSearchQuery("");
    setStatusFilter("all");
  };

  // Filtered Journals calculation for Journal Tab
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

      // 3. Unit filter
      if (selectedUnit && !isMatchUnit(j.memo, selectedUnit)) {
        return false;
      }

      // 4. Date range filter
      if (startDate && j.entry_date < startDate) {
        return false;
      }
      if (endDate && j.entry_date > endDate) {
        return false;
      }

      // 5. Search query (no, memo, account)
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
  }, [journalRows, tab, statusFilter, selectedUnit, startDate, endDate, searchQuery]);

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

  // =========================================================================
  // BUKU BESAR (GENERAL LEDGER) CALCULATION
  // =========================================================================
  const selectedAccount = useMemo(() => {
    return (
      accountRows.find((a) => a.id === selectedLedgerAccountId) ||
      accountRows[0] ||
      null
    );
  }, [accountRows, selectedLedgerAccountId]);

  const isDebitNormal = useMemo(() => {
    if (!selectedAccount) return true;
    const cat = selectedAccount.category.toLowerCase();
    return ["aset", "aktiva", "beban", "biaya", "hpp", "pengeluaran"].some((c) => cat.includes(c));
  }, [selectedAccount]);

  const ledgerData = useMemo(() => {
    if (!selectedAccount) {
      return { openingBalance: 0, lines: [], periodDebit: 0, periodCredit: 0, endingBalance: 0 };
    }

    // Only approved journals post to General Ledger
    const approvedJournals = [...journalRows]
      .filter((j) => (j.status ?? "approved") === "approved")
      .sort((a, b) => (a.entry_date > b.entry_date ? 1 : a.entry_date < b.entry_date ? -1 : 0));

    let openingBalance = 0;
    let periodDebit = 0;
    let periodCredit = 0;
    const rawLines: Array<{
      id: string;
      entry_no: string;
      entry_date: string;
      memo: string;
      source_type: string;
      debit: number;
      credit: number;
    }> = [];

    for (const j of approvedJournals) {
      for (const line of j.journal_lines || []) {
        const act = Array.isArray(line.accounts) ? line.accounts[0] : line.accounts;
        const match = act?.id === selectedAccount.id || act?.code === selectedAccount.code;

        if (match) {
          const deb = Number(line.debit || 0);
          const cred = Number(line.credit || 0);
          const impact = isDebitNormal ? deb - cred : cred - deb;

          if (startDate && j.entry_date < startDate) {
            openingBalance += impact;
          } else if ((!startDate || j.entry_date >= startDate) && (!endDate || j.entry_date <= endDate)) {
            periodDebit += deb;
            periodCredit += cred;
            rawLines.push({
              id: `${j.id}_${line.debit}_${line.credit}`,
              entry_no: j.entry_no,
              entry_date: j.entry_date,
              memo: j.memo || "Jurnal Transaksi",
              source_type: j.source_type || "manual",
              debit: deb,
              credit: cred,
            });
          }
        }
      }
    }

    let running = openingBalance;
    const computedLines = rawLines.map((l) => {
      const impact = isDebitNormal ? l.debit - l.credit : l.credit - l.debit;
      running += impact;
      return { ...l, balance: running };
    });

    return {
      openingBalance,
      lines: computedLines,
      periodDebit,
      periodCredit,
      endingBalance: running,
    };
  }, [journalRows, selectedAccount, isDebitNormal, startDate, endDate]);

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
            {entry.source_type && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
                {sourceLabels[entry.source_type]?.label ?? entry.source_type}
              </span>
            )}
          </div>
        </div>

        {/* Lines table */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-[#dbe5f1]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fbff] text-[#475569]">
              <tr>
                <th className="px-3 py-2 font-bold">Akun Pembukuan</th>
                <th className="px-3 py-2 font-bold text-right">Debit</th>
                <th className="px-3 py-2 font-bold text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {entry.journal_lines.map((line, idx) => {
                const act = Array.isArray(line.accounts)
                  ? line.accounts[0]
                  : (line.accounts as unknown as { code: string; name: string } | null);
                return (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-bold text-[#0b1220]">
                      <span className="font-mono text-[#2563eb] mr-1.5">{act?.code}</span>
                      <span>{act?.name}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {Number(line.debit) > 0 ? currency.format(Number(line.debit)) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">
                      {Number(line.credit) > 0 ? currency.format(Number(line.credit)) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-2.5">
          <button
            type="button"
            onClick={() => openEdit(entry)}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Pencil className="size-3.5 text-[#2563eb]" />
            <span>Edit Jurnal</span>
          </button>

          {["draft", "pending_manager", "pending_accountant"].includes(entry.status ?? "draft") && (
            <div className="flex items-center gap-2">
              <form action={approve}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  <Check className="size-3.5" />
                  <span>Setujui (Approve)</span>
                </button>
              </form>

              <form action={reject}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <X className="size-3.5" />
                  <span>Tolak</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      <div className="space-y-4 px-2 py-2 md:px-2 md:py-2">
        
        {/* ============================================================ */}
        {/* FILTER BAR & PERIODE TOOLBAR                                  */}
        {/* ============================================================ */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-[#dbe5f1] space-y-3 print:hidden">
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
            {(startDate || endDate || searchQuery || statusFilter !== "all" || selectedUnit || periodPreset !== "this_month") && (
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

          {/* Unit Usaha Filter Buttons (Only on Journal tab) */}
          {tab !== "ledger" && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#f1f5f9]">
              <span className="text-xs font-bold text-[#64748b] mr-1 flex items-center gap-1">
                <Building2 className="size-3.5 text-[#2563eb]" /> Unit:
              </span>
              <button
                type="button"
                onClick={() => setSelectedUnit("")}
                className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                  !selectedUnit
                    ? "bg-[#0b1220] text-white shadow-sm"
                    : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                }`}
              >
                Semua Unit ({journalRows.length})
              </button>
              {businessUnits.map((u) => {
                const isActive = selectedUnit === u.name;
                const count = journalRows.filter((j) => isMatchUnit(j.memo, u.name)).length;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUnit(u.name)}
                    className={`h-7.5 rounded-xl px-2.5 text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#2563eb] text-white shadow-sm"
                        : "bg-[#f8fbff] text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-100"
                    }`}
                  >
                    {u.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Date Picker Inputs */}
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
            {tab !== "ledger" && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB SELECTOR: DRAFT vs SEMUA JURNAL vs BUKU BESAR             */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setTab("draft")}
            className={`h-9 rounded-xl px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "draft"
                ? "bg-[#0b1220] text-white shadow-sm"
                : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
            }`}
          >
            <Clock className="size-3.5" />
            <span>Menunggu Review</span>
            {draftCountTotal > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                {draftCountTotal}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setTab("all")}
            className={`h-9 rounded-xl px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "all"
                ? "bg-[#0b1220] text-white shadow-sm"
                : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
            }`}
          >
            <BookOpenCheck className="size-3.5" />
            <span>Semua Jurnal ({journalRows.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("ledger")}
            className={`h-9 rounded-xl px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === "ledger"
                ? "bg-[#2563eb] text-white shadow-sm"
                : "bg-white text-[#2563eb] ring-1 ring-[#bfdbfe] hover:bg-blue-50"
            }`}
          >
            <Scale className="size-3.5" />
            <span>📖 Buku Besar (General Ledger)</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1 & 2: JURNAL DRAFT & SEMUA JURNAL UMUM                  */}
        {/* ============================================================ */}
        {tab !== "ledger" ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              {/* Quick Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-2xs border border-[#dbe5f1] text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-bold text-[#0b1220]">
                    Hasil: <span className="text-[#2563eb]">{filteredJournals.length} Jurnal</span>
                  </span>
                  <span className="text-[#64748b]">
                    Total Debit: <span className="font-bold text-emerald-700">{currency.format(totalDebit)}</span>
                  </span>
                  <span className="text-[#64748b]">
                    Total Kredit: <span className="font-bold text-rose-700">{currency.format(totalCredit)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    ✅ Balance ({currency.format(Math.abs(totalDebit - totalCredit))})
                  </span>
                </div>
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

              <form action={postManualJournal} className="mt-4 space-y-4">
                <input
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  name="entry_date"
                  type="date"
                  className="h-10 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-3 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
                  required
                />

                <textarea
                  className="w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] p-3 text-xs font-medium text-[#0b1220] outline-none focus:border-[#2563eb]"
                  name="memo"
                  placeholder="Keterangan transaksi / memo jurnal..."
                  rows={2}
                  required
                />

                <div className="space-y-3 rounded-2xl bg-[#f8fbff] p-3 border border-[#dbe5f1]">
                  <p className="text-[11px] font-bold uppercase text-[#2563eb]">Posisi Debit (D)</p>
                  <SearchableSelect
                    name="debit_account_id"
                    placeholder="Pilih Akun Debit..."
                    options={accountRows.map((a) => ({
                      value: a.id,
                      label: `${a.code} · ${a.name} (${a.category})`,
                    }))}
                  />
                  <CurrencyInput name="debit_amount" placeholder="Nominal Debit Rp..." required />
                </div>

                <div className="space-y-3 rounded-2xl bg-[#f8fbff] p-3 border border-[#dbe5f1]">
                  <p className="text-[11px] font-bold uppercase text-rose-600">Posisi Kredit (K)</p>
                  <SearchableSelect
                    name="credit_account_id"
                    placeholder="Pilih Akun Kredit..."
                    options={accountRows.map((a) => ({
                      value: a.id,
                      label: `${a.code} · ${a.name} (${a.category})`,
                    }))}
                  />
                  <CurrencyInput name="credit_amount" placeholder="Nominal Kredit Rp..." required />
                </div>

                <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8]">
                  Posting Jurnal (Draft)
                </SubmitButton>
              </form>
            </aside>
          </div>
        ) : (
          /* ============================================================ */
          /* VIEW 3: BUKU BESAR (GENERAL LEDGER PER AKUN)                 */
          /* ============================================================ */
          <div className="space-y-4">
            {/* Account Selector & Print Bar */}
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] space-y-3 print:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[280px]">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block mb-1.5">
                    PILIH REKENING BUKU BESAR (CHART OF ACCOUNTS):
                  </label>
                  <select
                    value={selectedLedgerAccountId}
                    onChange={(e) => setSelectedLedgerAccountId(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-[#2563eb] bg-[#f8fbff] px-3 text-xs font-bold text-[#0b1220] outline-none focus:ring-2 focus:ring-[#2563eb]/20 cursor-pointer"
                  >
                    {accountRows.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} · {a.name} ({a.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#eff6ff] px-3 py-2 border border-[#bfdbfe] text-center">
                    <p className="text-[10px] font-bold text-[#64748b]">SALDO NORMAL</p>
                    <p className={`text-xs font-black ${isDebitNormal ? "text-[#2563eb]" : "text-emerald-700"}`}>
                      {isDebitNormal ? "DEBIT (D)" : "KREDIT (K)"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] cursor-pointer"
                  >
                    <Printer className="size-4" />
                    <span>Cetak Buku Besar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 KPI Cards for the Selected Account */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase">Saldo Awal</span>
                  <Scale className="size-4 text-[#2563eb]" />
                </div>
                <p className="mt-2 text-lg font-black text-[#0b1220]">
                  {currency.format(ledgerData.openingBalance)}
                </p>
                <p className="text-[10px] font-medium text-[#64748b]">
                  {startDate ? `Posisi sebelum ${startDate}` : "Akumulasi awal"}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase">Total Mutasi Debit</span>
                  <ArrowDownLeft className="size-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-lg font-black text-emerald-700">
                  {currency.format(ledgerData.periodDebit)}
                </p>
                <p className="text-[10px] font-medium text-[#64748b]">Periode terpilih</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1]">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold uppercase">Total Mutasi Kredit</span>
                  <ArrowUpRight className="size-4 text-rose-600" />
                </div>
                <p className="mt-2 text-lg font-black text-rose-700">
                  {currency.format(ledgerData.periodCredit)}
                </p>
                <p className="text-[10px] font-medium text-[#64748b]">Periode terpilih</p>
              </div>

              <div className="rounded-2xl bg-[#0b1220] p-4 text-white shadow-sm ring-1 ring-[#0b1220]">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase text-[#93c5fd]">Saldo Akhir Akun</span>
                  <Calculator className="size-4 text-[#93c5fd]" />
                </div>
                <p className="mt-2 text-lg font-black text-white">
                  {currency.format(ledgerData.endingBalance)}
                </p>
                <p className="text-[10px] font-medium text-slate-300">
                  Posisi per {endDate || "hari ini"}
                </p>
              </div>
            </div>

            {/* General Ledger Table */}
            <div id="printable-ledger-sheet" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] space-y-4 print:p-0 print:ring-0 print:shadow-none">
              {/* Header on Printable Sheet */}
              <div className="border-b border-[#cbd5e1] pb-3 hidden print:block">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black text-black uppercase">{cooperativeProfile?.name || "KOPERASI PEGAWAI REPUBLIK INDONESIA"}</h2>
                    <p className="text-xs font-semibold text-slate-600">{cooperativeProfile?.address || "Jl. Raya Pusat No. 123"}</p>
                    <p className="text-xs font-semibold text-slate-600">Badan Hukum: {cooperativeProfile?.legal_number || "AHU-001928.AH.01.26"}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-sm font-black text-black">BUKU BESAR (GENERAL LEDGER)</h3>
                    <p className="text-xs font-bold text-slate-700">Akun: {selectedAccount?.code} - {selectedAccount?.name}</p>
                    <p className="text-[11px] text-slate-600">Periode: {startDate || "Awal"} s/d {endDate || "Sekarang"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between print:hidden">
                <div>
                  <h3 className="text-sm font-black text-[#0b1220]">
                    Kartu Mutasi Buku Besar: {selectedAccount?.code} · {selectedAccount?.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#64748b]">
                    Kategori: {selectedAccount?.category.toUpperCase()} · Periode: {startDate || "Semua"} s/d {endDate || "Sekarang"}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#2563eb] rounded-full bg-[#eff6ff] px-2.5 py-1">
                  {ledgerData.lines.length} Mutasi Transaksi
                </span>
              </div>

              {/* Mutasi Table */}
              <div className="overflow-x-auto rounded-xl border border-[#dbe5f1]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8fbff] text-[#475569] border-b border-[#dbe5f1]">
                    <tr>
                      <th className="px-3 py-2.5 font-bold w-24">Tanggal</th>
                      <th className="px-3 py-2.5 font-bold w-32">No. Jurnal</th>
                      <th className="px-3 py-2.5 font-bold">Keterangan / Memo</th>
                      <th className="px-3 py-2.5 font-bold w-28">Sumber</th>
                      <th className="px-3 py-2.5 font-bold text-right w-32 text-emerald-700">Debit</th>
                      <th className="px-3 py-2.5 font-bold text-right w-32 text-rose-700">Kredit</th>
                      <th className="px-3 py-2.5 font-bold text-right w-36 text-[#2563eb]">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {/* Row 1: Saldo Awal */}
                    <tr className="bg-slate-50/80 font-bold">
                      <td className="px-3 py-2 text-slate-500">{startDate || "-"}</td>
                      <td className="px-3 py-2 text-slate-500 font-mono">SALDO-AWAL</td>
                      <td className="px-3 py-2 text-[#0b1220]" colSpan={2}>
                        Saldo Awal Periode Buku
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">-</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">-</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-[#0b1220]">
                        {currency.format(ledgerData.openingBalance)}
                      </td>
                    </tr>

                    {/* Mutation Rows */}
                    {ledgerData.lines.length ? (
                      ledgerData.lines.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#f8fbff] transition-colors">
                          <td className="px-3 py-2 font-medium text-[#475569]">{row.entry_date}</td>
                          <td className="px-3 py-2 font-mono font-bold text-[#2563eb]">{row.entry_no}</td>
                          <td className="px-3 py-2 font-medium text-[#0b1220]">{row.memo}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                              {sourceLabels[row.source_type]?.label ?? row.source_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                            {row.debit > 0 ? currency.format(row.debit) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-rose-700">
                            {row.credit > 0 ? currency.format(row.credit) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-black text-[#0b1220]">
                            {currency.format(row.balance)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-[#64748b] font-medium">
                          Tidak ada mutasi transaksi pada rekening akun ini selama periode yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Table Footer */}
                  <tfoot className="bg-[#f8fbff] font-bold border-t-2 border-[#cbd5e1]">
                    <tr>
                      <td colSpan={4} className="px-3 py-2.5 text-right font-black uppercase text-[#0b1220]">
                        TOTAL MUTASI & SALDO AKHIR:
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-emerald-700">
                        {currency.format(ledgerData.periodDebit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-rose-700">
                        {currency.format(ledgerData.periodCredit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-black text-[#2563eb]">
                        {currency.format(ledgerData.endingBalance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures on Print Sheet */}
              <div className="mt-8 pt-6 border-t border-slate-300 hidden print:grid print:grid-cols-2 text-center text-xs">
                <div>
                  <p className="font-bold">Dibuat Oleh,</p>
                  <p className="font-semibold text-slate-600 mt-1">Bagian Pembukuan / Akuntan</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-black inline-block px-8">( ........................................ )</p>
                </div>
                <div>
                  <p className="font-bold">Mengetahui & Menyetujui,</p>
                  <p className="font-semibold text-slate-600 mt-1">Ketua / Pengurus Koperasi</p>
                  <div className="h-16" />
                  <p className="font-bold border-b border-black inline-block px-8">( ........................................ )</p>
                </div>
              </div>
            </div>

            {/* Global Print Stylesheet for General Ledger */}
            <style jsx global>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-ledger-sheet, #printable-ledger-sheet * {
                  visibility: visible;
                }
                #printable-ledger-sheet {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 8mm;
                  background: white !important;
                }
                @page {
                  size: A4 portrait;
                  margin: 8mm;
                }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL EDIT JURNAL                                             */}
      {/* ============================================================ */}
      <CrudModal
        isOpen={Boolean(editingJournal)}
        onClose={() => setEditingJournal(null)}
        title={`Edit Baris Jurnal: ${editingJournal?.entry_no ?? ""}`}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(new FormData(e.currentTarget)); }} className="space-y-4 text-xs">
          <div className="rounded-xl bg-[#eff6ff] p-3 text-[#2563eb] border border-[#bfdbfe]">
            <p className="font-bold">Koreksi Pembukuan Akuntansi</p>
            <p className="text-[11px] text-[#475569] mt-0.5">
              Ubah akun debit/kredit atau nominal. Pastikan total debit sama dengan total kredit (Balance).
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#64748b] uppercase block mb-1">Keterangan / Memo Jurnal</label>
            <textarea
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-2.5 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb]"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#64748b] uppercase">Rincian Baris Jurnal</label>
              <button
                type="button"
                onClick={addEditLine}
                className="inline-flex h-7 items-center gap-1 rounded-lg bg-[#2563eb] px-2 text-[11px] font-bold text-white hover:bg-[#1d4ed8] cursor-pointer"
              >
                <Plus className="size-3" />
                <span>Tambah Baris</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {editLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-[#dbe5f1] bg-[#f8fbff] p-2">
                  <div className="flex-1">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateEditLine(idx, "account_id", e.target.value)}
                      className="h-8 w-full rounded-lg border border-[#cbd5e1] bg-white px-2 text-xs font-bold text-[#0b1220]"
                      required
                    >
                      <option value="">Pilih Akun...</option>
                      {accountRows.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Debit"
                      value={line.debit}
                      onChange={(e) => updateEditLine(idx, "debit", e.target.value)}
                      className="h-8 w-full rounded-lg border border-[#cbd5e1] bg-white px-2 text-right text-xs font-bold text-emerald-700"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      placeholder="Kredit"
                      value={line.credit}
                      onChange={(e) => updateEditLine(idx, "credit", e.target.value)}
                      className="h-8 w-full rounded-lg border border-[#cbd5e1] bg-white px-2 text-right text-xs font-bold text-rose-700"
                    />
                  </div>
                  {editLines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeEditLine(idx)}
                      className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Balance status */}
            <div className="rounded-xl bg-slate-50 p-2.5 border border-[#e2e8f0]">
              <div className="flex items-center justify-between text-xs font-bold">
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
