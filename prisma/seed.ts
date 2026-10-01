import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "node:crypto";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://pendaftaran:pendaftaran_demo_2026@localhost:5440/pendaftaran";
const pool = new pg.Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const event = await prisma.event.upsert({
    where: { slug: "workshop-ai-sertifikasi-2026" },
    update: {},
    create: {
      title: "Workshop & Sertifikasi AI untuk Profesional",
      slug: "workshop-ai-sertifikasi-2026",
      description:
        "Workshop intensif penerapan AI di dunia kerja profesional, diakhiri uji kompetensi dan sertifikat resmi. Prototype pendaftaran peserta — demo build.",
      venue: "Aula Harmony Rise, Ampera Raya, Jakarta Selatan",
      eventDate: new Date("2026-11-15T09:00:00+07:00"),
      quota: 100,
      price: 750000,
      isActive: true,
    },
  });

  const existingCodes = await prisma.registrationCode.count();
  if (existingCodes === 0) {
    const codes = Array.from({ length: 15 }, (_, i) => ({
      code: `REG-2026-${String(i + 1).padStart(4, "0")}`,
      isUsed: false,
    }));
    await prisma.registrationCode.createMany({ data: codes });
    console.log(`Seeded ${codes.length} kode registrasi`);
  }

  await prisma.adminUser.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      name: "Admin Demo",
    },
  });

  console.log(`Seeded event: ${event.title}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() =>
    prisma.$disconnect().then(() => pool.end())
  );