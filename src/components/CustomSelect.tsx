"use client";

import { Check, ChevronDown } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type CustomSelectProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  name?: string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  required?: boolean;
  disabled?: boolean;
};

export function CustomSelect({
  value: controlledValue,
  defaultValue = "",
  onChange,
  options: optionsProp,
  children,
  name,
  placeholder = "Pilih opsi...",
  className = "",
  wrapperClassName = "",
  disabled = false,
}: CustomSelectProps) {
  // Extract options from children if optionsProp is not directly passed
  const parsedOptions: SelectOption[] = optionsProp ?? [];

  if (!optionsProp && children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === "option") {
        const props = child.props as { value?: string; children?: React.ReactNode };
        parsedOptions.push({
          value: String(props.value ?? ""),
          label: String(props.children ?? props.value ?? ""),
        });
      }
    });
  }

  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(controlledValue ?? defaultValue ?? (parsedOptions[0]?.value ?? ""));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValue = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = parsedOptions.find((opt) => opt.value === selectedValue) ?? parsedOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: SelectOption) => {
    if (disabled) return;
    setInternalValue(option.value);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: option.value } });
    }
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${wrapperClassName}`}>
      {/* Hidden native input for HTML form submission compatibility */}
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}

      {/* Custom Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex h-11 w-full items-center justify-between rounded-xl border border-[#dbe5f1] bg-[#f8fbff] px-3.5 text-xs font-bold text-[#0b1220] outline-none transition-all hover:border-[#2563eb] hover:bg-white focus:border-[#2563eb] focus:bg-white focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] ${
          isOpen ? "border-[#2563eb] bg-white ring-2 ring-[#2563eb]/20" : ""
        } ${className}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`size-4 text-[#64748b] transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#2563eb]" : ""
          }`}
        />
      </button>

      {/* Floating Custom Popup Options Menu */}
      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[150] max-h-60 w-full overflow-y-auto rounded-xl border border-[#dbe5f1] bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          {parsedOptions.map((option) => {
            const isSelected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  isSelected
                    ? "bg-[#eaf2ff] text-[#2563eb]"
                    : "text-[#0b1220] hover:bg-[#f8fbff]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check className="size-4 text-[#2563eb] shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
