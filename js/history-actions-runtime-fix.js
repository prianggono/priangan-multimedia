/* PRIANGAN MULTIMEDIA — robust history Publish + DP actions */
(function(){
'use strict';
if(window.__PM_HISTORY_RUNTIME_FIX)return;
window.__PM_HISTORY_RUNTIME_FIX=true;
const S=v=>String(v??'').trim();
const N=v=>{const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||null}
async function resolveId(btn){
  const direct=(btn.getAttribute('data-id')||'').trim();
  if(/^\d+$/.test(direct))return Number(direct);
  const oc=S(btn.getAttribute('onclick'));
  const m=oc.match(/\b(?:publishQuotation|inputDP|inputPelunasan|editQuotation|deleteQuotation)\s*\(\s*(\d+)\s*\)/i);
  if(m)return Number(m[1]);
  const tr=btn.closest('tr');
  const source=tr?.classList.contains('pmActionDataRow')||tr?.classList.contains('pmHistoryActionRow')?tr.previousElementSibling:tr;
  const no=S(source?.children?.[0]?.textContent);
  if(!no)return null;
  const d=DB();if(!d)return null;
  const r=await d.from('penawaran').select('id').eq('nomor_penawaran',no).maybeSingle();
  if(r.error){console.error('[PM] resolve quotation id:',r.error);return null}
  return r.data?.id?Number(r.data.id):null;
}
async function publish(id){
 const d=DB();if(!d)return toast('Supabase belum terhubung.');
 const q=await d.from('penawaran').select('id,status').eq('id',id).maybeSingle();
 if(q.error)throw q.error;if(!q.data)return toast('Penawaran tidak ditemukan.');
 if(['TERKIRIM','PUBLISHED','SENT'].includes(S(q.data.status).toUpperCase()))return toast('Penawaran sudah dipublish.');
 const r=await d.from('penawaran').update({status:'TERKIRIM'}).eq('id',id);
 if(r.error)throw r.error;
 toast('Penawaran berhasil dipublish.');
 if(typeof window.renderHistory==='function')await window.renderHistory();else if(typeof window.go==='function')window.go('history');
}
async function dp(id){
 if(!Number.isFinite(Number(id)))return toast('ID penawaran tidak valid.');
 if(typeof window.inputDP==='function'&&window.inputDP.__pmRuntimeOriginal!==true){
   /* Call the existing payment UI with a verified numeric DB id. */
   return window.inputDP(Number(id));
 }
 return toast('Modul pembayaran belum siap.');
}
function install(){
 document.addEventListener('click',async e=>{
   const btn=e.target?.closest?.('button');if(!btn)return;
   const text=S(btn.textContent).toUpperCase();
   if(!['PUBLISH','DP'].includes(text))return;
   if(!/riwayat|penawaran/i.test(S(document.querySelector('#title')?.textContent)))return;
   if(btn.dataset.pmRuntimeBusy==='1')return;
   e.preventDefault();e.stopImmediatePropagation();btn.dataset.pmRuntimeBusy='1';
   try{
     const id=await resolveId(btn);
     if(!id)return toast('ID penawaran tidak ditemukan.');
     if(text==='PUBLISH')await publish(id);else await dp(id);
   }catch(err){console.error('[PM] history action failed:',err);toast('Gagal menjalankan '+text+': '+(err?.message||err));}
   finally{delete btn.dataset.pmRuntimeBusy}
 },true);
}
install();
})();