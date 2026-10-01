import Link from "next/link";

export default function TopNav() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-sm font-semibold text-neutral-900"
          title="Halaman utama"
        >
          Pendaftaran<span className="text-blue-600">Peserta</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/daftar"
            className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
          >
            Daftar
          </Link>
          <Link href="/cek-status" className="text-neutral-600 hover:text-neutral-900">
            Cek Status
          </Link>
          <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
            Admin
          </Link>
        </div>
      </nav>
    </header>
  );
}