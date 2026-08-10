"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CreditCard,
  FileBarChart2,
  Fingerprint,
  Scale,
  ShieldCheck,
  UsersRound,
  UserCog,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  label: string;
  icon: string;
  href: string;
};

type DashboardNavigationProps = {
  navItems: NavItem[];
  mobileNavItems: NavItem[];
};

const iconMap: Record<string, LucideIcon> = {
  Home: Building2,
  Anggota: UsersRound,
  Simpanan: WalletCards,
  Pinjaman: CreditCard,
  Kas: Scale,
  Laporan: FileBarChart2,
  Audit: Fingerprint,
  User: UserCog,
  Setup: ShieldCheck,
};

export function DashboardNavigation({ navItems, mobileNavItems }: DashboardNavigationProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <aside className="hidden border-r border-[#dbe5f1] bg-[#f8fbff] px-5 py-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
            <Building2 className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">Admin suite</p>
            <h1 className="text-xl font-black">KoperasiPro</h1>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = iconMap[item.icon] ?? Building2;
            return (
              <Link
                className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors ${
                  active
                    ? "bg-[#0b1220] text-white shadow-sm"
                    : "text-[#475569] hover:bg-white"
                }`}
                href={item.href}
                key={item.label}
                prefetch={true}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = iconMap[item.icon] ?? Building2;
            return (
              <Link
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition-colors ${
                  active ? "bg-[#0b1220] text-white" : "text-[#64748b] hover:bg-white"
                }`}
                href={item.href}
                key={item.label}
                prefetch={true}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

    </>
  );
}
