"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  ReceiptText,
  Ban,
} from "lucide-react";
import { CrudHeader } from "@/components/CrudHeader";
import { CrudModal } from "@/components/CrudModal";
import { CustomSelect } from "@/components/CustomSelect";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CurrencyInput } from "@/components/CurrencyInput";
import { SubmitButton } from "@/components/SubmitButton";
import { PrintKuitansiModal } from "@/components/PrintKuitansiModal";
import { postSavingsTransaction, voidSavingsTransaction } from "../actions";



type SavingsAccount = {
  id: string;
  account_no: string;
  type: "pokok" | "wajib" | "sukarela";
  members: {
    full_name: string;
    member_no: string;
  }[] | null;
};

type SavingsTransaction = {
  id: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  transaction_date: string;
  reference_no?: string | null;
  savings_accounts: {
    account_no: string;
    type: "pokok" | "wajib" | "sukarela";
    members: {
      full_name: string;
      member_no: string;
    }[] | null;
  }[] | null;
};

type TransaksiClientManagerProps = {
  accountRows: SavingsAccount[];
  transactionRows: SavingsTransaction[];
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const typeLabels = {
  pokok: "Pokok",
  wajib: "Wajib",
  sukarela: "Sukarela",
};

export function TransaksiClientManager({
  accountRows,
  transactionRows,
}: TransaksiClientManagerProps) {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [printTransaction, setPrintTransaction] = useState<SavingsTransaction | null>(null);
  const [selectedVoidTx, setSelectedVoidTx] = useState<SavingsTransaction | null>(null);


  // Real-time search & filtering for Transactions
  const filteredTransactions = transactionRows.filter((t) => {
    const memberName = t.savings_accounts?.[0]?.members?.[0]?.full_name ?? "";
    const accountNo = t.savings_accounts?.[0]?.account_no ?? "";
    const matchesSearch =
      !search ||
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      accountNo.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesDirection = !directionFilter || t.direction === directionFilter;

    return matchesSearch && matchesDirection;
  });

  return (
    <div className="space-y-6">
      {/* Standar CrudHeader */}
      <CrudHeader
        title="Transaksi Kasir & Mutasi Simpanan"
        subtitle="Proses setoran dan penarikan kas simpanan anggota serta cetak kuitansi teller."
        countBadge={`${transactionRows.length} Mutasi`}
        addButtonLabel="Input Transaksi Teller"
        onAddClick={() => setIsTransactionModalOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        statusFilterValue={directionFilter}
        onStatusFilterChange={setDirectionFilter}
        statusOptions={[
          { value: "in", label: "Setoran (Kas Masuk)" },
          { value: "out", label: "Penarikan (Kas Keluar)" },
        ]}
      />

      {/* Tabel Mutasi Transaksi */}
      <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
        <div className="space-y-3">
          {filteredTransactions.length ? (
            filteredTransactions.map((transaction) => {
              const accountObj = Array.isArray(transaction.savings_accounts)
                ? transaction.savings_accounts[0]
                : (transaction.savings_accounts as unknown as {
                    account_no: string;
                    type: "pokok" | "wajib" | "sukarela";
                    members: { full_name: string; member_no: string } | { full_name: string; member_no: string }[] | null;
                  } | null);

              const memberObj = Array.isArray(accountObj?.members)
                ? accountObj?.members[0]
                : (accountObj?.members as unknown as { full_name: string; member_no: string } | null);

              const memberName = memberObj?.full_name ?? "Anggota";
              const memberNo = memberObj?.member_no ?? "-";
              const accountNo = accountObj?.account_no ?? "";
              const accountType = accountObj?.type ?? "sukarela";

              return (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-3 rounded-2xl bg-[#f8fbff] p-4 border border-[#e2e8f0] transition-all hover:border-[#2563eb]/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl ${
                        transaction.direction === "in"
                          ? "bg-[#dbeafe] text-[#1d4ed8]"
                          : "bg-[#fff1f2] text-[#be123c]"
                      }`}
                    >
                      {transaction.direction === "in" ? (
                        <ArrowDownLeft className="size-6" />
                      ) : (
                        <ArrowUpRight className="size-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-bold text-sm text-[#0b1220]">{memberName}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            transaction.direction === "in"
                              ? "bg-[#eff6ff] text-[#2563eb]"
                              : "bg-[#fff1f2] text-[#be123c]"
                          }`}
                        >
                          {transaction.direction === "in" ? "Setoran Kas Masuk" : "Penarikan Kas Keluar"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#64748b]">
                        No Anggota: <span className="font-bold text-[#0b1220]">{memberNo}</span> · No Rek: {accountNo} ({typeLabels[accountType]}) · {transaction.description ?? "Transaksi Simpanan"}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-center justify-between sm:justify-end gap-4 text-left sm:text-right">
                    <div>
                      <p
                        className={`font-bold text-base ${
                          transaction.direction === "in" ? "text-[#16a34a]" : "text-[#be123c]"
                        }`}
                      >
                        {transaction.direction === "in" ? "+" : "-"}
                        {currency.format(Number(transaction.amount ?? 0))}
                      </p>
                      <p className="text-[11px] font-medium text-[#94a3b8]">
                        {transaction.transaction_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPrintTransaction(transaction)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#dbe5f1] bg-white px-3 text-xs font-bold text-[#0b1220] hover:bg-[#2563eb] hover:text-white hover:border-[#2563eb] active:scale-95 transition-all"
                        title="Cetak Kuitansi Teller"
                      >
                        <Printer className="size-4" />
                        <span className="hidden sm:inline">Kuitansi</span>
                      </button>

                      {!transaction.description?.includes("KOREKSI / VOID") ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVoidTx(transaction)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#ffe4e6] bg-[#fff1f2] px-3 text-xs font-bold text-[#be123c] hover:bg-[#be123c] hover:text-white active:scale-95 transition-all"
                          title="Batalkan Transaksi Ini"
                        >
                          <Ban className="size-4" />
                          <span className="hidden sm:inline">Batal (Void)</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })

          ) : (
            <div className="p-10 text-center">
              <ReceiptText className="mx-auto size-10 text-[#94a3b8]" />
              <p className="mt-3 font-bold text-[#0b1220]">Riwayat Mutasi Tidak Ditemukan</p>
              <p className="mt-1 text-xs font-medium text-[#64748b]">
                Coba ubah kata kunci pencarian atau jenis transaksi Anda.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Modal 1: Form Setor / Tarik Simpanan */}
      <CrudModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        title="Setoran / Penarikan Simpanan"
        subtitle="Input transaksi setoran atau penarikan saldo kasir teller."
      >
        <form action={postSavingsTransaction} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Pilih Rekening Anggota *</span>
            <SearchableSelect
              name="account_id"
              required
              placeholder="-- Ketik nama anggota / no rekening --"
              searchPlaceholder="Ketik untuk mencari nama anggota / no rek..."
              className="mt-1.5 h-11"
              options={accountRows.map((acc) => {
                const memberObj = Array.isArray(acc.members)
                  ? acc.members[0]
                  : (acc.members as unknown as { full_name: string; member_no: string } | null);
                const memberName = memberObj?.full_name ?? "Anggota";
                const memberNo = memberObj?.member_no ?? "-";
                return {
                  value: acc.id,
                  label: memberName,
                  sublabel: `No Rek: ${acc.account_no} · ${typeLabels[acc.type]} (${memberNo})`,
                };
              })}
            />
          </label>


          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Jenis Transaksi</span>
              <CustomSelect name="direction" defaultValue="in" className="mt-1.5 h-11">
                <option value="in">Setoran (Kas Masuk)</option>
                <option value="out">Penarikan (Kas Keluar)</option>
              </CustomSelect>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Metode Pembayaran</span>
              <CustomSelect name="payment_method" defaultValue="kas" className="mt-1.5 h-11">
                <option value="kas">Via Kas Tunai</option>
                <option value="bank">Via Transfer Bank</option>
              </CustomSelect>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Tanggal Transaksi</span>
            <input
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
              name="transaction_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Nominal Transaksi (Rp) *</span>
            <CurrencyInput
              name="amount"
              placeholder="0"
              required
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Nomor Referensi</span>
            <input
              className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none focus:border-[#2563eb]"
              name="reference_no"
              placeholder="Opsional (No Kuitansi / Bukti Transfer)"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase text-[#475569]">Keterangan Transaksi</span>
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#2563eb]"
              name="description"
              placeholder="Keterangan setoran/penarikan..."
            />
          </label>

          <div className="pt-2">
            <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]">
              Posting Transaksi Simpanan
            </SubmitButton>
          </div>
        </form>
      </CrudModal>

      {/* Print Kuitansi Modal */}
      {printTransaction ? (() => {
        const accountObj = Array.isArray(printTransaction.savings_accounts)
          ? printTransaction.savings_accounts[0]
          : (printTransaction.savings_accounts as unknown as {
              account_no: string;
              type: "pokok" | "wajib" | "sukarela";
              members: { full_name: string; member_no: string } | { full_name: string; member_no: string }[] | null;
            } | null);

        const memberObj = Array.isArray(accountObj?.members)
          ? accountObj?.members[0]
          : (accountObj?.members as unknown as { full_name: string; member_no: string } | null);

        const memberName = memberObj?.full_name ?? "Anggota";
        const memberNo = memberObj?.member_no ?? "-";
        const accountNo = accountObj?.account_no ?? "-";
        const accountType = accountObj?.type ?? "sukarela";

        return (
          <PrintKuitansiModal
            data={{
              noKuitansi: printTransaction.reference_no ?? `KWT-SAV-${printTransaction.id.slice(0, 6)}`,
              tanggal: printTransaction.transaction_date,
              diterimaDari: `${memberName} (${memberNo})`,
              tipeTransaksi: printTransaction.direction === "in" ? "Setoran Simpanan" : "Penarikan Simpanan",
              nominal: Number(printTransaction.amount ?? 0),
              keterangan: `${printTransaction.direction === "in" ? "Setoran" : "Penarikan"} Simpanan (${typeLabels[accountType]}) - No Rek: ${accountNo}`,
              petugas: "Teller Kasir",
            }}
            onClose={() => setPrintTransaction(null)}
          />
        );
      })() : null}


      {/* Void Transaction Confirmation Modal */}
      <CrudModal
        isOpen={Boolean(selectedVoidTx)}
        onClose={() => setSelectedVoidTx(null)}
        title="Pembatalan Transaksi Teller (Void / Storno)"
        subtitle="Sistem akan memposting transaksi koreksi pembalik untuk menetralkan saldo."
      >
        {selectedVoidTx ? (
          <form
            action={async (formData) => {
              await voidSavingsTransaction(selectedVoidTx.id, formData);
            }}
            className="space-y-4"
          >
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-xs border border-[#ffe4e6] text-[#be123c] space-y-1">
              <p className="font-bold text-sm">⚠️ Konfirmasi Pembatalan Transaksi</p>
              <p>Nominal: <b>{currency.format(Number(selectedVoidTx.amount ?? 0))}</b></p>
              <p>Tipe: <b>{selectedVoidTx.direction === "in" ? "Setoran Kas Masuk" : "Penarikan Kas Keluar"}</b></p>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#475569]">Alasan Pembatalan / Koreksi *</span>
              <textarea
                name="void_reason"
                required
                placeholder="Contoh: Salah ketik nominal teller / transaksi ganda..."
                className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-2.5 text-xs font-semibold outline-none focus:border-[#be123c]"
              />
            </label>

            <div className="pt-2">
              <SubmitButton className="h-11 w-full rounded-2xl bg-[#be123c] text-xs font-bold text-white hover:bg-[#9f1239]">
                Proses Pembatalan (Storno Void)
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </CrudModal>
    </div>
  );
}

