-- Priangan Multimedia — financial stability migration
-- Run once in Supabase SQL Editor.
-- Safe to run repeatedly because every column uses IF NOT EXISTS.

alter table public.penawaran
  add column if not exists subtotal numeric default 0,
  add column if not exists diskon numeric default 0,
  add column if not exists diskon_persen numeric default 0,
  add column if not exists grand_total numeric default 0,
  add column if not exists tanggal_penawaran date default current_date;

alter table public.penawaran_items
  add column if not exists nama_item text,
  add column if not exists harga numeric default 0,
  add column if not exists tipe text,
  add column if not exists jumlah numeric default 1,
  add column if not exists tanggal_mulai date,
  add column if not exists tanggal_selesai date,
  add column if not exists durasi numeric default 1;

-- Keep the existing schedule schema canonical: penawaran_item_id is the FK.
alter table public.penawaran_jadwal
  add column if not exists penawaran_item_id bigint;

-- Backfill newly added financial fields from the existing total when possible.
update public.penawaran
set subtotal = coalesce(nullif(subtotal, 0), total, 0),
    grand_total = coalesce(nullif(grand_total, 0), total, 0),
    diskon = coalesce(diskon, 0),
    diskon_persen = coalesce(diskon_persen, 0)
where subtotal is null or grand_total is null;

-- Backfill compatibility fields used by the stable editor.
update public.penawaran_items
set nama_item = coalesce(nullif(nama_item, ''), item),
    harga = coalesce(nullif(harga, 0), harga_jual, 0),
    tipe = coalesce(nullif(tipe, ''), tipe_perhitungan, 'qty'),
    jumlah = coalesce(nullif(jumlah, 0), qty, 1),
    tanggal_mulai = coalesce(tanggal_mulai, null),
    tanggal_selesai = coalesce(tanggal_selesai, null),
    durasi = coalesce(nullif(durasi, 0), 1)
where true;

-- Refresh PostgREST schema cache after the migration.
notify pgrst, 'reload schema';
