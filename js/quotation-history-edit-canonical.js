/* Priangan Multimedia — Canonical History Edit for Quotations
 * The history Edit action owns loading quotation items, including optional
 * LED Level fields. This avoids timing-based wrappers around editQuotation().
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_HISTORY_EDIT_CANONICAL__)return;
  window.__PM_QUOTATION_HISTORY_EDIT_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const DB=()=>window.db||window.__PM_STABLE_DB||null;

  function header(q){
    const set=(id,v)=>{const el=document.querySelector('#'+id);if(el)el.value=S(v??'');};
    set('qc',q.nama_client||q.client||q.nama_pelanggan);
    set('qp',q.perusahaan||q.company);
    set('qw',q.telepon_wa||q.telepon||q.whatsapp||q.no_telepon||q.phone);
    set('qe',q.email);
    set('qeve',q.nama_event||q.event_name||q.event||q.project_name);
    set('qs',q.tanggal_mulai||q.tanggal_mulai_event);
    set('qe2',q.tanggal_selesai||q.tanggal_selesai_event);
  }

  async function loadEdit(qid){
    const d=DB();
    if(!d||!qid)return false;
    const [qr,ir,sr]=await Promise.all([
      d.from('penawaran').select('*').eq('id',Number(qid)).maybeSingle(),
      d.from('penawaran_items').select('*').eq('penawaran_id',Number(qid)).order('id'),
      d.from('penawaran_jadwal').select('*').eq('penawaran_id',Number(qid)).order('id')
    ]);
    if(qr.error)throw qr.error;
    if(ir.error)throw ir.error;
    if(sr.error)throw sr.error;
    if(!qr.data)throw Error('Penawaran tidak ditemukan.');

    const q=qr.data, schedules=sr.data||[], byItem=new Map();
    schedules.forEach(s=>byItem.set(String(s.penawaran_item_id??s.item_id),s));

    window.items=(ir.data||[]).map((r,i)=>{
      const s=byItem.get(String(r.id))||schedules[i]||{};
      const price=N(r.harga??r.harga_jual);
      return {
        id:Date.now()+Math.random()+i,
        db_id:r.id,
        master_id:r.master_harga_id??null,
        kode:S(r.kode||r.kode_item),
        item:S(r.item||r.nama_item),
        nama_item:S(r.nama_item||r.item),
        harga:price,
        harga_jual:price,
        harga_modal:N(r.harga_modal),
        diskon_persen:N(r.diskon_persen),
        diskon_nominal:N(r.diskon_nominal),
        qty:Math.max(1,N(r.qty??r.jumlah??s.qty)||1),
        jumlah:Math.max(1,N(r.jumlah??r.qty??s.qty)||1),
        lebar:N(r.lebar),
        tinggi:N(r.tinggi),
        panjang:N(r.panjang),
        mulai:S(r.tanggal_mulai||s.tanggal_mulai||''),
        selesai:S(r.tanggal_selesai||s.tanggal_selesai||''),
        durasi:Math.max(1,N(r.durasi||s.durasi||s.durasi_hari)||1),
        tipe:S(r.tipe_perhitungan||r.tipe||''),
        tipe_perhitungan:S(r.tipe_perhitungan||r.tipe||''),
        /* Critical persistence fields: these come directly from Supabase. */
        level_enabled:!!r.level_enabled,
        level_master_harga_id:r.level_master_harga_id==null?null:N(r.level_master_harga_id),
        level_tinggi:r.level_tinggi==null?0:N(r.level_tinggi),
        level_harga:r.level_harga==null?0:N(r.level_harga)
      };
    });

    window.__pmEditingQuotationId=Number(qid);
    window.__PM_EDIT_QUOTATION_ID=Number(qid);
    window.__pmEditingQuotationNumber=S(q.nomor_penawaran||q.nomor);
    window.__PM_EDIT_QUOTATION_NUMBER=S(q.nomor_penawaran||q.nomor);
    window.__PM_DISC_MODE='rp';
    window.__pmDiscountValue=Math.max(0,N(q.diskon_nominal??q.diskon));
    window.__pmDiscountPct=Math.max(0,N(q.diskon_persen));

    if(typeof window.go==='function')window.go('quotation');
    else if(typeof window.quotationPage==='function')window.quotationPage();
    header(q);
    requestAnimationFrame(()=>{
      header(q);
      if(typeof window.drawItems==='function')window.drawItems();
      requestAnimationFrame(()=>window.__PM_QUOTATION_UI_API?.enhance?.());
    });
    window.__PM_LAST_EDITED_QUOTATION_ID=Number(qid);
    return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-pm-history-action="edit"]');
    if(!b)return;
    const qid=Number(b.dataset.id);
    if(!qid)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    loadEdit(qid).catch(err=>{
      console.error('[PM] canonical history edit',err);
      window.msg?.('Gagal membuka penawaran: '+(err.message||err));
    });
  },true);

  window.__PM_QUOTATION_HISTORY_EDIT_API={loadEdit};
})();
