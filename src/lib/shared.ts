export type FormState = {
  ok: boolean;
  message: string;
  regCode?: string;
  errors?: Record<string, string>;
};

export type VerifyState = {
  ok: boolean;
  message: string;
  data?: {
    regCode: string;
    fullName: string;
    eventName: string;
    eventDate: string;
    eventVenue: string;
    registrationStatus: string;
    paymentStatus: string;
    paymentMethod: string | null;
    price: number;
    verifiedAt: string | null;
    paidAt: string | null;
    createdAt: string;
  };
};

export type LoginState = {
  error?: string;
};

/* ============ validasi (client-safe, tanpa prisma) ============ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+62|62|0)8[0-9]{7,12}$/;

export type FormInput = {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  address: string;
  regCodeInput: string;
  paymentMethod: string;
};

export function validateFormInput(input: Partial<FormInput>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input.fullName || input.fullName.trim().length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter";
  }
  if (!input.email || !EMAIL_RE.test(input.email.trim())) {
    errors.email = "Format email tidak valid";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Format nomor HP Indonesia tidak valid (contoh: 0812xxxxxxx)";
  }
  const code = (input.regCodeInput || "").trim().toUpperCase();
  if (!code) {
    errors.regCodeInput = "Kode registrasi wajib diisi";
  } else if (!/^REG-2026-[0-9]{4}$/.test(code)) {
    errors.regCodeInput = "Format kode: REG-2026-XXXX";
  }
  const pm = input.paymentMethod || "";
  if (!["TRANSFER", "QRIS", "CASH", "INVITED"].includes(pm)) {
    errors.paymentMethod = "Pilih metode pembayaran";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}