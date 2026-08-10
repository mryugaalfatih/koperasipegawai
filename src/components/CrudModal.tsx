"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

type CrudModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
};

export function CrudModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-xl",
}: CrudModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#07152f]/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Modal / Mobile Bottom Sheet Card */}
      <div
        className={`relative z-[101] w-full ${maxWidth} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-[28px] bg-white p-5 sm:p-6 shadow-2xl ring-1 ring-[#dbe5f1] transition-all animate-in slide-in-from-bottom-10 sm:zoom-in-95`}
      >
        {/* Touch Handle indicator for Mobile */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#cbd5e1] sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#f1f5f9]">
          <div>
            <h2 className="text-lg font-bold text-[#0b1220]">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs font-semibold text-[#64748b]">{subtitle}</p> : null}
          </div>

          <button
            onClick={onClose}
            type="button"
            className="grid size-9 place-items-center rounded-2xl bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0b1220] active:scale-95 transition-all"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form / Content Body */}
        <div className="pt-4 pb-6 sm:pb-0">{children}</div>
      </div>
    </div>
  );
}
