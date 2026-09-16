-- Production reconciliation: quotation cost is a snapshot.
-- Historical quotation margin must not change when master_harga.harga_modal changes.
-- Applied to Supabase production on 2026-09-16.

create or replace view public.v_keuangan_app as
with item_keuangan as (
  select pi.penawaran_id,
    sum(
      case
        when lower(coalesce(pi.tipe_perhitungan,'qty')) = 'luas' then
          coalesce(pi.harga_modal,0) * coalesce(pi.lebar,1) * coalesce(pi.tinggi,1) * coalesce(pj.qty,1) * coalesce(pj.durasi,1)
        when lower(coalesce(pi.tipe_perhitungan,'qty')) = 'level' then
          coalesce(pi.harga_modal,0) * coalesce(pi.lebar,1) * coalesce(pj.qty,1) * coalesce(pj.durasi,1)
        else
          coalesce(pi.harga_modal,0) * coalesce(pj.qty,1) * coalesce(pj.durasi,1)
      end
    ) as total_modal
  from public.penawaran_items pi
  left join public.penawaran_jadwal pj on pj.item_id = pi.id
  group by pi.penawaran_id
)
select p.id,p.nomor_penawaran,p.nama_client,p.perusahaan,p.nama_event,p.status,p.status_pembayaran,
       p.subtotal,p.diskon,p.total,p.grand_total,
       coalesce(ik.total_modal,0) as total_modal,
       (p.grand_total - coalesce(ik.total_modal,0)) as laba_kotor,
       case when p.grand_total > 0 then round(((p.grand_total-coalesce(ik.total_modal,0))/p.grand_total)*100,2) else 0 end as margin_persen,
       p.total_dibayar,p.sisa_pembayaran,p.created_at,p.updated_at
from public.penawaran p
left join item_keuangan ik on ik.penawaran_id = p.id;

create or replace view public.v_penawaran_detail_app as
select pi.id as item_id,pi.penawaran_id,pi.master_harga_id,pi.kode,pi.nama_item,pi.kategori,pi.satuan,
       pi.tipe_perhitungan,pi.harga,coalesce(pi.harga_modal,0) as harga_modal,
       coalesce(pi.lebar,1) as lebar,coalesce(pi.tinggi,1) as tinggi,coalesce(pi.panjang,1) as panjang,
       pj.id as jadwal_id,coalesce(pj.qty,1) as qty,pj.tanggal_mulai,pj.tanggal_selesai,
       coalesce(pj.durasi_hari::numeric,pj.durasi,1) as durasi,
       case
         when lower(coalesce(pi.tipe_perhitungan,'qty'))='luas' then pi.harga*coalesce(pi.lebar,1)*coalesce(pi.tinggi,1)*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
         when lower(coalesce(pi.tipe_perhitungan,'qty'))='level' then pi.harga*coalesce(pi.lebar,1)*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
         else pi.harga*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
       end as subtotal_jual,
       case
         when lower(coalesce(pi.tipe_perhitungan,'qty'))='luas' then coalesce(pi.harga_modal,0)*coalesce(pi.lebar,1)*coalesce(pi.tinggi,1)*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
         when lower(coalesce(pi.tipe_perhitungan,'qty'))='level' then coalesce(pi.harga_modal,0)*coalesce(pi.lebar,1)*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
         else coalesce(pi.harga_modal,0)*coalesce(pj.qty,1)*coalesce(pj.durasi,1)
       end as subtotal_modal
from public.penawaran_items pi
left join public.penawaran_jadwal pj on pj.item_id = pi.id;
