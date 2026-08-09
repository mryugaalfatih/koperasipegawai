"use client";

import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    <form action={action} className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="text-sm font-black">Email</span>
        <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4">
          <Mail className="size-5 text-[#64748b]" />
          <input
            autoComplete="username"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
            name="email"
            placeholder="nama@koperasi.com"
            ref={emailRef}
            required
            type="email"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-sm font-black">Password</span>
        <div className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-[#dbe5f1] bg-[#f8fbff] px-4">
          <KeyRound className="size-5 text-[#64748b]" />
          <input
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
            name="password"
            placeholder="Password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            className="grid size-9 place-items-center rounded-xl text-[#64748b] hover:bg-[#eaf2ff] hover:text-[#2563eb]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </label>

      <label className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fbff] px-4 py-3">
        <span className="text-sm font-bold text-[#475569]">Ingat email di perangkat ini</span>
        <input
          className="size-5 accent-[#2563eb]"
          ref={rememberUserRef}
          type="checkbox"
        />
      </label>

      <button className="h-12 w-full rounded-2xl bg-[#2563eb] text-sm font-black text-white" type="submit">
        Masuk
      </button>

      <p className="text-xs font-semibold leading-5 text-[#64748b]">
        Password dapat disimpan melalui password manager browser. Aplikasi tidak menyimpan password mentah.
      </p>
    </form>
  );
}
