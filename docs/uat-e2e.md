# Dokumen UAT End-to-End — Aplikasi Pendaftaran Peserta

**Versi:** 1.0 · **Build:** `0b8d470` · **URL Uji:** https://demo-web.harmonyrise.id
**Lingkungan:** Production-like (Cloudflare + nginx + Next 16 standalone + PostgreSQL 16)
**Peran UAT:** Peserta (tanpa login), Admin Panitia (login), QA/Penguji

---

## 0. Persiapan Sebelum UAT

### 0.1 Reset data demo (opsional, agar mulai dari kondisi bersih)

```bash
docker exec pendaftaran-pg psql -U pendaftaran -d pendaftaran -c \
 'TRUNCATE "Registration", "AuditLog"; UPDATE "RegistrationCode" SET "isUsed"=false, "usedAt"=NULL, "usedByRegistrationId"=NULL;'
```

### 0.2 Data awal yang dijamin tersedia

| Data | Nilai | Keterangan |
|---|---|---|
| Event aktif | Workshop & Sertifikasi AI untuk Profesional | 15 Nov 2026, kuota 100, Rp 750.000 |
| Kode registrasi | REG-2026-0001 … REG-2026-0015 | 15 kode, semua fresh setelah reset |
| Admin demo | username `admin` / password `admin123` | |
| Data uji legacy | REG-2026-0002 "Budi Santoso (E2E)" — status APPROVED/PAID | Ada jika belum direset |

### 0.3 Alat uji
- Browser (desktop & mobile) — Chrome/Edge/Safari
- curl (untuk verifikasi teknis) — opsional
- Akses ke halaman: `/`, `/daftar`, `/cek-status`, `/admin`

---

## 1. Skenario UC01 — Melihat Info Event (Landing)

**Pre-condition:** minimal 1 event aktif; pendaftar kosong/parsial.

**UAT-01 · Landing menampilkan seluruh info event**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `https://demo-web.harmonyrise.id/` | Halaman terbuka ≤ 3 dtk (200) |
| 2 | Perhatikan kartu utama | Judul event = "Workshop & Sertifikasi AI untuk Profesional", tag "Prototype Demo" |
| 3 | Perhatikan 3 kotak info | Tanggal (Senin, 15 November 2026) + jam, lokasi "Aula Harmony Rise, Ampera Raya, Jakarta Selatan", biaya "Rp 750.000" |
| 4 | Perhatikan progress bar | Label "Kuota Terisi" + angka `X / 100 — sisa Y` sesuai data riil |
| 5 | Perhatikan daftar "Cara Mendaftar" | 4 langkah + catatan mode prototype |

**Kriteria Lulus:** semua elemen muncul, angka kuota sinkron dengan DB.
**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-02 · Progress kuota update otomatis**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Catat angka kuota terisi saat ini | mis. 2 / 100 |
| 2 | (Tab lain) lakukan 1 pendaftaran berhasil (UAT-04) | Sukses |
| 3 | Reload landing | Angka bertambah 1 otomatis dari data DB |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

---

## 2. Skenario UC02 — Mendaftar (Happy Path per Metode)

**UAT-03 · Validasi client-side sebelum submit**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `/daftar` | Formulir terbuka; field bertanda * wajib |
| 2 | Kosongkan semua, klik "Kirim Pendaftaran" | Browser blok submit (HTML5 required) |
| 3 | Isi nama 2 karakter ("ab"), email salah ("abc"), HP salah ("12345"), kode salah ("XXX") | Submit ditolak; per-field HTML5 validasi muncul |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-04 · Daftar sukses — metode Transfer**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `/daftar` | — |
| 2 | Isi: nama ≥3 kar, email valid unik, HP `08xxxxxxxxxx` valid, instansi & alamat opsional | — |
| 3 | Kode registrasi: `REG-2026-0003`（belum terpakai） | — |
| 4 | Metode: Transfer Bank | — |
| 5 | Submit | Layar hijau "Pendaftaran Berhasil" + **Kode Peserta = REG-2026-0003** dalam kotak monospace |
| 6 | Klik "Cek Status" | Langsung ke `/cek-status` |

**Kriteria Lulus:** kode peserta tampil besar & bisa seleksi; tidak ada error merah.
**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-05 · Daftar sukses — metode Undangan (otomatis terverifikasi)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Ulangi UAT-04 dengan: email berbeda, kode `REG-2026-0004`, metode = Undangan/Gratis | Submit sukses |
| 2 | Cek status dengan kode peserta | Status = **Terverifikasi**, Pembayaran = **Lunas** (langsung, tanpa antrian admin) |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-06 · Kode registrasi tak valid**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Di `/daftar`, isi data valid semua, kode = `REG-2026-9999` (tidak ada) | Submit |
| 2 | — | Band merah: "Kode registrasi tidak ditemukan" + hint field "Kode tidak dikenal" |
| 3 | Kode = `REG-2026-0002` (sudah terpakai) | Band merah: "Kode registrasi sudah pernah digunakan" + "Kode sudah terpakai" |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-07 · Email ganda**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Ulangi pendaftaran dengan email yang sama seperti UAT-04, kode baru (`REG-2026-0005`) | Submit |
| 2 | — | Band merah: "Email ini sudah terdaftar untuk acara ini" + info kode lama: "Sudah terdaftar. Kode Anda: REG-2026-0003" |
| 3 | Verifikasi DB/kode peserta lama | Kode `REG-2026-0005` TIDAK ikut ditandai terpakai (tetap fresh utk uji berikutnya) |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-08 · Klik ganda / double submit**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Isi form data valid baru, kode `REG-2026-0005`, metode QRIS | — |
| 2 | Klik tombol submit 2x beruntun | Hanya 1 registrasi terbentuk; tombol disabled "Mengirim..." saat proses |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

---

## 3. Skenario UC05 — Cek Status

**UAT-09 · Cek status sukses**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `/cek-status` | Halaman terbuka; placeholder input: cth PSRT-A1B2C3D4 |
| 2 | Masukkan kode peserta dari UAT-04 (`REG-2026-0003`) | Klik "Cek Status" |
| 3 | — | Kartu: kode besar, nama peserta, nama acara, badge status **Menunggu Verifikasi** (kuning), badge bayar **Belum Bayar** (kuning), metode Transfer Bank, timestamp |
| 4 | Ulangi dengan kode UAT-05 (`REG-2026-0004`) | Badge **Terverifikasi** (biru) + **Lunas** (hijau) |
| 5 | Ulangi dengan kode legacy `REG-2026-0002` | Badge **Disetujui** (hijau) + banner "Pendaftaran final. Sampai jumpa di acara!" |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-10 · Cek status — kode tidak ada**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Masukkan `REG-2026-8842` (tak ada) klik Cek | Band merah: "Kode tidak ditemukan. Periksa kembali." |
| 2 | Kosongkan field, submit | HTML5 required memblok (atau pesan "Masukkan kode registrasi Anda") |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

---

## 4. Skenario UC06+UC07 — Admin

**UAT-11 · Proteksi route dashboard**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `https://demo-web.harmonyrise.id/admin/pendaftaran` dalam mode incognito (tanpa login) | **307 redirect** ke `/admin` (halaman login) |
| 2 | Atau curl: `curl -o /dev/null -w '%{http_code} %{redirect_url}' URL` | `307` → `.../admin` |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-12 · Login admin — salah password**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `/admin`, isi username `admin`, password `salah123`, Masuk | Band merah: "Username atau password salah." |
| 2 | Isi username tak dikenal `nobody`, password apa saja | Pesan error yang **sama persis** (anti user-enumeration) |
| 3 | Verifikasikan DB | Tidak ada AuditLog baru (login gagal tidak dicatat — sesuai desain) |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-13 · Login admin sukses**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Login `admin`/`admin123` | Redirect ke `/admin/pendaftaran` |
| 2 | Amati dashboard | 4 kartu statistik (Total, Menunggu Verifikasi, Disetujui, Lunas) — angka konsisten dengan data |
| 3 | Amati tabel | Kolom: Kode, Nama, Email, Metode, Status, Bayar, Aksi |
| 4 | (opsional) `docker exec pendaftaran-pg psql -U pendaftaran -d pendaftaran -c 'SELECT * FROM "AuditLog"'` | Ada baris ADMIN_LOGIN |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-14 · Verifikasi + Approve + Lunas (alur utama admin)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Temukan baris peserta UAT-04 (REG-2026-0003, Pending, Belum) | — |
| 2 | Klik "Verifikasi" | Statistik "Menunggu Verifikasi" berkurang 1; badge = **Verified** |
| 3 | Pada baris sama, klik "Konfirmasi Bayar" | Badge bayar jadi **Lunas** |
| 4 | Cek pendaftar lain Pending; klik "Setujui+Lunas" | Lompat 2 level: **Approved + Lunas** sekaligus |
| 5 | Cek AuditLog | Baris VERIFY_REGISTRATION & CONFIRM_PAYMENT & APPROVE_PAYMENT muncul dgn detail `by=admin` |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-15 · Tolak pendaftaran (kode dibebaskan)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buat pendaftaran baru di `/daftar` menggunakan kode `REG-2026-0006`, metode QRIS (email unik) | Sukses; status Pending |
| 2 | Di dashboard admin, klik "Tolak" pada baris tsb | Badge jadi **Rejected** |
| 3 | Coba daftar lagi menggunakan kode `REG-2026-0006` dengan email berbeda | **Sukses** (kode tadi sudah dibebaskan saat reject) — status Pending |
| 4 | Cek status kode `REG-2026-0006` | Menampilkan data pendaftar BARU (notifikasi, bukan yang lama) |

**Kriteria Lulus:** reject → kode bisa dipakai ulang (kebijakan bisnis BR-1 dengan pengecualian ini).
**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-16 · Idempotensi aksi admin**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Pada baris Pending, klik cepat "Setujui+Lunas" 2x | Tidak ada error; data tetap konsisten (tidak dobel approve) |
| 2 | Setelah Approved, cek tabel | Tombol aksi Pending (Verifikasi/Setujui/Tolak) hilang — hanya tinggal Konfirmasi Bayar bila belum lunas |
| 3 | (teknis) `docker exec … psql -c 'SELECT "regCode","registrationStatus","paymentStatus" FROM "Registration"'` | 1 baris per kode, status final konsisten |

**Status:** ☐ Lulus ☐ Gagal — Catatan: ─────

**UAT-17 · Pencarian & filter admin**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Isi search "Budi" klik Filter | Hanya baris cocok (nama/email/kode mengandung "Budi", case-insensitive) |
| 2 | Pilih Status = Disetujui, klik Filter | Hanya baris Approved |
| 3 | Kombinasi search+filter | Hasil = irisan keduanya |
| 4 | Search nonsense "zzzzz" | "Tidak ada data." — tidak crash |
| 5 | Kosongkan search, pilih status "Semua Status" | Kembali menampilkan seluruh pendaftar |

**Status:** ☐ ☐ (status: Lulus / Gagal) — Catatan: ─────

**UAT-18 · Pagination admin**

**Pre-condition:** butuh > 10 pendaftar — buat via UAT-04 berulang dengan kode 0006–0015 (10 kode) & email berbeda. Jika sudah cukup, skip re-seed.

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka dashboard; lihat bagian bawah | "Halaman 1 dari N — Total data" (N > 10 bila punya > 10) |
| 2 | Klik "Berikutnya" | Halaman 2, query dipertahankan |
| 3 | Set filter+page 2, klik "Sebelumnya" | Back ke page 1, filter tetap |

**Status:** ☐ ☐ — Catatan: ─────

**UAT-19 · Logout**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Klik "Keluar" kanan-atas | Redirect ke `/admin` (halaman login) |
| 2 | Buka langsung `/admin/pendaftaran` | 307 → `/admin` (sesi berakhir, cookie dihapus) |
| 3 | Login ulang | Berhasil; tidak ada error |

**Status:** ☐ ☐ — Catatan: ─────

---

## 5. Uji Keamanan (Sanity — Prototype)

**UAT-20 · Cookie session palsu**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | (DevTools) set cookie `admin_session=FAKE.FAKE` di domain demo | — |
| 2 | Buka `/admin/pendaftaran` | **Ditolak** (307 → /admin) — signature HMAC tidak cocok |
| 3 | Hapus cookie, login legal | Dashboard terbuka |

**Status:** ☐ ☐ — Catatan: ─────

**UAT-21 · XSS input → aman (React escaping)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Daftar dengan nama = `<script>alert(1)</script>` (min 3 kar — script text ini 25 kar, lolos) via kode fresh | Submit sukses |
| 2 | Cek status & dashboard admin baris tsb | Nama tampil **apa adanya sebagai teks** — tidak ada alert JS; React auto-escape |
| 3 | Tolak pendaftaran ini di dashboard agar data bersih | — |

**Status:** ☐ ☐ — Catatan: ─────

**UAT-22 · Rate-limit / antispam (dikenali sebagai batasan)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Submit form berulang cepat dari IP sama | Saat ini **belum ada rate-limit** — diharapkan bisa submit sampai kode habis. Catat sebagai *known limitation*, di-handle di fase produksi (Cloudflare WAF / rate-limit app). |

**Status:** ☐ Batasan dikonfirmasi — Catatan: ─────

---

## 6. Uji Non-Functional Quick Check

**UAT-23 · Responsive & mobile**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `/`, `/daftar`, `/admin` di layar 375px (DevTools device mode) | Layout rapih, tidak horizontal-scroll |
| 2 | Submit form di mobile | Keyboard membuka field; tombol submit tetap terlihat |
| 3 | Tabel admin di mobile | Scroll horizontal tabel (bukan halaman rusak) |

**Status:** ☐ ☐ — Catatan: ─────

**UAT-24 · Waktu muat (performance, informal)**

| Langkah | Aksi | Hasil diharapkan |
|---|---|---|
| 1 | Buka `https://demo-web.harmonyrise.id/` — refresh 3x | Berulangnya < 3 dtk (cloud; TTFB via CF + origin SG) |
| 2 | `curl -s -o /dev/null -w '%{time_total}'` landing | < 2 dtk dari dalam server |

**Status:** ☐ ☐ — Catatan: ─────

---

## 7. Matriks Traceability UAT → Fitur

| Use Case | ID UAT | Tingkat risiko | Sudah dibuktikan otomatis (build) |
|---|---|---|---|
| UC01 Info Event | UAT-01, UAT-02 | Rendah | ✓ smoke 200, data DB sinkron |
| UC02 Daftar | UAT-03 … UAT-08 | **Tinggi** | ✓ E2E DB (scripts/e2e-db.ts) |
| UC05 Cek Status | UAT-09, UAT-10 | Sedang | ✓ smoke 200 |
| UC06 Login | UAT-11, UAT-12, UAT-13, UAT-19 | Sedang | ✓ token valid/palsu + password benar/salah |
| UC07 Kelola | UAT-14 … UAT-18 | **Tinggi** | ✓ idempotensi count (approve ulang = 0) |
| Keamanan | UAT-20 … UAT-22 | Sedang | ✓ cookie palsu ditolak; scrypt hash |
| Non-functional | UAT-23, UAT-24 | Rendah | ✓ X-Robots-Tag + robots.txt active |

---

## 8. Bug Tracking Template

```
ID Bug     : BUG-<nomor>
UAT Ref    : <ID, mis. UAT-07>
Tanggal    : <yyyy-mm-dd hh.mm WIB>
Environment: desktop / mobile, browser + versi
Step to Reproduce:
1. ...
Expected   : ...
Actual     : ...
Screenshot : <lampiran>
Priority   : P1 (blokir) / P2 (rusak fitur minor) / P3 (cosmetic)
Owner      : <nama>
```

---

## 9. Keluar dari UAT (Sign-off Criteria)

UAT dinyatakan **LULUS** bila:
1. 100% skenario prioritas Tinggi lulus: UAT-04, UAT-08, UAT-14, UAT-16.
2. ≥ 90% seluruh 24 skenario lulus; item gagal berstatus P3 dengan justifikasi.
3. Tidak ada bug P1 terbuka.
4. Data pembersihan pasca-UAT (reset DB demo) dilakukan.

---

*Dibuat otomatis dari audit kode build 0b8d470 — semua nilai hasil-hasil yang dinyatakan "dihargapkan" diambil dari perilaku implementasi yang sudah diverifikasi oleh pengujian build sebelumnya (smoke test HTTP + uji keamanan session + E2E DB).*