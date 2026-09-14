/* Priangan Multimedia — quotation save authoritative final v2
 * Persist discount from the saved quotation row and saved quotation items.
 * The previous v1 calculated subtotal from window.items and skipped persistence
 * when that runtime array was empty/stale. The database is authoritative after save.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_AUTHORITATIVE_FINAL_V2)return;
  window.__PM_QUOTATION_SAVE_AUTHORITATIVE_FINAL_V2=true;
  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  function dbClient(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||window.__PRIANGAN_EDIT_DB||null}
  function discountPercent(){const el=document.querySelector('#pmDiscPct');return Math.max(0,Math.min(100,Math.trunc(N(el?.value??window.__pmDiscountPct??0))))}
  async function findTarget(d,editId,beforeIds){
    if(editId)return N(editId);
    const q=await d.from('penawaran').select('id').order('id',{ascending:false}).limit(20);
    if(q.error)throw q.error;
    const fresh=(q.data||[]).find(x=>!beforeIds.has(String(x.id)));
    return N(fresh?.id||q.data?.[0]?.id);
  }
  async function persist(d,id){
    if(!d||!id)return;
    const ir=await d.from('penawaran_items').select('subtotal').eq('penawaran_id',id);
    if(ir.error)throw ir.error;
    const base=Math.max(0,(ir.data||[]).reduce((sum,row)=>sum+N(row?.subtotal),0));
    const pct=discountPercent();
    const nominal=Math.max(0,Math.min(base,Math.round(base*pct/100)));
    const total=Math.max(0,base-nominal);
    const r=await d.from('penawaran').update({subtotal:base,diskon:nominal,diskon_persen:pct,diskon_nominal:nominal,total,grand_total:total}).eq('id',id);
    if(r.error)throw r.error;
    window.__pmDiscountBase=base;window.__pmDiscountPct=pct;window.__pmDiscountValue=nominal;window.__pmNetTotal=total;
  }
  function install(){
    if(typeof window.saveQuote!=='function'||window.saveQuote.__pmAuthoritativeFinalV2)return false;
    const original=window.saveQuote;
    const wrapped=async function(){
      const d=dbClient(),editId=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID),beforeIds=new Set();
      if(d&&!editId){try{const q=await d.from('penawaran').select('id').order('id',{ascending:false}).limit(500);(q.data||[]).forEach(x=>beforeIds.add(String(x.id)))}catch(e){console.warn('[PM] quotation target snapshot:',e)}}
      const result=await original.apply(this,arguments);
      if(!d)return result;
      try{const targetId=await findTarget(d,editId,beforeIds);if(targetId)await persist(d,targetId)}catch(err){console.error('[PM] authoritative quotation persistence v2:',err);if(typeof window.msg==='function')window.msg('Penawaran tersimpan, tetapi sinkronisasi diskon gagal: '+(err?.message||err))}
      return result;
    };
    wrapped.__pmAuthoritativeFinalV2=true;window.saveQuote=wrapped;return true;
  }
  install();[50,100,200,400,800,1500,3000].forEach(ms=>setTimeout(install,ms));
})();
