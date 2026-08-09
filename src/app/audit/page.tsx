import {
  ArrowLeft,
  ClipboardCheck,
  Database,
  FileClock,
  FileText,
  Fingerprint,
  ListChecks,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createDemoAuditLog } from "./actions";
import { createClient } from "@/lib/supabase/server";

type AuditPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type AuditLogRow = {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
  }[] | null;
};

const actionLabels: Record<string, string> = {
  "demo.audit.checked": "Cek audit demo",
  "member.created": "Anggota dibuat",
  "savings.transaction.posted": "Transaksi simpanan",
  "loan.approved": "Pinjaman disetujui",
  "loan.disbursed": "Pinjaman dicairkan",
  "journal.posted": "Jurnal diposting",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, metadata, created_at, profiles(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(80);

  const auditRows = (logs ?? []) as unknown as AuditLogRow[];
  const tableCount = new Set(auditRows.map((row) => row.table_name).filter(Boolean)).size;
  const actorCount = new Set(auditRows.map((row) => row.profiles?.[0]?.full_name).filter(Boolean)).size;
  const latest = auditRows[0];

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/home">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Audit trail</p>
              <h1 className="text-xl font-black md:text-2xl">Jejak aktivitas sistem</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/laporan">
            Laporan
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">Kontrol dan pemeriksaan</p>
                <h2 className="mt-2 text-3xl font-black">Semua aksi penting bisa ditelusuri</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                  Audit trail membantu pengurus dan auditor melihat siapa melakukan apa, kapan, dan pada data apa.
                </p>
              </div>
              <ShieldCheck className="size-9 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Total log", value: String(auditRows.length), icon: ListChecks },
              { label: "Tabel terdampak", value: String(tableCount), icon: Database },
              { label: "Aktor", value: String(actorCount), icon: UserRound },
              { label: "Log terakhir", value: latest ? formatDate(latest.created_at) : "-", icon: FileClock },
            ].map((item) => (
              <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]" key={item.label}>
                <item.icon className="size-6 text-[#2563eb]" />
                <p className="mt-4 text-sm font-bold text-[#64748b]">{item.label}</p>
                <p className="mt-1 text-xl font-black">{item.value}</p>
              </article>
            ))}
          </div>

          <section className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div>
              <p className="text-sm font-bold text-[#64748b]">Aktivitas terbaru</p>
              <h2 className="text-2xl font-black">Daftar audit</h2>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {auditRows.length ? (
                auditRows.map((log) => (
                  <div className="grid gap-4 border-b border-[#dbe5f1] p-4 last:border-b-0 xl:grid-cols-[1fr_auto]" key={log.id}>
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                        <Fingerprint className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black">{actionLabels[log.action] ?? log.action}</p>
                        <p className="mt-1 text-sm font-semibold text-[#64748b]">
                          {log.profiles?.[0]?.full_name ?? "Sistem"} | {log.profiles?.[0]?.role ?? "system"}
                        </p>
                        <p className="mt-1 text-xs font-bold text-[#64748b]">
                          Tabel {log.table_name ?? "-"} | Record {log.record_id ?? "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-left xl:text-right">
                      <p className="text-sm font-black text-[#2563eb]">{formatDate(log.created_at)}</p>
                      <p className="mt-1 text-xs font-bold text-[#64748b]">
                        {typeof log.metadata?.note === "string" ? log.metadata.note : "Metadata tersimpan"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <FileText className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada audit log</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Buat log demo dari form di samping.</p>
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {params.error ? (
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
          ) : null}
          {params.saved ? (
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Audit log demo berhasil dibuat.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Demo</p>
                <h2 className="text-xl font-black">Buat audit log</h2>
              </div>
            </div>
            <form action={createDemoAuditLog} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Aksi</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="action">
                  <option value="demo.audit.checked">Cek audit demo</option>
                  <option value="member.created">Anggota dibuat</option>
                  <option value="loan.approved">Pinjaman disetujui</option>
                  <option value="journal.posted">Jurnal diposting</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-black">Tabel</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="table_name" placeholder="audit_logs" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Catatan</span>
                <textarea className="mt-2 min-h-20 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" name="note" placeholder="Catatan pemeriksaan" />
              </label>
              <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
                Simpan log demo
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-[#eaf2ff] p-5 md:p-6">
            <ClipboardCheck className="size-6 text-[#2563eb]" />
            <h2 className="mt-4 text-xl font-black">Untuk implementasi asli</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#475569]">
              Setiap server action penting akan menulis audit log otomatis: create, update, approve, disburse, posting transaksi, dan perubahan konfigurasi.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
