/* Priangan Multimedia — internal margin indicator for quotation history. */
(function(){
'use strict';
if(window.__PM_HISTORY_MARGIN_INTERNAL)return;
window.__PM_HISTORY_MARGIN_INTERNAL=true;
const num=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').trim();if(!s)return 0;const n=Number(s.replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\.|,|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function getId(tr){const el=tr.querySelector('[onclick]');const m=String(el?.getAttribute('onclick')||'').match(/(?:editQuotation|publishQuotation|deleteQuotation|inputDP|inputPelunasan)\s*\(\s*(\d+)\s*\)/);return m?Number(m[1]):null}
async function apply(){if(!/^Riwayat Penawaran$/i.test(String(document.querySelector('#title')?.textContent||'')))return;if(typeof db==='undefined'||!db)return;const table=document.querySelector('#content table');if(!table||table.dataset.pmMargin==='1')return;const rows=[...table.querySelectorAll('tbody tr')].filter(tr=>!tr.classList.contains('pmHistoryActionRow'));const ids=rows.map(getId).filter(Boolean);if(!ids.length)return;
const ir=await db.from('penawaran_items').select('penawaran_id,kode,item,harga_jual,qty,subtotal').in('penawaran_id',ids);if(ir.error)return;const mr=await db.from('master_harga').select('kode,item,harga_modal');const masters=mr.error?[]:(mr.data||[]);const byId={};(ir.data||[]).forEach(i=>(byId[i.penawaran_id]??=[]).push(i));
const head=table.querySelector('thead tr');if(head){const th=document.createElement('th');th.className='pm-history-margin-head';th.textContent='Margin Internal';head.appendChild(th)}
rows.forEach(tr=>{const id=getId(tr);if(!id)return;const list=byId[id]||[];let cost=0,total=0,missing=false;list.forEach(i=>{const m=masters.find(x=>String(x.kode||'').trim()===String(i.kode||'').trim())||masters.find(x=>String(x.item||'').trim()===String(i.item||'').trim());const unit=num(m?.harga_modal);if(unit<=0)missing=true;const sale=num(i.harga_jual),sub=num(i.subtotal);const multiplier=sale>0?sub/sale:Math.max(1,num(i.qty)||1);cost+=unit*multiplier;total+=sub});const margin=total>0?(total-cost)/total*100:0;const cls=missing?'warn':margin>=20?'good':'bad';const td=document.createElement('td');td.className='pm-history-margin-cell';td.innerHTML=`<span class="pm-history-margin ${cls}">${missing?'—':margin.toFixed(1)+'%'}</span><small>${missing?'MODAL?':margin>=20?'AMAN':'RENDAH'}</small>`;tr.appendChild(td)});table.dataset.pmMargin='1'}
function schedule(){[200,700,1600,3000].forEach(ms=>setTimeout(apply,ms))}document.addEventListener('click',()=>setTimeout(apply,1200),true);schedule();
}());
