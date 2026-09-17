/* Priangan Multimedia — Mobile A4 Preview Stability Fix
 * Keeps screen preview responsive on Android/mobile browsers.
 * A4 physical dimensions are reserved for the actual print phase.
 */
(function(){
  'use strict';
  if(window.__PM_MOBILE_PRINT_FIX__) return;
  window.__PM_MOBILE_PRINT_FIX__ = true;

  const isMobile = () => window.matchMedia && window.matchMedia('(max-width:700px)').matches;

  function normalizePreview(){
    if(!isMobile()) return;
    const overlay = document.getElementById('pmPrintPreview');
    const area = document.getElementById('pmPrintArea');
    const scroll = overlay?.querySelector('.pm-print-scroll');
    if(!overlay || !area) return;

    // Do not keep the desktop physical A4 width during on-screen mobile preview.
    area.style.removeProperty('width');
    area.style.removeProperty('min-width');
    area.style.removeProperty('max-width');
    area.style.removeProperty('min-height');
    area.style.removeProperty('height');
    area.style.removeProperty('max-height');
    area.style.boxSizing = 'border-box';
    if(scroll){
      scroll.style.overflow = 'auto';
      scroll.style.webkitOverflowScrolling = 'touch';
      scroll.style.touchAction = 'pan-y';
    }
    overlay.style.touchAction = 'auto';
  }

  function wrapPrintQuote(){
    const fn = window.printQuote;
    if(typeof fn !== 'function' || fn.__pmMobilePrintFix) return !!fn;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      // Let the DOM/CSS settle before touching layout again.
      requestAnimationFrame(() => requestAnimationFrame(normalizePreview));
      return result;
    };
    wrapped.__pmMobilePrintFix = true;
    window.printQuote = wrapped;
    return true;
  }

  function wrapExecutePrint(){
    const fn = window.executePrintPreview;
    if(typeof fn !== 'function' || fn.__pmMobilePrintFix) return !!fn;
    const wrapped = async function(){
      // Android browsers can stall when print() is called in the same layout
      // turn that created a large fixed preview. Give rendering one clean turn.
      normalizePreview();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return fn.apply(this, arguments);
    };
    wrapped.__pmMobilePrintFix = true;
    window.executePrintPreview = wrapped;
    return true;
  }

  function install(){
    wrapPrintQuote();
    wrapExecutePrint();
    normalizePreview();
  }

  // Modules are loaded with defer; retry briefly until quotation core exposes APIs.
  [0, 100, 300, 700, 1200].forEach(ms => setTimeout(install, ms));
  window.addEventListener('resize', normalizePreview, {passive:true});
})();
