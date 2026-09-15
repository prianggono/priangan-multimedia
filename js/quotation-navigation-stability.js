/* Priangan Multimedia — Quotation navigation stability
 * A normal click on "Buat Penawaran" always starts a fresh quotation.
 * History -> Edit continues to use its explicit edit route and is untouched.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_NAV_STABILITY__) return;
  window.__PM_QUOTATION_NAV_STABILITY__=true;

  document.addEventListener('click', function(event){
    const nav=event.target?.closest?.('.nav[data-p="quotation"]');
    if(!nav) return;

    window.__pmEditingQuotationId=null;
    window.__PM_EDIT_QUOTATION_ID=null;
    window.__pmEditingQuotationNumber=null;
    window.__PM_EDIT_QUOTATION_NUMBER=null;
    window.__PM_QUOTATION_OPEN_ITEM_ID=null;
    window.__PM_QUOTATION_AUTO_COLLAPSE=false;
    window.__PM_DISC_MODE='rp';
    window.__pmDiscountValue=0;
    window.__pmDiscountPct=0;
    window.__pmDiscountBase=0;
    window.__pmNetTotal=0;
    window.items=[];
  }, true);
})();
