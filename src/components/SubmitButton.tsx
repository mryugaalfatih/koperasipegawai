"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  className = "h-12 w-full rounded-2xl bg-[#0b1220] text-sm font-black text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed",
  disabled = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin text-white" />
          <span>Memproses...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
