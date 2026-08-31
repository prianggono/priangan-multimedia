/* Priangan Multimedia — Master Harga satuan rule, source-level safe patch.
 * IMPORTANT: keep existing quotation calculation logic untouched.
 * The original pick() infers "luas" from words such as LED/Videotron.
 * That is wrong for products whose Master Harga satuan is unit/pcs/buah/set,
 * e.g. LED TV. This wrapper temporarily hides the category from the original
 * inference, so the existing pick() stores the item as qty in its real state.
 */
(function(){
  'use strict';
  const norm=v=>String(v??'').trim().toLowerCase();
  const isUnit=v=>['unit','units','pcs','pc','buah','set'].includes(norm(v));

  function lexical(name){
    try{return Function('return '+name)();}catch(_){return null;}
  }

  const originalPick=window.pick;
  if(typeof originalPick!=='function'){
    console.warn('[PM] master satuan patch: pick() belum tersedia');
    return;
  }
  if(window.__PM_MASTER_SATUAN_PICK_PATCHED)return;

  window.pick=function(id,kode){
    const list=lexical('masters');
    const master=Array.isArray(list)?list.find(row=>String(row?.kode??'')===String(kode??'')):null;
    if(!master || !isUnit(master.satuan)) return originalPick(id,kode);

    // Let the original application perform the normal pick/calculation flow.
    // Only suppress the misleading LED/Videotron category inference for unit items.
    const oldKategori=master.kategori;
    master.kategori='';
    try{
      return originalPick(id,kode);
    }finally{
      master.kategori=oldKategori;
    }
  };

  window.__PM_MASTER_SATUAN_PICK_PATCHED=true;
  console.info('[PM] Master Harga satuan rule aktif: unit/pcs/buah/set => qty');
})();