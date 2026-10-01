# Pendaftaran Peserta — Prototype

Aplikasi web pendaftaran peserta: dari input data diri, kode registrasi, hingga pembayaran. Build demo (prototype) — pembayaran belum terhubung gateway sungguhan.

## Stack

- Next.js 16 (App Router, Server Actions)
- Prisma 7 + PostgreSQL 16 (Docker)
- Tailwind CSS 4
- Tanpa NextAuth — session HMAC sederhana utk demo

## Jalankan Lokal

1. Database:
   ```bash
   docker network create pendaftaran-net 2>/dev/null
   docker run -d --name pendaftaran-pg --network pendaftaran-net \
     -e POSTGRES_USER=pendaftaran -e POSTGRES_PASSWORD=pendaftaran_demo_2026 \
     -e POSTGRES_DB=pendaftaran -p 127.0.0.1:5440:5432 postgres:16-alpine
   ```

2. Env (`.env`):
   ```
   DATABASE_URL=postgresql://pendaftaran:pendaftaran_demo_2026@localhost:5440/pendaftaran
   ```

3. Migrasi + seed:
   ```bash
   DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) npx prisma migrate dev
   DATABASE_URL=$(grep DATABASE_URL .env | cut -d= -f2-) npx tsx prisma/seed.ts
   ```

4. Build & run:
   ```bash
   npm run build && npm start
   # atau: npm run dev
   ```

## Login Admin (demo)

- URL: `/admin`
- Username: `admin`
- Password: `admin123`

## Data Demo

- Event: Workshop & Sertifikasi AI untuk Profesional (15 Nov 2026, kuota 100)
- Kode registrasi: `REG-2026-0001` s/d `REG-2026-0015`

## Struktur

```
prisma/            schema + migrasi + seed
src/actions.ts     server actions (daftar, cek status, login)
src/app/(public)/  halaman publik (landing, /daftar, /cek-status)
src/app/admin/     login + dashboard admin
src/lib/           db client, helpers, validasi shared
```

## Roadmap (post-prototype)

- Gateway pembayaran (Midtrans/Xendit) + webhook idempotent
- Email/kirim kode via WhatsApp
- Export CSVExcel pendaftar
- QrCode check-in
- Multi-event management UI

## Status Keamanan (prototype)

- Session admin: cookie HMAC, httpOnly — **ganti `ADMIN_SESSION_SECRET` env untuk produksi.**
- Password di-hash scrypt w/ random salt.
- Semua DB credential di-env, tak di-commit (`.env` di gitignore).
- **Belum ada rate-limit & CSRF klaim khusus — prototype saja.**