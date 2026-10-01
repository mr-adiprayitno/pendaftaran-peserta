"use server";

import { prisma } from "@/lib/db";
import { createRegistration, countActiveRegistrations } from "@/lib/queries";
import { verifyPassword, signAdminSession, ADMIN_COOKIE, createAuditLog } from "@/lib/helpers";
import { genPaymentReference } from "@/lib/utils";
import {
  validateFormInput,
  type FormState,
  type VerifyState,
  type FormInput,
} from "@/lib/shared";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/* ============ PENDAFTARAN ============ */

export async function submitRegistration(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const input: FormInput = {
    fullName: String(formData.get("fullName") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    organization: String(formData.get("organization") || ""),
    address: String(formData.get("address") || ""),
    regCodeInput: String(formData.get("regCodeInput") || "").toUpperCase(),
    paymentMethod: String(formData.get("paymentMethod") || ""),
  };

  const { valid, errors } = validateFormInput(input);
  if (!valid) {
    return { ok: false, message: "Periksa kembali isian Anda.", errors };
  }

  // Event aktif
  const event = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { eventDate: "desc" },
  });
  if (!event) {
    return { ok: false, message: "Saat ini belum ada pendaftaran dibuka." };
  }

  // Kuota
  const taken = await countActiveRegistrations(event.id);
  if (taken >= event.quota) {
    return { ok: false, message: "Kuota pendaftaran sudah penuh." };
  }

  // Kode registrasi unik + belum dipakai
  const code = await prisma.registrationCode.findUnique({
    where: { code: input.regCodeInput },
    include: { usedByRegistration: { select: { id: true, email: true } } },
  });
  if (!code) {
    return {
      ok: false,
      message: "Kode registrasi tidak ditemukan.",
      errors: { regCodeInput: "Kode tidak dikenal" },
    };
  }
  if (code.isUsed || code.usedByRegistration) {
    return {
      ok: false,
      message: "Kode registrasi sudah pernah digunakan.",
      errors: { regCodeInput: "Kode sudah terpakai" },
    };
  }

  // Email ganda untuk event yang sama
  const dup = await prisma.registration.findFirst({
    where: { eventId: event.id, email: input.email.trim().toLowerCase() },
  });
  if (dup) {
    return {
      ok: false,
      message: "Email ini sudah terdaftar untuk acara ini.",
      errors: { email: `Sudah terdaftar. Kode Anda: ${dup.regCode}` },
    };
  }

  // Pembayaran — prototype: INVITED langsung PAID, lainnya pending
  const isInvited = input.paymentMethod === "INVITED";
  const reference = genPaymentReference();

  try {
    const reg = await createRegistration({
      eventId: event.id,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.replace(/[\s-]/g, ""),
      organization: input.organization || null,
      address: input.address || null,
      regCode: code.code,
      paymentMethod: input.paymentMethod,
      status: isInvited ? "VERIFIED" : "PENDING_VERIFICATION",
      paymentStatus: isInvited ? "PAID" : "UNPAID",
      reference,
    });

    // Tandai kode terpakai
    await prisma.registrationCode.update({
      where: { id: code.id },
      data: { isUsed: true },
    });

    await createAuditLog("CREATE_REGISTRATION", "Registration", reg.id, `email=${reg.email}`);

    return {
      ok: true,
      message: "Pendaftaran berhasil!",
      regCode: reg.regCode,
    };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Terjadi kesalahan sistem. Coba lagi." };
  }
}

/* ============ VERIFIKASI STATUS ============ */

export async function checkRegistrationStatus(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const code = String(formData.get("checkCode") || "").trim().toUpperCase();
  if (!code) {
    return { ok: false, message: "Masukkan kode registrasi Anda." };
  }

  const reg = await prisma.registration.findUnique({
    where: { regCode: code },
    include: { event: true },
  });
  if (!reg) {
    return { ok: false, message: "Kode tidak ditemukan. Periksa kembali." };
  }

  return {
    ok: true,
    message: "Data ditemukan.",
    data: {
      regCode: reg.regCode,
      fullName: reg.fullName,
      eventName: reg.event.title,
      eventDate: reg.event.eventDate.toISOString(),
      eventVenue: reg.event.venue,
      registrationStatus: reg.registrationStatus,
      paymentStatus: reg.paymentStatus,
      paymentMethod: reg.paymentMethod,
      price: reg.event.price,
      verifiedAt: reg.verifiedAt?.toISOString() || null,
      paidAt: reg.paidAt?.toISOString() || null,
      createdAt: reg.createdAt.toISOString(),
    },
  };
}

/* ============ ADMIN LOGIN ============ */

export async function adminLogin(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  const admin = await prisma.adminUser.findUnique({ where: { username } });
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return { error: "Username atau password salah." };
  }

  await createAuditLog("ADMIN_LOGIN", "AdminUser", admin.id, `username=${username}`);

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminSession(username), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 3600,
    path: "/",
  });

  redirect("/admin/pendaftaran");
}

export async function adminLogout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}