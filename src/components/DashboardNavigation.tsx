"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { CustomSelect } from "@/components/CustomSelect";

import {
  Building2,
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
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
  Layers,
  LogOut,
  Home,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { unitNavItems } from "@/lib/dashboardNavigation";
import { createClient } from "@/lib/supabase/client";

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
  businessUnits?: { id: string; code: string; name: string; is_active?: boolean }[];
};

const iconMap: Record<string, LucideIcon> = {
  Home: Building2,
  Anggota: UsersRound,
  Simpanan: WalletCards,
  Pinjaman: CreditCard,
  Keuangan: Scale,
  Kas: Scale,
  Akuntansi: BookOpenCheck,
  Laporan: FileBarChart2,
  Audit: Fingerprint,
  Unit: Store,
  User: UserCog,
  Setup: ShieldCheck,
};

export function DashboardNavigation({ navItems: initialNavItems, mobileNavItems, businessUnits: businessUnitsProp }: DashboardNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedUnit, setSelectedUnit] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Sign out error:", err);
      window.location.href = "/login";
    }
  };

  type UnitProp = { id: string; code: string; name: string; is_active?: boolean };
  const [units, setUnits] = useState<UnitProp[]>(
    (businessUnitsProp ?? []).filter((u) => u.is_active !== false)
  );

  // --- Hover handlers for Supabase-style expand ---
  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setIsExpanded(true), 80);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setIsExpanded(false), 180);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // --- Unit detection ---
  const detectUnitFromPath = (path: string, availableUnits: UnitProp[]): string | null => {
    if (path.startsWith("/toko")) {
      const u = availableUnits.find((u) => {
        const c = u.code.toUpperCase(); const n = u.name.toUpperCase();
        return c.includes("TOKO") || c.includes("WAS") || n.includes("TOKO") || n.includes("WAS");
      });
      return u?.code ?? "TOKO";
    }
    if (path.startsWith("/simpanan") || path.startsWith("/pinjaman") || path.startsWith("/usp")) {
      const u = availableUnits.find((u) => {
        const c = u.code.toUpperCase(); const n = u.name.toUpperCase();
        return c.includes("USP") || c.includes("SIMPAN") || n.includes("SIMPAN");
      });
      return u?.code ?? "USP";
    }
    if (path.startsWith("/jasa")) {
      const u = availableUnits.find((u) => {
        const c = u.code.toUpperCase(); const n = u.name.toUpperCase();
        return c.includes("JASA") || n.includes("JASA");
      });
      return u?.code ?? "JASA";
    }
    if (path.startsWith("/apar")) {
      const u = availableUnits.find((u) => {
        const c = u.code.toUpperCase(); const n = u.name.toUpperCase();
        return c.includes("APAR") || c.includes("DAMKAR") || n.includes("APAR") || n.includes("DAMKAR");
      });
      return u?.code ?? "APAR";
    }
    return null;
  };

  useEffect(() => {
    const initUnits = (availableUnits: UnitProp[]) => {
      const activeOnly = availableUnits.filter((u) => u.is_active !== false);
      setUnits(activeOnly);
      if (!activeOnly.length) return;
      const pathUnit = detectUnitFromPath(pathname, activeOnly);
      if (pathUnit) {
        setSelectedUnit(pathUnit);
        if (typeof window !== "undefined") localStorage.setItem("koperasi_selected_unit", pathUnit);
        return;
      }
      const savedUnit = typeof window !== "undefined" ? localStorage.getItem("koperasi_selected_unit") : null;
      if (savedUnit && activeOnly.some((u) => u.code === savedUnit)) {
        setSelectedUnit(savedUnit);
        return;
      }
      setSelectedUnit(activeOnly[0].code);
    };

    if (businessUnitsProp?.length) {
      initUnits(businessUnitsProp);
      return;
    }

    const supabase = createClient();
    supabase.from("business_units").select("id, code, name, is_active").eq("is_active", true).order("code")
      .then(({ data }) => { if (data?.length) initUnits(data); });
  }, [businessUnitsProp, pathname]);

  const resolveNavItems = (code: string): NavItem[] => {
    if (unitNavItems[code]) return unitNavItems[code];
    const upper = (code || "").toUpperCase();
    if (upper.includes("USP") || upper.includes("SIMPAN")) return unitNavItems.USP ?? initialNavItems;
    if (upper.includes("TOKO") || upper.includes("WAS")) return unitNavItems.TOKO ?? initialNavItems;
    if (upper.includes("JASA")) return unitNavItems.JASA ?? initialNavItems;
    if (upper.includes("APAR") || upper.includes("DAMKAR")) return unitNavItems.APAR ?? initialNavItems;
    return unitNavItems.PUSAT ?? initialNavItems;
  };

  const currentNavItems = resolveNavItems(selectedUnit);
  const currentUnitObj = units.find((u) => u.code === selectedUnit);

  const unitOptions = units.map((u) => ({ value: u.code, label: `${u.code} · ${u.name}` }));

  const handleUnitChange = (newCode: string) => {
    setSelectedUnit(newCode);
    if (typeof window !== "undefined") localStorage.setItem("koperasi_selected_unit", newCode);
    const upper = (newCode || "").toUpperCase();
    if (upper.includes("TOKO") || upper.includes("WAS") || upper.includes("PERDAGANGAN")) {
      router.push("/toko/home");
      return;
    }
    if (upper.includes("USP") || upper.includes("SIMPAN") || upper.includes("PINJAM")) {
      router.push("/usp/home");
      return;
    }
    if (upper.includes("APAR") || upper.includes("DAMKAR")) {
      router.push("/apar/home");
      return;
    }
    router.push("/home");
  };

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));

  const getInitialExpanded = (): Set<string> => {
    const expanded = new Set<string>();
    currentNavItems.forEach((item) => {
      if (item.children?.length) {
        const hasActiveChild = item.children.some((child) => isActive(child.href));
        if (hasActiveChild || isActive(item.href)) expanded.add(item.label);
      }
    });
    return expanded;
  };

  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(getInitialExpanded);

  useEffect(() => { setExpandedMenus(getInitialExpanded()); }, [pathname, selectedUnit]);
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // ---- ICON RAIL RENDERER (collapsed mode) ----
  const renderIconRail = (items: NavItem[]) => (
    <nav className="mt-4 flex flex-col items-center gap-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon] ?? Building2;
        const parentActive = isActive(item.href) || Boolean(item.children?.some((c) => isActive(c.href)));

        return (
          <Link
            key={item.label}
            href={item.children?.[0]?.href ?? item.href}
            title={item.label}
            className={`group relative flex size-10 items-center justify-center rounded-xl transition-all duration-150 ${
              parentActive
                ? "bg-[#0b1220] text-white shadow-sm"
                : "text-[#64748b] hover:bg-white hover:text-[#0b1220] hover:shadow-sm"
            }`}
          >
            <Icon className="size-4.5" />
            {/* Tooltip on hover */}
            <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0b1220] px-2.5 py-1.5 text-[11px] font-bold text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              {item.label}
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#0b1220]" />
            </span>
          </Link>
        );
      })}
    </nav>
  );

  // ---- FULL NAV RENDERER (expanded mode) ----
  const renderNavItems = (items: NavItem[], isMobile = false) => (
    <nav className={`space-y-0.5 ${isMobile ? "" : "mt-4"}`}>
      {items.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const parentActive = isActive(item.href) || Boolean(item.children?.some((child) => isActive(child.href)));
        const Icon = iconMap[item.icon] ?? Building2;
        const isExp = expandedMenus.has(item.label);

        if (hasChildren) {
          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                className={`flex h-10 w-full items-center gap-3 rounded-xl px-2 text-[13px] font-bold transition-all cursor-pointer ${
                  parentActive ? "text-[#2563eb] bg-[#eaf2ff]" : "text-[#475569] hover:bg-white hover:text-[#0b1220]"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${parentActive ? "text-[#2563eb]" : ""}`} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                <ChevronDown className={`size-3.5 text-[#94a3b8] transition-transform duration-200 ${isExp ? "rotate-180" : ""}`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isExp ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="ml-4 mt-0.5 border-l-2 border-[#e2e8f0] pl-3 space-y-0.5 pb-1">
                  {item.children?.map((child) => {
                    const childActive = isActive(child.href);
                    const ChildIcon = iconMap[child.icon] ?? Building2;
                    return (
                      <Link
                        className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold transition-all ${
                          childActive ? "bg-[#0b1220] text-white shadow-sm" : "text-[#64748b] hover:bg-white hover:text-[#0b1220]"
                        }`}
                        href={child.href}
                        key={child.label}
                        prefetch={true}
                        aria-current={childActive ? "page" : undefined}
                      >
                        <ChildIcon className="size-3.5 shrink-0" />
                        <span className="truncate">{child.label}</span>
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
            className={`flex h-10 items-center gap-3 rounded-xl px-2 text-[13px] font-bold transition-colors ${
              parentActive ? "bg-[#0b1220] text-white shadow-sm" : "text-[#475569] hover:bg-white hover:text-[#0b1220]"
            }`}
            href={item.href}
            key={item.label}
            prefetch={true}
            aria-current={parentActive ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ===== DESKTOP SIDEBAR - Supabase-Style Hover Expand ===== */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`hidden lg:flex flex-col border-r border-[#dbe5f1] bg-[#f8fbff] py-5 print:hidden transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? "w-[240px] px-2" : "w-[56px] px-2"
        }`}
        style={{ minHeight: "100vh" }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 overflow-hidden ${isExpanded ? "px-1" : "justify-center"}`}>
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white shadow-sm">
            <Building2 className="size-4" />
          </div>
          {isExpanded ? (
            <div className="min-w-0">
              <h1 className="text-sm font-black text-[#0b1220] leading-tight">KoperasiPro</h1>
              <p className="text-[10px] font-semibold text-[#64748b]">Multi-Unit System</p>
            </div>
          ) : null}
        </div>

        {/* Unit Selector (only when expanded) */}
        {isExpanded ? (
          <div className="mt-4 space-y-2">
            <CustomSelect
              value={selectedUnit}
              onChange={(e) => handleUnitChange(e.target.value)}
              options={unitOptions}
              className="h-9 text-[11px]"
            />

            <div className="flex items-center gap-1.5 rounded-xl bg-[#eff6ff] px-2.5 py-1.5 text-[10px] font-bold text-[#2563eb] border border-[#dbeafe]">
              <span className="size-1.5 shrink-0 rounded-full bg-[#2563eb] animate-pulse" />
              <span className="truncate">
                {currentUnitObj ? `${currentUnitObj.name}` : "Semua Unit Usaha"}
              </span>
            </div>
          </div>
        ) : (
          /* Mini unit badge (icon only) */
          <button
            type="button"
            title={currentUnitObj?.name ?? "Pilih Unit"}
            onClick={() => setIsExpanded(true)}
            className="mt-3 flex size-10 mx-auto items-center justify-center rounded-xl border border-[#dbe5f1] bg-white text-[10px] font-black text-[#2563eb] hover:border-[#2563eb] transition-colors"
          >
            {selectedUnit ? selectedUnit.slice(0, 3) : <Layers className="size-4" />}
          </button>
        )}

        {/* Divider */}
        <div className="my-3 border-t border-[#e2e8f0]" />

        {/* Nav Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-0.5 pr-0.5">
          {isExpanded ? renderNavItems(currentNavItems) : renderIconRail(currentNavItems)}
        </div>

        {/* Bottom Actions: Portal Utama & Logout */}
        {isExpanded ? (
          <div className="mt-auto pt-3 border-t border-[#e2e8f0] space-y-1">
            <Link
              href="/home"
              className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-xs font-bold text-[#475569] hover:bg-white hover:text-[#0b1220] transition-all"
            >
              <Building2 className="size-4 text-[#2563eb] shrink-0" />
              <span className="truncate">Portal Utama</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="truncate">Keluar / Logout</span>
            </button>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-[#e2e8f0] space-y-1.5 flex flex-col items-center">
            <Link
              href="/home"
              title="Portal Utama"
              className="grid size-9 place-items-center rounded-xl text-[#475569] hover:bg-white hover:text-[#0b1220] transition-colors"
            >
              <Building2 className="size-4 text-[#2563eb]" />
            </Link>

            <button
              type="button"
              title="Keluar / Logout"
              onClick={handleSignOut}
              className="grid size-9 place-items-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ===== MOBILE BOTTOM BAR ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dbe5f1] bg-[#f8fbff]/95 px-2 py-2 backdrop-blur lg:hidden print:hidden">
        <div className="grid grid-cols-5 gap-1">
          {currentNavItems.slice(0, 4).map((item) => {
            const active = isActive(item.href);
            const Icon = iconMap[item.icon] ?? Building2;
            return (
              <Link
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-colors ${
                  active ? "bg-[#0b1220] text-white" : "text-[#64748b] hover:bg-white"
                }`}
                href={item.href}
                key={item.label}
                prefetch={true}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" />
                <span className="truncate max-w-[56px] text-center leading-tight">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-colors cursor-pointer ${
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[#f8fbff] px-5 py-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[#2563eb] text-white">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#0b1220]">Menu Navigasi</h2>
                  <p className="text-[10px] font-semibold text-[#64748b]">KoperasiPro · {currentUnitObj?.name ?? "Multi-Unit"}</p>
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

            <div className="mb-3">
              <CustomSelect
                value={selectedUnit}
                onChange={(e) => { handleUnitChange(e.target.value); setMobileMenuOpen(false); }}
                options={unitOptions}
                className="h-10 text-[12px]"
              />
            </div>

            <div className="border-t border-[#e2e8f0] pt-3">
              {renderNavItems(currentNavItems, true)}
            </div>

            {/* Mobile Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-[#e2e8f0] space-y-2">
              <Link
                href="/home"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white border border-[#dbe5f1] text-xs font-bold text-[#0b1220] shadow-2xs hover:bg-slate-50"
              >
                <Building2 className="size-4 text-[#2563eb]" />
                <span>Kembali ke Portal Utama</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shadow-2xs"
              >
                <LogOut className="size-4" />
                <span>Keluar dari Aplikasi (Logout)</span>
              </button>
            </div>

            <div className="h-4" />
          </div>
        </div>
      )}
    </>
  );
}
