/* Priangan Multimedia — reliable quotation editor.
 * Loads saved quotation items directly into the normal quotation state.
 * Removes only exact accidental duplicate item rows before loading.
 * Restores both saved discount percentage and nominal discount when editing.
 * Also persists the discount explicitly after save because the core save payload
 * historically omitted diskon/diskon_persen fields.
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
function savedDiscountPercent(row,discount){
  const explicit=N(row?.diskon_persen??row?.discount_percent??row?.persen_diskon);
  if(explicit>0)return Math.max(0,Math.min(100,Math.trunc(explicit)));
  const base=N(row?.subtotal);
  if(base>0&&discount>0)return Math.max(0,Math.min(100,Math.trunc((discount/base)*100)));
  const total=N(row?.total??row?.grand_total);
  if(total>0&&discount>0){
    const inferredBase=total+discount;
    return Math.max(0,Math.min(100,Math.trunc((discount/inferredBase)*100)));
  }
  return 0;
}
function readDiscountState(){
  const p=N(document.querySelector('#pmDiscPct')?.value);
  const r=N(document.querySelector('#pmDisc')?.value);
  const base=Math.max(0,N(window.__pmDiscountBase));
  let pct=p;
  let discount=r;
  if(window.__PM_DISC_MODE==='pct'&&base>0)discount=Math.round(base*Math.max(0,Math.min(100,p))/100);
  else if(!discount&&base>0&&p>0)discount=Math.round(base*Math.max(0,Math.min(100,p))/100);
  if(!pct&&base>0&&discount>0)pct=discount/base*100;
  return {base,discount:Math.max(0,discount),pct:Math.max(0,Math.min(100,pct)),total:Math.max(0,base-discount)};
}
async function persistSavedDiscount(d,id,state){
  if(!d||!id)return;
  const payload={
    subtotal:state.base,
    diskon:state.discount,
    diskon_persen:state.pct,
    diskon_nominal:state.discount,
    total:state.total,
    grand_total:state.total
  };
  const r=await d.from('penawaran').update(payload).eq('id',id);
  if(r.error)throw r.error;
}
async function restoreDiscount(row){
  const savedDiscount=Math.max(0,N(row?.diskon??row?.diskon_nominal));
  const savedPct=savedDiscountPercent(row,savedDiscount);
  const p=document.querySelector('#pmDiscPct');
  const r=document.querySelector('#pmDisc');
  window.__PM_DISC_MODE='pct';
  window.__pmDiscountPct=savedPct;
  window.__pmDiscountValue=savedDiscount;
  window.__pmDiscountBase=Math.max(0,N(row?.subtotal));
  if(p){
    p.value=String(savedPct);
    p.dispatchEvent(new Event('input',{bubbles:true}));
  }
  if(r){
    r.value=savedDiscount;
    r.dispatchEvent(new Event('change',{bubbles:true}));
  }
  window.__pmDiscountPct=savedPct;
  window.__pmDiscountValue=savedDiscount;
}
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
  setVal('#qc',row.nama_client);setVal('#qp',row.perusahaan);setVal('#qw',row.whatsapp||row.telepon_wa||row.telepon);setVal('#qe',row.email);setVal('#qeve',row.nama_event||row.event_name||row.event||row.project);setVal('#qs',row.tanggal_mulai);setVal('#qe2',row.tanggal_selesai);

  const loaded=saved.map(s=>({id:Date.now()+Math.random(),__savedItemId:s.id,kode:S(s.kode),item:S(s.item||s.nama_item),harga:N(s.harga_jual??s.harga),qty:N(s.qty??s.jumlah)||1,lebar:N(s.lebar),tinggi:N(s.tinggi),panjang:N(s.panjang),mulai:S(s.tanggal_mulai),selesai:S(s.tanggal_selesai),tipe:S(s.tipe_perhitungan||s.tipe||'qty').toLowerCase()||'qty'}));
  window.items=loaded;window.__pmItems=loaded;
  if(typeof window.drawItems==='function')window.drawItems();

  await wait(40); await restoreDiscount(row);
  await wait(80); await restoreDiscount(row);
  toast(`Mode edit aktif: ${window.__pmEditingQuotationNumber} — ${loaded.length} item dimuat. Diskon ${savedDiscountPercent(row,N(row.diskon))}% dipulihkan.`);
 }catch(e){window.__pmEditingQuotationId=null;console.error('Edit quotation fix:',e);toast('Gagal membuka penawaran: '+(e.message||e))}
}
function installSavePersistence(){
  if(typeof window.saveQuote!=='function'||window.saveQuote.__pmDiscountPersistenceV1)return false;
  const original=window.saveQuote;
  const wrapped=async function(){
    const d=DB();
    const editId=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    const beforeState=readDiscountState();
    const beforeIds=new Set();
    if(d){
      try{const q=await d.from('penawaran').select('id').order('id',{ascending:false}).limit(500);(q.data||[]).forEach(x=>beforeIds.add(String(x.id)))}catch(_){}
    }
    const result=await original.apply(this,arguments);
    if(!d)return result;
    try{
      let targetId=editId;
      if(!targetId){
        const q=await d.from('penawaran').select('id,nomor_penawaran').order('id',{ascending:false}).limit(20);
        const fresh=(q.data||[]).find(x=>!beforeIds.has(String(x.id)))||q.data?.[0];
        targetId=N(fresh?.id);
      }
      if(targetId)await persistSavedDiscount(d,targetId,beforeState);
    }catch(e){
      console.error('[PM] discount persistence:',e);
      toast('Penawaran tersimpan, tetapi sinkronisasi diskon gagal: '+(e.message||e));
    }
    return result;
  };
  wrapped.__pmDiscountPersistenceV1=true;
  window.saveQuote=wrapped;
  return true;
}
window.editQuotation=editQuotationFixed;
window.__PRIANGAN_EDIT_QUOTATION_FIXED=true;
installSavePersistence();
[100,300,700,1500,3000,5000].forEach(ms=>setTimeout(installSavePersistence,ms));
})();
