/* Priangan Multimedia — quotation PDF filename FINAL
 * PDF filename always follows the visible quotation document number.
 * Never invents a new revision during printing.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_PDF_FILENAME_FINAL)return;
  window.__PM_QUOTATION_PDF_FILENAME_FINAL=true;
  const S=v=>String(v??'').trim();
  function numberFromPreview(){
    const el=document.querySelector('#pmPrintPreview .pm-doc-tag strong');
    return S(el?.textContent||window.__PM_LAST_QUOTATION_NUMBER||window.__PM_PRINT_DOCUMENT_NUMBER);
  }
  function forceTitle(){
    const no=numberFromPreview();
    if(no)document.title=`Penawaran - ${no}`;
    return no;
  }
  function wrapPrint(){
    if(typeof window.print!=='function'||window.print.__pmQuotationPdfFilename)return false;
    const original=window.print;
    const wrapped=function(){
      const no=forceTitle();
      try{return original.apply(this,arguments)}finally{if(no)document.title=`Penawaran - ${no}`;}
    };
    wrapped.__pmQuotationPdfFilename=true;
    window.print=wrapped;
    return true;
  }
  function wrapPreview(){
    if(typeof window.printQuote!=='function'||window.printQuote.__pmQuotationPdfFilename)return false;
    const original=window.printQuote;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      const no=numberFromPreview();
      if(no){window.__PM_PRINT_DOCUMENT_NUMBER=no;document.title=`Penawaran - ${no}`;}
      return result;
    };
    wrapped.__pmQuotationPdfFilename=true;
    window.printQuote=wrapped;
    return true;
  }
  function boot(){wrapPreview();wrapPrint()}
  boot();[100,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
