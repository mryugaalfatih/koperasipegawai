"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export type SearchableOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type SearchableSelectProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  options: SearchableOption[];
  name?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  wrapperClassName?: string;
  required?: boolean;
  disabled?: boolean;
};

export function SearchableSelect({
  value: controlledValue,
  defaultValue = "",
  onChange,
  options = [],
  name,
  placeholder = "Ketik atau pilih data...",
  searchPlaceholder = "Cari berdasarkan nama / nomor...",
  className = "",
  wrapperClassName = "",
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(
    controlledValue ?? defaultValue ?? ""
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = options.find((opt) => opt.value === selectedValue);

  const filteredOptions = options.filter((opt) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      opt.value.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: SearchableOption) => {
    if (disabled) return;
    setInternalValue(option.value);
    setIsOpen(false);
    setQuery("");
    if (onChange) {
      onChange({ target: { name, value: option.value } });
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${wrapperClassName}`}>
      {/* Hidden input for HTML form submission */}
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3.5 text-xs font-bold text-[#0b1220] outline-none transition-all hover:border-[#2563eb] hover:bg-white focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] ${
          isOpen ? "border-[#2563eb] bg-white ring-2 ring-[#2563eb]/20" : ""
        } ${className}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-[#0b1220]">{selectedOption.label}</span>
              {selectedOption.sublabel ? (
                <span className="font-semibold text-[#64748b]">({selectedOption.sublabel})</span>
              ) : null}
            </span>
          ) : (
            <span className="text-[#94a3b8] font-semibold">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`size-4 text-[#64748b] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#2563eb]" : ""
          }`}
        />
      </button>

      {/* Floating Searchable Options Popup */}
      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[200] max-h-72 w-full overflow-hidden rounded-xl border border-[#dbe5f1] bg-white p-2 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          {/* Real-time Keyboard Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 w-full rounded-xl border border-[#dbe5f1] bg-[#f8fbff] pl-9 pr-8 text-xs font-bold text-[#0b1220] outline-none focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b1220]"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Filtered Options List */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-[#eaf2ff] text-[#2563eb]"
                        : "text-[#0b1220] hover:bg-[#f4f7fb] hover:text-[#2563eb]"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{option.label}</p>
                      {option.sublabel ? (
                        <p className="truncate text-[11px] font-semibold text-[#64748b]">
                          {option.sublabel}
                        </p>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <Check className="size-4 shrink-0 text-[#2563eb]" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs font-semibold text-[#94a3b8]">
                Tidak ada data anggota yang cocok dengan `{query}`.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
