/* Priangan Multimedia — keep exactly one Margin Internal column in quotation history. */
(function(){
'use strict';
if(window.__PM_HISTORY_MARGIN_DEDUPE_FINAL)return;
window.__PM_HISTORY_MARGIN_DEDUPE_FINAL=true;
function clean(){
  const title=String(document.querySelector('#title')?.textContent||'').trim();
  if(!/^Riwayat Penawaran$/i.test(title))return;
  const table=document.querySelector('#content table');
  if(!table)return;
  const head=table.querySelector('thead tr');
  if(!head)return;
  const headers=[...head.children].filter(th=>/margin internal/i.test(String(th.textContent||'')));
  if(headers.length<=1)return;
  /* Keep the first Margin Internal column and remove every duplicate by column index. */
  const keep=headers[0];
  const all=[...head.children];
  headers.slice(1).forEach(th=>{
    const idx=all.indexOf(th);
    if(idx<0)return;
    th.remove();
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=[...tr.children];
      if(cells[idx])cells[idx].remove();
    });
  });
  table.dataset.pmMarginDedup='1';
}
function schedule(){[0,250,700,1500,3000].forEach(ms=>setTimeout(clean,ms))}
document.addEventListener('click',()=>setTimeout(clean,300),true);
new MutationObserver(()=>clean()).observe(document.body,{childList:true,subtree:true});
schedule();
})();
