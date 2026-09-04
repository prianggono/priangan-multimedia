/* Priangan Multimedia — FINAL A4 PDF header visibility fix */
(function(){
  'use strict';
  if(window.__PM_PDF_HEADER_FIX_FINAL)return;
  window.__PM_PDF_HEADER_FIX_FINAL=true;

  const id='pmPdfHeaderFixFinalStyles';
  function install(){
    if(document.getElementById(id))return;
    const style=document.createElement('style');
    style.id=id;
    style.textContent=`
      /* Keep the quotation letterhead physically inside the printable A4 page. */
      #pmPrintPreview .pm-a4{position:relative!important;top:auto!important;left:auto!important;transform:none!important;overflow:visible!important;}
      #pmPrintPreview .pm-letterhead{display:flex!important;position:relative!important;visibility:visible!important;opacity:1!important;break-inside:avoid!important;page-break-inside:avoid!important;}
      #pmPrintPreview .pm-top-accent{display:block!important;visibility:visible!important;}
      #pmPrintPreview .pm-logo-wrap,#pmPrintPreview .pm-letterhead .logo,#pmPrintPreview .pm-brand,#pmPrintPreview .pm-brand-name,#pmPrintPreview .pm-brand-sub,#pmPrintPreview .pm-brand p,#pmPrintPreview .pm-doc-tag{visibility:visible!important;}
      @media print{
        html,body{width:210mm!important;min-width:210mm!important;margin:0!important;padding:0!important;}
        #pmPrintPreview{position:absolute!important;inset:0!important;width:210mm!important;min-height:297mm!important;display:block!important;overflow:visible!important;background:#fff!important;}
        #pmPrintPreview .pm-print-scroll{display:block!important;position:static!important;width:210mm!important;height:auto!important;max-height:none!important;overflow:visible!important;padding:0!important;margin:0!important;}
        #pmPrintPreview .pm-a4{display:block!important;width:210mm!important;min-width:210mm!important;height:auto!important;min-height:297mm!important;margin:0!important;padding:13mm 14mm 11mm!important;box-sizing:border-box!important;overflow:visible!important;}
        #pmPrintPreview .pm-top-accent{display:block!important;height:4px!important;visibility:visible!important;}
        #pmPrintPreview .pm-letterhead{display:flex!important;visibility:visible!important;position:relative!important;width:100%!important;min-height:118px!important;height:auto!important;max-height:none!important;margin-bottom:0!important;overflow:visible!important;break-inside:avoid!important;page-break-inside:avoid!important;}
        #pmPrintPreview .pm-letterhead *{visibility:visible!important;}
        #pmPrintPreview .pm-title-row,#pmPrintPreview .pm-info-card,#pmPrintPreview .pm-opening,#pmPrintPreview .pm-items{break-inside:avoid!important;page-break-inside:avoid!important;}
      }
    `;
    document.head.appendChild(style);
  }

  install();
  document.addEventListener('DOMContentLoaded',install,{once:true});
  const observer=new MutationObserver(()=>{
    const preview=document.getElementById('pmPrintPreview');
    if(preview){install();}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
