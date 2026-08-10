"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";

import {

  Building2,
  BookOpenCheck,
  CreditCard,
  FileBarChart2,
  Fingerprint,
  Scale,
  ShieldCheck,
  Store,
  UsersRound,
  UserCog,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { unitNavItems } from "@/lib/dashboardNavigation";


type NavSubItem = {
  label: string;
  icon: string;
  href: string;
};

type NavItem = {
  label: string;
  icon: string;
  href: string;
  children?: NavSubItem[];
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
  Akuntansi: BookOpenCheck,
  Laporan: FileBarChart2,
  Audit: Fingerprint,
  Unit: Store,
  User: UserCog,
  Setup: ShieldCheck,
};



export function DashboardNavigation({ navItems: initialNavItems, mobileNavItems }: DashboardNavigationProps) {
  const pathname = usePathname();
  const [selectedUnit, setSelectedUnit] = useState("USP");

  const currentNavItems = unitNavItems[selectedUnit] ?? initialNavItems;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <aside className="hidden border-r border-[#dbe5f1] bg-[#f8fbff] px-5 py-6 lg:block">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-[#2563eb] text-white shadow-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#0b1220]">KoperasiPro</h1>
              <p className="text-[11px] font-semibold text-[#64748b]">Multi-Unit System</p>
            </div>
          </div>

          {/* Pemilih Unit Usaha Interaktif */}
          <div className="pt-1 space-y-2">
            <CustomSelect
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              options={[
                { value: "USP", label: "USP · Simpan Pinjam" },
                { value: "TOKO", label: "TOKO · Waserda Ritel" },
                { value: "JASA", label: "JASA · Sewa & Layanan" },
              ]}
              className="h-9 text-[11px]"
            />

            <div className="flex items-center gap-1.5 rounded-xl bg-[#eff6ff] px-3 py-1.5 text-[11px] font-bold text-[#2563eb] border border-[#dbeafe]">
              <span className="size-2 rounded-full bg-[#2563eb] animate-pulse" />
              <span>
                {selectedUnit === "USP"
                  ? "Konteks: Unit Simpan Pinjam"
                  : selectedUnit === "TOKO"
                  ? "Konteks: Waserda / Pertokoan"
                  : "Konteks: Jasa & Penyewaan"}
              </span>
            </div>
          </div>
        </div>

        <nav className="mt-8 space-y-1">
          {currentNavItems.map((item) => {

            const hasChildren = Boolean(item.children?.length);
            const parentActive =
              isActive(item.href) ||
              Boolean(item.children?.some((child) => isActive(child.href)));
            const Icon = iconMap[item.icon] ?? Building2;

            if (hasChildren) {
              return (
                <div className="space-y-1" key={item.label}>
                  <div
                    className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-bold ${
                      parentActive
                        ? "text-[#2563eb] bg-[#eaf2ff]"
                        : "text-[#475569]"
                    }`}
                  >
                    <Icon className="size-5 text-[#2563eb]" />
                    <span>{item.label}</span>
                  </div>

                  <div className="ml-4 border-l-2 border-[#dbe5f1] pl-3 space-y-1">
                    {item.children?.map((child) => {
                      const childActive = isActive(child.href);
                      const ChildIcon = iconMap[child.icon] ?? Building2;

                      return (
                        <Link
                          className={`flex h-10 items-center gap-2.5 rounded-xl px-3 text-xs font-bold transition-all ${
                            childActive
                              ? "bg-[#0b1220] text-white shadow-sm"
                              : "text-[#64748b] hover:bg-white hover:text-[#0b1220]"
                          }`}
                          href={child.href}
                          key={child.label}
                          prefetch={true}
                          aria-current={childActive ? "page" : undefined}
                        >
                          <ChildIcon className="size-4" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-colors ${
                  parentActive
                    ? "bg-[#0b1220] text-white shadow-sm"
                    : "text-[#475569] hover:bg-white"
                }`}
                href={item.href}
                key={item.label}
                prefetch={true}
                aria-current={parentActive ? "page" : undefined}
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
