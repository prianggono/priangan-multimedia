-- Jalankan sekali di Supabase Dashboard > SQL Editor.
-- Menambahkan kolom URL tanda tangan yang digunakan Template Surat.

alter table public.template_surat
  add column if not exists ttd_url text;

-- Paksa PostgREST membaca ulang schema setelah perubahan kolom.
notify pgrst, 'reload schema';
