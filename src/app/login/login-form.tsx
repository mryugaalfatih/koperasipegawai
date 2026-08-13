"use client";

import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SubmitButton } from "@/components/SubmitButton";

type LoginFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

const rememberedEmailKey = "koperasipro.remembered_email";

export function LoginForm({ action }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberUserRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(rememberedEmailKey);

    if (rememberedEmail && emailRef.current && rememberUserRef.current) {
      emailRef.current.value = rememberedEmail;
      rememberUserRef.current.checked = true;
    }
  }, []);

  function handleSubmit() {
    const email = emailRef.current?.value ?? "";
    const rememberUser = rememberUserRef.current?.checked ?? false;

    if (rememberUser && email) {
      window.localStorage.setItem(rememberedEmailKey, email);
      return;
    }

    window.localStorage.removeItem(rememberedEmailKey);
  }

  return (
    <form action={action} className="mt-5 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-xs font-bold uppercase text-[#475569]">Email</span>
        <div className="mt-1.5 flex h-11 items-center gap-3 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 focus-within:border-[#2563eb] transition-all">
          <Mail className="size-4 text-[#64748b]" />
          <input
            autoComplete="username"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            name="email"
            placeholder="nama@koperasi.com"
            ref={emailRef}
            required
            type="email"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase text-[#475569]">Password</span>
        <div className="mt-1.5 flex h-11 items-center gap-3 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-2 focus-within:border-[#2563eb] transition-all">
          <KeyRound className="size-4 text-[#64748b]" />
          <input
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            name="password"
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="grid size-8 place-items-center rounded-xl text-[#64748b] hover:bg-[#eaf2ff] hover:text-[#2563eb]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbff] px-2 py-2.5">
        <span className="text-xs font-semibold text-[#475569]">Ingat email di perangkat ini</span>
        <input
          className="size-4 accent-[#2563eb]"
          ref={rememberUserRef}
          type="checkbox"
        />
      </label>

      <SubmitButton className="h-11 w-full rounded-2xl bg-[#2563eb] text-sm font-bold text-white hover:bg-[#1d4ed8]">
        Masuk Ke Sistem
      </SubmitButton>
    </form>
  );
}

