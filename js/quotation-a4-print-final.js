/* Priangan Multimedia — FINAL A4 print geometry + letterhead visibility */
(function(){
  'use strict';
  if(window.__PM_A4_PRINT_FINAL_V1)return;
  window.__PM_A4_PRINT_FINAL_V1=true;

  const style=document.createElement('style');
  style.id='pmA4PrintFinalStyles';
  style.textContent=`
    /* Screen preview remains A4-sized */
    #pmPrintPreview .pm-a4{
      width:210mm!important;
      min-width:210mm!important;
      height:297mm!important;
      min-height:297mm!important;
      max-height:297mm!important;
      box-sizing:border-box!important;
      margin:0 auto!important;
      padding:10mm 12mm 9mm!important;
      overflow:hidden!important;
      position:relative!important;
      background:#fff!important;
    }
    #pmPrintPreview .pm-letterhead{
      display:flex!important;
      visibility:visible!important;
      opacity:1!important;
      position:relative!important;
      width:100%!important;
      min-height:112px!important;
      height:112px!important;
      max-height:112px!important;
      box-sizing:border-box!important;
      overflow:visible!important;
      flex:none!important;
      z-index:10!important;
    }
    #pmPrintPreview .pm-letterhead *{
      visibility:visible!important;
      opacity:1!important;
    }
    #pmPrintPreview .pm-top-accent{display:block!important;visibility:visible!important;}

    @page{
      size:A4 portrait;
      margin:0;
    }

    @media print{
      html,body{
        width:210mm!important;
        height:297mm!important;
        min-width:210mm!important;
        min-height:297mm!important;
        max-width:210mm!important;
        max-height:297mm!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
      }
      #pmPrintPreview{
        position:absolute!important;
        left:0!important;
        top:0!important;
        width:210mm!important;
        height:297mm!important;
        min-height:297mm!important;
        max-height:297mm!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        display:block!important;
        background:#fff!important;
      }
      #pmPrintPreview .pm-print-scroll{
        position:static!important;
        width:210mm!important;
        height:297mm!important;
        max-height:297mm!important;
        margin:0!important;
        padding:0!important;
        overflow:hidden!important;
        display:block!important;
      }
      #pmPrintPreview .pm-a4{
        width:210mm!important;
        height:297mm!important;
        min-width:210mm!important;
        min-height:297mm!important;
        max-width:210mm!important;
        max-height:297mm!important;
        margin:0!important;
        padding:10mm 12mm 9mm!important;
        box-sizing:border-box!important;
        overflow:hidden!important;
        box-shadow:none!important;
        display:block!important;
        position:relative!important;
      }
      #pmPrintPreview .pm-top-accent{
        display:block!important;
        width:auto!important;
        height:4px!important;
        margin:-10mm -12mm 8mm!important;
        visibility:visible!important;
      }
      #pmPrintPreview .pm-letterhead{
        display:flex!important;
        visibility:visible!important;
        opacity:1!important;
        width:100%!important;
        height:112px!important;
        min-height:112px!important;
        max-height:112px!important;
        margin:0!important;
        padding:8px 14px!important;
        box-sizing:border-box!important;
        overflow:visible!important;
        position:relative!important;
        z-index:999!important;
        break-inside:avoid!important;
        page-break-inside:avoid!important;
        -webkit-print-color-adjust:exact!important;
        print-color-adjust:exact!important;
      }
      #pmPrintPreview .pm-letterhead::before,
      #pmPrintPreview .pm-letterhead::after{display:block!important;visibility:visible!important;}
      #pmPrintPreview .pm-logo-wrap,
      #pmPrintPreview .pm-letterhead .logo,
      #pmPrintPreview .pm-brand,
      #pmPrintPreview .pm-brand-name,
      #pmPrintPreview .pm-brand-sub,
      #pmPrintPreview .pm-brand p,
      #pmPrintPreview .pm-doc-tag{
        display:block!important;
        visibility:visible!important;
        opacity:1!important;
      }
      #pmPrintPreview .pm-logo-wrap{display:flex!important;}
      #pmPrintPreview .pm-letterhead .logo{object-fit:contain!important;}
      #pmPrintPreview .pm-title-row{margin-top:12px!important;}
    }
  `;
  document.head.appendChild(style);

  function enforce(){
    const area=document.querySelector('#pmPrintArea');
    if(!area)return;
    area.style.width='210mm';
    area.style.height='297mm';
    area.style.minHeight='297mm';
    area.style.maxHeight='297mm';
    area.style.boxSizing='border-box';
    const head=area.querySelector('.pm-letterhead');
    if(head){
      head.style.display='flex';
      head.style.visibility='visible';
      head.style.opacity='1';
      head.style.height='112px';
      head.style.minHeight='112px';
      head.style.maxHeight='112px';
      head.style.overflow='visible';
      head.querySelectorAll('*').forEach(el=>{
        el.style.visibility='visible';
        el.style.opacity='1';
      });
    }
  }

  document.addEventListener('click',function(e){
    if(e.target.closest('.pm-print'))setTimeout(enforce,100);
  },true);
  const observer=new MutationObserver(enforce);
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
