# MixApp - Comprehensive Project Documentation (v2.0)

*Dokumen ini menggantikan PRD.md lama, merangkum seluruh visi produk, arsitektur teknis, sistem desain, dan fitur terbaru dari MixApp.*

---

## 1. Visi Produk & Tujuan
MixApp adalah web-app *mixing* musik ringan berbasis browser yang mengambil sumber audio langsung dari YouTube. Didesain khusus untuk penggunaan personal (dengar musik santai di laptop/PC) tanpa perlu menginstal *software* DJ/Audio profesional yang berat (seperti Serato atau FL Studio). 

**Filosofi Utama**: *Playful* tapi tenang, lapang, bersih, dan meminimalisir beban pikiran pengguna. Terasa seperti membuat *mixtape* untuk teman, bukan mengoperasikan mesin pabrik.

## 2. Fitur Inti (Current State)

### 2.1 Manajemen Playlist & Library (3-Panel UI)
Aplikasi mengusung desain **3-kolom utama**:
1. **Left Panel (Library)**: Menampilkan daftar semua *playlist* yang dibuat pengguna. Mendukung pembuatan *playlist* baru, penghapusan, dan penggantian nama *playlist*.
2. **Middle Panel (Active Workspace)**: Menampilkan antrean lagu (*queue*) pada *playlist* yang sedang aktif. Pengguna bisa melakukan *drag-and-drop* untuk mengubah urutan lagu, serta menyalin **Shareable Link** untuk membagikan *playlist* tersebut.
3. **Right Panel (Global All Songs)**: Berfungsi sebagai *database* pusat lagu. Semua lagu yang pernah ditambahkan pengguna akan bermuara di sini, memungkinkan pengguna menyeret lagu lama ke *playlist* baru tanpa harus mencari tautan YouTube-nya lagi.

### 2.2 Audio Engine: Dual-Player Crossfade
Menggunakan arsitektur `DualPlayer.tsx` yang membungkus dua *iframe* YouTube secara tersembunyi.
- **Seamless Crossfade**: Saat lagu pertama hampir habis (ditentukan oleh *End Time* atau durasi asli dikurangi durasi *crossfade*), lagu kedua akan otomatis diputar (Fade In) sementara lagu pertama mengecil volumenya (Fade Out).
- **Trim Playback**: Pengguna dapat mengatur batas waktu mulai (*Start Time*) dan selesai (*End Time*) dari setiap lagu tanpa memotong *file* asli.

### 2.3 Cloud Sync & Auto-Save
- Seluruh antrean dan *playlist* otomatis disinkronkan ke **Supabase**.
- Menggunakan sistem **Debounce + AbortController** yang sangat tangguh untuk mencegah *race condition* saat pengguna melakukan perubahan cepat (seperti *drag-and-drop* beruntun).

### 2.4 Keyboard Shortcuts
Mendukung interaksi tanpa *mouse* untuk fungsi dasar:
- `Space`: Play / Pause.
- `ArrowRight`: Skip ke lagu berikutnya.

---

## 3. Arsitektur Teknis & Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite.
- **Styling**: Vanilla CSS dengan *CSS Variables* (`index.css`), menghindari ketergantungan pada *framework utility* seperti Tailwind untuk menjaga kontrol absolut terhadap *Glassmorphism*.
- **Drag and Drop**: `@hello-pangea/dnd`.
- **Icons**: `lucide-react`.
- **YouTube API**: `react-youtube`.

### Backend / Database
- **Supabase**: Bertindak sebagai *Database-as-a-Service* (BaaS).
  - Tabel: `playlists`
  - Skema: `id` (UUID), `title` (Text), `songs` (JSONB), `created_at` (Timestamp).
  - Terdapat baris khusus ber-title `Global_All_Songs` untuk menyimpan daftar seluruh lagu.
- **Environment Variables**: Dikelola melalui `.env.local` (membutuhkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` saat *deployment* ke Vercel).

---

## 4. Sistem Desain & Aturan UI (Design System)

### 4.1 Tema (Light/Dark Mode)
- **Persistent Theme**: Disimpan di `localStorage` (`mixapp_theme`), dikontrol sepenuhnya oleh pengguna via *toggle*, bukan secara otomatis oleh OS.
- **Glassmorphism**: Desain mengandalkan *blur* (*backdrop-filter*) dan transparansi elegan, terutama pada komponen *Modal* dan *Panel*.

### 4.2 Warna (Restrained-Plus)
- Menggunakan palet netral yang di-*tint* hangat. Menghindari warna solid mentah seperti `#000000`, `#FFFFFF`, murni merah, atau murni biru.
- **Accent Color** (`var(--accent)`): Warna oranye-koral hangat, digunakan secara hemat (10-15% dari UI) hanya untuk elemen interaktif (CTA, tombol simpan, tombol putar).

### 4.3 Tipografi & Spasi
- **Font**: Humanist sans-serif (Inter / Outfit) untuk kesan ramah.
- **Clarity over Density**: Menjadikan ruang kosong (*whitespace*) sebagai pembatas visual utama, meminimalisir penggunaan *border* atau *card* bertumpuk.

### 4.4 Komponen Kritis (Aturan Keras)
> **DILARANG MENGGUNAKAN NATIVE DIALOGS** (`window.prompt`, `window.confirm`, `window.alert`).
Penggunaan *native dialogs* akan memblokir *Event Loop* React dan menyebabkan *iframe* YouTube mengalami _freeze_ atau layar menjadi *blank*. Seluruh interaksi input pengguna dan konfirmasi destruktif **WAJIB** menggunakan komponen kustom `<Modal />` (`src/components/Modal.tsx`).

---

## 5. Deployment
- **Platform**: Vercel.
- **Syarat**: Wajib mendaftarkan *Environment Variables* Supabase secara manual ke *dashboard* Vercel karena `.env.local` tidak diunggah ke repositori GitHub.

---
*Dokumen ini menggantikan PRD, PRODUCT.md, dan DESIGN.md yang lama, menyatukan visi bisnis, desain, dan teknis ke dalam satu sumber kebenaran (Source of Truth).*
