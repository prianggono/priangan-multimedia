-- Canonical live quotation date column used by quotation-fix.js.
-- Safe to run more than once.

alter table public.penawaran
  add column if not exists tgl_penawaran date;

update public.penawaran
set tgl_penawaran = coalesce(
  tgl_penawaran,
  tanggal_penawaran,
  tanggal,
  created_at::date
)
where tgl_penawaran is null;

notify pgrst, 'reload schema';
