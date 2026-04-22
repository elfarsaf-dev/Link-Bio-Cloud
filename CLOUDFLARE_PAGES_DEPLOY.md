# Panduan Deploy LinkHub ke Cloudflare Pages

Panduan lengkap deploy frontend **LinkHub** (folder `artifacts/linktree`) ke Cloudflare Pages.
Project ini adalah **monorepo pnpm**, jadi setting build sedikit berbeda dari project Vite biasa.

---

## Ringkasan Cepat (TL;DR)

| Setting | Value |
|---|---|
| Framework preset | **None** (jangan pilih Vite, biar manual) |
| Root directory (Advanced) | `/` (biarkan kosong / root repo) |
| Build command | `pnpm install --frozen-lockfile && pnpm --filter @workspace/linktree build` |
| Build output directory | `artifacts/linktree/dist/public` |
| Node version (env var) | `NODE_VERSION` = `22` |
| Environment | Production |

Backend tetap di **Cloudflare Worker** (`https://linkhub.cocspedsafliz.workers.dev`) — tidak perlu deploy ulang. Database tetap di **Supabase**.

---

## Struktur Project

```
workspace/                          ← root repo (monorepo pnpm)
├── pnpm-workspace.yaml
├── package.json
├── artifacts/
│   ├── linktree/                   ← FRONTEND (yang di-deploy ke Pages)
│   │   ├── package.json            (name: @workspace/linktree)
│   │   ├── vite.config.ts          (outDir: dist/public)
│   │   ├── public/
│   │   └── src/
│   └── api-server/                 ← BACKEND (sudah jadi Worker)
└── lib/                            ← shared packages (api-client, db, dll.)
```

Karena pakai pnpm workspace + `workspace:*` dependencies, build **harus** dijalankan dari root repo dengan `pnpm`, bukan langsung di folder `artifacts/linktree`.

---

## Cara A — Deploy via Git (Recommended)

Cocok kalau project sudah di GitHub / GitLab. Setiap push otomatis re-deploy.

### 1. Push project ke GitHub
Pastikan seluruh monorepo (root `workspace/`) ter-push, bukan cuma folder `linktree`.

### 2. Buat project Pages baru
1. Buka https://dash.cloudflare.com → **Workers & Pages** → **Create** → tab **Pages** → **Connect to Git**
2. Pilih repo kamu, klik **Begin setup**

### 3. Isi Build settings
| Field | Isi |
|---|---|
| Project name | `linkhub` (atau bebas) |
| Production branch | `main` |
| Framework preset | **None** |
| Build command | `pnpm install --frozen-lockfile && pnpm --filter @workspace/linktree build` |
| Build output directory | `artifacts/linktree/dist/public` |
| Root directory (Advanced) | kosongkan (default `/`) |

### 4. Environment variables
Klik **Add variable**:

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |

> **Catatan:** image build Cloudflare Pages **sudah include `pnpm`** (versi 10+). Jangan jalankan `npm install -g pnpm` — akan error `EEXIST: file already exists`.

### 5. Save and Deploy
Tunggu 2–4 menit. Kalau sukses, dapat URL `https://linkhub.pages.dev`.

### 6. Update otomatis
Setiap `git push` ke `main` → Cloudflare otomatis build & deploy ulang.

---

## Cara B — Deploy via Direct Upload (tanpa Git)

Cocok kalau tidak mau pakai Git, atau cuma butuh deploy sekali.

### 1. Build di lokal / Replit
Dari root repo, jalankan:
```bash
pnpm install
pnpm --filter @workspace/linktree build
```
Hasil build ada di `artifacts/linktree/dist/public/`.

### 2. Upload
1. Buka https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. Beri nama project (`linkhub`)
3. Drag folder **`dist/public`** (isinya `index.html`, `assets/`, `_redirects`, dst.) — bukan file `.tar.gz`
4. Klik **Deploy site**

### 3. Update kemudian
Pilih project → **Create deployment** → upload folder hasil build terbaru.

---

## File `_redirects` (Penting buat SPA)

LinkHub adalah Single Page App (pakai `wouter` routing). Supaya refresh di halaman `/login` atau `/username` tidak 404, harus ada file `_redirects` di output.

Cek dulu apakah sudah ada:
```bash
cat artifacts/linktree/public/_redirects
```

Kalau **belum ada**, buat file `artifacts/linktree/public/_redirects` dengan isi:
```
/*    /index.html   200
```

Vite otomatis copy isi `public/` ke `dist/public/` saat build, jadi `_redirects` ikut ter-deploy.

---

## Konfigurasi API Backend

API URL di-hardcode di `artifacts/linktree/src/config.ts`:
```ts
export const API_URL = "https://linkhub.cocspedsafliz.workers.dev";
```

Kalau suatu saat ganti URL backend, edit file itu lalu re-deploy. Tidak perlu env var di Cloudflare karena nilainya di-bundle saat build.

> Mau bikin dinamis lewat env var? Ubah jadi `import.meta.env.VITE_API_URL`, lalu tambah `VITE_API_URL` di Environment variables Cloudflare Pages.

---

## Custom Domain

1. Di project Pages → **Custom domains** → **Set up a custom domain**
2. Masukkan domain (misal `linkhub.io` atau `app.linkhub.io`)
3. Kalau domain sudah di Cloudflare → DNS otomatis ke-set
4. Kalau di registrar lain → ikuti instruksi CNAME yang muncul

SSL otomatis aktif dalam beberapa menit.

---

## Verifikasi Setelah Deploy

Buka URL Pages dan test:
- `/` → halaman utama
- `/login` → halaman login (refresh tidak boleh 404)
- `/USERNAME_KAMU` → halaman public profile
- DevTools → Network → request ke `linkhub.cocspedsafliz.workers.dev` harus status 200
- Login → cookie harus tersimpan, redirect ke dashboard

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `npm error EEXIST ... bin/pnpm` | Hapus `npm install -g pnpm` dari build command. pnpm sudah ada di image Cloudflare |
| `pnpm: command not found` (jarang) | Pakai `corepack enable && corepack prepare pnpm@10 --activate && pnpm install ...` |
| `ERR_PNPM_NO_LOCKFILE` | Pastikan `pnpm-lock.yaml` ter-commit ke Git |
| `Cannot find module @workspace/api-client-react` | Build tidak dijalankan dari root. Pastikan Root directory = `/` dan command pakai `pnpm --filter` |
| Refresh halaman 404 | File `_redirects` belum ada di `public/`. Lihat bagian di atas |
| CORS error ke Worker | Cek setting CORS di Worker, pastikan domain Pages (`*.pages.dev` & custom) di-allow |
| Build output kosong | Cek path: harus `artifacts/linktree/dist/public`, **bukan** `dist` saja |
| Build sukses tapi blank page | Asset path salah. Pastikan `vite.config.ts` `base: "/"` (default sudah benar) |

---

## Arsitektur Setelah Deploy

```
User browser
    │
    ├──► Cloudflare Pages  (linkhub.pages.dev)        ← Frontend (React + Vite)
    │
    └──► Cloudflare Worker (linkhub.cocspedsafliz...) ← Backend (API)
              │
              └──► Supabase Postgres                  ← Database
```
