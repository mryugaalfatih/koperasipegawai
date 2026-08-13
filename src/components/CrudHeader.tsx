"use client";

import { Plus, Search, Filter, X } from "lucide-react";
import { useState } from "react";
import { CustomSelect } from "@/components/CustomSelect";


type CrudHeaderProps = {
  title: string;
  subtitle: string;
  countBadge?: string;
  addButtonLabel?: string;
  onAddClick?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  statusFilterValue?: string;
  onStatusFilterChange?: (val: string) => void;
  statusOptions?: { value: string; label: string }[];
};

export function CrudHeader({
  title,
  subtitle,
  countBadge,
  addButtonLabel = "Tambah Data",
  onAddClick,
  searchValue = "",
  onSearchChange,
  statusFilterValue = "",
  onStatusFilterChange,
  statusOptions,
}: CrudHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top Title & Add Button Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#0b1220] md:text-2xl">{title}</h1>
            {countBadge ? (
              <span className="rounded-full bg-[#eaf2ff] px-2 py-0.5 text-xs font-bold text-[#2563eb] ring-1 ring-[#bfdbfe]">
                {countBadge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[#64748b]">{subtitle}</p>
        </div>

        {onAddClick ? (
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563eb] px-2 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8] active:scale-[0.96] transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>{addButtonLabel}</span>
          </button>
        ) : null}

      </div>

      {/* Toolbar Search & Filter */}
      {(onSearchChange || onStatusFilterChange) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-[#dbe5f1]">
          {onSearchChange ? (
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari data..."
                className="h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-10 pr-9 text-xs font-semibold text-[#0b1220] outline-none focus:border-[#2563eb] focus:bg-white"
              />
              {searchValue ? (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b1220]"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {statusOptions && onStatusFilterChange ? (
            <div className="flex items-center gap-2 min-w-[150px]">
              <Filter className="size-4 text-[#64748b] shrink-0" />
              <CustomSelect
                value={statusFilterValue}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="h-10 text-xs"
              >
                <option value="">Semua Status</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </CustomSelect>
            </div>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}
