# Priangan Multimedia V1

Frontend statis untuk GitHub Pages + Supabase.

## Mulai
1. Buka `js/config.js`.
2. Isi `SUPABASE_ANON_KEY` dari Supabase > Project Settings > API.
3. Jangan gunakan `service_role` key.
4. Upload folder ini ke GitHub.
5. Aktifkan GitHub Pages dari branch `main`, folder root.

## Supabase
Aplikasi memakai tabel:
- `master_harga`
- `clients`
- `penawaran`
- `penawaran_items`
- `penawaran_jadwal`
- `template_surat`

Template `template_surat` Anda sudah ada. Bucket `surat-assets` juga sudah dibuat public; masukkan public URL logo dan TTD ke kolom `logo_url` dan `ttd_url`.

Jika tabel penawaran belum lengkap, lihat `supabase_schema.sql`.
