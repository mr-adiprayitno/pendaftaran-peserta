"use server";

import { prisma } from "@/lib/db";
import { ADMIN_COOKIE, verifyAdminSession, createAuditLog } from "@/lib/helpers";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin(): Promise<string> {
  const jar = await cookies();
  const username = verifyAdminSession(jar.get(ADMIN_COOKIE)?.value);
  if (!username) redirect("/admin");
  return username;
}

export async function approvePayment(formData: FormData) {
  const username = await requireAdmin();
  const id = String(formData.get("id") || "");

  // Idempotent: hanya update jika masih PENDING+UNPAID
  const res = await prisma.registration.updateMany({
    where: { id, registrationStatus: "PENDING_VERIFICATION", paymentStatus: "UNPAID" },
    data: {
      registrationStatus: "APPROVED",
      paymentStatus: "PAID",
      verifiedAt: new Date(),
      paidAt: new Date(),
    },
  });

  if (res.count > 0) {
    await createAuditLog("APPROVE_PAYMENT", "Registration", id, `by=${username}`);
  }
  revalidatePath("/admin/pendaftaran");
}

export async function verifyRegistration(formData: FormData) {
  const username = await requireAdmin();
  const id = String(formData.get("id") || "");

  const res = await prisma.registration.updateMany({
    where: { id, registrationStatus: "PENDING_VERIFICATION" },
    data: { registrationStatus: "VERIFIED", verifiedAt: new Date() },
  });

  if (res.count > 0) {
    await createAuditLog("VERIFY_REGISTRATION", "Registration", id, `by=${username}`);
  }
  revalidatePath("/admin/pendaftaran");
}

export async function rejectRegistration(formData: FormData) {
  const username = await requireAdmin();
  const id = String(formData.get("id") || "");

  const reg = await prisma.registration.findUnique({ where: { id } });
  if (!reg) return;

  const res = await prisma.registration.updateMany({
    where: { id, registrationStatus: { not: "REJECTED" } },
    data: { registrationStatus: "REJECTED" },
  });

  if (res.count > 0 && reg.regCode) {
    // Bebaskan kode registrasi agar bisa dipakai ulang
    await prisma.registrationCode.updateMany({
      where: { code: reg.regCode },
      data: { isUsed: false },
    });
    await createAuditLog("REJECT_REGISTRATION", "Registration", id, `by=${username}`);
  }
  revalidatePath("/admin/pendaftaran");
}

export async function confirmCashPayment(formData: FormData) {
  const username = await requireAdmin();
  const id = String(formData.get("id") || "");

  const res = await prisma.registration.updateMany({
    where: { id, paymentStatus: "UNPAID" },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });

  if (res.count > 0) {
    await createAuditLog("CONFIRM_PAYMENT", "Registration", id, `by=${username} method=manual`);
  }
  revalidatePath("/admin/pendaftaran");
}