export type NavItem = {
  label: string;
  icon: string;
  href: string;
  children?: { label: string; href: string; icon: string }[];
};

export const unitNavItems: Record<string, NavItem[]> = {
  USP: [
    { label: "Home", icon: "Home", href: "/home" },
    { label: "Anggota", icon: "Anggota", href: "/anggota" },
    {
      label: "Simpanan",
      icon: "Simpanan",
      href: "/simpanan/rekening",
      children: [
        { label: "Rekening Simpanan", icon: "Simpanan", href: "/simpanan/rekening" },
        { label: "Transaksi Kasir", icon: "Kas", href: "/simpanan/transaksi" },
      ],
    },
    { label: "Pinjaman", icon: "Pinjaman", href: "/pinjaman" },
    { label: "Keuangan", icon: "Kas", href: "/kas" },
    { label: "Akuntansi", icon: "Akuntansi", href: "/akuntansi" },
    { label: "Laporan", icon: "Laporan", href: "/laporan" },
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
  TOKO: [
    { label: "Home Toko", icon: "Home", href: "/home" },
    { label: "Pelanggan & Anggota", icon: "Anggota", href: "/anggota" },
    {
      label: "Waserda / Toko",
      icon: "Unit",
      href: "/toko/produk",
      children: [
        { label: "Katalog & Stok Barang", icon: "Unit", href: "/toko/produk" },
        { label: "Kasir POS Toko", icon: "Kas", href: "/toko/kasir" },
        { label: "Penjualan Toko", icon: "Laporan", href: "/toko/penjualan" },
      ],
    },
    { label: "Keuangan Toko", icon: "Kas", href: "/kas" },
    { label: "Akuntansi Toko", icon: "Akuntansi", href: "/akuntansi" },
    { label: "Laporan Toko", icon: "Laporan", href: "/laporan" },
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
    { label: "Keuangan Jasa", icon: "Kas", href: "/kas" },
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

export const navItems: NavItem[] = unitNavItems.USP;

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
