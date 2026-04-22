# LinkHub - Cloudflare Worker

API lengkap untuk LinkHub, berjalan di Cloudflare Workers menggunakan Supabase REST API.
Tidak butuh Node.js — murni menggunakan Web Crypto API bawaan browser/workers.

## Yang dibutuhkan

- Akun Cloudflare (gratis)
- Wrangler CLI

## Langkah Deploy

### 1. Install Wrangler
```bash
npm install -g wrangler
wrangler login
```

### 2. Masuk ke folder worker
```bash
cd artifacts/cf-worker
```

### 3. Dapatkan Supabase Service Role Key
- Supabase Dashboard → Project Settings → API
- Copy **service_role** key (bukan anon key)

### 4. Set secrets
```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste service role key saat diminta

wrangler secret put JWT_SECRET
# Ketik random string panjang, contoh: linkhub-prod-2024-xK9mP3qR7nL2
```

### 5. Deploy
```bash
wrangler deploy
```

Setelah deploy, kamu akan dapat URL seperti:
`https://linkhub-api.your-name.workers.dev`

### 6. Update frontend
Ganti base URL API di frontend ke URL worker tersebut.

---

## Catatan Penting

### Password Hashing
Worker ini menggunakan **PBKDF2** (Web Crypto API) untuk hash password — sama persis dengan Express API lokal. Jadi akun yang dibuat di lokal bisa dipakai di worker juga.

### Database
Worker menggunakan tabel yang sama di Supabase:
- `lh_users` — data user (email, username, password)
- `profile` — profil per user
- `links` — link per user

---

## Semua Endpoint

| Method | Path | Auth? | Deskripsi |
|--------|------|-------|-----------|
| GET | /api/healthz | Tidak | Health check |
| POST | /api/auth/register | Tidak | Daftar akun baru |
| POST | /api/auth/login | Tidak | Masuk |
| GET | /api/auth/me | Ya | Info user login |
| GET | /api/profile | Ya | Lihat profil sendiri |
| PUT | /api/profile | Ya | Update profil |
| GET | /api/links | Ya | Semua link milik sendiri |
| POST | /api/links | Ya | Buat link baru |
| PUT | /api/links/reorder | Ya | Ubah urutan link |
| PUT | /api/links/:id | Ya | Edit link |
| DELETE | /api/links/:id | Ya | Hapus link |
| POST | /api/links/:id/click | Tidak | Catat klik (publik) |
| GET | /api/stats | Ya | Statistik klik |
| GET | /api/public/:username | Tidak | Profil publik |

## Variables di wrangler.toml

| Variable | Jenis | Keterangan |
|----------|-------|------------|
| `SUPABASE_URL` | var | URL project Supabase (sudah ada di wrangler.toml) |
| `SUPABASE_SERVICE_ROLE_KEY` | secret | Service role key Supabase |
| `JWT_SECRET` | secret | Secret untuk signing JWT token |
