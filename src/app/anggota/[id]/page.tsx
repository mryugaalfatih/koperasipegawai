import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  MapPin,
  Phone,
  PiggyBank,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateMemberStatus } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { MemberPhotoGalleryModal } from "@/components/MemberPhotoGalleryModal";


type MemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

type MemberDetail = {
  id: string;
  member_no: string;
  full_name: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  joined_at: string;
  status: "active" | "inactive" | "resigned";
  photo_url?: string | null;
  ktp_url?: string | null;
  email?: string | null;
  gender?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  department?: string | null;
  employee_no?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_name?: string | null;
  heir_name?: string | null;
  heir_relation?: string | null;
  heir_phone?: string | null;
  branches: {
    name: string;
    code: string;
  }[] | null;
};



type SavingsSummary = {
  total_simpanan: number | null;
  simpanan_pokok: number | null;
  simpanan_wajib: number | null;
  simpanan_sukarela: number | null;
};

type LoanSummary = {
  outstanding_amount: number | null;
};

const currency = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const statusLabels = {
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Keluar",
};

export default async function MemberDetailPage({ params, searchParams }: MemberDetailPageProps) {
  const supabase = await createClient();
  const { id } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, allowed_unit_codes")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const canManageMembers =
    profile.role === "super_admin" ||
    profile.role === "admin" ||
    profile.allowed_unit_codes?.includes("*") ||
    profile.allowed_unit_codes?.includes("PUSAT");

  const [{ data: member }, { data: savings }, { data: loanOutstanding }] = await Promise.all([
    supabase
      .from("members")
      .select("id, member_no, full_name, nik, phone, address, joined_at, status, photo_url, ktp_url, email, gender, birth_place, birth_date, department, employee_no, bank_name, bank_account_no, bank_account_name, heir_name, heir_relation, heir_phone, branches(name, code)")
      .eq("id", id)
      .single(),


    supabase
      .from("v_member_savings_summary")
      .select("total_simpanan, simpanan_pokok, simpanan_wajib, simpanan_sukarela")
      .eq("member_id", id)
      .maybeSingle(),
    supabase
      .from("v_loan_outstanding")
      .select("outstanding_amount")
      .eq("member_id", id),
  ]);

  if (!member) {
    notFound();
  }

  const memberDetail = member as unknown as MemberDetail;
  const savingsSummary = savings as SavingsSummary | null;
  const loanRows = (loanOutstanding ?? []) as LoanSummary[];
  const totalOutstanding = loanRows.reduce((sum, loan) => sum + Number(loan.outstanding_amount ?? 0), 0);
  const updateStatus = updateMemberStatus.bind(null, id);

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur md:px-2">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/anggota">
              <ArrowLeft className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Detail anggota</p>
              <h1 className="truncate text-xl font-black md:text-2xl">{memberDetail.full_name}</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-2 text-sm font-black text-white md:inline-flex" href="/home">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-2 py-5 md:px-2 xl:grid-cols-[0.85fr_1.15fr]">
        <aside className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="grid size-14 place-items-center rounded-3xl bg-white/10">
              <UserRound className="size-7 text-[#93c5fd]" />
            </div>
            <h2 className="mt-5 text-3xl font-black">{memberDetail.full_name}</h2>
            <p className="mt-2 font-bold text-[#bfdbfe]">{memberDetail.member_no}</p>
            <div className="mt-5 inline-flex rounded-full bg-white px-2 py-1 text-xs font-black text-[#0b1220]">
              {statusLabels[memberDetail.status]}
            </div>
          </section>

          {canManageMembers ? (
            <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <h3 className="text-xl font-black">Ubah status</h3>
              {query.error ? (
                <div className="mt-4 rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{query.error}</div>
              ) : null}
              {query.updated ? (
                <div className="mt-4 rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Status anggota diperbarui.</div>
              ) : null}
              <form action={updateStatus} className="mt-4 space-y-3">
                <select className="h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 text-sm font-bold outline-none" defaultValue={memberDetail.status} name="status">
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="resigned">Keluar</option>
                </select>
                <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white cursor-pointer hover:bg-[#1d4ed8]" type="submit">
                  Simpan status
                </button>
              </form>
            </section>
          ) : (
            <section className="rounded-[28px] bg-amber-50 border border-amber-200 p-5 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldCheck className="size-5 text-amber-600 shrink-0" />
                <span>Mode Info Read-Only</span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-amber-800 leading-relaxed">
                Unit Usaha ini dapat melihat seluruh informasi anggota (Read-Only). Perubahan data atau status anggota hanya dapat dilakukan oleh Admin Pusat.
              </p>
            </section>
          )}
        </aside>

        <section className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <PiggyBank className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Total simpanan</p>
              <p className="mt-1 text-2xl font-black">{currency.format(Number(savingsSummary?.total_simpanan ?? 0))}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <CreditCard className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Outstanding pinjaman</p>
              <p className="mt-1 text-2xl font-black">{currency.format(totalOutstanding)}</p>
            </article>
            <article className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <ShieldCheck className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Status</p>
              <p className="mt-1 text-2xl font-black">{statusLabels[memberDetail.status]}</p>
            </article>
          </div>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <h3 className="text-xl font-black">Dokumen Identitas & Foto</h3>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">Pas foto profil dan dokumen KTP anggota yang tersimpan di Supabase Storage.</p>
            <div className="mt-4">
              <MemberPhotoGalleryModal
                memberName={memberDetail.full_name}
                photoUrl={memberDetail.photo_url}
                ktpUrl={memberDetail.ktp_url}
              />
            </div>
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <h3 className="text-xl font-black">Informasi Lengkap Anggota</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                { label: "NIK (KTP)", value: memberDetail.nik ?? "-", icon: CheckCircle2 },
                { label: "Nomor HP / WA", value: memberDetail.phone ?? "-", icon: Phone },
                { label: "Email", value: memberDetail.email ?? "-", icon: CheckCircle2 },
                { label: "Tempat / Tgl Lahir", value: memberDetail.birth_place || memberDetail.birth_date ? `${memberDetail.birth_place ?? "-"}, ${memberDetail.birth_date ?? "-"}` : "-", icon: CalendarDays },
                { label: "Departemen / Unit Kerja", value: memberDetail.department ?? "-", icon: CheckCircle2 },
                { label: "NIP / No Pegawai", value: memberDetail.employee_no ?? "-", icon: CheckCircle2 },
                { label: "Rekening Bank", value: memberDetail.bank_name ? `${memberDetail.bank_name} - ${memberDetail.bank_account_no} a.n ${memberDetail.bank_account_name}` : "-", icon: CreditCard },
                { label: "Ahli Waris / Kontak Darurat", value: memberDetail.heir_name ? `${memberDetail.heir_name} (${memberDetail.heir_relation ?? "Keluarga"}) · ${memberDetail.heir_phone ?? "-"}` : "-", icon: Phone },
                { label: "Tanggal Bergabung", value: memberDetail.joined_at, icon: CalendarDays },
                { label: "Alamat Lengkap", value: memberDetail.address ?? "-", icon: MapPin },
              ].map((item) => (
                <div className="rounded-3xl bg-[#f4f7fb] p-4" key={item.label}>
                  <item.icon className="size-5 text-[#2563eb]" />
                  <p className="mt-3 text-xs font-bold text-[#64748b]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#0b1220]">{item.value}</p>
                </div>
              ))}
            </div>
          </section>



          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <h3 className="text-xl font-black">Rincian simpanan</h3>
              <div className="mt-5 space-y-3">
                {[
                  ["Pokok", savingsSummary?.simpanan_pokok],
                  ["Wajib", savingsSummary?.simpanan_wajib],
                  ["Sukarela", savingsSummary?.simpanan_sukarela],
                ].map(([label, value]) => (
                  <div className="flex items-center justify-between rounded-2xl bg-[#f4f7fb] p-4" key={String(label)}>
                    <span className="text-sm font-black">{label}</span>
                    <span className="text-sm font-black text-[#2563eb]">{currency.format(Number(value ?? 0))}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
              <h3 className="text-xl font-black">Pinjaman</h3>
              <p className="mt-4 rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold leading-6 text-[#64748b]">
                Modul pinjaman akan memakai data anggota ini untuk pengajuan, simulasi flat/anuitas, approval, dan jadwal angsuran.
              </p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
