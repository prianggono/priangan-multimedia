/* PRIANGAN MULTIMEDIA — robust history actions + renderer */
(function(){
'use strict';
if(window.__PM_HISTORY_RUNTIME_FIX_V2)return;
window.__PM_HISTORY_RUNTIME_FIX_V2=true;
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null}

async function resolveId(btn){
  const direct=S(btn.getAttribute('data-id'));
  if(/^\d+$/.test(direct))return Number(direct);
  const oc=S(btn.getAttribute('onclick'));
  const m=oc.match(/\b(?:publishQuotation|inputDP|inputPelunasan|editQuotation|deleteQuotation)\s*\(\s*(\d+)\s*\)/i);
  if(m)return Number(m[1]);
  const tr=btn.closest('tr');
  const no=S(tr?.children?.[0]?.textContent);
  if(!no)return null;
  const d=DB();if(!d)return null;
  const r=await d.from('penawaran').select('id').eq('nomor_penawaran',no).maybeSingle();
  if(r.error){console.error('[PM] resolve quotation id:',r.error);return null}
  return r.data?.id?Number(r.data.id):null;
}

async function publish(id){
  const d=DB();if(!d)return toast('Supabase belum terhubung.');
  const q=await d.from('penawaran').select('id,status').eq('id',id).maybeSingle();
  if(q.error)throw q.error;
  if(!q.data)return toast('Penawaran tidak ditemukan.');
  if(['TERKIRIM','PUBLISHED','SENT'].includes(S(q.data.status).toUpperCase()))return toast('Penawaran sudah dipublish.');
  const r=await d.from('penawaran').update({status:'TERKIRIM'}).eq('id',id);
  if(r.error)throw r.error;
  toast('Penawaran berhasil dipublish.');
  await renderHistory();
}

async function dp(id){
  if(!Number.isFinite(Number(id)))return toast('ID penawaran tidak valid.');
  if(typeof window.inputDP==='function'&&window.inputDP.__pmRuntimeOriginal!==true)return window.inputDP(Number(id));
  return toast('Modul pembayaran belum siap.');
}

async function renderHistory(){
  const d=DB();if(!d)return toast('Supabase belum terhubung.');
  try{
    const q=await d.from('penawaran').select('*').order('id',{ascending:false});
    if(q.error)throw q.error;
    const rows=q.data||[];
    const title=document.querySelector('#title');if(title)title.textContent='Riwayat Penawaran';
    document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='history'));
    const content=document.querySelector('#content');if(!content)return;
    const html=rows.map(r=>{
      const id=Number(r.id)||0;
      const st=S(r.status||'DRAFT').toUpperCase();
      const sent=['TERKIRIM','PUBLISHED','SENT'].includes(st);
      return `<tr>
        <td>${E(r.nomor_penawaran||'-')}</td>
        <td>${E(S(r.tanggal_penawaran||r.created_at||r.tanggal_mulai).slice(0,10))}</td>
        <td>${E(r.nama_client||'-')}</td>
        <td>${E(r.perusahaan||'-')}</td>
        <td>${E(r.nama_event||r.event_name||r.name_event||'-')}</td>
        <td>${M(r.grand_total??r.total)}</td>
        <td>${E(sent?'TERKIRIM':st)}</td>
        <td><div class="pmHistoryActions">
          <button class="btn sm" type="button" onclick="editQuotation(${id})">Edit</button>
          ${sent?'':`<button class="btn green sm" type="button" data-id="${id}" onclick="publishQuotation(${id})">Publish</button>`}
          <button class="btn secondary sm" type="button" data-id="${id}" onclick="inputDP(${id})">DP</button>
          <button class="btn red sm" type="button" data-id="${id}" onclick="deleteQuotation(${id})">Hapus</button>
        </div></td>
      </tr>`;
    }).join('');
    content.innerHTML=`<div class="head"><div><h1>Riwayat Penawaran</h1><p>Data tersimpan di Supabase.</p></div><button class="btn" type="button" onclick="go('quotation')">+ Buat Penawaran</button></div>
    <div class="card"><div class="scroll"><table class="table"><thead><tr><th>No</th><th>Tanggal</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${html||'<tr><td colspan="8" class="empty">Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
  }catch(e){console.error('[PM] history render failed:',e);toast('Gagal membaca riwayat: '+(e.message||e));}
}

window.renderHistory=renderHistory;

function scheduleRender(){
  if(scheduleRender.timer)return;
  scheduleRender.timer=setTimeout(()=>{scheduleRender.timer=null;const title=S(document.querySelector('#title')?.textContent);const hasActions=!!document.querySelector('#content .pmHistoryActions');if(/riwayat penawaran/i.test(title)&&!hasActions)renderHistory();},40);
}

function install(){
  document.addEventListener('click',async e=>{
    const btn=e.target?.closest?.('button');if(!btn)return;
    const text=S(btn.textContent).toUpperCase();
    if(!['PUBLISH','DP'].includes(text))return;
    const title=S(document.querySelector('#title')?.textContent);
    if(!/riwayat|penawaran/i.test(title))return;
    if(btn.dataset.pmRuntimeBusy==='1')return;
    e.preventDefault();e.stopImmediatePropagation();btn.dataset.pmRuntimeBusy='1';
    try{
      const id=await resolveId(btn);
      if(!id)return toast('ID penawaran tidak ditemukan.');
      if(text==='PUBLISH')await publish(id);else await dp(id);
    }catch(err){console.error('[PM] history action failed:',err);toast('Gagal menjalankan '+text+': '+(err?.message||err));}
    finally{delete btn.dataset.pmRuntimeBusy}
  },true);

  document.addEventListener('click',e=>{
    const nav=e.target?.closest?.('[data-p="history"]');
    if(nav)setTimeout(renderHistory,80);
  },true);

  const mo=new MutationObserver(scheduleRender);
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{const title=S(document.querySelector('#title')?.textContent);if(/riwayat penawaran/i.test(title))renderHistory();},150);
}
install();
})();