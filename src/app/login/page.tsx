import { Building2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "./actions";
import { LoginForm } from "./login-form";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-[#f4f7fb] text-[#0b1220] lg:grid-cols-[1fr_0.95fr]">
      <section className="hidden bg-[#07152f] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb]">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#bfdbfe]">KoperasiPro</p>
            <h1 className="text-base font-bold">Dashboard Admin</h1>
          </div>
        </Link>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#93c5fd]">Akses Pengguna</p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight">
            Masuk untuk mengelola data koperasi dengan akses berbasis role.
          </h2>
          <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-[#cbd5e1]">
            Satu portal aman untuk Super Admin, Pengurus, Bendahara, Teller, dan Auditor sesuai cabang masing-masing.
          </p>
        </div>

        <div className="grid gap-2.5">
          {["Satu portal terpadu semua role", "Isolasi data cabang & RLS", "Keamanan transaksi ter-audit"].map((item) => (
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-3.5 text-xs font-semibold" key={item}>
              <ShieldCheck className="size-4 text-[#93c5fd] shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link className="mb-6 flex items-center gap-3 lg:hidden" href="/">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">KoperasiPro</p>
              <h1 className="text-base font-bold">Dashboard Admin</h1>
            </div>
          </Link>

          <div className="rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-[#dbe5f1] md:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">Login Pengguna</p>
              <h2 className="mt-1 text-2xl font-bold text-[#0b1220]">Selamat Datang</h2>
              <p className="mt-1 text-xs font-medium text-[#64748b]">
                Gunakan email dan password yang terdaftar untuk mengakses sistem.
              </p>
            </div>

            {params.error ? (
              <div className="mt-4 rounded-2xl bg-[#fff1f2] p-3.5 text-xs font-bold text-[#be123c]">
                {params.error}
              </div>
            ) : null}

            <LoginForm action={signIn} />
          </div>
        </div>

      </section>
    </main>
  );
}
