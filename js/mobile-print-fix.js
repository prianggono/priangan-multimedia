/* Priangan Multimedia — Mobile A4 Preview Stability Fix
 * Android/mobile: avoid fixed-overlay/compositor pressure during quotation preview.
 * Physical A4 dimensions remain reserved for the actual print phase.
 */
(function(){
  'use strict';
  if(window.__PM_MOBILE_PRINT_FIX_V2__) return;
  window.__PM_MOBILE_PRINT_FIX_V2__ = true;

  const mobile = () => window.matchMedia && window.matchMedia('(max-width:700px)').matches;

  function installMobilePreviewStyles(){
    if(!mobile() || document.getElementById('pmMobilePreviewStabilityV2')) return;
    const st=document.createElement('style');
    st.id='pmMobilePreviewStabilityV2';
    st.textContent=`
      @media (max-width:700px){
        /* Do not use a fixed composited full-screen print layer on Android. */
        #pmPrintPreview{
          position:absolute!important;
          inset:0 auto auto 0!important;
          width:100%!important;
          min-width:0!important;
          max-width:100%!important;
          height:auto!important;
          min-height:100dvh!important;
          max-height:none!important;
          overflow:visible!important;
          background:#e9edf3!important;
          transform:none!important;
          filter:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
        }
        #pmPrintPreview .pm-print-toolbar{
          position:relative!important;
          width:100%!important;
          box-sizing:border-box!important;
          transform:none!important;
          filter:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
        }
        #pmPrintPreview .pm-print-scroll{
          width:100%!important;
          max-width:100%!important;
          height:auto!important;
          max-height:none!important;
          overflow:visible!important;
          padding:10px!important;
          box-sizing:border-box!important;
          -webkit-overflow-scrolling:auto!important;
          touch-action:auto!important;
          overscroll-behavior:auto!important;
        }
        #pmPrintPreview .pm-a4{
          width:100%!important;
          min-width:0!important;
          max-width:100%!important;
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
          margin:0 auto!important;
          box-sizing:border-box!important;
          overflow:visible!important;
          transform:none!important;
          box-shadow:0 2px 12px rgba(15,23,42,.12)!important;
        }
        #pmPrintPreview .pm-letterhead,
        #pmPrintPreview .pm-info-card,
        #pmPrintPreview .pm-items,
        #pmPrintPreview .pm-terms,
        #pmPrintPreview .pm-signature{
          contain:layout style paint;
        }
        #pmPrintPreview .pm-letterhead{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
      }
    `;
    document.head.appendChild(st);
  }

  function normalizePreview(){
    if(!mobile()) return;
    installMobilePreviewStyles();
    const overlay=document.getElementById('pmPrintPreview');
    const area=document.getElementById('pmPrintArea');
    if(!overlay||!area) return;
    document.body.classList.add('pm-preview-open');
    document.body.style.overflow='auto';
    document.documentElement.style.overflow='auto';
    overlay.style.position='absolute';
    overlay.style.width='100%';
    overlay.style.minWidth='0';
    overlay.style.maxWidth='100%';
    overlay.style.height='auto';
    overlay.style.minHeight='100dvh';
    overlay.style.maxHeight='none';
    overlay.style.overflow='visible';
    area.style.width='100%';
    area.style.minWidth='0';
    area.style.maxWidth='100%';
    area.style.height='auto';
    area.style.minHeight='0';
    area.style.maxHeight='none';
    area.style.boxSizing='border-box';
    area.style.overflow='visible';
  }

  function wrapPreview(){
    const fn=window.printQuote;
    if(typeof fn!=='function'||fn.__pmMobilePreviewV2)return;
    const wrapped=function(){
      if(mobile()) installMobilePreviewStyles();
      const result=fn.apply(this,arguments);
      if(mobile()){
        normalizePreview();
        requestAnimationFrame(normalizePreview);
        setTimeout(normalizePreview,80);
      }
      return result;
    };
    wrapped.__pmMobilePreviewV2=true;
    window.printQuote=wrapped;
  }

  function wrapExecutePrint(){
    const fn=window.executePrintPreview;
    if(typeof fn!=='function'||fn.__pmMobilePreviewV2)return;
    const wrapped=async function(){
      if(!mobile()) return fn.apply(this,arguments);
      /* Mobile browsers are unreliable with JS-triggered native printing.
       * Keep the A4 preview interactive and let the browser's Share > Print
       * command handle the final print operation. */
      normalizePreview();
      const area=document.getElementById('pmPrintArea');
      if(area){
        const no=String(area.querySelector('.pm-doc-tag strong')?.textContent||window.__PM_LAST_QUOTATION_NUMBER||'Penawaran').trim();
        document.title='Penawaran - '+no;
      }
      return;
    };
    wrapped.__pmMobilePreviewV2=true;
    window.executePrintPreview=wrapped;
  }

  function install(){
    if(!mobile()) return;
    installMobilePreviewStyles();
    wrapPreview();
    wrapExecutePrint();
    normalizePreview();
  }

  [0,100,300,700,1200].forEach(ms=>setTimeout(install,ms));
  window.addEventListener('resize',()=>{if(mobile())normalizePreview();},{passive:true});
})();
