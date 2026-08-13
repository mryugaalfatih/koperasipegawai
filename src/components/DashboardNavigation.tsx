"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { CustomSelect } from "@/components/CustomSelect";

import {
  Building2,
  BookOpenCheck,
  ChevronDown,
  CreditCard,
  FileBarChart2,
  Fingerprint,
  Menu,
  Scale,
  ShieldCheck,
  Store,
  UsersRound,
  UserCog,
  WalletCards,
  X,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNavItems = unitNavItems[selectedUnit] ?? initialNavItems;

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  // Auto-expand: find which parent menus have an active child
  const getInitialExpanded = (): Set<string> => {
    const expanded = new Set<string>();
    currentNavItems.forEach((item) => {
      if (item.children?.length) {
        const hasActiveChild = item.children.some((child) => isActive(child.href));
        if (hasActiveChild || isActive(item.href)) {
          expanded.add(item.label);
        }
      }
    });
    return expanded;
  };

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(getInitialExpanded);

  // Update expanded menus when pathname changes
  useEffect(() => {
    setExpandedMenus(getInitialExpanded());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, selectedUnit]);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Shared nav renderer for desktop & mobile full menu
  const renderNavItems = (items: NavItem[], isMobile = false) => (
    <nav className={`space-y-1 ${isMobile ? "" : "mt-8"}`}>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const parentActive =
          isActive(item.href) ||
          Boolean(item.children?.some((child) => isActive(child.href)));
        const Icon = iconMap[item.icon] ?? Building2;
        const isExpanded = expandedMenus.has(item.label);

        if (hasChildren) {
          return (
            <div key={item.label}>
              {/* Parent button - toggles collapse */}
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                className={`flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold transition-all cursor-pointer ${
                  parentActive
                    ? "text-[#2563eb] bg-[#eaf2ff]"
                    : "text-[#475569] hover:bg-white"
                }`}
              >
                <Icon className={`size-5 ${parentActive ? "text-[#2563eb]" : ""}`} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={`size-4 text-[#94a3b8] transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Collapsible children */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="ml-4 border-l-2 border-[#dbe5f1] pl-3 space-y-1 py-1">
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
  );

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden border-r border-[#dbe5f1] bg-[#f8fbff] px-5 py-6 lg:block print:hidden">
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

          {/* Unit Selector */}
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

        {renderNavItems(currentNavItems)}
      </aside>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur lg:hidden print:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.slice(0, 4).map((item) => {
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

          {/* "Lainnya" button to open full mobile menu */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition-colors cursor-pointer ${
              mobileMenuOpen ? "bg-[#0b1220] text-white" : "text-[#64748b] hover:bg-white"
            }`}
          >
            <Menu className="size-4" />
            Lainnya
          </button>
        </div>
      </nav>

      {/* ===== MOBILE FULL MENU OVERLAY ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-up panel */}
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-[#f8fbff] px-5 py-5 shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0b1220]">Menu Navigasi</h2>
                  <p className="text-[11px] font-semibold text-[#64748b]">KoperasiPro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid size-9 place-items-center rounded-xl border border-[#dbe5f1] bg-white text-[#64748b] hover:text-[#0b1220] cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Unit Selector */}
            <div className="mb-4">
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
            </div>

            {/* Full nav with collapsible submenus */}
            {renderNavItems(currentNavItems, true)}

            {/* Bottom padding for safe area */}
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Animation keyframe */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
