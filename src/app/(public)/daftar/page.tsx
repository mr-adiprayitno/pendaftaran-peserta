import type { Metadata } from "next";
import DaftarForm from "./DaftarForm";

export const metadata: Metadata = {
  title: "Formulir Pendaftaran",
};

export default function DaftarPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Formulir Pendaftaran</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Lengkapi data berikut. Kolom bertanda <span className="text-red-600">*</span>{" "}
        wajib diisi.
      </p>
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
        <DaftarForm />
      </div>
    </div>
  );
}