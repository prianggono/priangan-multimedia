/* PRIANGAN MULTIMEDIA — compact history actions/layout */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const idFrom=el=>{const m=S(el?.getAttribute('onclick')).match(/(?:editQuotation|publishQuotation|deleteQuotation|inputDP|inputPelunasan)\s*\(\s*(\d+)\s*\)/);return m?Number(m[1]):null};
  function normalizePaymentColumns(table){
    const head=table.querySelector('thead tr');
    if(!head)return;
    const headers=[...head.children];
    const seen={};
    const remove=[];
    headers.forEach((th,i)=>{
      const key=S(th.textContent).toUpperCase();
      if(key==='DP'||key==='DIBAYAR'){
        seen[key]=(seen[key]||0)+1;
        if(seen[key]>1)remove.push(i);
      }
    });
    remove.reverse().forEach(i=>{
      head.children[i]?.remove();
      table.querySelectorAll('tbody tr').forEach(tr=>tr.children[i]?.remove());
    });
  }
  function normalizeActions(table){
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=[...tr.children];
      const actionCell=cells.find(td=>td.querySelector('[onclick*="editQuotation"],[onclick*="publishQuotation"],[onclick*="deleteQuotation"],button'));
      if(!actionCell)return;
      const edit=[...actionCell.querySelectorAll('button')].find(b=>/edit/i.test(b.textContent));
      const publish=[...actionCell.querySelectorAll('button')].find(b=>/publish/i.test(b.textContent));
      const del=[...actionCell.querySelectorAll('button')].find(b=>/hapus/i.test(b.textContent));
      const id=idFrom(edit)||idFrom(publish)||idFrom(del);
      if(!id)return;
      actionCell.innerHTML=`<div class="pmCompactActions"><div class="pmCompactRow pmCompactTop"><button type="button" class="btn sm" data-action="edit">Edit</button>${publish?'<button type="button" class="btn green sm" data-action="publish">Publish</button>':'<span class="pmAlreadySent">Sudah diberikan</span>'}<button type="button" class="btn red sm" data-action="delete">Hapus</button></div><div class="pmCompactRow pmCompactBottom"><button type="button" class="btn secondary sm" data-action="dp">DP</button><button type="button" class="btn green sm" data-action="paid">Bayar</button></div></div>`;
      actionCell.querySelector('[data-action="edit"]').onclick=()=>window.editQuotation?.(id);
      actionCell.querySelector('[data-action="publish"]')?.addEventListener('click',()=>window.publishQuotation?.(id));
      actionCell.querySelector('[data-action="delete"]').onclick=()=>window.deleteQuotation?.(id);
      actionCell.querySelector('[data-action="dp"]').onclick=()=>window.inputDP?.(id);
      actionCell.querySelector('[data-action="paid"]').onclick=()=>window.inputPelunasan?.(id);
    });
  }
  function apply(){
    if(!/^Riwayat Penawaran$/i.test(S(document.querySelector('#title')?.textContent)))return;
    const tables=[...document.querySelectorAll('#content table')];
    tables.forEach(t=>{normalizePaymentColumns(t);normalizeActions(t);t.classList.add('pm-compact-history');});
  }
  const style=document.createElement('style');
  style.textContent=`
    .pm-compact-history{width:100%;table-layout:auto}
    .pm-compact-history th,.pm-compact-history td{vertical-align:middle}
    .pm-compact-history th:last-child,.pm-compact-history td:last-child{min-width:150px;width:150px}
    .pmCompactActions{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:5px!important;width:max-content!important;min-width:145px!important}
    .pmCompactRow{display:flex!important;align-items:center!important;gap:5px!important;flex-wrap:nowrap!important;height:30px!important}
    .pmCompactRow .btn{white-space:nowrap!important;margin:0!important}
    .pmCompactTop .btn.sm,.pmCompactBottom .btn.sm{padding:6px 9px!important;font-size:12px!important;line-height:1!important}
    .pmAlreadySent{font-size:11px!important;color:#7dd3fc!important;white-space:nowrap!important;padding:0 4px!important}
    @media(max-width:1050px){.pm-compact-history{min-width:1000px!important}.pm-compact-history th:last-child,.pm-compact-history td:last-child{min-width:145px!important;width:145px!important}}
  `;
  document.head.appendChild(style);
  const observer=new MutationObserver(apply);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(apply,150);
  setTimeout(apply,600);
  setTimeout(apply,1500);
})();
