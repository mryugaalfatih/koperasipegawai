import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  KeyRound,
  Plus,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createUserProfile, updateUserProfile } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardNavigation } from "@/components/DashboardNavigation";
import { navItems, mobileNavItems } from "@/lib/dashboardNavigation";

type UsersPageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type Branch = {
  id: string;
  code: string;
  name: string;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  branch_id: string | null;
  branches: {
    code: string;
    name: string;
  }[] | null;
};

const roles = [
  { value: "super_admin", label: "Super admin", description: "Akses penuh lintas cabang" },
  { value: "admin", label: "Admin", description: "Kelola master data dan operasional" },
  { value: "pengurus", label: "Pengurus", description: "Approval dan monitoring" },
  { value: "bendahara", label: "Bendahara", description: "Kas, jurnal, dan laporan" },
  { value: "operator", label: "Operator", description: "Input transaksi harian" },
  { value: "auditor", label: "Auditor", description: "Baca laporan dan audit" },
];

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!currentProfile) {
    redirect("/login?error=Profil%20user%20belum%20dibuat.");
  }

  if (currentProfile.role !== "super_admin") {
    redirect("/home");
  }

  type BusinessUnitOption = {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
  };

  const [{ data: profiles }, { data: branches }, { data: businessUnits }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, phone, branch_id, allowed_unit_codes, branches(code, name)").order("created_at", { ascending: false }),
    supabase.from("branches").select("id, code, name").order("name"),
    supabase.from("business_units").select("id, code, name, is_active").order("code"),
  ]);

  const profileRows = (profiles ?? []) as unknown as ProfileRow[];
  const branchRows = (branches ?? []) as Branch[];
  const unitRows = (businessUnits ?? [
    { id: "1", code: "USP", name: "Unit Simpan Pinjam", is_active: true },
    { id: "2", code: "TOKO", name: "Unit Toko / Waserda", is_active: false },
    { id: "3", code: "JASA", name: "Unit Jasa & Penyewaan", is_active: false },
  ]) as BusinessUnitOption[];
  const defaultBranchId = branchRows[0]?.id ?? "";
  const superAdminCount = profileRows.filter((profile) => profile.role === "super_admin").length;


  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_1fr]">
        <DashboardNavigation navItems={navItems} mobileNavItems={mobileNavItems} />
        <section className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 border-b border-[#dbe5f1] bg-[#f8fbff]/95 px-4 py-3 backdrop-blur md:px-7">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link className="grid size-10 place-items-center rounded-2xl border border-[#dbe5f1] bg-white" href="/home">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">User & role</p>
              <h1 className="text-xl font-black md:text-2xl">Manajemen akses admin</h1>
            </div>
          </div>
          <Link className="hidden h-10 items-center rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white md:inline-flex" href="/audit">
            Audit
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 md:px-7 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <section className="rounded-[28px] bg-[#07152f] p-5 text-white shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#bfdbfe]">Akses berbasis role</p>
                <h2 className="mt-2 text-3xl font-black">Super admin mengatur user internal</h2>
                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#cbd5e1]">
                  Super admin membuat akun dari aplikasi. Sistem otomatis membuat Supabase Auth user dan profil internal.
                </p>
              </div>
              <ShieldCheck className="size-9 text-[#93c5fd]" />
            </div>
          </section>

          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Total user", value: String(profileRows.length), icon: UsersRound },
              { label: "Super admin", value: String(superAdminCount), icon: BadgeCheck },
              { label: "Cabang", value: String(branchRows.length), icon: Building2 },
              { label: "Role aktif", value: String(new Set(profileRows.map((profile) => profile.role)).size), icon: KeyRound },
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
              <p className="text-sm font-bold text-[#64748b]">Profil user</p>
              <h2 className="text-2xl font-black">Daftar akses</h2>
            </div>
            <div className="mt-5 space-y-4">
              {profileRows.length ? (
                profileRows.map((profile) => {
                  const updateAction = updateUserProfile.bind(null, profile.id);

                  return (
                    <form action={updateAction} className="rounded-3xl border border-[#dbe5f1] bg-white p-4" key={profile.id}>
                      <div className="flex items-start gap-3">
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                          <UserRound className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-black uppercase text-[#64748b]">Nama</span>
                              <input className="mt-2 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={profile.full_name} name="full_name" required />
                            </label>
                            <label className="block">
                              <span className="text-xs font-black uppercase text-[#64748b]">Telepon</span>
                              <input className="mt-2 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={profile.phone ?? ""} name="phone" />
                            </label>
                            <label className="block">
                              <span className="text-xs font-black uppercase text-[#64748b]">Role</span>
                              <select className="mt-2 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={profile.role} name="role">
                                {roles.map((role) => (
                                  <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-xs font-black uppercase text-[#64748b]">Cabang</span>
                              <select className="mt-2 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" defaultValue={profile.branch_id ?? defaultBranchId} name="branch_id">
                                {branchRows.map((branch) => (
                                  <option key={branch.id} value={branch.id}>{branch.code} | {branch.name}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-bold text-[#64748b]">Auth user ID: {profile.id}</p>
                            <button className="h-10 rounded-2xl bg-[#0b1220] px-4 text-sm font-black text-white" type="submit">
                              Simpan perubahan
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-[#f4f7fb] p-4 text-sm font-bold text-[#64748b]">Belum ada profil user.</p>
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {params.error ? (
            <div className="rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">{params.error}</div>
          ) : null}
          {params.saved ? (
            <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm font-bold text-[#1d4ed8]">Profil user berhasil disimpan.</div>
          ) : null}

          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Plus className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#64748b]">Akun baru</p>
                <h2 className="text-xl font-black">Buat user login</h2>
              </div>
            </div>
            <form action={createUserProfile} className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-black">Email login</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="email" placeholder="nama@koperasi.co.id" required type="email" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Password sementara</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" minLength={8} name="password" placeholder="Minimal 8 karakter" required type="password" />
              </label>
              <label className="block">
                <span className="text-sm font-black">Nama lengkap</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="full_name" placeholder="Nama user" required />
              </label>
              <label className="block">
                <span className="text-sm font-black">Role</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none" name="role">
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="branch_id" value={defaultBranchId} />

              <div className="rounded-2xl bg-[#f8fbff] p-4 border border-[#dbe5f1] space-y-2.5">
                <span className="text-xs font-bold uppercase text-[#475569]">Custom Hak Akses Unit Usaha</span>
                <label className="flex items-center gap-2.5 pb-2 border-b border-[#dbe5f1]">
                  <input type="checkbox" name="is_multi_unit" value="true" className="size-4 accent-[#2563eb]" />
                  <span className="text-xs font-bold text-[#1d4ed8]">Akses Semua Unit Usaha (Multi-Unit)</span>
                </label>
                <div className="space-y-2 pt-1">
                  {unitRows.map((unit) => (
                    <label className="flex items-center gap-2.5" key={unit.code}>
                      <input
                        className="size-4 accent-[#2563eb]"
                        defaultChecked={unit.code === "USP"}
                        name="allowed_unit_codes"
                        type="checkbox"
                        value={unit.code}
                      />
                      <span className="text-xs font-bold text-[#0b1220]">{unit.name} ({unit.code})</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-[#64748b]">Superadmin dapat memilih kustom kombinasi unit usaha yang berhak diakses user ini.</p>
              </div>


              <label className="block">
                <span className="text-xs font-bold uppercase text-[#475569]">Telepon</span>
                <input className="mt-1.5 h-11 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-xs font-bold outline-none" name="phone" placeholder="Opsional" />
              </label>
              <button className="h-11 w-full rounded-2xl bg-[#2563eb] text-xs font-bold text-white hover:bg-[#1d4ed8]" type="submit">
                Buat Akun User
              </button>
            </form>
          </section>


          <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-6">
            <div className="flex items-center gap-3">
              <UserCog className="size-5 text-[#2563eb]" />
              <h2 className="text-xl font-black">Role tersedia</h2>
            </div>
            <div className="mt-4 space-y-3">
              {roles.map((role) => (
                <div className="rounded-2xl bg-[#f4f7fb] p-4" key={role.value}>
                  <p className="font-black">{role.label}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">{role.description}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
    </div>
    </main>
  );
}

