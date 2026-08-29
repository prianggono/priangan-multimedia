/* Priangan Multimedia — duplicate quotation item guard.
 * Fixes duplicate rows created by earlier edit/save versions without touching
 * master_harga. Only EXACTLY identical quotation items are considered duplicates.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PRIANGAN_QUOTE_DB||window.__PRIANGAN_EDIT_DB||null}
function fp(x){return [x.kode,x.item,x.nama_item,x.harga_jual,x.tipe_perhitungan,x.tipe,x.qty,x.jumlah,x.lebar,x.tinggi,x.panjang,x.tanggal_mulai,x.tanggal_selesai,x.durasi,x.subtotal].map(S).join('|')}
async function removeDuplicateRows(d,quoteId,rows){
 const seen=new Map(),unique=[];
 for(const row of rows){const key=fp(row);if(!seen.has(key)){seen.set(key,row);unique.push(row);continue}
  let z=await d.from('penawaran_jadwal').delete().eq('item_id',row.id);if(z.error)throw z.error;
  z=await d.from('penawaran_items').delete().eq('id',row.id).eq('penawaran_id',quoteId);if(z.error)throw z.error;
 }
 return unique;
}
async function cleanQuote(quoteId){
 const d=DB();if(!d||!quoteId)return null;
 const r=await d.from('penawaran_items').select('*').eq('penawaran_id',quoteId).order('id',{ascending:true});
 if(r.error)throw r.error;
 const before=r.data||[],after=await removeDuplicateRows(d,quoteId,before);
 return {before:before.length,after:after.length};
}
function duplicateDomCards(){
 const cards=[...document.querySelectorAll('#items > .item')],seen=new Set(),dupes=[];
 for(const card of cards){
  const sel=card.querySelector('select'),opt=sel?.selectedOptions?.[0];
  const fields=[...card.querySelectorAll('.field')];
  const val=name=>fields.find(f=>S(f.querySelector('label')?.textContent).toLowerCase().includes(name))?.querySelector('input,select,textarea')?.value;
  const key=[sel?.value,opt?.textContent,val('harga jual'),val('tipe perhitungan'),val('jumlah (qty)'),val('lebar videotron'),val('tinggi videotron'),val('panjang rigging'),val('tanggal mulai'),val('tanggal selesai')].map(S).join('|');
  if(seen.has(key))dupes.push(card);else seen.add(key);
 }
 for(const card of dupes)card.remove();
 return dupes.length;
}
const originalEdit=window.editQuotation;
if(typeof originalEdit==='function'){
 window.editQuotation=async function(id){
  try{
   const result=await cleanQuote(id);
   const cleaned=result&&result.before>result.after?result.before-result.after:0;
   const result2=await originalEdit(id);
   const domRemoved=duplicateDomCards();
   if(cleaned||domRemoved)toast(`Duplikasi diperbaiki: ${cleaned+domRemoved} item ganda dihapus.`);
   return result2;
  }catch(e){console.error('[PM] duplicate cleanup:',e);toast('Gagal membersihkan duplikasi item: '+(e.message||e));return originalEdit(id)}
 };
}
const originalSave=window.saveQuote;
if(typeof originalSave==='function'){
 window.saveQuote=async function(){
  if(window.__pmEditingQuotationId){const removed=duplicateDomCards();if(removed)toast(`Item ganda di form dihapus: ${removed}.`)}
  return originalSave.apply(this,arguments);
 };
}
window.__PM_DUPLICATE_ITEM_FIX=true;
})();
