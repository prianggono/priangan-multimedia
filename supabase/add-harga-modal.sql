-- Tambahkan harga modal ke Master Harga.
-- Jalankan sekali di Supabase SQL Editor jika kolom ini belum ada.

alter table public.master_harga
add column if not exists harga_modal numeric not null default 0;

comment on column public.master_harga.harga_modal is 'Harga modal / cost dasar item sebelum dijual';
