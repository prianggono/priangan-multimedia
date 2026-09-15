/* Customer document display: show saved Level height in centimeters. */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_LEVEL_CM__) return;
  window.__PM_DOCUMENT_LEVEL_CM__ = true;

  const toCm = (value) => {
    const n = Number(String(value ?? '').replace(',', '.').replace(/[^0-9.\-]/g,''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  };

  function normalizeText(root){
    if(!root) return;
    root.querySelectorAll('strong').forEach(el=>{
      const text=String(el.textContent||'');
      const m=text.match(/^(.*?\s*\+\s*Level\s+)([0-9]+(?:[.,][0-9]+)?)\s*m$/i);
      if(!m) return;
      const cm=toCm(m[2]);
      if(cm>0) el.textContent=`${m[1]}${cm} cm`;
    });
  }

  function run(){
    normalizeText(document.querySelector('#pmPrintArea'));
    normalizeText(document.querySelector('#pmInvoiceArea'));
    normalizeText(document.querySelector('#pmInvoicePreview'));
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');
    if(!b) return;
    if(/Preview|Cetak|Invoice/i.test(String(b.textContent||''))) setTimeout(run,80);
  },true);
  window.addEventListener('beforeprint',run,true);
  window.addEventListener('load',run);
  run();
})();
