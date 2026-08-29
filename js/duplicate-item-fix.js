/* Priangan Multimedia — duplicate quotation item guard.
 * Fixes duplicate rows created by earlier edit/save versions without touching
 * master_harga. Only EXACTLY identical quotation items are considered duplicates.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PRIANGAN_QUOTE_DB||window.__PRIANGAN_EDIT_DB||null}
function fp(x){return [x.kode,x.item,x.nama_item,x.harga_jual,x.tipe_perhitungan,x.tipe,x.qty,x.jumlah,x.lebar,x.tinggi,x.panjang,x.tanggal_mulai,x.tanggal_selesai,x.durasi,x.subtotal].map(S).join('|')}
async function removeDuplicateRows(d, quoteId, rows){
 const seen=new Map(), unique=[];
 for(const row of rows){const key=fp(row);if(!seen.has(key)){seen.set(key,row);unique.push(row);continue}
   let z=await d.from('penawaran_jadwal').delete().eq('item_id',row.id);if(z.error)throw z.error;
   z=await d.from('penawaran_items').delete().eq('id',row.id).eq('penawaran_id',quoteId);if(z.error)throw z.error;
 }
 return unique;
}
async function cleanQuote(quoteId){
 const d=DB();if(!d||!quoteId)return;
 const r=await d.from('penawaran_items').select('*').eq('penawaran_id',quoteId).order('id',{ascending:true});
 if(r.error)throw r.error;
 const before=r.data||[], after=await removeDuplicateRows(d,quoteId,before);
 return {before:before.length,after:after.length};
}
const originalEdit=window.editQuotation;
if(typeof originalEdit==='function'){
 window.editQuotation=async function(id){
  try{
   const result=await cleanQuote(id);
   if(result&&result.before>result.after)toast(`Duplikasi item diperbaiki: ${result.before-result.after} item ganda dihapus.`);
  }catch(e){console.error('[PM] duplicate cleanup:',e);toast('Peringatan: duplikasi item tidak dapat dibersihkan otomatis. '+(e.message||e));}
  return originalEdit(id);
 };
}
function duplicateDomCards(){
 const cards=[...document.querySelectorAll('#items > .item')],seen=new Set(),dupes=[];
 for(const card of cards){
  const sel=card.querySelector('select'),opt=sel?.selectedOptions?.[0];
  const price=[...card.querySelectorAll('.field')].find(f=>S(f.querySelector('label')?.textContent).toLowerCase().includes('harga jual'))?.querySelector('input')?.value;
  const qty=[...card.querySelectorAll('.field')].find(f=>S(f.querySelector('label')?.textContent).toLowerCase().includes('jumlah (qty)'))?.querySelector('input')?.value;
  const key=[sel?.value,opt?.textContent,price,qty].map(S).join('|');
  if(seen.has(key))dupes.push(card);else seen.add(key);
 }
 for(const card of dupes)card.remove();
 return dupes.length;
}
const originalSave=window.saveQuote;
if(typeof originalSave==='function'){
 window.saveQuote=async function(){
  if(window.__pmEditingQuotationId){
   const removed=duplicateDomCards();
   if(removed)toast(`Item ganda di form dihapus: ${removed}.`);
  }
  return originalSave.apply(this,arguments);
 };
}
window.__PM_DUPLICATE_ITEM_FIX=true;
})();
