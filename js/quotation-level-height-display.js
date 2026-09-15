/* Priangan Multimedia — Level height display normalization
 * Uses the user-entered Level height for customer-facing names.
 * Example: master "Level 120–200 cm" + 1.5m input => "LED Indoor P2.6 Hybrid + Level 1,5 m".
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_HEIGHT_DISPLAY__)return;
  window.__PM_LEVEL_HEIGHT_DISPLAY__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const items=()=>Array.isArray(window.items)?window.items:[];
  function heightText(v){
    const n=N(v); if(!(n>0)) return '';
    return `${n.toLocaleString('id-ID',{maximumFractionDigits:2})} m`;
  }
  function nameFor(item){
    const base=S(item?.item||item?.nama_item||'-');
    if(!item?.level_enabled)return base;
    const h=heightText(item?.level_tinggi);
    return h?`${base} + Level ${h}`:`${base} + Level`;
  }
  function findItemFromRow(row){
    const code=S(row.querySelector?.('td:nth-child(2) .pm-inv-sync-code')?.textContent);
    if(code)return items().find(x=>S(x.kode)===code)||null;
    const strong=S(row.querySelector?.('td:nth-child(2) strong')?.textContent);
    if(!strong)return null;
    return items().find(x=>S(x.item)===strong||S(x.nama_item)===strong)||null;
  }
  function patchQuotationCards(){
    document.querySelectorAll('#items > .item').forEach(card=>{
      const itemId=card.dataset.itemId;
      const item=items().find(x=>String(x.id)===String(itemId));
      if(!item)return;
      const name=nameFor(item);
      const el=card.querySelector('.pm-item-display-name');
      if(el)el.textContent=name;
      const summary=card.querySelector('.pm-item-summary strong');
      if(summary)summary.textContent=name;
    });
  }
  function patchDocument(area){
    if(!area)return;
    area.querySelectorAll('.pm-items tbody tr').forEach(row=>{
      const item=findItemFromRow(row); if(!item)return;
      const strong=row.querySelector('td:nth-child(2) strong');
      if(strong)strong.textContent=nameFor(item);
    });
    area.querySelectorAll('.pm-inv-sync-table tbody tr.pm-inv-sync-item').forEach(row=>{
      const item=findItemFromRow(row); if(!item)return;
      const strong=row.querySelector('td:nth-child(2) strong');
      if(strong)strong.textContent=nameFor(item);
    });
  }
  function refresh(){
    patchQuotationCards();
    patchDocument(document.querySelector('#pmPrintArea'));
    patchDocument(document.querySelector('#pmInvoiceArea'));
    patchDocument(document.querySelector('#pmInvoicePreview'));
  }
  function installPrintPatch(){
    const fn=window.printQuote;
    if(typeof fn!=='function'||fn.__pmLevelHeightDisplayWrapped)return false;
    return true;
  }
  function wrapWhenReady(){
    const fn=window.printQuote;
    if(typeof fn==='function'&&!fn.__pmLevelHeightDisplayWrapped){
      const wrapped=function(){
        const result=fn.apply(this,arguments);
        requestAnimationFrame(()=>{refresh();setTimeout(refresh,50);});
        return result;
      };
      wrapped.__pmLevelHeightDisplayWrapped=true;
      window.printQuote=wrapped;
    }
    return !!window.printQuote?.__pmLevelHeightDisplayWrapped;
  }
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))setTimeout(refresh,0);},true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('#items')&&e.target.classList?.contains('pm-led-level-height'))setTimeout(refresh,0);},true);
  [0,100,300,700,1200,2000].forEach(ms=>setTimeout(()=>{wrapWhenReady();refresh();},ms));
  window.addEventListener('load',()=>{wrapWhenReady();refresh();});
  window.__PM_LEVEL_HEIGHT_DISPLAY_API={refresh,nameFor,heightText,wrapWhenReady};
})();
