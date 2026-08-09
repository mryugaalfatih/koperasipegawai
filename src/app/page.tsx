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
      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2563eb]">Koperasi</p>
            <h1 className="text-lg font-bold text-[#0b1220]">KoperasiPro</h1>
          </div>
        </Link>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#0b1220] px-5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
          href="/login"
        >
          Masuk Sistem
        </Link>
      </header>

      {/* Hero Section */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-4 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbeafe] px-3.5 py-1 text-xs font-bold text-[#1d4ed8]">
            <CheckCircle2 className="size-4" />
            Platform Koperasi Simpan Pinjam Digital
          </div>
          <h2 className="mt-4 max-w-3xl text-2xl font-bold leading-tight md:text-4xl text-[#0b1220]">
            Kelola Seluruh Operasional Koperasi dalam Satu Sistem Terpadu.
          </h2>
          <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-[#475569] md:text-base">
            KoperasiPro mempermudah pengurus, teller, dan bendahara mengelola data anggota, simpanan, pinjaman,
            pembukuan kas, serta distribusi SHU secara akurat dan transparan.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#2563eb] px-6 text-sm font-bold text-white shadow-md hover:bg-[#1d4ed8] transition-all"
              href="/login"
            >
              Masuk ke Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Preview Box */}
        <div className="overflow-hidden rounded-[32px] bg-[#07152f] p-5 text-white shadow-xl md:p-6">
          <div className="rounded-[24px] bg-white/8 p-4 md:p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#bfdbfe]">Workspace Admin</p>
            <p className="mt-2 text-xl font-bold leading-snug md:max-w-md">
              Modul Koperasi Terintegrasi & Pembukuan Otomatis.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {platformHighlights.map((item) => (
                <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-white/10 p-3 text-xs font-bold text-[#e2e8f0]" key={item}>
                  <CheckCircle2 className="size-4 shrink-0 text-[#93c5fd]" />
                  <span className="min-w-0">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {features.map((item) => (
              <div className="min-w-0 rounded-2xl bg-white p-4 text-[#0b1220]" key={item.title}>
                <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#eaf2ff] text-[#2563eb]">
                  <item.icon className="size-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dbe5f1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-8 text-xs font-semibold text-[#64748b]">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-xl bg-[#2563eb] text-white">
              <Building2 className="size-4" />
            </div>
            <span className="font-bold text-[#0b1220]">KoperasiPro</span>
            <span>· Sistem Informasi Koperasi Simpan Pinjam</span>
          </div>
          <p>© 2026 KoperasiPro. Semua hak dilindungi.</p>
        </div>
      </footer>
    </main>
  );
}

