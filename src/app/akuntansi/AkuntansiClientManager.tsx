"use client";

import { useState } from "react";
import {
  BookOpenCheck,
  Calculator,
  Check,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
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

type AkuntansiClientManagerProps = {
  accountRows: AccountRow[];
  journalRows: JournalRow[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Menunggu Review", color: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Disetujui", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Ditolak", color: "bg-rose-50 text-rose-700 border-rose-200" },
};

const sourceLabels: Record<string, string> = {
  manual: "Manual",
  loans: "Pinjaman",
  loan_payments: "Angsuran",
  savings: "Simpanan",
};

export function AkuntansiClientManager({ accountRows, journalRows }: AkuntansiClientManagerProps) {
  const [tab, setTab] = useState<"draft" | "all">("draft");
  const [editingJournal, setEditingJournal] = useState<JournalRow | null>(null);
  const [editMemo, setEditMemo] = useState("");
  const [editLines, setEditLines] = useState<{ account_id: string; debit: string; credit: string }[]>([]);

  const draftJournals = journalRows.filter((j) => (j.status ?? "draft") === "draft");
  const displayedJournals = tab === "draft" ? draftJournals : journalRows;

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
        <div className="mt-3 rounded-xl bg-[#f8fbff] p-3 text-xs font-semibold space-y-1.5 border border-[#e2e8f0]">
          {entry.journal_lines?.map((line, index) => {
            const act = Array.isArray(line.accounts)
              ? line.accounts[0]
              : (line.accounts as unknown as { code: string; name: string } | null);

            return (
              <div className="flex items-center justify-between gap-2" key={index}>
                <span className={Number(line.credit ?? 0) > 0 ? "pl-4 text-[#64748b]" : "font-bold text-[#0b1220]"}>
                  {act?.code ?? "-"} · {act?.name ?? "Akun"}
                </span>
                <span className="whitespace-nowrap">
                  {Number(line.debit ?? 0) > 0
                    ? `(Dr) ${currency.format(Number(line.debit))}`
                    : `(Cr) ${currency.format(Number(line.credit))}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons for draft journals */}
        {(entry.status ?? "draft") === "draft" && (
          <div className="mt-3 flex items-center gap-2">
            <form action={approve}>
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="size-3.5" />
                Approve
              </button>
            </form>
            <button
              type="button"
              onClick={() => openEdit(entry)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe5f1] bg-white px-3 text-[11px] font-bold text-[#0b1220] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            >
              <Pencil className="size-3.5" />
              Edit
            </button>
            <form action={reject}>
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 text-[11px] font-bold text-rose-700 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
              >
                <X className="size-3.5" />
                Tolak
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="min-w-0 pb-20 lg:pb-8">
      <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-4 md:px-7 md:py-6">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Tab selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("draft")}
                className={`h-10 rounded-2xl px-5 text-xs font-bold transition-all cursor-pointer ${
                  tab === "draft"
                    ? "bg-[#0b1220] text-white"
                    : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
                }`}
              >
                Menunggu Review ({draftJournals.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("all")}
                className={`h-10 rounded-2xl px-5 text-xs font-bold transition-all cursor-pointer ${
                  tab === "all"
                    ? "bg-[#0b1220] text-white"
                    : "bg-white text-[#64748b] ring-1 ring-[#dbe5f1] hover:bg-slate-50"
                }`}
              >
                Semua Jurnal ({journalRows.length})
              </button>
            </div>

            {/* Journal List */}
            <section className="space-y-3">
              {displayedJournals.length ? (
                displayedJournals.map(renderJournalCard)
              ) : (
                <div className="rounded-[28px] bg-white p-10 text-center shadow-sm ring-1 ring-[#dbe5f1]">
                  <BookOpenCheck className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-bold text-[#0b1220]">
                    {tab === "draft" ? "Tidak ada jurnal menunggu review" : "Belum ada riwayat jurnal"}
                  </p>
                </div>
              )}
            </section>

            {/* Chart of Accounts */}
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Master Akun</p>
                  <h2 className="text-base font-bold text-[#0b1220]">Bagan Akun (Chart of Accounts / CoA)</h2>
                </div>
                <Calculator className="size-5 text-[#2563eb]" />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {accountRows.map((acc) => (
                  <div className="rounded-2xl bg-[#f4f7fb] p-3.5" key={acc.id}>
                    <p className="text-xs font-bold text-[#2563eb]">{acc.code}</p>
                    <p className="text-sm font-bold text-[#0b1220]">{acc.name}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#64748b] capitalize">{acc.category}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Manual Journal Form Sidebar */}
          <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Form Akuntansi</p>
                <h2 className="text-base font-bold text-[#0b1220]">Input Jurnal Umum</h2>
              </div>
            </div>

            <form action={postManualJournal} className="mt-5 space-y-4">
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
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  name="amount"
                  placeholder="0"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Jurnal</span>
                <input
                  className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  name="entry_date"
                  type="date"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Keterangan Jurnal</span>
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
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
      >
        <form action={handleSaveEdit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-[#0b1220]">Keterangan / Memo</span>
            <textarea
              className="mt-2 min-h-16 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-sm font-semibold outline-none focus:border-[#2563eb]"
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
            />
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-[#0b1220]">Baris Jurnal</span>
              <button
                type="button"
                onClick={addEditLine}
                className="h-7 rounded-lg bg-[#eaf2ff] px-3 text-[11px] font-bold text-[#2563eb] hover:bg-[#dbeafe] cursor-pointer"
              >
                + Tambah Baris
              </button>
            </div>

            <div className="space-y-2">
              {editLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2 rounded-xl bg-[#f8fbff] p-2 border border-[#e2e8f0]">
                  <select
                    className="flex-1 h-9 rounded-lg border border-[#dbe5f1] bg-white px-2 text-xs font-bold outline-none"
                    value={line.account_id}
                    onChange={(e) => updateEditLine(index, "account_id", e.target.value)}
                  >
                    <option value="">Pilih Akun</option>
                    {accountRows.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} · {acc.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-24 h-9 rounded-lg border border-[#dbe5f1] bg-white px-2 text-xs font-bold outline-none text-right"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={(e) => updateEditLine(index, "debit", e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 h-9 rounded-lg border border-[#dbe5f1] bg-white px-2 text-xs font-bold outline-none text-right"
                    placeholder="Kredit"
                    value={line.credit}
                    onChange={(e) => updateEditLine(index, "credit", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeEditLine(index)}
                    className="grid size-8 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Balance indicator */}
            <div className={`mt-3 rounded-xl p-3 text-xs font-bold ${isBalanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              <div className="flex justify-between">
                <span>Total Debit:</span>
                <span>{currency.format(editTotalDebit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Kredit:</span>
                <span>{currency.format(editTotalCredit)}</span>
              </div>
              {!isBalanced && (
                <p className="mt-1 text-[11px]">⚠️ Debit dan Kredit harus balance sebelum simpan.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!isBalanced}
            className={`h-12 w-full rounded-2xl text-sm font-bold text-white transition-all ${isBalanced ? "bg-[#2563eb] hover:bg-[#1d4ed8]" : "bg-[#94a3b8] cursor-not-allowed"}`}
          >
            Simpan Perubahan
          </button>
        </form>
      </CrudModal>
    </section>
  );
}
