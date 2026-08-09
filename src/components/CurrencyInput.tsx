"use client";

import { useState, ChangeEvent } from "react";

type CurrencyInputProps = {
  name: string;
  placeholder?: string;
  defaultValue?: number | string;
  required?: boolean;
  className?: string;
};

function formatNumber(value: string | number): string {
  if (!value && value !== 0) return "";
  const cleanNum = String(value).replace(/\D/g, "");
  if (!cleanNum) return "";
  return new Intl.NumberFormat("id-ID").format(Number(cleanNum));
}

function parseRawNumber(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export function CurrencyInput({
  name,
  placeholder = "0",
  defaultValue = "",
  required = false,
  className = "mt-2 h-12 w-full rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4 text-sm font-bold outline-none focus:border-[#2563eb] focus:bg-white transition-all",
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatNumber(defaultValue));

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatNumber(rawVal);
    setDisplayValue(formatted);
  };

  const rawNumber = parseRawNumber(displayValue);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={className}
      />
      {/* Hidden input to pass raw integer value to FormData */}
      <input type="hidden" name={name} value={rawNumber} />
    </div>
  );
}
