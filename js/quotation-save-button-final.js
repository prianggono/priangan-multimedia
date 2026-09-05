/* Priangan Multimedia — quotation + invoice save schema bridge FINAL v3 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V3)return;
  window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V3=true;

  function numeric(v){
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }
  function money(v){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(numeric(v));}

  function patchAll(){
    try{if(typeof db!=='undefined'&&db)db.__pmInvoiceSchemaBridgeV3=true}catch(_){}
    try{if(window.db)window.db.__pmInvoiceSchemaBridgeV3=true}catch(_){}
    try{if(window.__PM_STABLE_DB)window.__PM_STABLE_DB.__pmInvoiceSchemaBridgeV3=true}catch(_){}
    try{if(window.__PRIANGAN_QUOTE_DB)window.__PRIANGAN_QUOTE_DB.__pmInvoiceSchemaBridgeV3=true}catch(_){}
  }
  patchAll();
  [100,300,800,1500,2500].forEach(ms=>setTimeout(patchAll,ms));

  function isQuoteSaveButton(el){return !!el&&el.tagName==='BUTTON'&&/simpan\s+penawaran/i.test((el.textContent||'').trim());}
  document.addEventListener('click',async function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isQuoteSaveButton(btn))return;
    const fn=window.saveQuote;if(typeof fn!=='function')return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const r=document.querySelector('#pmDisc');
    if(r)r.value=String(numeric(r.value));
    try{btn.disabled=true;await fn()}
    catch(e){console.error('[PM] quotation save bridge',e);if(typeof window.msg==='function')window.msg('Gagal menyimpan: '+(e?.message||e))}
    finally{btn.disabled=false;if(r)r.value=money(r.value)}
  },true);
})();
