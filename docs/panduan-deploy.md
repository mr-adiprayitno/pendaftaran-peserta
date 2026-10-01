# Panduan Deploy — Pendaftaran Peserta (demo-web.harmonyrise.id)

Topologi aktif:

```
Browser ── HTTPS ──► Cloudflare (orange, Full)
                       │ A record: demo-web → 141.11.190.165
                       ▼
             Host nginx (port 443, LE wildcard *.harmonyrise.id)
                       │ proxy_pass http://127.0.0.1:3500
                       ▼
             Next.js 16 standalone (next start, port 3500, loopback saja)
                       ▼
             PostgreSQL 16 (Docker pendaftaran-pg, 127.0.0.1:5440)
```

## Komponen & Lokasi

| Komponen | Lokasi |
|---|---|
| Source app | `~/harmonyrise/pendaftaran` |
| Repo | https://github.com/mr-adiprayitno/pendaftaran-peserta |
| Nginx config | `/etc/nginx/sites-available/demo-web.harmonyrise.id` (+ symlink sites-enabled) |
| TLS | `/etc/letsencrypt/live/harmonyrise.id/` (wildcard, berlaku sd 25 Des 2026) |
| Cloudflare DNS | zone harmonyrise.id — record `demo-web` A, proxied |
| Database | Docker `pendaftaran-pg`, port 5440 (localhost saja) |

## Restart / Update App

```bash
cd ~/harmonyrise/pendaftaran
DATABASE_URL=postgresql://pendaftaran:pendaftaran_demo_2026@localhost:5440/pendaftaran npx next build
# start (foreground test):
DATABASE_URL=... npx next start -p 3500
```

Sesi saat ini app jalan via proses background Hermes. Untuk permanen, pasang systemd:

```ini
# /etc/systemd/system/pendaftaran-demo.service
[Unit]
Description=Pendaftaran Peserta (prototype demo)
After=network.target docker.service

[Service]
Directory=/root/harmonyrise/pendaftaran
Environment=DATABASE_URL=postgresql://pendaftaran:pendaftaran_demo_2026@localhost:5440/pendaftaran
Environment=ADMIN_SESSION_SECRET=<ganti-dengan-random>
Environment=NODE_ENV=production
ExecStart=/usr/bin/npx next start -p 3500
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now pendaftaran-demo
systemctl status pendaftaran-demo
```

## Cloudflare (ubah/ulang nanti)

Token: `/etc/letsencrypt/cloudflare-harmonyrise.ini` (Zone harmonyrise.id).

```bash
CF_TOKEN=$(grep -oP '(?<=token = ).*' /etc/letsencrypt/cloudflare-harmonyrise.ini)
ZONE=c30d992cd10d4ea51d31450a1bb658c4
# lihat record
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records?name=demo-web.harmonyrise.id" -H "Authorization: Bearer $CF_TOKEN"
```

## Verfikasi Sehat (jalankan setelah deploy ulang)

```bash
for p in / /daftar /cek-status /admin /robots.txt; do
  printf "%-14s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://demo-web.harmonyrise.id$p)"
done
# dashboard harus 307 → /admin tanpa cookie:
curl -s -o /dev/null -w '%{http_code} redirect=%{redirect_url}\n' https://demo-web.harmonyrise.id/admin/pendaftaran
```

## Reset Data Demo

```bash
# penuh (hapus semua pendaftar + kode dgn isUsed):
docker exec pendaftaran-pg psql -U pendaftaran -d pendaftaran -c 'TRUNCATE "Registration", "AuditLog"; UPDATE "RegistrationCode" SET "isUsed"=false, "usedAt"=NULL, "usedByRegistrationId"=NULL;'
```