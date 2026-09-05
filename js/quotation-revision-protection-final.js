/* Priangan Multimedia — quotation revision protection FINAL v2
 * A revision is created ONLY when quotation business data actually changes.
 * Re-saving an unchanged quotation keeps the existing quotation number.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_REVISION_PROTECTION_FINAL)return;
  window.__PM_QUOTATION_REVISION_PROTECTION_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PM_STABLE_DB||null};
  const nextRevision=no=>{const s=S(no),m=s.match(/^(.*?)(?:_(\d+))?$/);return `${m?.[1]||s}_${(m?.[2]?Number(m[2]):0)+1}`};
  const omit=(row,keys)=>{const o={...(row||{})};keys.forEach(k=>delete o[k]);return o};
  const clean=v=>{if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object'){const o={};Object.keys(v).sort().forEach(k=>{o[k]=clean(v[k])});return o}return v};
  const same=(a,b)=>JSON.stringify(clean(a))===JSON.stringify(clean(b));

  async function snapshot(id){
    const d=DB();if(!d||!id)return null;
    const q=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
    if(q.error||!q.data)return null;
    const it=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});
    if(it.error)return null;
    return {
      quote:omit(q.data,['id','nomor_penawaran','nomor_invoice','tanggal_invoice','jatuh_tempo','status_invoice','catatan_invoice','total_dibayar','sisa_pembayaran','status_pembayaran','created_at','updated_at']),
      items:(it.data||[]).map(x=>omit(x,['id','penawaran_id','created_at','updated_at']))
    };
  }

  async function setNumber(id,no){
    const d=DB();if(!d||!id||!no)return;
    const r=await d.from('penawaran').update({nomor_penawaran:no}).eq('id',id);
    if(r.error)throw r.error;
    window.__PM_LAST_QUOTATION_NUMBER=no;
    window.__PM_PRINT_DOCUMENT_NUMBER=no;
  }

  async function install(){
    if(typeof window.saveQuote!=='function'||window.saveQuote.__pmRevisionProtection)return false;
    const original=window.saveQuote;
    const wrapped=async function(){
      const id=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
      if(!id)return original.apply(this,arguments);
      const before=await snapshot(id);
      let oldNo='';
      if(before){
        const d=DB();const r=await d.from('penawaran').select('nomor_penawaran').eq('id',id).maybeSingle();oldNo=S(r.data?.nomor_penawaran);
      }
      try{
        const result=await original.apply(this,arguments);
        const after=await snapshot(id);
        if(before&&after&&!same(before,after)){
          // Business data changed: create exactly ONE revision.
          // The numbering module no longer increments automatically.
          if(oldNo){
            const d=DB();const r=await d.from('penawaran').select('nomor_penawaran').eq('id',id).maybeSingle();
            const current=S(r.data?.nomor_penawaran);
            const expected=nextRevision(oldNo);
            if(current!==expected)await setNumber(id,expected);
            else{window.__PM_LAST_QUOTATION_NUMBER=current;window.__PM_PRINT_DOCUMENT_NUMBER=current}
          }
        }else if(before&&after&&oldNo){
          // Absolutely no business-data change: keep the exact original number.
          const d=DB();const r=await d.from('penawaran').select('nomor_penawaran').eq('id',id).maybeSingle();
          if(S(r.data?.nomor_penawaran)!==oldNo)await setNumber(id,oldNo);
          else{window.__PM_LAST_QUOTATION_NUMBER=oldNo;window.__PM_PRINT_DOCUMENT_NUMBER=oldNo}
        }
        return result;
      }catch(e){
        if(oldNo)try{await setNumber(id,oldNo)}catch(_){}
        throw e;
      }
    };
    wrapped.__pmRevisionProtection=true;
    window.saveQuote=wrapped;
    return true;
  }
  install();[100,300,700,1500,3000].forEach(ms=>setTimeout(install,ms));
})();
