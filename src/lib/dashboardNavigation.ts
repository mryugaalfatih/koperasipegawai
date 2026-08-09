export const navItems = [
  { label: "Home", icon: "Home", href: "/home" },
  { label: "Anggota", icon: "Anggota", href: "/anggota" },
  { label: "Simpanan", icon: "Simpanan", href: "/simpanan" },
  { label: "Pinjaman", icon: "Pinjaman", href: "/pinjaman" },
  { label: "Kas", icon: "Kas", href: "/kas-jurnal" },
  { label: "Laporan", icon: "Laporan", href: "/laporan" },
  { label: "Audit", icon: "Audit", href: "/audit" },
  { label: "User", icon: "User", href: "/users" },
  { label: "Setup", icon: "Setup", href: "/konfigurasi" },
];

export const mobileNavItems = navItems.filter((item) =>
  ["Home", "Anggota", "Simpanan", "Pinjaman", "Setup"].includes(item.label),
);
