/* Priangan Multimedia — navigation safety guard */
(function(){
  'use strict';
  if(window.__PM_NAVIGATION_SAFETY_FINAL_V2)return;
  window.__PM_NAVIGATION_SAFETY_FINAL_V2=true;

  function isCreateQuotationButton(el){
    if(!el || el.tagName!=='BUTTON')return false;
    const text=String(el.textContent||'').trim().toUpperCase();
    return text.includes('BUAT PENAWARAN');
  }

  function isHistoryPage(){
    const title=String(document.querySelector('#title')?.textContent||'').trim().toUpperCase();
    return /RIWAYAT PENAWARAN/.test(title);
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

  function handleNavigation(ev){
    const btn=ev.target?.closest?.('button');
    if(!isCreateQuotationButton(btn) || !isHistoryPage())return;

    /* Navigate on the earliest pointer event so older click handlers cannot
       consume this action first. */
    ev.preventDefault();
    ev.stopImmediatePropagation();

    if(btn.dataset.pmQuotationNavBusy==='1')return;
    btn.dataset.pmQuotationNavBusy='1';
    openQuotation();
  }

  document.addEventListener('pointerdown',handleNavigation,true);
  document.addEventListener('click',handleNavigation,true);
})();
