import {
  Building2,
  CheckCircle2,
  Filter,
  LogOut,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMember, signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";

type AnggotaPageProps = {
  searchParams: Promise<{
    created?: string;
    error?: string;
    status?: string;
  }>;
};

type MemberRow = {
  id: string;
  member_no: string;
  full_name: string;
  nik: string | null;
  phone: string | null;
  address: string | null;
  joined_at: string;
  status: "active" | "inactive" | "resigned";
  branches: {
    name: string;
  }[] | null;
};

const statusLabels = {
  active: "Aktif",
  inactive: "Nonaktif",
  resigned: "Keluar",
};

type MemberStatus = keyof typeof statusLabels;
const statusValues = ["active", "inactive", "resigned"] as const;

export default async function AnggotaPage({ searchParams }: AnggotaPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const selectedStatus: MemberStatus | "all" =
    params.status && statusValues.includes(params.status as MemberStatus) ? (params.status as MemberStatus) : "all";

  let membersQuery = supabase
    .from("members")
    .select("id, member_no, full_name, nik, phone, address, joined_at, status, branches(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (selectedStatus !== "all") {
    membersQuery = membersQuery.eq("status", selectedStatus);
  }

  const [{ data: profile }, { data: members }, { count: activeCount }, { count: totalCount }, { data: branches }] = await Promise.all([
    supabase.from("profiles").select("branch_id, role, full_name").eq("id", user.id).single(),
    membersQuery,
    supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("members").select("*", { count: "exact", head: true }),
    supabase.from("branches").select("id, code, name").order("name"),
  ]);

  if (!profile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  const memberRows = (members ?? []) as unknown as MemberRow[];
  const defaultBranchId = profile.branch_id ?? branches?.[0]?.id ?? "";

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />
        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white" href="/home">
              <Building2 className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Modul anggota</p>
              <h1 className="truncate text-xl font-black md:text-2xl">Data anggota koperasi</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link className="hidden h-10 items-center rounded-2xl border border-[#dbe5f1] bg-white px-4 text-sm font-black md:inline-flex" href="/home">
              Dashboard
            </Link>
            <form action={signOut}>
              <button className="grid size-10 place-items-center rounded-2xl bg-[#0b1220] text-white md:hidden" type="submit" aria-label="Keluar">
                <LogOut className="size-4" />
              </button>
              <button className="hidden h-10 items-center gap-2 rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" type="submit">
                <LogOut className="size-4" />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">Anggota</p>
                <h2 className="mt-2 text-3xl font-black">Kelola identitas anggota</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                  Data anggota menjadi sumber untuk simpanan, pinjaman, pelaporan, SHU, dan akses mobile.
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4">
                <p className="text-xs font-bold text-[#bfdbfe]">Login sebagai</p>
                <p className="mt-1 font-black">{profile.full_name}</p>
                <p className="text-sm font-bold text-[#93c5fd]">{profile.role}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <UsersRound className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Total anggota</p>
              <p className="mt-1 text-3xl font-black">{totalCount ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <CheckCircle2 className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Anggota aktif</p>
              <p className="mt-1 text-3xl font-black">{activeCount ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1]">
              <ShieldCheck className="size-6 text-[#2563eb]" />
              <p className="mt-4 text-sm font-bold text-[#64748b]">Status filter</p>
              <p className="mt-1 text-3xl font-black">{selectedStatus === "all" ? "Semua" : statusLabels[selectedStatus]}</p>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-[#dbe5f1] md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-2xl bg-[#f4f7fb] px-4">
                <Search className="size-4 text-[#64748b]" />
                <span className="text-sm font-semibold text-[#64748b]">Pencarian nama/nomor anggota segera ditambahkan</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  ["all", "Semua"],
                  ["active", "Aktif"],
                  ["inactive", "Nonaktif"],
                  ["resigned", "Keluar"],
                ].map(([value, label]) => (
                  <Link
                    className={`inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-black ${
                      selectedStatus === value ? "bg-[#0b1220] text-white" : "bg-[#f4f7fb] text-[#64748b]"
                    }`}
                    href={value === "all" ? "/anggota" : `/anggota?status=${value}`}
                    key={value}
                  >
                    <Filter className="size-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dbe5f1]">
              {memberRows.length ? (
                memberRows.map((member) => (
                  <Link className="grid gap-3 border-b border-[#dbe5f1] p-4 transition-colors last:border-b-0 hover:bg-[#f8fbff] md:grid-cols-[1fr_auto]" href={`/anggota/${member.id}`} key={member.id}>
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                        <UserRound className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-black">{member.full_name}</p>
                        <p className="text-sm font-bold text-[#64748b]">{member.member_no}</p>
                        <p className="mt-1 text-sm font-semibold text-[#64748b]">{member.branches?.[0]?.name ?? "Cabang belum diset"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 md:block md:text-right">
                      <p className="text-sm font-black text-[#2563eb]">{statusLabels[member.status]}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-[#64748b] md:justify-end">
                        <Phone className="size-4" />
                        {member.phone ?? "-"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#94a3b8]">Bergabung {member.joined_at}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center">
                  <UsersRound className="mx-auto size-10 text-[#94a3b8]" />
                  <p className="mt-3 font-black">Belum ada anggota</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">Tambahkan anggota pertama dari form di samping.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
              <Plus className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#64748b]">Form anggota</p>
              <h2 className="text-xl font-black">Tambah anggota</h2>
            </div>
          </div>

          {params.error ? (
            <div className="mt-5 rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">
              {params.error}
            </div>
          ) : null}

          {params.created ? (
            <div className="mt-5 rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">
              Anggota baru berhasil ditambahkan.
            </div>
          ) : null}

          <form action={createMember} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-black">Cabang</span>
              <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={defaultBranchId} name="branch_id">
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-black">Nomor anggota</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="member_no" placeholder="Kosongkan untuk otomatis" />
            </label>
            <label className="block">
              <span className="text-sm font-black">Nama lengkap</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="full_name" placeholder="Nama anggota" required />
            </label>
            <label className="block">
              <span className="text-sm font-black">NIK</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="nik" placeholder="Nomor KTP" />
            </label>
            <label className="block">
              <span className="text-sm font-black">Nomor HP</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="phone" placeholder="+62..." />
            </label>
            <label className="block">
              <span className="text-sm font-black">Tanggal bergabung</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="joined_at" type="date" />
            </label>
            <label className="block">
              <span className="text-sm font-black">Alamat</span>
              <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 py-3 text-sm font-bold outline-none" name="address" placeholder="Alamat anggota" />
            </label>
            <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
              Simpan anggota
            </button>
          </form>
        </aside>
      </div>
    </section>
    </div>
    </main>
  );
}

