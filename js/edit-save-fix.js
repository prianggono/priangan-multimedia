/* Priangan Multimedia — FINAL edit quotation persistence.
 * Editing NEVER inserts a new penawaran row. It updates the original id.
 * Existing penawaran_items keep their ids; removed items are deleted; new items are inserted.
 * This prevents duplicate quotations and preserves item references used by finance/payments.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
const days=(a,b)=>{if(!a||!b)return 1;const d=Math.round((new Date(`${b}T00:00:00`)-new Date(`${a}T00:00:00`))/86400000);return d>=0?d+1:1};
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PRIANGAN_QUOTE_DB||null}
function input(card,label){const wanted=label.toLowerCase();for(const f of card.querySelectorAll('.field')){const l=S(f.querySelector('label')?.textContent).toLowerCase();if(l===wanted||l.includes(wanted))return f.querySelector('input,select,textarea')}return null}
function itemData(card){
 const sel=card.querySelector('select');const opt=sel?.selectedOptions?.[0];const raw=S(opt?.textContent);const m=raw.match(/^\[([^\]]+)\]\s*(.*)$/);
 const kode=S(sel?.value)||S(m?.[1]);const item=S(m?.[2])||raw;
 const harga=N(input(card,'Harga Jual')?.value);const tipe=S(input(card,'Tipe Perhitungan')?.value).toLowerCase()||'qty';
 const qty=Math.max(1,N(input(card,'Jumlah (Qty)')?.value)||1);
 const lebar=N(input(card,'Lebar Videotron')?.value||input(card,'Lebar Level')?.value);
 const tinggi=N(input(card,'Tinggi Videotron')?.value||input(card,'Tinggi Level')?.value||input(card,'Tinggi Rigging')?.value);
 const panjang=N(input(card,'Panjang Rigging')?.value);
 const mulai=S(input(card,'Tanggal Mulai')?.value)||null;const selesai=S(input(card,'Tanggal Selesai')?.value)||null;const durasi=days(mulai,selesai);
 let subtotal=0;if(tipe==='luas')subtotal=lebar*tinggi*harga*durasi;else if(tipe==='level')subtotal=lebar*harga*durasi;else if(tipe==='rigging')subtotal=((panjang*2)+(tinggi*2))*harga*durasi;else subtotal=qty*harga*durasi;
 return {savedId:S(card.dataset.pmSavedItemId)||null,kode,item,harga_jual:harga,tipe_perhitungan:tipe,qty,lebar:lebar||null,tinggi:tinggi||null,panjang:panjang||null,tanggal_mulai:mulai,tanggal_selesai:selesai,durasi,subtotal};
}
function readItems(){return [...document.querySelectorAll('#items > .item')].map(itemData).filter(x=>x.kode&&x.item&&x.harga_jual>=0)}
function discount(){const b=N(document.querySelector('#pmDisc')?.value);return Math.max(0,b)}
async function saveSchedule(d,itemId,x){
 if(!itemId)return;
 let r=await d.from('penawaran_jadwal').delete().eq('item_id',itemId);if(r.error)throw r.error;
 r=await d.from('penawaran_jadwal').insert({item_id:itemId,qty:x.qty,tanggal_mulai:x.tanggal_mulai,tanggal_selesai:x.tanggal_selesai,durasi:x.durasi,subtotal:x.subtotal});
 if(r.error)throw r.error;
}
async function saveEdit(){
 const quoteId=S(window.__pmEditingQuotationId);if(!quoteId)return false;
 const d=DB();if(!d){toast('Supabase belum terhubung.');return true}
 const button=document.querySelector('button[onclick="saveQuote()"]');if(button?.dataset.pmEditBusy==='1')return true;button?.setAttribute('data-pm-edit-busy','1');if(button){button.disabled=true;button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent='Menyimpan perubahan...'}
 try{
  const f={nama_client:S(document.querySelector('#qc')?.value),perusahaan:S(document.querySelector('#qp')?.value),telepon:S(document.querySelector('#qw')?.value),whatsapp:S(document.querySelector('#qw')?.value),email:S(document.querySelector('#qe')?.value),nama_event:S(document.querySelector('#qeve')?.value),tanggal_mulai:S(document.querySelector('#qs')?.value)||null,tanggal_selesai:S(document.querySelector('#qe2')?.value)||null};
  if(!f.nama_client||!f.perusahaan||!f.nama_event)throw Error('Client, perusahaan, dan event wajib diisi.');
  if(f.tanggal_mulai&&f.tanggal_selesai&&f.tanggal_selesai<f.tanggal_mulai)throw Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
  const its=readItems();if(!its.length)throw Error('Minimal satu item harus dipilih.');
  const base=its.reduce((a,x)=>a+N(x.subtotal),0);const disc=Math.min(base,discount());const grand=Math.max(0,base-disc);
  /* CRITICAL: UPDATE the existing quotation id. Never INSERT penawaran here. */
  let r=await d.from('penawaran').update({nama_client:f.nama_client,perusahaan:f.perusahaan,telepon:f.telepon,whatsapp:f.whatsapp,email:f.email,nama_event:f.nama_event,event_name:f.nama_event,tanggal_mulai:f.tanggal_mulai,tanggal_selesai:f.tanggal_selesai,subtotal:base,diskon:disc,discount:disc,nilai_diskon:disc,persen_diskon:base?disc/base*100:0,discount_percent:base?disc/base*100:0,grand_total:grand,total:grand}).eq('id',quoteId).select('id').single();
  if(r.error)throw r.error;if(!r.data?.id)throw Error('Penawaran tidak ditemukan atau tidak bisa diperbarui.');
  const old=await d.from('penawaran_items').select('id').eq('penawaran_id',quoteId);if(old.error)throw old.error;const oldIds=(old.data||[]).map(x=>String(x.id));const kept=new Set();
  for(const x of its){
   let itemId=x.savedId;
   if(itemId&&oldIds.includes(String(itemId))){
    kept.add(String(itemId));
    r=await d.from('penawaran_items').update({kode:x.kode,item:x.item,nama_item:x.item,harga_jual:x.harga_jual,harga:x.harga_jual,tipe_perhitungan:x.tipe_perhitungan,tipe:x.tipe_perhitungan,qty:x.qty,jumlah:x.qty,lebar:x.lebar,tinggi:x.tinggi,panjang:x.panjang,tanggal_mulai:x.tanggal_mulai,tanggal_selesai:x.tanggal_selesai,durasi:x.durasi,subtotal:x.subtotal}).eq('id',itemId).eq('penawaran_id',quoteId).select('id').single();
    if(r.error)throw r.error;
   }else{
    r=await d.from('penawaran_items').insert({penawaran_id:quoteId,kode:x.kode,item:x.item,nama_item:x.item,harga_jual:x.harga_jual,harga:x.harga_jual,tipe_perhitungan:x.tipe_perhitungan,tipe:x.tipe_perhitungan,qty:x.qty,jumlah:x.qty,lebar:x.lebar,tinggi:x.tinggi,panjang:x.panjang,tanggal_mulai:x.tanggal_mulai,tanggal_selesai:x.tanggal_selesai,durasi:x.durasi,subtotal:x.subtotal}).select('id').single();
    if(r.error)throw r.error;itemId=r.data?.id;if(!itemId)throw Error(`Item ${x.kode} tidak mendapatkan ID.`);kept.add(String(itemId));
   }
   await saveSchedule(d,itemId,x);
  }
  for(const oldId of oldIds){if(kept.has(oldId))continue;let z=await d.from('penawaran_jadwal').delete().eq('item_id',oldId);if(z.error)throw z.error;z=await d.from('penawaran_items').delete().eq('id',oldId).eq('penawaran_id',quoteId);if(z.error)throw z.error;}
  window.__pmEditingQuotationId=null;window.__pmEditSaveInProgress=false;toast('Penawaran berhasil diperbarui. Tidak membuat penawaran baru.');if(typeof window.go==='function')window.go('history');return true;
 }catch(e){console.error('[PM] edit save error',e);toast('Gagal menyimpan perubahan: '+(e.message||e));return false}finally{if(button){button.disabled=false;button.textContent=button.dataset.originalText||'Simpan Penawaran';button.dataset.pmEditBusy='0'}}
}
const original=window.saveQuote;window.saveQuote=async function(){if(window.__pmEditingQuotationId)return saveEdit();return typeof original==='function'?original():toast('Fungsi simpan penawaran tidak tersedia.')};
document.addEventListener('click',e=>{const b=e.target.closest?.('button[onclick="saveQuote()"]');if(!b||!window.__pmEditingQuotationId)return;e.preventDefault();e.stopImmediatePropagation();saveEdit()},true);
window.__saveEditedQuotation=saveEdit;window.__PM_FINAL_EDIT_SAVE=true;
})();
