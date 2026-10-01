// E2E DB-logic test untuk alur pendaftaran (logika sama dengan server action)
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 1. cek kode belum terpakai
  const code = await prisma.registrationCode.findUnique({
    where: { code: "REG-2026-0002" },
  });
  if (!code) throw new Error("kode REG-2026-0002 tidak ada");

  // 2. event aktif
  const event = await prisma.event.findFirst({ where: { isActive: true } });
  if (!event) throw new Error("tidak ada event aktif");

  // 3. create registration (logika sama dengan action)
  const reg = await prisma.registration.create({
    data: {
      eventId: event.id,
      fullName: "Budi Santoso (E2E)",
      email: "budi.e2e@example.com",
      phone: "081234567890",
      regCode: code.code,
      paymentMethod: "TRANSFER",
      paymentReference: "INV-E2E-TEST",
      registrationStatus: "PENDING_VERIFICATION",
      paymentStatus: "UNPAID",
    },
  });
  console.log("reg dibuat:", reg.regCode, reg.registrationStatus);

  await prisma.registrationCode.update({
    where: { id: code.id },
    data: { isUsed: true },
  });
  console.log("kode ditandai terpakai");

  // 4. email duplikat harus terdeteksi
  const dup = await prisma.registration.findFirst({
    where: { eventId: event.id, email: "budi.e2e@example.com" },
  });
  console.log("dup terdeteksi:", !!dup);

  // 5. idempotent approve (updateMany dengan filter status)
  const appr = await prisma.registration.updateMany({
    where: {
      id: reg.id,
      registrationStatus: "PENDING_VERIFICATION",
      paymentStatus: "UNPAID",
    },
    data: {
      registrationStatus: "APPROVED",
      paymentStatus: "PAID",
      verifiedAt: new Date(),
      paidAt: new Date(),
    },
  });
  console.log("approve idempotent count:", appr.count);
  const appr2 = await prisma.registration.updateMany({
    where: { id: reg.id, registrationStatus: "PENDING_VERIFICATION" },
    data: { registrationStatus: "APPROVED" },
  });
  console.log("approve ulang (harus 0):", appr2.count);

  console.log("E2E-DB: ALL PASS");
}

main()
  .catch((e) => {
    console.error("E2E-DB FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => pool.end()));