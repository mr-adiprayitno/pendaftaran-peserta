import type { Metadata } from "next";
import CekStatusClient from "./CekStatusClient";

export const metadata: Metadata = {
  title: "Cek Status Pendaftaran",
};

export default function CekStatusPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Cek Status Pendaftaran</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Masukkan kode peserta Anda (dapat setelah submit formulir).
      </p>
      <div className="mt-6">
        <CekStatusClient />
      </div>
    </div>
  );
}