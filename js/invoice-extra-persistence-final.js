/* Priangan Multimedia — persistent invoice-only items FINAL
 * Browser localStorage remains a fast cache, while Supabase is the durable source.
 * This does not alter penawaran, penawaran_items, or master_harga.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_EXTRA_PERSIST_FINAL)return;
  window.__PM_INVOICE_EXTRA_PERSIST_FINAL=true;

  const KEY='PM_INVOICE_EXTRA_ITEMS';
  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=S(v).replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const db=()=>window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}};
  const write=x=>{try{localStorage.setItem(KEY,JSON.stringify(x));}catch(_){}};
  const localList=id=>read()[String(id)]||[];

  function toLocal(r){
    return {
      id:String(r.id),
      invoice_item:true,
      source:S(r.source||'manual'),
      master_harga_id:r.master_harga_id??null,
      tipe:S(r.tipe_perhitungan||'qty').toLowerCase(),
      item:S(r.nama_item||r.item||'Item Tambahan'),
      kode:S(r.kode||'ADD-INV'),
      qty:N(r.qty)||1,
      satuan:S(r.satuan||'unit'),
      harga:N(r.harga),
      harga_jual:N(r.harga),
      lebar:r.lebar==null?null:N(r.lebar),
      tinggi:r.tinggi==null?null:N(r.tinggi),
      panjang:r.panjang==null?null:N(r.panjang),
      tanggal_mulai:r.tanggal_mulai||null,
      tanggal_selesai:r.tanggal_selesai||null,
      durasi:N(r.durasi)||1,
      basis:N(r.basis),
      subtotal:N(r.subtotal)
    };
  }

  function toDb(x,quoteId){
    return {
      penawaran_id:Number(quoteId),
      master_harga_id:x.master_harga_id==null?null:Number(x.master_harga_id),
      kode:S(x.kode||'ADD-INV'),
      nama_item:S(x.item||x.nama_item||'Item Tambahan'),
      source:S(x.source||'manual'),
      tipe_perhitungan:S(x.tipe||x.tipe_perhitungan||'qty').toLowerCase(),
      qty:Math.max(0,N(x.qty)||1),
      satuan:S(x.satuan||'unit'),
      harga:Math.max(0,N(x.harga_jual??x.harga)),
      lebar:x.lebar==null?null:N(x.lebar),
      tinggi:x.tinggi==null?null:N(x.tinggi),
      panjang:x.panjang==null?null:N(x.panjang),
      tanggal_mulai:x.tanggal_mulai||null,
      tanggal_selesai:x.tanggal_selesai||null,
      durasi:Math.max(1,N(x.durasi)||1),
      basis:Math.max(0,N(x.basis)),
      subtotal:Math.max(0,N(x.subtotal)),
      updated_at:new Date().toISOString()
    };
  }

  async function fetchDb(id){
    const d=db();if(!d)return {rows:[],error:'Supabase belum terhubung.'};
    const r=await d.from('penawaran_invoice_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});
    if(r.error)return {rows:[],error:r.error.message};
    return {rows:(r.data||[]).map(toLocal),error:''};
  }

  async function hydrate(id){
    const qid=Number(id);if(!Number.isFinite(qid))return;
    const d=db();if(!d)return;
    const local=localList(qid);
    const remote=await fetchDb(qid);
    if(remote.error)return;
    if(remote.rows.length===0 && local.length>0){
      const payload=local.map(x=>toDb(x,qid));
      const ins=await d.from('penawaran_invoice_items').insert(payload).select('*');
      if(!ins.error){
        const normalized=(ins.data||[]).map(toLocal);
        const data=read();data[String(qid)]=normalized;write(data);
        return;
      }
    }
    const data=read();data[String(qid)]=remote.rows;write(data);
  }

  async function persistLatest(id){
    const qid=Number(id),items=localList(qid),d=db();
    if(!d||!Number.isFinite(qid))return;
    const remote=await fetchDb(qid);
    if(remote.error)return;
    const remoteIds=new Set(remote.rows.map(x=>String(x.id)));
    const pending=items.filter(x=>!remoteIds.has(String(x.id)));
    if(pending.length){
      const ins=await d.from('penawaran_invoice_items').insert(pending.map(x=>toDb(x,qid))).select('*');
      if(ins.error){console.warn('[PM] Invoice extra not persisted:',ins.error.message);return;}
    }
    await hydrate(qid);
  }

  async function removePersisted(id,itemId){
    const d=db();if(!d)return;
    const numeric=Number(itemId);
    if(Number.isFinite(numeric)){
      const r=await d.from('penawaran_invoice_items').delete().eq('id',numeric).eq('penawaran_id',Number(id));
      if(r.error)console.warn('[PM] Invoice extra delete failed:',r.error.message);
    }
    await hydrate(id);
  }

  function patch(){
    if(typeof window.invoiceEdit==='function'&&!window.invoiceEdit.__pmPersistent){
      const oldEdit=window.invoiceEdit;
      const wrappedEdit=async function(id){
        const result=await oldEdit.apply(this,arguments);
        await hydrate(id);
        setTimeout(()=>window.invoiceRenderExtras?.(),50);
        return result;
      };
      wrappedEdit.__pmPersistent=true;
      window.invoiceEdit=wrappedEdit;
    }
    if(typeof window.invoiceSaveAddItem==='function'&&!window.invoiceSaveAddItem.__pmPersistent){
      const oldSave=window.invoiceSaveAddItem;
      const wrappedSave=async function(){
        const before=window.__PM_INVOICE_ADD_STATE?.id;
        const result=oldSave.apply(this,arguments);
        if(before!=null)await persistLatest(before);
        return result;
      };
      wrappedSave.__pmPersistent=true;
      window.invoiceSaveAddItem=wrappedSave;
    }
    if(typeof window.invoiceRemoveItem==='function'&&!window.invoiceRemoveItem.__pmPersistent){
      const oldRemove=window.invoiceRemoveItem;
      const wrappedRemove=async function(itemId){
        const qid=window.__PM_INVOICE_ADD_STATE?.id;
        const result=oldRemove.apply(this,arguments);
        if(qid!=null)await removePersisted(qid,itemId);
        return result;
      };
      wrappedRemove.__pmPersistent=true;
      window.invoiceRemoveItem=wrappedRemove;
    }
  }

  window.invoiceRenderExtras=()=>{
    try{
      const s=window.__PM_INVOICE_ADD_STATE;
      if(s&&typeof window.invoiceAddItem==='function'){
        const target=document.getElementById('invoiceItems');
        if(target)target.dispatchEvent(new Event('pm:invoice-extras-refresh'));
      }
    }catch(_){}
  };

  const mo=new MutationObserver(()=>patch());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(patch,ms));
})();
