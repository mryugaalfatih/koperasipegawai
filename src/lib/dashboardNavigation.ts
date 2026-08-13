export type NavItem = {
  label: string;
  icon: string;
  href: string;
  children?: { label: string; href: string; icon: string }[];
};

export const unitNavItems: Record<string, NavItem[]> = {
  PUSAT: [
    { label: "Home", icon: "Home", href: "/home" },
    { label: "Anggota", icon: "Anggota", href: "/anggota" },
    { label: "Keuangan", icon: "Keuangan", href: "/kas" },
    { label: "Akuntansi", icon: "Akuntansi", href: "/akuntansi" },
    {
      label: "Laporan",
      icon: "Laporan",
      href: "/laporan",
      children: [
        { label: "Laba Rugi & Neraca", icon: "Laporan", href: "/laporan" },
        { label: "Jurnal Kas", icon: "Keuangan", href: "/kas-jurnal" },
      ],
    },
    { label: "User", icon: "User", href: "/users" },
    {
      label: "Setup",
      icon: "Setup",
      href: "/konfigurasi",
      children: [
        { label: "Konfigurasi", icon: "Setup", href: "/konfigurasi" },
        { label: "Unit Usaha", icon: "Unit", href: "/unit-usaha" },
        { label: "Audit Log", icon: "Audit", href: "/audit" },
      ],
    },
  ],
  USP: [
    { label: "Home", icon: "Home", href: "/home" },
    { label: "Anggota", icon: "Anggota", href: "/anggota" },
    {
      label: "Simpanan",
      icon: "Simpanan",
      href: "/simpanan/rekening",
      children: [
        { label: "Rekening Simpanan", icon: "Simpanan", href: "/simpanan/rekening" },
        { label: "Setor / Tarik Simpanan", icon: "Kas", href: "/simpanan/transaksi" },
      ],
    },
    { label: "Pinjaman", icon: "Pinjaman", href: "/pinjaman" },
  ],
  TOKO: [
    { label: "Home", icon: "Home", href: "/home" },
    { label: "Anggota", icon: "Anggota", href: "/anggota" },
    {
      label: "Waserda / Toko",
      icon: "Unit",
      href: "/toko/produk",
      children: [
        { label: "Katalog & Stok Barang", icon: "Unit", href: "/toko/produk" },
        { label: "Kasir POS Toko", icon: "Keuangan", href: "/toko/kasir" },
        { label: "Order & Pembelian Supplier", icon: "Setup", href: "/toko/pembelian" },
        { label: "Penjualan Toko", icon: "Laporan", href: "/toko/penjualan" },
        { label: "Laporan & Analisa Toko", icon: "Laporan", href: "/toko/laporan" },
        { label: "Promo & Paket Sembako", icon: "Setup", href: "/toko/promo" },
        { label: "Cetak Barcode & Price Tag", icon: "Unit", href: "/toko/label" },
      ],
    },
  ],
  APAR: [
    { label: "Home Damkar", icon: "Home", href: "/home" },
    { label: "Anggota & Klien PT", icon: "Anggota", href: "/anggota" },
    {
      label: "Unit Jasa APAR & Damkar",
      icon: "Unit",
      href: "/apar/refill",
      children: [
        { label: "Jasa Refill & Inspeksi APAR", icon: "Setup", href: "/apar/refill" },
        { label: "Katalog APAR & Peralatan", icon: "Unit", href: "/apar/katalog" },
        { label: "Invoice & Penjualan B2B", icon: "Keuangan", href: "/apar/penjualan" },
        { label: "Cetak Sertifikat Hydrotest", icon: "Laporan", href: "/apar/sertifikat" },
      ],
    },
    { label: "Buku Kas APAR", icon: "Keuangan", href: "/kas" },
    { label: "Akuntansi APAR", icon: "Akuntansi", href: "/akuntansi" },
    { label: "Laporan APAR", icon: "Laporan", href: "/laporan" },
  ],
  JASA: [
    { label: "Home Jasa", icon: "Home", href: "/home" },
    { label: "Penyewa & Anggota", icon: "Anggota", href: "/anggota" },
    {
      label: "Jasa & Sewa",
      icon: "Unit",
      href: "/jasa/aset",
      children: [
        { label: "Katalog Aset Sewa", icon: "Unit", href: "/jasa/aset" },
        { label: "Jadwal Penyewaan", icon: "Simpanan", href: "/jasa/sewa" },
        { label: "Pendapatan Jasa", icon: "Laporan", href: "/jasa/pendapatan" },
      ],
    },
    { label: "Keuangan Jasa", icon: "Keuangan", href: "/kas" },
    { label: "Akuntansi Jasa", icon: "Akuntansi", href: "/akuntansi" },
    { label: "Laporan Jasa", icon: "Laporan", href: "/laporan" },
    { label: "User", icon: "User", href: "/users" },
    {
      label: "Setup",
      icon: "Setup",
      href: "/konfigurasi",
      children: [
        { label: "Konfigurasi", icon: "Setup", href: "/konfigurasi" },
        { label: "Unit Usaha", icon: "Unit", href: "/unit-usaha" },
        { label: "Audit Log", icon: "Audit", href: "/audit" },
      ],
    },
  ],
};

export const navItems: NavItem[] = unitNavItems.PUSAT;

export const mobileNavItems = navItems.filter((item) =>
  ["Home", "Anggota", "Simpanan", "Pinjaman", "Setup"].includes(item.label),
);

export function filterNavItemsByRole(role?: string): NavItem[] {
  if (!role || role === "super_admin") {
    return navItems;
  }

  if (role === "operator" || role === "teller") {
    return navItems.filter((item) =>
      ["Home", "Anggota", "Simpanan", "Pinjaman", "Kas", "Laporan"].includes(item.label)
    );
  }

  if (role === "auditor") {
    return navItems.filter((item) =>
      ["Home", "Kas", "Laporan"].includes(item.label)
    );
  }

  return navItems;
}
