/* Priangan Multimedia — reliable quotation editor.
 * Loads saved quotation items directly into the normal quotation state.
 * Removes only exact accidental duplicate item rows before loading.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim(),N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}const c=window.PRIANGAN_CONFIG||{},u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);if(!u||!k||!window.supabase?.createClient)return null;window.__PRIANGAN_EDIT_DB ||= window.supabase.createClient(u,k);return window.__PRIANGAN_EDIT_DB}
function setVal(sel,val){const e=document.querySelector(sel);if(!e)return;e.value=val??'';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function fingerprint(x){return [x.kode,x.item,x.nama_item,x.harga_jual,x.tipe_perhitungan,x.tipe,x.qty,x.jumlah,x.lebar,x.tinggi,x.panjang,x.tanggal_mulai,x.tanggal_selesai,x.durasi,x.subtotal].map(S).join('|')}
async function removeExactDuplicates(d,quoteId,rows){const seen=new Set(),keep=[];for(const row of rows){const key=fingerprint(row);if(!seen.has(key)){seen.add(key);keep.push(row);continue}let z=await d.from('penawaran_jadwal').delete().eq('item_id',row.id);if(z.error)throw z.error;z=await d.from('penawaran_items').delete().eq('id',row.id).eq('penawaran_id',quoteId);if(z.error)throw z.error}return keep}
async function editQuotationFixed(id){
 const d=DB();if(!d)return toast('Supabase belum terhubung.');
 try{
  const q=await d.from('penawaran').select('*').eq('id',id).single();if(q.error)throw q.error;
  const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});if(r.error)throw r.error;
  const row=q.data||{};let saved=await removeExactDuplicates(d,id,r.data||[]);if(!saved.length)throw new Error('Penawaran ini belum memiliki item.');
  if(typeof window.go!=='function')throw new Error('Navigasi penawaran tidak tersedia.');

  window.__pmEditingQuotationId=id;
  window.__pmEditingQuotationNumber=S(row.nomor_penawaran||row.nomor||id);
  window.go('quotation');
  await wait(180);
  setVal('#qc',row.nama_client);setVal('#qp',row.perusahaan);setVal('#qw',row.whatsapp||row.telepon);setVal('#qe',row.email);setVal('#qeve',row.nama_event||row.event_name||row.event||row.project);setVal('#qs',row.tanggal_mulai);setVal('#qe2',row.tanggal_selesai);

  /* Replace the whole quotation state in one operation. No addItem/pick loop,
     so edit cannot create a blank item or reorder existing rows. */
  const loaded=saved.map(s=>({id:Date.now()+Math.random(),__savedItemId:s.id,kode:S(s.kode),item:S(s.item||s.nama_item),harga:N(s.harga_jual??s.harga),qty:N(s.qty??s.jumlah)||1,lebar:N(s.lebar),tinggi:N(s.tinggi),panjang:N(s.panjang),mulai:S(s.tanggal_mulai),selesai:S(s.tanggal_selesai),tipe:S(s.tipe_perhitungan||s.tipe||'qty').toLowerCase()||'qty'}));
  window.items=loaded;window.__pmItems=loaded;
  if(typeof window.drawItems==='function')window.drawItems();

  const savedDiscount=N(row.diskon);
  if(document.querySelector('#pmDisc')){document.querySelector('#pmDisc').value=savedDiscount;document.querySelector('#pmDisc').dispatchEvent(new Event('input',{bubbles:true}))}
  toast(`Mode edit aktif: ${window.__pmEditingQuotationNumber} — ${loaded.length} item dimuat. Tidak ada item kosong yang ditambahkan.`);
 }catch(e){window.__pmEditingQuotationId=null;console.error('Edit quotation fix:',e);toast('Gagal membuka penawaran: '+(e.message||e))}
}
window.editQuotation=editQuotationFixed;window.__PRIANGAN_EDIT_QUOTATION_FIXED=true;
})();
