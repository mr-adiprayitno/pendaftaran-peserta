# Use Case Diagram — Aplikasi Pendaftaran Peserta

## Ringkasan

Diagram use case menggambarkan interaksi 3 aktor terhadap 7 use case pada sistem pendaftaran peserta (prototype).

```
                 ┌─────────────────────────────────────────────────────┐
                 │        Sistem Pendaftaran Peserta (prototype)       │
                 │                                                     │
                 │   ┌──────────────────────┐                          │
        ┌────────┼──►│ UC01 Melihat Info    │                          │
        │        │   │ Event (Landing)      │                          │
        │        │   └──────────────────────┘                          │
        │        │   ┌──────────────────────┐                          │
        │        ├──►│ UC02 Mendaftar       │◄──────«include»──┐       │
        │        │   │ (form + kode reg)    │                  │       │
        │        │   └──────────┬───────────┘                  │       │
        │        │              │ «extends»                    │       │
        │        │        ┌─────▼──────────────┐               │       │
        ├────────┼───────►│ UC03 Melihat Panduan│     ┌─────────┴─────┐ │
        │        │        │ Pembayaran          │     │ UC04 Validasi │ │
        │        │        └────────────────────┘     │ Kode+Kuota+   │ │
        │        │   ┌──────────────────────┐        │ Duplikat      │ │
        ├────────┼──►│ UC05 Cek Status      │        └───────────────┘ │
  PESERTA │        │   │ Pendaftaran          │                          │
CALON     │        │   └──────────────────────┘                          │
        │        │   ┌──────────────────────┐                          │
        ├────────┼──►│ UC06 Login Admin     │◄─────────┐               │
        │        │   └──────────────────────┘          │               │
        │        │   ┌──────────────────────┐          │               │
        └────────┼──►│ UC07 Kelola Pendaftar│◄─────────┘               │
                 │   │ + Verifikasi /       │                          │
                 │   │   Approve / Tolak /  │──►«include» UC08         │
                 │   │   Konfirmasi Bayar   │   Catat Audit Log        │
                 │   └──────────────────────┘                          │
                 └─────────────────────────────────────────────────────┘

   Aktor:
   ○── Peserta (Calon Peserta)   — publik, tanpa login
   ○── Admin Panitia             — login admin
   ○── Time                      — trigger otomatis (sesi 24 jam, ekspirasi)
```

## Aktor

| Aktor | Deskripsi | Saluran |
|---|---|---|
| Peserta (Calon Peserta) | Orang yang ingin mendaftar acara; tidak perlu akun | Publik via web |
| Admin Panitia | Staf yang memverifikasi pendaftaran & pembayaran | `/admin` (login) |
| Time (sistem) | Pemicu otomatis: ekspirasi sesi admin (24 jam) | Internal |

## Daftar Use Case

| ID | Nama | Aktor | Ringkas |
|----|------|-------|---------|
| UC01 | Melihat Info Event (Landing) | Peserta | Buka halaman utama; lihat judul, tanggal, lokasi, biaya, sisa kuota live |
| UC02 | Mendaftar | Peserta | Isi formulir + kode registrasi, kirim; dapat kode peserta (saat ini = kode registrasi, cth REG-2026-0002) |
| UC03 | Melihat Panduan Pembayaran | Peserta | Extension UC02 — opsional, sesuai metode yang dipilih |
| UC04 | Validasi Pendaftaran | (include UC02) | Sistem memeriksa: format kode, kode terpakai/belum, sisa kuota, email ganda |
| UC05 | Cek Status Pendaftaran | Peserta | Masukkan kode peserta; lihat status verifikasi & pembayaran |
| UC06 | Login Admin | Admin | Masuk dengan username/password; sesi HMAC 24 jam |
| UC07 | Kelola Pendaftaran | Admin | Dashboard: cari, filter, pagination, verifikasi, approve+tandai lunas, tolak, konfirmasi bayar manual |
| UC08 | Catat Audit Log | (include UC07, UC06) | Sistem mencatat aksi admin: verifikasi / approve / tolak / konfirmasi bayar / login |

## Relasi Antar Use Case

- UC02 «include» UC04 — setiap submit pendaftaran **selalu** lolos validasi sistem.
- UC07, UC06 «include» UC08 — setiap aksi admin **selalu** tercatat di AuditLog.
- UC03 «extend» UC02 — muncul opsional bila metode pembayaran = Transfer / QRIS / Tunai.

## Precondition & Postcondition (ringkas per UC)

- UC02: kode registrasi valid belum terpakai & kuota tersisa. Setelah: data tersimpan `PENDING_VERIFICATION`/`UNPAID` (atau langsung `VERIFIED`/`PAID` bila metode = Undangan).
- UC06: username + password cocok. Setelah: cookie `admin_session` (HMAC, httpOnly) terpasang, redirect ke `/admin/pendaftaran`.
- UC07: admin sudah login (server-side session check; tidak punya → 307 ke `/admin`). Semua mutasi **idempotent** — klik ganda tidak menimpa status salah.

## Alur Utama UC02 (Mendaftar)

1. Peserta buka `/daftar`, isi nama, email, HP, instansi, alamat.
2. Masukkan kode registrasi `REG-2026-XXXX` dari panitia.
3. Pilih metode: Transfer / QRIS / Tunai / Undangan.
4. Sistem validasi → simpan → tandai kode terpakai → tampilkan kode peserta (implementasi saat ini: kode = kode registrasi yang dipakai, cth `REG-2026-0002`).
5. (Alternatif A1) Kode tidak ada / sudah terpakai → pesan error.
6. (Alternatif A2) Kuota penuh → tolak dengan pesan.
7. (Alternatif A3) Email sudah terdaftar → tolak + saran cek status.