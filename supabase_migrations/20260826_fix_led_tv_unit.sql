-- LED TV is sold/rented per unit, not by area.
-- Safe to run repeatedly.
update public.master_harga
set satuan = 'unit',
    updated_at = now()
where lower(coalesce(item,'')) like '%led tv%'
   or lower(coalesce(item,'')) like 'tv %'
   or lower(coalesce(kode,'')) like 'tv-%';

notify pgrst, 'reload schema';
