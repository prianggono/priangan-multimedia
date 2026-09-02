/* Priangan Multimedia — quotation editor -> A4 print sync
 * Presentation-only bridge. Keeps the existing print engine, but makes the
 * A4 quotation reflect the same discount/net total shown in the editor.
 * No database writes and no changes to transaction logic.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_PRINT_SYNC_FINAL_V1)return;
window.__PM_QUOTATION_PRINT_SYNC_FINAL_V1=true;
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const S=v=>String(v??'').trim();
function totals(){
 const rows=[...document.querySelectorAll('#items > *')];
 let base=0;
 rows.forEach(row=>{const el=row.querySelector?.('[data-subtotal]');if(el)base+=N(el.textContent)})
 if(!base){const totalText=document.querySelector('#total')?.textContent||'';const disc=N(document.querySelector('#pmDisc')?.value);const pct=N(document.querySelector('#pmDiscPct')?.value);const net=N(totalText);if(pct>0)base=Math.round(net/(1-pct/100));else base=net+disc;}
 let disc=N(document.querySelector('#pmDisc')?.value);const pct=N(document.querySelector('#pmDiscPct')?.value);if(pct>0 && (!disc||window.__PM_DISC_MODE==='pct'))disc=Math.round(base*pct/100);disc=Math.max(0,Math.min(base,disc));return {base,disc,pct:base?disc/base*100:0,total:Math.max(0,base-disc)};
}
function sync(){
 const area=document.querySelector('#pmPrintArea');if(!area)return;
 const t=totals();
 const table=area.querySelector('.pm-items');if(!table)return;
 const tbody=table.querySelector('tbody');if(!tbody)return;
 const old=tbody.querySelector('.pm-discount-row');if(old)old.remove();
 const grand=tbody.querySelector('.pm-total');
 if(grand){
   const tr=document.createElement('tr');tr.className='pm-discount-row';
   tr.innerHTML=`<td colspan="5" class="right">DISKON${t.pct?` (${t.pct.toFixed(2)}%)`:''}</td><td class="right">- ${M(t.disc)}</td>`;
   tbody.insertBefore(tr,grand);
   const cells=grand.querySelectorAll('td');if(cells.length)cells[cells.length-1].textContent=M(t.total);
   const label=grand.querySelector('td');if(label)label.textContent='GRAND TOTAL';
 }
 const number=window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER;
 if(number){const tag=area.querySelector('.pm-doc-tag strong');if(tag)tag.textContent=S(number)}
 const styleId='pmQuotationPrintSyncStyle';if(!document.getElementById(styleId)){const st=document.createElement('style');st.id=styleId;st.textContent='.pm-items .pm-discount-row td{font-weight:700;color:#334155}.pm-items .pm-total td{font-weight:800}';document.head.appendChild(st)}
}
const original=window.printQuote;
if(typeof original==='function'){
 window.printQuote=async function(){const result=await original.apply(this,arguments);sync();return result};
}
window.pmSyncQuotationPrint=sync;
})();
