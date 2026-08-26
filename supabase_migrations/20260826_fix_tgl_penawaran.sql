-- DEPRECATED compatibility migration.
-- The canonical quotation date column is tanggal_penawaran.
-- This migration intentionally does NOT create or reference tgl_penawaran.

alter table public.penawaran
  add column if not exists tanggal_penawaran date;

update public.penawaran
set tanggal_penawaran = coalesce(tanggal_penawaran, tanggal, created_at::date)
where tanggal_penawaran is null;

notify pgrst, 'reload schema';
