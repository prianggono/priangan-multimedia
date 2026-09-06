/* Priangan Multimedia — authoritative quotation edit loader.
 * IMPORTANT: when editing an existing quotation, use the saved quotation-item
 * price, not the current Master Harga price. This prevents 550k master prices
 * from overwriting a previously customized 450k quotation price.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_EDIT_PRICE_AUTHORITATIVE)return;
  window.__PM_QUOTATION_EDIT_PRICE_AUTHORITATIVE=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const toast=m=>typeof window.msg==='function'?window.msg(m):console.warn('[PM]',m);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function DB(){
    try{if(window.__PM_STABLE_DB)return window.__PM_STABLE_DB}catch(_){}
    try{if(typeof db!=='undefined'&&db)return db}catch(_){}
    const c=window.PRIANGAN_CONFIG||{};
    if(c.SUPABASE_URL&&c.SUPABASE_ANON_KEY&&window.supabase?.createClient){
      return window.__PM_STABLE_DB=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
    }
    return null;
  }

  async function editQuotationAuthoritative(id){
    const d=DB();
    if(!d)return toast('Supabase belum terhubung.');
    try{
      const q=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
      if(q.error)throw q.error;
      if(!q.data)throw new Error('Penawaran tidak ditemukan.');

      const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});
      if(r.error)throw r.error;
      const rows=r.data||[];
      if(!rows.length)throw new Error('Penawaran belum memiliki item.');

      window.__pmEditingQuotationId=Number(id);
      window.__PM_EDIT_QUOTATION_ID=Number(id);
      window.__pmEditingQuotationNumber=S(q.data.nomor_penawaran||q.data.nomor||id);
      window.go('quotation');
      await wait(220);

      // Do NOT call pick(): pick() intentionally reads the current Master Harga
      // and would replace a quotation-specific 450k price with the current 550k.
      const loaded=rows.map(row=>({
        id:Date.now()+Math.random(),
        __savedItemId:row.id,
        kode:S(row.kode),
        item:S(row.item||row.nama_item),
        harga:N(row.harga_jual??row.harga),
        harga_jual:N(row.harga_jual??row.harga),
        qty:Math.max(1,N(row.qty??row.jumlah)||1),
        lebar:N(row.lebar),
        tinggi:N(row.tinggi),
        panjang:N(row.panjang),
        mulai:S(row.tanggal_mulai),
        selesai:S(row.tanggal_selesai),
        tipe:S(row.tipe_perhitungan||row.tipe||'qty').toLowerCase()||'qty'
      }));

      window.items=loaded;
      window.__pmItems=loaded;
      if(typeof window.drawItems==='function')window.drawItems();

      const set=(sel,val)=>{const e=document.querySelector(sel);if(e)e.value=val??''};
      set('#qc',q.data.nama_client);
      set('#qp',q.data.perusahaan);
      set('#qw',q.data.whatsapp||q.data.telepon);
      set('#qe',q.data.email);
      set('#qeve',q.data.nama_event||q.data.event_name||q.data.name_event||q.data.project);
      set('#qs',q.data.tanggal_mulai);
      set('#qe2',q.data.tanggal_selesai);

      await wait(30);
      if(document.querySelector('#pmDisc'))document.querySelector('#pmDisc').value=N(q.data.diskon);
      window.__PM_DISC_MODE='rp';
      if(typeof window.setQuotationTotals==='function')window.setQuotationTotals();
      else if(typeof window.__pmSetTotals==='function')window.__pmSetTotals();

      // Price editor observes #items, but force one enhancement cycle after the
      // authoritative data is rendered so the Edit button uses the saved value.
      window.dispatchEvent(new Event('pm:quotation-loaded'));
      await wait(30);
      toast('Edit '+window.__pmEditingQuotationNumber+' — harga penawaran tersimpan digunakan.');
    }catch(e){
      window.__pmEditingQuotationId=null;
      window.__PM_EDIT_QUOTATION_ID=null;
      console.error('[PM] authoritative quotation edit',e);
      toast('Gagal membuka penawaran: '+(e.message||e));
    }
  }

  // stability-final.js installs its own editQuotation with setTimeout().
  // Install after it, and repeat briefly so this remains the final authority.
  function install(){window.editQuotation=editQuotationAuthoritative;}
  [0,100,300,700,1200,2000,3000].forEach(ms=>setTimeout(install,ms));
  install();
})();
