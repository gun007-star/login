# ◆ SIBERTAK — Cyber Access Terminal

Website login & register bertema **cyber-futuristik** bernama SIBERTAK. Dibangun dengan HTML + CSS + JavaScript murni (tanpa framework), jadi bisa langsung dijalankan lokal maupun di-deploy ke Vercel apa adanya.

## ✨ Fitur

- **Halaman Login & Register dalam satu kartu** dengan tab bergeser (slide) dan indikator neon
- **Latar hidup & interaktif**: hujan matrix, jaringan partikel yang merespons gerakan kursor, grid lantai 3D bergerak, scanline CRT & vignette
- **Efek glitch** pada logo SIBERTAK, bingkai neon berputar (conic-gradient), kartu dengan efek **tilt 3D** mengikuti mouse
- **Terminal FAQ palsu dengan efek ketik** + HUD jam real-time dan status sistem
- **Validasi lengkap**: username, email, kekuatan sandi (meter 4 tingkat), konfirmasi sandi, persetujuan syarat & ketentuan, peringatan **Caps Lock**
- **Tampilkan/sembunyikan kata sandi**, opsi "Ingat saya", notifikasi **toast**
- **Overlay AKSES DIBERIKAN / AKSES DITOLAK** ala sistem keamanan saat login
- **Dashboard terproteksi** (`dashboard.html`): profil operatif, status sesi, telemetri sistem bergerak, log aktivitas, tombol keluar
- Kata sandi di-**hash SHA-256** sebelum disimpan di `localStorage` (simulasi akun frontend-only)
- **Responsif penuh** untuk desktop, tablet, dan HP + dukungan `prefers-reduced-motion`

## 📁 Struktur Proyek

```
sibertak/
├── index.html      → Halaman login & register
├── dashboard.html  → Halaman dashboard setelah login
├── style.css       → Seluruh styling (tema cyber)
├── script.js       → Animasi, validasi, logika login/register
├── vercel.json     → Konfigurasi deploy Vercel
└── README.md
```

## 🔑 Akun Demo

| ID Pengguna | Kata Sandi   |
|-------------|--------------|
| `admin`     | `sibertak123` |

Akun demo dibuat otomatis saat halaman pertama kali dibuka. Kamu juga bisa mendaftar akun baru lewat tab **DAFTAR**.

## 🚀 Menjalankan Secara Lokal

**Cara 1 — Buka langsung (paling cepat):**
Cukup klik dua kali file `index.html` — semuanya berjalan di browser.

**Cara 2 — Server lokal (disarankan):**

```bash
# Python
cd sibertak
python -m http.server 8080
# lalu buka http://localhost:8080

# atau Node.js
npx serve sibertak
```

**Cara 3 — VS Code:**
Instal ekstensi *Live Server* → klik kanan `index.html` → *Open with Live Server*.

## ▲ Deploy ke Vercel

**Cara 1 — Import dari GitHub (direkomendasikan):**
1. Push folder `sibertak` ke repositori GitHub.
2. Buka [vercel.com/new](https://vercel.com/new) dan login.
3. Pilih repositorinya → Framework Preset: **Other** (biarkan tanpa build command).
4. Klik **Deploy** — selesai! Situs live di `https://nama-proyekmu.vercel.app`.

**Cara 2 — Vercel CLI:**

```bash
npm i -g vercel
cd sibertak
vercel          # ikuti petunjuknya (setting default saja)
vercel --prod   # deploy ke production
```

**Cara 3 — Drag & drop:**
Buka [vercel.com/new](https://vercel.com/new), lalu seret folder `sibertak` ke area upload.

> Tidak perlu build step apapun — ini situs statis murni. File `vercel.json` sudah disertakan (`cleanUrls` agar URL lebih rapi, mis. `/dashboard` tanpa `.html`).

## ⚠️ Catatan Keamanan

Ini adalah **demo frontend-only**: akun disimpan di `localStorage` browser (dengan hash SHA-256) dan **tidak cocok untuk produksi**. Untuk sistem nyata, hubungkan form ke backend autentikasi sungguhan — misalnya **Vercel Serverless Functions + database** (Supabase, PlanetScale, MongoDB Atlas) atau layanan seperti Firebase/Auth0.

## 🎨 Kustomisasi

Buka `style.css` dan ubah variabel di bagian `:root`:

```css
--cyan:    #00f0ff;   /* warna neon utama  */
--magenta: #ff2bd6;   /* warna aksen kedua */
--green:   #39ff14;   /* warna sukses      */
```

Ganti nama brand di `index.html` (logo, HUD, judul tab browser) sesuai kebutuhanmu.
