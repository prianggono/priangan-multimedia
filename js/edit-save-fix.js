/* Priangan Multimedia — FINAL edit quotation persistence.
 * EDIT MODE ALWAYS updates the original penawaran.id.
 * It never INSERTs a new row into penawaran.
 * Items are synchronized by product code so adding/removing items works even
 * after the compact UI redraws the form. Existing item IDs are reused when
 * the same code remains, protecting finance/payment references as much as possible.
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
 const kode=S(sel?.value)||S(m?.[1]);const item=S(m?.[2])||raw;const harga=N(input(card,'Harga Jual')?.value);const tipe=S(input(card,'Tipe Perhitungan')?.value).toLowerCase()||'qty';
 const qty=Math.max(1,N(input(card,'Jumlah (Qty)')?.value)||1);const lebar=N(input(card,'Lebar Videotron')?.value||input(card,'Lebar Level')?.value);const tinggi=N(input(card,'Tinggi Videotron')?.value||input(card,'Tinggi Level')?.value||input(card,'Tinggi Rigging')?.value);const panjang=N(input(card,'Panjang Rigging')?.value);const mulai=S(input(card,'Tanggal Mulai')?.value)||null;const selesai=S(input(card,'Tanggal Selesai')?.value)||null;const durasi=days(mulai,selesai);
 let subtotal=0;if(tipe==='luas')subtotal=lebar*tinggi*harga*durasi;else if(tipe==='level')subtotal=lebar*harga*durasi;else if(tipe==='rigging')subtotal=((panjang*2)+(tinggi*2))*harga*durasi;else subtotal=qty*harga*durasi;
 return{kode,item,harga_jual:harga,tipe_perhitungan:tipe,qty,lebar:lebar||null,tinggi:tinggi||null,panjang:panjang||null,tanggal_mulai:mulai,tanggal_selesai:selesai,durasi,subtotal};
}
function readItems(){return [...document.querySelectorAll('#items > .item')].map(itemData).filter(x=>x.kode&&x.item)}
function discount(){return Math.max(0,N(document.querySelector('#pmDisc')?.value))}
async function syncSchedule(d,itemId,x){let r=await d.from('penawaran_jadwal').delete().eq('item_id',itemId);if(r.error)throw r.error;r=await d.from('penawaran_jadwal').insert({item_id:itemId,qty:x.qty,tanggal_mulai:x.tanggal_mulai,tanggal_selesai:x.tanggal_selesai,durasi:x.durasi,subtotal:x.subtotal});if(r.error)throw r.error}
async function saveEdit(){
 const quoteId=S(window.__pmEditingQuotationId);if(!quoteId)return false;const d=DB();if(!d){toast('Supabase belum terhubung.');return true}
 const button=document.querySelector('button[onclick="saveQuote()"]');if(button?.dataset.pmEditBusy==='1')return true;if(button){button.dataset.pmEditBusy='1';button.disabled=true;button.dataset.originalText=button.dataset.originalText||button.textContent;button.textContent='Menyimpan perubahan...'}
 try{
  const f={nama_client:S(document.querySelector('#qc')?.value),perusahaan:S(document.querySelector('#qp')?.value),telepon:S(document.querySelector('#qw')?.value),whatsapp:S(document.querySelector('#qw')?.value),email:S(document.querySelector('#qe')?.value),nama_event:S(document.querySelector('#qeve')?.value),tanggal_mulai:S(document.querySelector('#qs')?.value)||null,tanggal_selesai:S(document.querySelector('#qe2')?.value)||null};
  if(!f.nama_client||!f.perusahaan||!f.nama_event)throw Error('Client, perusahaan, dan event wajib diisi.');if(f.tanggal_mulai&&f.tanggal_selesai&&f.tanggal_selesai<f.tanggal_mulai)throw Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
  const current=readItems();if(!current.length)throw Error('Minimal satu item harus dipilih.');
  const base=current.reduce((a,x)=>a+N(x.subtotal),0);const disc=Math.min(base,discount());const grand=Math.max(0,base-disc);const pct=base?disc/base*100:0;
  /* NEVER INSERT penawaran in edit mode. */
  let r=await d.from('penawaran').update({nama_client:f.nama_client,perusahaan:f.perusahaan,telepon:f.telepon,whatsapp:f.whatsapp,email:f.email,nama_event:f.nama_event,event_name:f.nama_event,tanggal_mulai:f.tanggal_mulai,tanggal_selesai:f.tanggal_selesai,subtotal:base,diskon:disc,discount:disc,nilai_diskon:disc,persen_diskon:pct,discount_percent:pct,grand_total:grand,total:grand}).eq('id',quoteId).select('id').single();
  if(r.error)throw r.error;if(!r.data?.id)throw Error('Penawaran tidak ditemukan atau tidak bisa diperbarui.');
  const oldResult=await d.from('penawaran_items').select('id,kode').eq('penawaran_id',quoteId).order('id',{ascending:true});if(oldResult.error)throw oldResult.error;
  const buckets=new Map();for(const old of oldResult.data||[]){const k=S(old.kode);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(old)}
  const kept=new Set();
  for(const x of current){
   const bucket=buckets.get(S(x.kode))||[];const reusable=bucket.shift();let itemId=reusable?.id;
   const payload={kode:x.kode,item:x.item,nama_item:x.item,harga_jual:x.harga_jual,harga:x.harga_jual,tipe_perhitungan:x.tipe_perhitungan,tipe:x.tipe_perhitungan,qty:x.qty,jumlah:x.qty,lebar:x.lebar,tinggi:x.tinggi,panjang:x.panjang,tanggal_mulai:x.tanggal_mulai,tanggal_selesai:x.tanggal_selesai,durasi:x.durasi,subtotal:x.subtotal};
   if(itemId){r=await d.from('penawaran_items').update(payload).eq('id',itemId).eq('penawaran_id',quoteId).select('id').single();if(r.error)throw r.error;kept.add(String(itemId));}
   else{r=await d.from('penawaran_items').insert({...payload,penawaran_id:quoteId}).select('id').single();if(r.error)throw r.error;itemId=r.data?.id;if(!itemId)throw Error(`Item ${x.kode} tidak mendapatkan ID.`);kept.add(String(itemId));}
   await syncSchedule(d,itemId,x);
  }
  for(const bucket of buckets.values())for(const old of bucket){const oldId=String(old.id);if(kept.has(oldId))continue;let z=await d.from('penawaran_jadwal').delete().eq('item_id',old.id);if(z.error)throw z.error;z=await d.from('penawaran_items').delete().eq('id',old.id).eq('penawaran_id',quoteId);if(z.error)throw z.error;}
  window.__pmEditingQuotationId=null;toast('Penawaran berhasil diperbarui. Tidak membuat penawaran baru.');if(typeof window.go==='function')window.go('history');return true;
 }catch(e){console.error('[PM] edit save error',e);toast('Gagal menyimpan perubahan: '+(e.message||e));return false}
 finally{if(button){button.disabled=false;button.textContent=button.dataset.originalText||'Simpan Penawaran';button.dataset.pmEditBusy='0'}}
}
const original=window.saveQuote;window.saveQuote=async function(){if(window.__pmEditingQuotationId)return saveEdit();return typeof original==='function'?original():toast('Fungsi simpan penawaran tidak tersedia.')};
document.addEventListener('click',e=>{const b=e.target.closest?.('button[onclick="saveQuote()"]');if(!b||!window.__pmEditingQuotationId)return;e.preventDefault();e.stopImmediatePropagation();saveEdit()},true);
window.__saveEditedQuotation=saveEdit;window.__PM_FINAL_EDIT_SAVE=true;
})();
