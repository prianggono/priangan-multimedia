/* Priangan Multimedia — always start a fresh quotation from navigation.
 * Editing a saved quotation remains populated; opening "Buat Penawaran"
 * from the sidebar/dashboard clears the previous edit state and item list.
 */
(function(){
  'use strict';
  if(window.__PM_NEW_QUOTATION_RESET_FIX)return;
  window.__PM_NEW_QUOTATION_RESET_FIX=true;

  function resetForNewQuotation(){
    try{ window.__pmEditingQuotationId=null; }catch(_){}
    try{ window.__pmEditingQuotationNumber=null; }catch(_){}
    try{ window.__pmItems=[]; }catch(_){}
    try{
      if(typeof items!=='undefined') items=[];
    }catch(_){}
  }

  document.addEventListener('click',function(ev){
    const target=ev.target?.closest?.('button,a,[data-p]');
    if(!target)return;

    const page=String(target.getAttribute('data-p')||'').toLowerCase();
    const onclick=String(target.getAttribute('onclick')||'').toLowerCase();

    // Sidebar "Buat Penawaran" or dashboard shortcut: this is a new quote.
    if(page==='quotation' || /go\s*\(\s*['"]quotation['"]\s*\)/.test(onclick)){
      resetForNewQuotation();
    }
  },true);
})();
