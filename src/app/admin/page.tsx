import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAdminSession, ADMIN_COOKIE } from "@/lib/helpers";
import { cookies } from "next/headers";
import AdminLoginForm from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Login Admin",
};

export default async function AdminLoginPage() {
  const jar = await cookies();
  const username = verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
  if (username) {
    redirect("/admin/pendaftaran");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8">
        <h1 className="text-xl font-bold text-neutral-900">Login Admin</h1>
        <p className="mt-1 mb-6 text-sm text-neutral-600">
          Panel verifikasi pendaftaran &amp; pembayaran.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}