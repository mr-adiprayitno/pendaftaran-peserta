# Spesifikasi Fitur — Aplikasi Pendaftaran Peserta (Prototype)

Dokumen ini mendeskripsikan **fitur yang sudah dibangun** — semuanya terimplementasi & teruji di build saat ini. Versi: 1.0 (match build 6376cc3).

---

## 1. Registrasi Peserta

**Prioritas:** Tinggi — fitur inti.

### Deskripsi
Calon peserta mendaftar acara melalui formulir web publik. Data diri + kode registrasi + metode pembayaran. Berhasil → sistem menerbitkan kode peserta unik.

### Alur detail
1. Peserta isi: nama lengkap (min 3 kar), email (format valid), nomor WhatsApp (format ID 08/+62/62), instansi (ops), alamat (ops).
2. Masukkan kode registrasi `REG-2026-XXXX` diberikan panitia.
3. Pilih metode: Transfer Bank / QRIS / Tunai / Undangan-Gratis.
4. Submit → server action `submitRegistration` berjalan.
5. Sistem memeriksa berurutan: format input → event aktif → sisa kuota → kode terdaftar → kode belum terpakai → email belum terdaftar (per event).
6. Lolos semua → registrasi dibuat (status awal lihat §1.3) → kode registrasi ditandai `isUsed=true` → AuditLog ditulis → kode peserta ditampilkan.

### Aturan bisnis
- BR-1: 1 kode registrasi hanya bisa dipakai **sekali** — relasi `RegistrationCode.usedByRegistrationId` unique.
- BR-2: 1 email hanya boleh 1x per event (anti double-click & double-register).
- BR-3: Kuota total dari kolom `Event.quota` vs agregat registrasi aktif (pending+verified+approved). Penuh = submit ditolak.
- BR-4: Metode `INVITED` = otomatis `VERIFIED`+`PAID` (tidak lewat antrian admin).

### Status awal registrasi
| Metode | Status Registrasi | Status Bayar |
|---|---|---|
| Transfer / QRIS / Tunai | `PENDING_VERIFICATION` | `UNPAID` |
| Undangan | `VERIFIED` | `PAID` |

### Error handling
- Kode salah format → "Format kode: REG-2026-XXXX"
- Kode tidak terdaftar → "Kode registrasi tidak ditemukan"
- Kode sudah dipakai → "Kode registrasi sudah pernah digunakan"
- Email ganda → "Email ini sudah terdaftar... Kode Anda: <kode>"
- Kuota penuh → "Kuota pendaftaran sudah penuh"

---

## 2. Kode Registrasi & Kode Peserta

Dua kode berbeda — jangan tertukar. *Catatan implementasi saat ini:* kode yang ditampilkan peserta setelah submit **adalah kode registrasi yang dipakai** (contoh: `REG-2026-0002`) — belum pernah ada pendaftar memakai format `PSRT-XXXXXXXX`.

| Jenis | Format | Diterbitkan | Dipakai untuk |
|---|---|---|---|
| Kode Registrasi | `REG-2026-XXXX` (seed 0001–0015) | Panitia, pra-acara | Token untuk buka formulir; **sekaligus jadi kode peserta** di implementasi sekarang |
| Kode Peserta | `PSRT-XXXXXXXX` (helper `genRegCode`, fallback `randomUUID 8`) | Sistem, saat submit w/o kode | Rencana: identitas peserta; placeholder di halaman cek status masih `PSRT-A1B2C3D4` |

---

## 3. Cek Status Pendaftaran

**Aktor:** Peserta (tanpa login).

### Alur
1. Peserta buka `/cek-status`, masukkan kode peserta.
2. Server action `checkRegistrationStatus` mencari di `Registration` by `regCode`.
3. Tidak ditemukan → pesan error. Ditemukan → tampil:
   - Kode peserta (mono besar, mudah dicopy)
   - Nama, nama acara
   - Badge status pendaftaran (Pending / Verified / Approved / Rejected dengan warna)
   - Badge pembayaran (Lunas / Belum Bayar)
   - Metode pembayaran terpilih
   - Timestamp pendaftaran

### Panduan status (teks di halaman)
- Pending+Unpaid → "Pendaftaran menunggu verifikasi pembayaran"
- Approved → "Pendaftaran final. Sampai jumpa di acara!"

---

## 4. Admin: Login & Manajemen Pendaftaran

### 4.1 Login (`/admin`)
- Username+password vs hash scrypt (salt random 16-byte, 64-byte digest). Password salah → pesan error generik (*bukan* spesifik username/password — anti enumeration).
- Sesi: cookie `admin_session` — payload JSON `{u, t}` base64url, ditandatangani **HMAC-SHA256** `ADMIN_SESSION_SECRET`, **httpOnly**, `sameSite=lax`, usia **24 jam**. Cookie palsu / signature salah / expired → ditolak.
- Ganti password: belum — beralih ke `AdminUser.passwordHash` via re-seed (prototype).

### 4.2 Dashboard `/admin/pendaftaran`
- **Proteksi route:** server-side cek session; cookie invalid → 307 redirect `/admin` (terverifikasi).
- **Statistik atas:** Total Pendaftar / Menunggu Verifikasi / Disetujui / Lunas.
- **Pencarian:** nama, email, kode (insensitive).
- **Filter status:** semua / pending / verified / approved / rejected.
- **Pagination:** 10 baris/halaman, navigasi Sebelumnya/Berikutnya (mem-preserve filter).

### 4.3 Aksi (semua idempotent via `updateMany` dengan guard status)
| Tombol | Efek transisi | Guard |
|---|---|---|
| Verifikasi | `PENDING_VERIFICATION` → `VERIFIED`, set `verifiedAt` | hanya jika masih pending |
| Setujui+Lunas | → `APPROVED` + `PAID` + set `verifiedAt`,`paidAt` | hanya jika pending+unpaid |
| Tolak | → `REJECTED` + **kode registrasi dibebaskan** (`isUsed=false`) | hanya jika belum rejected |
| Konfirmasi Bayar | set `PAID` + `paidAt` | hanya jika unpaid |

### 4.4 Audit Log
Setiap aksi admin tercatat di tabel `AuditLog`: action, entity, entityId, detail (`by=<username>`). Termasuk login sukses.

---

## 5. Data & Model (Ringkas)

Tabel utama (`/prisma/schema.prisma`):

| Model | Kunci & Relasi | Catatan |
|---|---|---|
| Event | slug unique; quota; price; isActive | Event demo 1x; multi-event sudah didukung skema |
| Registration | regCode unique; FK→Event; email per-event (cek di app); index eventId/email/regCode | paymentMethod string, referensi INV |
| RegistrationCode | code unique; isUsed; relasi→Registration (unique) | Bebaskan saat reject |
| AdminUser | username unique; passwordHash scrypt | seed: admin/admin123 |
| AuditLog | action, entity, entityId; index | Siap untuk trail |

Enum: `RegistrationStatus` (PENDING_VERIFICATION, VERIFIED, APPROVED, REJECTED), `PaymentStatus` (UNPAID, PAID). Transisi status diagram:

```
PENDING_VERIFICATION ──Verifikasi──► VERIFIED ──(Konfirmasi Bayar)──► + PAID
        │                                               
        ├──Setujui+Lunas──► APPROVED (PAID)
        └──Tolak──► REJECTED (kode dibebaskan)
```

---

## 6. API Internal (Server Actions)

Bukan REST — Next.js Server Actions di layer server (type-safe, tanpa endpoint publik):

| Action | Dipakai di | Kembalian |
|---|---|---|
| `submitRegistration(prev, formData)` | `/daftar` | FormState: ok + regCode, atau pesan error + field errors |
| `checkRegistrationStatus(prev, formData)` | `/cek-status` | VerifyState: data lengkap atau pesan error |
| `adminLogin(prev, formData)` | `/admin` | set cookie + redirect, atau `{error}` |
| `adminLogout()` | dashboard | hapus cookie + redirect |
| `verifyRegistration(dataForm)` | admin row | revalidatePath |
| `approvePayment(dataForm)` | admin row | revalidatePath |
| `rejectRegistration(dataForm)` | admin row | revalidatePath |
| `confirmCashPayment(dataForm)` | admin row | revalidatePath |

---

## 7. Non-Functional (Prototype)

| Aspek | Implementasi |
|---|---|
| Auth | Session cookie HMAC httpOnly 24 jam; no framework auth (sengaja, prototype) |
| Password hash | scrypt (N=16384 default), salt random 16B, per-admin |
| Idempotensi | Semua aksi admin memakai `updateMany` dengan filter status — klik ganda aman |
| Audit | Tabel `AuditLog` per aksi penting |
| SEO | robots.txt Disallow + header X-Robots-Tag noindex (hanya di nginx demo) |
| Port & TLS | App HTTP :3500 (localhost); TLS di host nginx + Cloudflare (Full) |
| DB | PostgreSQL 16 (Docker `pendaftaran-pg`, port 5440), Prisma 7.10 driver adapter-pg |

---

## 8. Batasan Prototype (Diketahui)

- Pembayaran manual — tanpa gateway; "Setujui+Lunas" & "Konfirmasi Bayar" dijalankan admin.
- Email/kirim kode via WhatsApp otomatis — belum (kode peserta ditampilkan di layar).
- Rate-limit antispam formulir — belum.
- `ADMIN_SESSION_SECRET` default di kode — **ganti via env produksi**.
- Re-seed `db reset` menghapus semua pendaftar — eksekusi manual.

---

## 9. Checklist Acceptance (Sudah Diuji)

- ✇ Build production hijau (`next build`).
- ✇ Route smoke: `/`, `/daftar`, `/cek-status`, `/admin`, `/admin/pendaftaran` = 200 / 307 redirect benar.
- ✇ E2E DB: create → kode terpakai → duplikat terdeteksi → approve idempotent → pass (`scripts/e2e-db.ts`).
- ✇ Live URL `https://demo-web.harmonyrise.id` semua route 200 & dashboard dilindungi.
- ✇ Auth uji: password benar/salah, token valid/palsu.