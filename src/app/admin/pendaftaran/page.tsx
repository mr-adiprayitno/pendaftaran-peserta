import { prisma } from "@/lib/db";
import { formatDateID, formatTimeID, formatRupiah } from "@/lib/helpers";
import { adminLogout } from "@/actions";
import {
  approvePayment,
  verifyRegistration,
  rejectRegistration,
  confirmCashPayment,
} from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

function pm(s: string | null): string {
  if (!s) return "-";
  return { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai", INVITED: "Undangan" }[s] || s;
}

function StatBadge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

const stCls: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  VERIFIED: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};
const payCls: Record<string, string> = {
  UNPAID: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
};

export default async function AdminPendaftaranPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const q = (sp.q || "").trim();
  const statusFilter = sp.status || "";

  const where = {
    AND: [
      q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { regCode: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
      statusFilter
        ? { registrationStatus: statusFilter as "PENDING_VERIFICATION" }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { event: { select: { title: true } } },
      skip: (page - 1) * 10,
      take: 10,
    }),
    prisma.registration.count({ where }),
  ]);

  const stats = {
    total: await prisma.registration.count(),
    pending: await prisma.registration.count({
      where: { registrationStatus: "PENDING_VERIFICATION" },
    }),
    approved: await prisma.registration.count({
      where: { registrationStatus: "APPROVED" },
    }),
    paid: await prisma.registration.count({ where: { paymentStatus: "PAID" } }),
  };
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard Pendaftaran</h1>
        <form action={adminLogout}>
          <button className="text-sm text-neutral-600 hover:text-red-600">
            Keluar
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Pendaftar", stats.total, "bg-white"],
          ["Menunggu Verifikasi", stats.pending, "bg-amber-50"],
          ["Disetujui", stats.approved, "bg-green-50"],
          ["Lunas", stats.paid, "bg-blue-50"],
        ].map(([label, val, cls]) => (
          <div key={String(label)} className={`rounded-lg border border-neutral-200 p-4 ${cls}`}>
            <p className="text-xs text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{String(val)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <form className="mt-6 flex flex-col gap-2 sm:flex-row" action="/admin/pendaftaran">
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama / email / kode..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="PENDING_VERIFICATION">Menunggu Verifikasi</option>
          <option value="VERIFIED">Terverifikasi</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
        </select>
        <button className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900">
          Filter
        </button>
      </form>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Kode</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Nama</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Email</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Metode</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Bayar</th>
              <th className="px-3 py-2 text-left font-medium text-neutral-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-neutral-500">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2 font-mono text-xs">{r.regCode}</td>
                  <td className="px-3 py-2">{r.fullName}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{r.email}</td>
                  <td className="px-3 py-2 text-xs">{pm(r.paymentMethod)}</td>
                  <td className="px-3 py-2">
                    <StatBadge cls={stCls[r.registrationStatus]}>
                      {{ PENDING_VERIFICATION: "Pending", VERIFIED: "Verified", APPROVED: "Approved", REJECTED: "Rejected" }[r.registrationStatus]}
                    </StatBadge>
                  </td>
                  <td className="px-3 py-2">
                    <StatBadge cls={payCls[r.paymentStatus]}>
                      {r.paymentStatus === "PAID" ? "Lunas" : "Belum"}
                    </StatBadge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.registrationStatus === "PENDING_VERIFICATION" ? (
                        <>
                          <form action={verifyRegistration}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">
                              Verifikasi
                            </button>
                          </form>
                          <form action={approvePayment}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700">
                              Setujui+Lunas
                            </button>
                          </form>
                          <form action={rejectRegistration}>
                            <input type="hidden" name="id" value={r.id} />
                            <button className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700">
                              Tolak
                            </button>
                          </form>
                        </>
                      ) : null}
                      {r.paymentStatus === "UNPAID" && r.registrationStatus !== "REJECTED" ? (
                        <form action={confirmCashPayment}>
                          <input type="hidden" name="id" value={r.id} />
                          <button className="rounded bg-neutral-200 px-2 py-1 text-xs text-neutral-800 hover:bg-neutral-300">
                            Konfirmasi Bayar
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-neutral-600">
          Halaman {page} dari {totalPages} — {total} data
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/pendaftaran?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
            >
              Sebelumnya
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={`/admin/pendaftaran?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`}
              className="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
            >
              Berikutnya
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}