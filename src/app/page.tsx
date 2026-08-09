import {
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import Link from "next/link";

const features = [
  { title: "Simpanan", description: "Simpanan pokok, wajib, sukarela, setoran, penarikan, dan mutasi.", icon: PiggyBank },
  { title: "Pinjaman", description: "Pengajuan, approval, pencairan, jadwal angsuran, dan tunggakan.", icon: CreditCard },
  { title: "Laporan & SHU", description: "Jurnal, laba rugi, neraca, simulasi SHU, dan distribusi anggota.", icon: Banknote },
];

const platformHighlights = [
  "Akses super admin penuh",
  "Workflow cabang dan role",
  "Audit transaksi otomatis",
  "Portal mobile anggota",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#0b1220]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#2563eb]">Koperasi</p>
            <h1 className="text-xl font-black">KoperasiPro</h1>
          </div>
        </Link>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0b1220] px-5 text-sm font-black text-white"
          href="/login"
        >
          Masuk
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-4 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbeafe] px-3 py-1 text-xs font-black text-[#1d4ed8]">
            <CheckCircle2 className="size-4" />
            Platform koperasi simpan pinjam
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
            Kelola operasional koperasi dari anggota sampai SHU.
          </h2>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-[#475569] md:text-lg">
            KoperasiPro membantu pengurus dan admin mengelola anggota, simpanan, pinjaman,
            kas, laporan keuangan, dan pembagian SHU dalam satu sistem web yang rapi.
          </p>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-[#07152f] p-4 text-white shadow-sm md:p-6">
          <div className="rounded-[24px] bg-white/8 p-4 md:p-5">
            <p className="text-sm font-bold text-[#bfdbfe]">Workspace admin</p>
            <p className="mt-2 text-2xl font-black leading-tight md:max-w-md">
              Modul inti koperasi dalam satu area kerja yang mudah dipantau.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {platformHighlights.map((item) => (
                <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white/10 p-3 text-sm font-black text-[#e2e8f0]" key={item}>
                  <CheckCircle2 className="size-4 shrink-0 text-[#93c5fd]" />
                  <span className="min-w-0">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {features.map((item) => (
              <div className="min-w-0 rounded-3xl bg-white p-4 text-[#0b1220]" key={item.title}>
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-black">{item.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748b]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
        <div className="rounded-[32px] bg-white p-5 shadow-sm ring-1 ring-[#dbe5f1] md:p-7">
          <p className="text-sm font-black text-[#2563eb]">Fondasi sistem</p>
          <h2 className="mt-2 max-w-3xl text-2xl font-black md:text-3xl">
            Dibangun untuk operasional harian dan pertumbuhan koperasi.
          </h2>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#64748b]">
            Akses pengguna, dokumen, audit, dan kanal anggota disiapkan sebagai bagian dari alur utama.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#dbe5f1] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_0.8fr] md:px-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white">
                <Building2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2563eb]">KoperasiPro</p>
                <h2 className="font-black">Sistem koperasi simpan pinjam</h2>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-[#64748b]">
              Informasi footer ini dapat disesuaikan dengan nama koperasi, alamat, legalitas, dan kontak resmi.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-black">Kontak</h3>
            <div className="mt-3 space-y-2 text-sm font-semibold text-[#64748b]">
              <p>Email: info@koperasi.com</p>
              <p>Telepon: +62 812 0000 0000</p>
              <p>Alamat: Jakarta, Indonesia</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[#dbe5f1] px-4 py-4 text-center text-xs font-bold text-[#64748b]">
          © 2026 KoperasiPro. Semua informasi dapat disesuaikan.
        </div>
      </footer>
    </main>
  );
}
