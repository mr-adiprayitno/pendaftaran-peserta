import { prisma } from "@/lib/db";
import { formatRupiah, formatDateID, formatTimeID } from "@/lib/helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const event = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { eventDate: "desc" },
  });

  if (!event) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-neutral-900">
          Belum ada pendaftaran dibuka
        </h1>
        <p className="mt-2 text-neutral-600">
          Silakan cek kembali di lain waktu.
        </p>
      </div>
    );
  }

  const taken = await prisma.registration.count({
    where: {
      eventId: event.id,
      registrationStatus: { in: ["PENDING_VERIFICATION", "VERIFIED", "APPROVED"] },
    },
  });
  const sisaKuota = Math.max(0, event.quota - taken);
  const persen = Math.min(100, Math.round((taken / event.quota) * 100));
  const free = event.price <= 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
        <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Prototype Demo
        </span>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 sm:text-3xl">
          {event.title}
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">{event.description}</p>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-neutral-50 p-4">
            <dt className="text-xs text-neutral-500">Tanggal</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {formatDateID(event.eventDate)}
            </dd>
            <dd className="text-xs text-neutral-500">
              {formatTimeID(event.eventDate)} WIB
            </dd>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4">
            <dt className="text-xs text-neutral-500">Lokasi</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">{event.venue}</dd>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4">
            <dt className="text-xs text-neutral-500">Biaya</dt>
            <dd className="mt-1 text-sm font-medium text-neutral-900">
              {free ? "Gratis" : formatRupiah(event.price)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/daftar"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            aria-disabled={sisaKuota === 0}
          >
            Daftar Sekarang
          </Link>
          <Link
            href="/cek-status"
            className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-5 py-2.5 font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Cek Status Pendaftaran
          </Link>
        </div>
      </section>

      {/* Kuota */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-900">Kuota Terisi</span>
          <span className="text-neutral-600">
            {taken} / {event.quota} — sisa {sisaKuota}
          </span>
        </div>
        <div
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={persen}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full ${sisaKuota === 0 ? "bg-red-500" : "bg-blue-600"}`}
            style={{ width: `${persen}%` }}
          />
        </div>
      </section>

      {/* Cara daftar */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Cara Mendaftar</h2>
        <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-neutral-700">
          <li>Siapkan kode registrasi (REG-2026-XXXX) dari panitia.</li>
          <li>Isi formulir pendaftaran dengan data diri yang valid.</li>
          <li>
            Pilih metode pembayaran <em>Transfer</em>, <em>QRIS</em>, <em>Tunai</em>,
            atau <em>Undangan</em>.
          </li>
          <li>
            Simpan kode peserta yang muncul setelah submit — gunakan untuk cek
            status.
          </li>
        </ol>
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
          Mode prototype: pembayaran belum terhubung gateway sungguhan. Status
          verifikasi dikelola admin demo.
        </p>
      </section>
    </div>
  );
}