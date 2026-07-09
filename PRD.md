# PRD: Simple YouTube Music Mixer (Webapp Pribadi)

## 1. Latar Belakang
User butuh software mixing musik sederhana untuk dengar musik pribadi di laptop, tapi software mixing profesional yang ada terlalu berat untuk spek laptop user. Solusinya: webapp ringan berbasis browser yang jalan dengan sumber musik dari YouTube (via link), dengan 3 fitur inti: crossfade, antrian (queue), dan potong (trim) playback.

## 2. Tujuan
Membuat webapp ringan (client-side, tanpa install software berat) yang bisa:
1. Memutar musik dari link YouTube
2. Transisi crossfade antar lagu
3. Menyusun & mengelola antrian lagu
4. Mengatur titik mulai & selesai putar (trim playback, bukan potong file asli)

## 3. Target User
- Personal use (1 user, dengar musik santai di laptop sendiri)

## 4. Batasan Teknis (Penting)
| Batasan | Penjelasan |
|---|---|
| Tidak ada download/export audio | Kita hanya kontrol pemutaran via YouTube IFrame Player API, bukan ambil file asli |
| "Potong musik" = trim playback | Set titik mulai (start time) & titik selesai (end time), bukan memotong file MP3 |
| Crossfade pakai 2 player | Dua YouTube player disiapkan bersamaan, volumenya diatur naik-turun bareng saat transisi (bukan mixing audio level sample) |
| Perlu koneksi internet | Karena streaming langsung dari YouTube |

## 5. Fitur

### 5.1 Input Musik
- User paste link YouTube
- Sistem ambil info dasar (judul video) untuk ditampilkan di queue

### 5.2 Antrian (Queue)
- Tambah lagu ke antrian (dari link)
- Urutkan ulang (drag/reorder atau tombol naik-turun)
- Hapus lagu dari antrian
- Lagu berikutnya otomatis diputar setelah lagu sebelumnya selesai (atau mencapai titik "selesai" yang di-set)
- **Disimpan permanen** di browser (localStorage) — antrian tetap ada meskipun browser ditutup & dibuka lagi

### 5.3 Trim (Potong Playback)
- Per lagu, user bisa set:
  - Titik mulai (start time)
  - Titik selesai (end time) — lagu otomatis pindah ke antrian berikutnya saat mencapai titik ini
- **Tidak disimpan** — reset tiap kali sesi baru / lagu dimuat ulang

### 5.4 Crossfade
- Saat mendekati titik selesai lagu A, lagu B (berikutnya di antrian) mulai diputar bersamaan
- Volume lagu A turun bertahap (fade out), volume lagu B naik bertahap (fade in), dalam durasi crossfade yang bisa diatur user (misal 3-8 detik)
- **Tidak disimpan** — durasi crossfade di-set ulang tiap sesi (default value tertentu)

### 5.5 Kontrol Pemutaran Dasar
- Play / Pause
- Skip ke lagu berikutnya
- Volume master

## 6. Yang TIDAK Termasuk (Out of Scope)
- Download / export file audio
- Multi-user / login / akun
- Equalizer atau efek audio lanjutan (reverb, bass boost, dll)
- Mixing 2 sumber musik non-YouTube (misal file lokal) — bisa jadi fitur fase berikutnya kalau dibutuhkan

## 7. Persyaratan Non-Fungsional
- Ringan: 100% berjalan di browser (client-side), tidak butuh install software
- Tidak butuh spek laptop tinggi — cukup browser modern (Chrome/Edge/Firefox)
- Tidak butuh server backend kompleks (queue disimpan di localStorage browser, bukan database)

## 8. Keputusan Tambahan
- Default durasi crossfade: **5 detik**
- Shortcut keyboard: **Ya, ditambahkan** (detail tombol shortcut ditentukan di fase desain UI)
- Tampilan queue (list biasa vs thumbnail): **ditentukan nanti saat fase desain UI**

---
*Dokumen ini adalah hasil dari Fase 1: Requirement Gathering. Belum masuk ke desain teknis atau coding.*
