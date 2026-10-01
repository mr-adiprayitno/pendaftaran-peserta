"use client";

import { useActionState } from "react";
import { submitRegistration } from "@/actions";
import type { FormState } from "@/lib/shared";

const initial: FormState = { ok: false, message: "" };

const inputCls =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export default function DaftarForm() {
  const [state, action, pending] = useActionState(submitRegistration, initial);

  if (state.ok && state.regCode) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-green-800">
          ✅ Pendaftaran Berhasil
        </h1>
        <p className="mt-2 text-sm text-green-700">{state.message}</p>
        <div className="mt-4 rounded-lg border border-green-300 bg-white p-4">
          <p className="text-xs text-neutral-500">Kode Peserta Anda</p>
          <p className="mt-1 font-mono text-lg font-bold text-neutral-900 select-all">
            {state.regCode}
          </p>
        </div>
        <p className="mt-4 text-xs text-green-700">
          Simpan kode ini. Gunakan untuk cek status pendaftaran &amp; pembayaran.
        </p>
        <a
          href="/cek-status"
          className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Cek Status
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-neutral-900">
          Nama Lengkap <span className="text-red-600">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          minLength={3}
          className={inputCls}
          placeholder="cth: Budi Santoso"
          autoComplete="name"
        />
        <FieldError msg={state.errors?.fullName} />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-900">
          Email <span className="text-red-600">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputCls}
          placeholder="nama@perusahaan.co.id"
          autoComplete="email"
        />
        <FieldError msg={state.errors?.email} />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-900">
          Nomor WhatsApp <span className="text-red-600">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className={inputCls}
          placeholder="08xxxxxxxxxx"
          autoComplete="tel"
        />
        <FieldError msg={state.errors?.phone} />
      </div>

      <div>
        <label htmlFor="organization" className="mb-1 block text-sm font-medium text-neutral-900">
          Instansi / Perusahaan
        </label>
        <input
          id="organization"
          name="organization"
          type="text"
          className={inputCls}
          placeholder="opsional"
          autoComplete="organization"
        />
      </div>

      <div>
        <label htmlFor="address" className="mb-1 block text-sm font-medium text-neutral-900">
          Alamat
        </label>
        <textarea
          id="address"
          name="address"
          rows={2}
          className={inputCls}
          placeholder="opsional"
        />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <label htmlFor="regCodeInput" className="mb-1 block text-sm font-medium text-blue-900">
          Kode Registrasi <span className="text-red-600">*</span>
        </label>
        <input
          id="regCodeInput"
          name="regCodeInput"
          type="text"
          required
          className={`${inputCls} font-mono uppercase`}
          placeholder="REG-2026-XXXX"
        />
        <p className="mt-1 text-xs text-blue-700">
          Dari panitia. Demo code: REG-2026-0001 s/d REG-2026-0015
        </p>
        <FieldError msg={state.errors?.regCodeInput} />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-neutral-900">
          Metode Pembayaran <span className="text-red-600">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["TRANSFER", "Transfer Bank"],
            ["QRIS", "QRIS"],
            ["CASH", "Tunai (di lokasi)"],
            ["INVITED", "Undangan / Gratis"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm has-checked:border-blue-500 has-checked:bg-blue-50"
            >
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                required
                className="accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Mode demo: konfirmasi pembayaran dikelola admin.
        </p>
        <FieldError msg={state.errors?.paymentMethod} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Mengirim..." : "Kirim Pendaftaran"}
      </button>
    </form>
  );
}