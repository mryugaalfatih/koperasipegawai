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
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb]">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#bfdbfe]">KoperasiPro</p>
            <h1 className="text-xl font-black">Dashboard Admin</h1>
          </div>
        </Link>

        <div>
          <p className="text-sm font-black text-[#93c5fd]">Akses pengguna</p>
          <h2 className="mt-4 max-w-xl text-5xl font-black leading-tight">
            Masuk untuk mengelola data koperasi dengan akses berbasis role.
          </h2>
          <p className="mt-5 max-w-lg text-base font-semibold leading-8 text-[#cbd5e1]">
            Setiap user masuk dengan akun yang sama, lalu sistem menyesuaikan hak akses berdasarkan role dan cabang.
          </p>
        </div>

        <div className="grid gap-3">
          {["Satu login untuk semua role", "Akses sesuai cabang", "Keamanan data dengan RLS"].map((item) => (
            <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-4" key={item}>
              <ShieldCheck className="size-5 text-[#93c5fd]" />
              <span className="font-bold">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link className="mb-8 flex items-center gap-3 lg:hidden" href="/">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
              <Building2 className="size-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563eb]">KoperasiPro</p>
              <h1 className="text-xl font-black">Dashboard Admin</h1>
            </div>
          </Link>

          <div className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-7">
            <div>
              <p className="text-sm font-black text-[#2563eb]">Login pengguna</p>
              <h2 className="mt-2 text-3xl font-black">Selamat datang</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">
                Gunakan email dan password yang terdaftar untuk mengakses dashboard.
              </p>
            </div>

            {params.error ? (
              <div className="mt-5 rounded-2xl bg-[#fff1f2] p-4 text-sm font-bold text-[#be123c]">
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
