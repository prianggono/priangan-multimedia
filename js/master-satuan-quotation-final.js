/* Priangan Multimedia — final quotation unit rule.
 * Master Harga.satuan is authoritative for unit items.
 * This is intentionally a tiny wrapper around the existing quotation pick()
 * so existing calculation logic remains untouched.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim().toLowerCase();
  const unit=v=>['unit','units','pcs','pc','buah','set'].includes(S(v));
  const original=window.pick;
  if(typeof original!=='function' || window.__PM_QUOTATION_MASTER_UNIT_FINAL) return;

  window.pick=function(id,kode){
    original.apply(this,arguments);
    try{
      const item=(window.items||[]).find(x=>String(x.id)===String(id));
      const master=(window.masters||[]).find(x=>String(x.kode)===String(kode));
      if(!item || !master) return;
      if(unit(master.satuan)) item.tipe='qty';
      if(typeof window.drawItems==='function') window.drawItems();
    }catch(e){console.error('[PM] master satuan quotation fix',e);}
  };
  window.__PM_QUOTATION_MASTER_UNIT_FINAL=true;
})();