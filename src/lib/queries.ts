import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import type { $Enums } from "@/generated/prisma/client";

type RegData = {
  eventId: string;
  fullName: string;
  email: string;
  phone: string;
  organization?: string | null;
  address?: string | null;
  regCode: string;
  paymentMethod: string;
  status: $Enums.RegistrationStatus;
  paymentStatus: $Enums.PaymentStatus;
  reference?: string | null;
};

export async function createRegistration(data: Partial<RegData>) {
  return prisma.registration.create({
    data: {
      eventId: data.eventId!,
      fullName: data.fullName!,
      email: data.email!,
      phone: data.phone!,
      organization: data.organization || null,
      address: data.address || null,
      regCode: data.regCode ?? crypto.randomUUID().slice(0, 8),
      paymentMethod: data.paymentMethod as string,
      paymentReference: data.reference || "",
      registrationStatus: data.status,
      paymentStatus: data.paymentStatus,
      verifiedAt: data.status === "VERIFIED" ? new Date() : null,
      paidAt: data.paymentStatus === "PAID" ? new Date() : null,
    },
  });
}

export async function getActiveEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
  });
}

export async function getRegistrationByCode(code: string) {
  return prisma.registration.findUnique({
    where: { regCode: code },
    include: { event: true },
  });
}

export async function countActiveRegistrations(eventId: string) {
  return prisma.registration.count({
    where: {
      eventId,
      registrationStatus: { in: ["VERIFIED", "APPROVED", "PENDING_VERIFICATION"] },
    },
  });
}