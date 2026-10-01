import crypto from "node:crypto";

/** Cek apakah sebuah file adalah server-only: import prisma/pg = server-only */
export function getBaseUrlFromEnv(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

/** Generate kode pembayaran inv unik */
export function genPaymentReference(prefix = "INV"): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${ym}-${rand}`;
}

export function genRegCode(prefix = "PSRT"): string {
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${rand}`;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  return phone.length <= 4 ? "***" : "*".repeat(phone.length - 4) + phone.slice(-4);
}