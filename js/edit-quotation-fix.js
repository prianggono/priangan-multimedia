/* Reliable quotation edit loader: rebuild every saved item into the app's real lexical `items` array. */
(function(){
'use strict';
const S=v=>String(v??'').trim(),N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}const c=window.PRIANGAN_CONFIG||{},u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);if(!u||!k||!window.supabase?.createClient)return null;window.__PRIANGAN_EDIT_DB ||= window.supabase.createClient(u,k);return window.__PRIANGAN_EDIT_DB}
function setVal(sel,val){const e=document.querySelector(sel);if(!e)return;e.value=val??'';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function itemId(card){const s=card?.querySelector('button[onclick^="removeItem("]')?.getAttribute('onclick')||'',m=s.match(/removeItem\(([^)]+)\)/);return m?Number(m[1]):null}
async function editQuotationFixed(id){
 const d=DB();if(!d)return toast('Supabase belum terhubung.');
 try{
  const q=await d.from('penawaran').select('*').eq('id',id).single();if(q.error)throw q.error;
  const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});if(r.error)throw r.error;
  const row=q.data||{},saved=r.data||[];if(!saved.length)throw new Error('Penawaran ini belum memiliki item.');
  if(typeof window.go!=='function')throw new Error('Navigasi penawaran tidak tersedia.');
  window.go('quotation');await wait(120);
  setVal('#qc',row.nama_client);setVal('#qp',row.perusahaan);setVal('#qw',row.whatsapp||row.telepon);setVal('#qe',row.email);setVal('#qeve',row.nama_event||row.event_name||row.event||row.project);setVal('#qs',row.tanggal_mulai);setVal('#qe2',row.tanggal_selesai);
  /* Remove only the initial blank item from the actual app state. */
  const blankId=itemId(document.querySelector('#items .item'));if(blankId&&typeof window.removeItem==='function')window.removeItem(blankId);
  for(const s of saved){
   if(typeof window.addItem!=='function'||typeof window.pick!=='function'||typeof window.upd!=='function')throw new Error('Fungsi item penawaran tidak tersedia.');
   window.addItem();await wait(0);
   let card=[...document.querySelectorAll('#items .item')].at(-1),code=S(s.kode),idNow=itemId(card);
   if(!idNow)throw new Error('ID item form tidak tersedia.');
   if(code)window.pick(idNow,code);await wait(0);
   /* pick() redraws. Re-read the newest card and use upd(), which updates the real lexical item. */
   card=[...document.querySelectorAll('#items .item')].at(-1);idNow=itemId(card);if(!idNow)continue;
   const upd=(key,val)=>{if(val!==undefined&&val!==null&&val!=='')window.upd(idNow,key,val)};
   upd('lebar',N(s.lebar));upd('tinggi',N(s.tinggi));upd('panjang',N(s.panjang));upd('qty',N(s.qty)||1);upd('mulai',S(s.tanggal_mulai));upd('selesai',S(s.tanggal_selesai));
  }
  toast(`Mode edit aktif: ${S(row.nomor_penawaran||row.nomor||id)} — ${saved.length} item berhasil dimuat.`);
 }catch(e){console.error('Edit quotation fix:',e);toast('Gagal membuka penawaran: '+(e.message||e))}
}
window.editQuotation=editQuotationFixed;window.__PRIANGAN_EDIT_QUOTATION_FIXED=true;
})();
