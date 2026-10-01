import { prisma } from "@/lib/db";
import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

export type { Prisma };

/* ============ helpers client-safe (dipakai di server & client) ============ */

export function formatRupiah(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

export function formatDateID(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeID(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  PENDING_VERIFICATION: "Menunggu Verifikasi",
  VERIFIED: "Terverifikasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "Belum Bayar",
  PAID: "Lunas",
};

/* ============ auth admin: cookie sederhana (prototype) ============ */

export const ADMIN_COOKIE = "admin_session";

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || "pendaftaran-demo-secret-change-me";
}

export function signAdminSession(username: string): string {
  const payload = JSON.stringify({ u: username, t: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyAdminSession(token: string | undefined | null): string | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(b64)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (Date.now() - payload.t > 24 * 3600 * 1000) return null;
    return payload.u;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  if (computed.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

/* ============ audit log helper ============ */

export async function createAuditLog(
  action: string,
  entity: string,
  entityId: string,
  detail?: string
) {
  try {
    await prisma.auditLog.create({ data: { action, entity, entityId, detail } });
  } catch (e) {
    console.error("audit log gagal:", e);
  }
}

/* ============ konstanta ============ */

export const ACTIVE_EVENT_SLUG = "workshop-ai-sertifikasi-2026";
export const PER_PAGE = 10;