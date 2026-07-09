# Design

## Theme

Mendukung light mode & dark mode dengan switch manual (bukan auto by OS, biar user yang kontrol). Skenario pemakaian: santai di laptop, bisa siang atau malam — makanya dua tema disediakan, bukan dipaksa satu.

## Color Strategy

**Restrained-plus**: neutral hangat (tinted, bukan abu-abu netral kaku) sebagai basis, dengan satu accent playful (oranye-koral hangat) untuk elemen interaktif utama (tombol play, active state, progress crossfade). Accent dipakai konsisten tapi tidak mendominasi — sekitar 10-15% dari surface.

- Neutral base (light): OKLCH lightness tinggi, chroma sangat rendah (~0.01), hue netral hangat
- Neutral base (dark): OKLCH lightness rendah, chroma rendah, hue sama agar konsisten antar tema
- Accent: OKLCH chroma sedang-tinggi, hue oranye-koral (~40-50°), dipakai untuk CTA, active states, progress indicator crossfade
- Tidak pakai `#000`/`#fff` murni — semua netral di-tint ke arah hue accent supaya terasa satu keluarga warna

## Typography

- Font: humanist sans-serif yang ramah (bukan geometris dingin) — contoh: Inter atau sejenis, dengan sedikit personality di heading (weight lebih berani)
- Skala: rasio ≥1.25 antar step, hierarchy lewat scale + weight, bukan cuma warna
- Body text max 65-75ch supaya nyaman dibaca

## Layout

- Bukan grid kartu identik untuk antrian lagu — pakai list dengan rhythm spacing bervariasi, tiap item punya "personality" kecil (nomor urut, bukan ikon generic)
- Tidak dibungkus container/card berlapis — whitespace jadi pembatas visual, bukan border/background
- Satu area fokus utama: player + antrian aktif. Kontrol sekunder (trim, crossfade duration) muncul kontekstual per item, bukan semua keliatan sekaligus

## Motion

- Ease-out-quart/expo untuk semua transisi, tidak ada bounce/elastic
- Progress bar crossfade: animasi halus yang mencerminkan proses fade beneran (dua indikator volume yang saling menyilang), jadi motion-nya fungsional sekaligus playful — bukan hiasan kosong
- Hover/interaksi kecil untuk kesan "hidup" tapi tidak berlebihan (tidak animate layout properties)

## Components (awal)

- Input link YouTube (single field, paste-friendly)
- Queue list item: judul lagu, durasi, kontrol trim (start/end), tombol hapus/reorder
- Player bar: play/pause, skip, volume, indikator crossfade
- Theme switch: toggle kecil, biasanya di pojok
