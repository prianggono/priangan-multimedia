/* Priangan Multimedia — quotation PDF filename FINAL v2
 * PDF filename always follows the visible quotation document number.
 * Printing never creates a new revision.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_PDF_FILENAME_FINAL_V2)return;
  window.__PM_QUOTATION_PDF_FILENAME_FINAL_V2=true;
  const S=v=>String(v??'').trim();
  function numberFromPreview(){
    const el=document.querySelector('#pmPrintPreview .pm-doc-tag strong');
    return S(el?.textContent||window.__PM_LAST_QUOTATION_NUMBER||window.__PM_PRINT_DOCUMENT_NUMBER);
  }
  function wrapPrint(){
    if(typeof window.print!=='function'||window.print.__pmQuotationPdfFilenameV2)return false;
    const original=window.print;
    const wrapped=function(){
      const no=numberFromPreview();
      if(no)window.__PM_PRINT_DOCUMENT_NUMBER=no;
      if(no)document.title=`Penawaran - ${no}`;
      try{return original.apply(this,arguments)}finally{if(no)document.title=`Penawaran - ${no}`;}
    };
    wrapped.__pmQuotationPdfFilenameV2=true;
    window.print=wrapped;
    return true;
  }
  function wrapPreview(){
    if(typeof window.printQuote!=='function'||window.printQuote.__pmQuotationPdfFilenameV2)return false;
    const original=window.printQuote;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      const no=numberFromPreview();
      if(no){window.__PM_PRINT_DOCUMENT_NUMBER=no;document.title=`Penawaran - ${no}`;}
      return result;
    };
    wrapped.__pmQuotationPdfFilenameV2=true;
    window.printQuote=wrapped;
    return true;
  }
  function boot(){wrapPreview();wrapPrint()}
  boot();[100,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
