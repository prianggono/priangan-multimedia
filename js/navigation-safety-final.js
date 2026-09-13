/* Priangan Multimedia — final navigation safety guard */
(function(){
  'use strict';
  if(window.__PM_NAVIGATION_SAFETY_FINAL)return;
  window.__PM_NAVIGATION_SAFETY_FINAL=true;

  function isCreateQuotationButton(el){
    if(!el || el.tagName!=='BUTTON')return false;
    const text=String(el.textContent||'').trim().toUpperCase();
    return text.includes('BUAT PENAWARAN');
  }

  function openQuotation(){
    try{
      window.__pmEditingQuotationId=null;
      window.__PM_EDIT_QUOTATION_ID=null;
      window.__pmEditingQuotationNumber='';
      if(typeof window.go==='function'){
        window.go('quotation');
        return true;
      }
      if(typeof window.render==='function'){
        window.page='quotation';
        window.render();
        return true;
      }
    }catch(err){
      console.error('[PM] navigation safety guard:',err);
    }
    return false;
  }

  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isCreateQuotationButton(btn))return;

    /* Only take ownership of the create-quotation action from History.
       Other pages keep their normal button handlers. */
    const title=String(document.querySelector('#title')?.textContent||'').trim().toUpperCase();
    const isHistory=/RIWAYAT PENAWARAN/.test(title);
    if(!isHistory)return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    openQuotation();
  },true);
})();
