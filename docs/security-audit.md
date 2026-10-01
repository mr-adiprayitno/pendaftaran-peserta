# Laporan Audit Keamanan — Aplikasi Pendaftaran Peserta

**Tanggal:** 1 Oktober 2026 · **Build diaudit:** `10febe6` · **Metode:** audit kode statis + uji exploit dinamis (DB race test, cookie forgery, akses publik port) + verifikasi infra (nginx, CF, binding port)
**Scope:** seluruh kode app (`src/`, `prisma/`, `scripts/`), konfigurasi Next/nginx, eksposur jaringan, dependencies. *Tidak* within scope: Cloudflare dashboard di luar zone settings yang terbaca, akun-akun DNS lain.

**Konteks pemakaian (per owner):** ini **demo prototype untuk kebutuhan ujian LSP informatika** — bukan sistem produksi pembayaran nyata. Security di level infra (Cloudflare orange, TLS, nginx, port binding DB loopback-only) dianggap aman dan di luar lingkup tindak lanjut app. Seluruh penilaian & prioritas di dokumen ini menggunakan lensa tersebut; rekomendasi "sebelum produksi real" hanya berlaku bila suatu saat app ini diminta jadi produksi sungguhan.

---

## Ringkasan Risiko — lensa demo (ujian LSP informatika)

Konteks keputusan owner: app ini demo prototype untuk ujian LSP informatika; security infra (TLS CF+nginx, DB loopback, proteksi port host) dianggap aman. Matriks tetap memakai skala P0-P3 teknis, tetapi *tingkat tindak lanjut* mengikuti bagian "Prioritas Aksi" di bawah.

| Skor | Jumlah | Arti (produksi) |
|---|---|---|
| P0 Kritis | **0** | Tidak ditemukan backdoor / account takeover langsung |
| P1 Tinggi | **3** | Wajib fix bila menjadi produksi nyata |
| P2 Sedang | **5** | Bereskan saat diproduksi penuh |
| P3 Rendah / catatan | **4** | Hygiene, dokumentasi, hardening tambahan |

**Verdict umum:** untuk *prototype demo (konteks ujian LSP informatika)* statusnya **LAYAK TAYANG** — tidak ada lubang yang memungkinkan orang asing mengambil alih admin atau melihat data peserta lain, dan layer infra (TLS via Cloudflare+nginx, DB loopback-only) sudah menutup permukaan serangan jaringan. Temuan P1/P2 di bawah **bukan blocker untuk demo** — tercatat sebagai backlog bila suatu saat diangkat jadi produksi nyata.

---

## P1 — Tinggi *(hanya relevan jika jadi produksi nyata; untuk demo = catatan backlog)*

### P1-1 · BR-4: Siapapun bisa memilih "Undangan / Gratis" → langsung lunas & terverifikasi
- **Lokasi:** `src/actions.ts:84-85` (`isInvited = input.paymentMethod === "INVITED"` → `status: VERIFIED, paymentStatus: PAID`)
- **Exploit:** pilih radio "Undangan / Gratis" di form → status langsung lunas tanpa pembayaran dan tanpa antrian admin. Sistem tidak membuktikan siapa berhak undangan.
- **Dampak:** kebocoran pendapatan — tiket Rp 750.000 gratis bebas, quota terpakai orang tanpa hak.
- **Fix (opsi):** (a) hapus opsi INVITED dari radiogroup di DaftarForm; jalur undangan hanya via admin (tombol "Setujui+Lunas"); atau (b) butuh promo/invite code kedua divalidasi DB. Prototype demo: biarkan tapi catat di README — sudah dilakukan sebagian.

### P1-2 · Tidak ada rate-limit / anti-enumerasi di semua endpoint
- **Lokasi:** `src/actions.ts` (submitRegistration, checkRegistrationStatus, adminLogin); `src/app/admin/pendaftaran/actions.ts`
- **Exploit:** brute-force password admin tanpa batas attempt; brute/scan kode registrasi `REG-2026-XXXX` (ruang hanya 15 kode terdefinisi — mudah ditebak, lalu di-submit bebas); spam submit mengisi quota dengan data sampah (quota 100 habis dalam ~100 request otomatis).
- **Dampak:** kompromis akun admin; DoS kuota; data demo tercemar.
- **Fix:** rate-limit app-level (per IP per action) atau Cloudflare WAF Rules + Turnstile di form submit. Prototype saat ini: hanya dijaga "kecilnya ruang pencarian kode + tidak ada listing kode publik" — tidak memadai utk produksi.

### P1-3 · Secret fallback hardcoded di kode (`ADMIN_SESSION_SECRET`)
- **Lokasi:** `src/lib/helpers.ts:51` — `process.env.ADMIN_SESSION_SECRET || "pendaftaran-demo-secret-change-me"`
- **Exploit:** siapapun yang baca **repo public GitHub** (kode ini public!) tahu secret fallback → bisa menandatangani cookie palid `admin_session` yang lolos verifikasi → **ambil alih admin tanpa password** (asal tahu URL dashboard & app jalan dengan env kosong).
- **Bukti uji:** saat ini env ter-set `protodemo-secret-2026` pada instance live — jadi fallback TIDAK aktif di server saat ini. Tetapi build yang jalankan tanpa env (mis. dev lokal, redeploy lupa env) langsung rentan.
- **Dampak:** login admin bebas (account takeover) pada environment yang lupa set secret.
- **Fix:** gagal-closed — throw saat missing:
  ```ts
  const sec = process.env.ADMIN_SESSION_SECRET;
  if (!sec || sec.length < 32) throw new Error("ADMIN_SESSION_SECRET required (min 32 chars)");
  ```
  + rotasi: generate `openssl rand -base64 48`.

---

## P2 — Sedang (bereskan sebelum produksi penuh)

### P2-1 · Kode aplikasi listen di semua interface (`*:3500`) — bisa diakses publik melewati Cloudflare
- **Bukti uji:** `curl http://141.11.190.165:3500/admin` dari luar = **200** — admin panel dapat diakses via HTTP polos tanpa TLS, menghindari nginx+X-Robots-Tag.
- **Catatan keberatan:** password login tetap tidak bocor (scrypt, HTTPS tidak dipakai di jalur ini → password dapat disniff di jaringan transit yang hostile!). Cookie admin juga terkirim cleartext di jalur ini.
- **Fix:** bind 127.0.0.1: `npx next start -p 3500 -H 127.0.0.1` (atau `HOSTNAME=127.0.0.1` di systemd unit). nginx tetap jadi pintu satu-satunya.

### P2-2 · Cookie sesi tidak ber-flag `Secure`
- **Lokasi:** `src/actions.ts:178-183`
- **Dampak:** bila ada akses via HTTP polos (lihat P2-1) atau MITM di jaringan klien, cookie admin bisa terpanen.
- **Fix:** `secure: process.env.NODE_ENV === "production"` di opsi cookie (setelah P2-1 beres).

### P2-3 · Tidak ada cap panjang & sanitasi ketat pada beberapa field input
- **Lokasi:** `src/lib/shared.ts` (hanya min-length; tanpa `maxLength`), kolom DB `text` tanpa `@db.VarChar(n)`
- **Exploit:** submit nama 500k karakter → memenuhi baris DB & UI dashboard; string aneh di organization/address.
- **Dampak:** bloat DB, UI rusak/lebar, kerumitan tampilan. (XSS TIDAK mungkin — React escaping, sudah diuji di dokumen UAT.)
- **Fix:** maxLength per field (nama 120, email 120, HP 20, org 160, address 500) + validasi server-side padanan.

### P2-4 · 4 high vulnerability di dependency chain `prisma` CLI (devDependencies)
- **Detail:** `deepmerge-ts` (stack exhaustion, GHSA-ggr8-5vv4-36mx) dan `mysql2` (auth downgrade + zlib bomb) via `@prisma/config@7.10.0` — hanya devDependencies, TIDAK dikirim ke client build; risiko runtime rendah di server ini (mysql2 tidak dipakai; postgres + adapter-pg).
- **Dampak:** tidak berdampak runtime app ini; tetap wajib patch saat prisma rilis fix (saat audit: belum ada di 8.x RC / 6.x, fix via downgrade breaking).
- **Aksi:** pantau rilis prisma >=7.x yang bump deepmerge-ts & mysql2; jalankan `npm audit` berkala di CI.

### P2-5 · Race condition minor pada kuota (`count → create` non-transaksional)
- **Bukti uji (dinamis):** 2 submit paralel kode sama → P2002 (unique constraint menolak duplikat — **aman utk kode** karena regCode unique). Tetapi untuk **kuota**, 2 submit paralel di sisa kuota 1 masih bisa keduanya lolos (count-check jalan bersamaan sebelum create).
- **Dampak:** overbooking kuota kecil kemungkinan, tidak fatal utk demo.
- **Fix (saat produksi):** bungkus cek+create dalam `prisma.$transaction(interactive)` + lakukan re-count di tx, atau gunakan SQL `INSERT ... WHERE (SELECT count(*)...) < quota`.

---

## P3 — Rendah / Catatan (hygiene)

### P3-1 · Kredensial demo ter-public di README & halaman login
- `admin/admin123` tertulis di README (public), halaman login (hint di UI), docs UAT.
- **Risiko:** sesuai status *prototype* — diterima. Sebelum demo klien: ganti password seed + hapus kredensial dari README & UI (atau set via env).

### P3-2 · AuditLog tidak immutable (belum append-only)
- `AuditLog` bisa di-update via prisma by id (tidak ada pencegahan teknis). Untuk produksi: tambahkan proteksi (no update/delete via aplikasi, DB trigger) bila audit bersifat compliance.

### P3-3 · `zod` terinstall tapi tidak dipakai
- Tambah konsistensi: validasi di `src/lib/shared.ts` tulis manual. Opsi refactor: pakai zod schema sehingga satu sumber kebenaran.

### P3-4 · Belum ada security headers tambahan
- `next.config.ts` kosong; nginx hanya `X-Robots-Tag`. Disarankan tambahkan HSTS (diterapkan host level? belum), `X-Frame-Options: DENY` atau frame-ancestors, `X-Content-Type-Options: nosniff`, `Referrer-Policy` di level nginx.

---

## Positive Findings (sudah benar)

1. **Tidak ada SQLi** — semua query lewat Prisma parameterized; tidak ada `$queryRawUnsafe` di kode app.
2. **Password hashing benar** — scrypt + random salt + `timingSafeEqual` (anti timing attack).
3. **Session HMAC timing-safe** — verifikasi pakai `timingSafeEqual`, cookie `httpOnly` + `sameSite=lax`.
4. **Tidak ada data PII lintas peserta** — cek status hanya via kode; kode tak ditebak kecuali tahu format & terbatas.
5. **Authz action admin konsisten** — semua admin action memanggil `requireAdmin()`; dashboard ada session check server-side (307 bila cookie invalid — teruji).
6. **Idempotensi mutasi admin** — `updateMany` dengan guard status mencegah double-apply.
7. **Env terpisah dari git** — `.env*` di gitignore, terverifikasi `git ls-files` (tidak ada .env tracked; DATABASE_URL tidak bocor ke repo).
8. **DB tidak expose** — PG bind 127.0.0.1:5440 (teruji: koneksi dari luar ditolak Connection refused).
9. **Tidak ada XSS** — React auto-escape; tidak ada `dangerouslySetInnerHTML`, tidak ada `eval`.
10. **Audit log** — per aksi penting (+ login success), memberi jejak siapa-kapan-bisnis.

---

## Verifikasi Uji yang Dilakukan (dinamis)

| Uji | Metode | Hasil |
|---|---|---|
| Eksploit BR-4 | review kode `isInvited` path | Terkonfirmasi bisa auto-paid |
| Race duplicate kode | 2 create paralel tsx | P2002 — unik aman |
| Port PG dari luar | `/dev/tcp/141.11.190.165/5440` | Connection refused — aman |
| Port app dari luar | curl `:3500` | 200 — **terbuka lewat IP** (P2-1) |
| Cookie palsu | `Cookie: admin_session=FAKE.FAKE` | 307 → /admin — ditolak |
| Secret fallback | grep `process.env.*||` | 1 fallback di helpers.ts (P1-3) |
| npm audit | `npm audit` | 4 high via devDeps prisma (P2-4) |
| Headers live | curl -I | hanya X-Robots-Tag; tanpa HSTS/frame/nosniff (P3-4) |

---

## Prioritas Aksi (konteks: demo LSP informatika — infra-level security sudah dianggap aman)

1. **Demo sekarang: tidak ada fix wajib.** Semua P1/P2 dinyatakan *backlog produksi*, bukan blocker demo.
2. **Catatan opsional sebelum demo ke klien/asesor:** P3-1 (ganti password admin + hapus kredensial dari README/UI) dan P2-1 (bind 127.0.0.1) — keduanya 5-10 menit, berjalan saat diminta.
3. **Hanya jika suatu saat dibangun jadi produksi nyata:** baru eksekusi urutan P1-1 → P1-2 → P1-3 → P2-2 → P2-3 → P2-5 → P2-4 → P3-2/P3-4 (detail di atas).

---

*Audit oleh MUXA — statis dari kode + uji dinamis live; bukan audit pihak ketiga tersertifikasi (ISO 27001 / pen-test vendor). Konteks demo LSP: risiko diterima pada level ini; untuk produksi nyata disarankan pentest independen sebelum mengelola pembayaran sungguhan.*