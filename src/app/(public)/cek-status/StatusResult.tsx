"use client";

import { useActionState } from "react";
import { checkRegistrationStatus } from "@/actions";
import type { VerifyState } from "@/lib/shared";

const initial: VerifyState = { ok: false, message: "" };

function humanStatus(s: string): string {
  const map: Record<string, string> = {
    PENDING_VERIFICATION: "Menunggu Verifikasi",
    VERIFIED: "Terverifikasi",
    APPROVED: "Disetujui / Terdaftar Final",
    REJECTED: "Ditolak",
  };
  return map[s] || s;
}

function humanPayment(s: string): string {
  return s === "PAID" ? "Lunas" : "Belum Bayar";
}

export default function StatusResult({ data }: { data: NonNullable<VerifyState["data"]> }) {
  const badgeCls = (v: string) =>
    v === "APPROVED" || v === "PAID"
      ? "bg-green-100 text-green-800"
      : v === "REJECTED"
        ? "bg-red-100 text-red-800"
        : v === "VERIFIED"
          ? "bg-blue-100 text-blue-800"
          : "bg-amber-100 text-amber-800";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">Kode Peserta</p>
          <p className="font-mono text-lg font-bold text-neutral-900">{data.regCode}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">Status Pembayaran</p>
          <span
            className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${badgeCls(data.paymentStatus)}`}
          >
            {humanPayment(data.paymentStatus)}
          </span>
        </div>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Nama</dt>
          <dd className="font-medium text-neutral-900">{data.fullName}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Acara</dt>
          <dd className="text-right font-medium text-neutral-900">{data.eventName}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Status Pendaftaran</dt>
          <dd>
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${badgeCls(data.registrationStatus)}`}
            >
              {humanStatus(data.registrationStatus)}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Metode Pembayaran</dt>
          <dd className="font-medium text-neutral-900">
            {data.paymentMethod
              ? { TRANSFER: "Transfer Bank", QRIS: "QRIS", CASH: "Tunai", INVITED: "Undangan" }[data.paymentMethod] || data.paymentMethod
              : "-"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Didaftarkan</dt>
          <dd className="text-neutral-900">
            {new Date(data.createdAt).toLocaleString("id-ID")}
          </dd>
        </div>
      </dl>

      {data.registrationStatus === "PENDING_VERIFICATION" && data.paymentStatus === "UNPAID" ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Pendaftaran Anda menunggu verifikasi pembayaran. Hubungi panitia jika
          sudah transfer.
        </p>
      ) : null}
      {data.registrationStatus === "APPROVED" ? (
        <p className="mt-4 rounded-md bg-green-50 p-3 text-xs text-green-800">
          Pendaftaran final. Sampai jumpa di acara!
        </p>
      ) : null}
    </div>
  );
}

export { initial };