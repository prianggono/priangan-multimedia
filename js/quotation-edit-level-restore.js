/* Priangan Multimedia — Restore LED Level state when editing saved quotations.
 * Supabase penawaran_items is the source of truth. Rehydrate Level fields
 * after the quotation has been rendered, with a few safe post-render retries.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_EDIT_LEVEL_RESTORE__) return;
  window.__PM_QUOTATION_EDIT_LEVEL_RESTORE__=true;

  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const DB=()=>window.db||window.__PM_STABLE_DB||null;

  async function restore(qid){
    const d=DB();
    if(!d||!qid||!Array.isArray(window.items)||!window.items.length)return false;
    const r=await d.from('penawaran_items').select('id,level_enabled,level_master_harga_id,level_tinggi,level_harga').eq('penawaran_id',Number(qid)).order('id',{ascending:true});
    if(r.error||!Array.isArray(r.data)){
      console.error('[PM] restore saved LED Level query',r.error||'invalid data');
      return false;
    }
    const rows=r.data||[];
    const byDbId=new Map(rows.map(x=>[String(x.id),x]));
    window.items.forEach((item,index)=>{
      const saved=(item.db_id!=null?byDbId.get(String(item.db_id)):null)||rows[index];
      if(!saved)return;
      item.level_enabled=!!saved.level_enabled;
      item.level_master_harga_id=saved.level_master_harga_id==null?null:N(saved.level_master_harga_id);
      item.level_tinggi=saved.level_tinggi==null?0:N(saved.level_tinggi);
      item.level_harga=saved.level_harga==null?0:N(saved.level_harga);
    });
    if(typeof window.__PM_QUOTATION_UI_API?.enhance==='function'){
      requestAnimationFrame(()=>window.__PM_QUOTATION_UI_API.enhance());
    }else if(typeof window.drawItems==='function'){
      requestAnimationFrame(()=>window.drawItems());
    }
    return true;
  }

  async function restoreAndRefresh(qid){
    try{await restore(Number(qid));}catch(e){console.error('[PM] restore saved LED Level',e);}
  }

  let installed=false;
  function install(){
    if(installed||typeof window.editQuotation!=='function')return false;
    const original=window.editQuotation;
    if(original.__pmLevelRestoreWrapped){installed=true;return true;}
    async function wrapped(id){
      const qid=Number(id);
      const result=await original.apply(this,arguments);
      window.__PM_LAST_EDITED_QUOTATION_ID=qid;
      await restoreAndRefresh(qid);
      [80,250,600].forEach(ms=>setTimeout(()=>restoreAndRefresh(qid),ms));
      return result;
    }
    wrapped.__pmLevelRestoreWrapped=true;
    window.editQuotation=wrapped;
    installed=true;
    return true;
  }

  [0,100,300,700,1200,2000].forEach(ms=>setTimeout(install,ms));
  window.addEventListener('load',install);
  window.__PM_QUOTATION_EDIT_LEVEL_RESTORE_API={restore,restoreAndRefresh,install};
})();
