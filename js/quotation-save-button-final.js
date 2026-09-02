/* Priangan Multimedia — quotation save button final bridge
 * Keeps the Rupiah display on #pmDisc while ensuring the existing canonical
 * saveQuote() handler receives a plain numeric value. Does not replace the
 * quotation save engine or touch database schema.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V1)return;
  window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V1=true;

  function numeric(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }
  function money(v){
    return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(numeric(v));
  }
  function isSaveButton(el){
    if(!el || el.tagName!=='BUTTON')return false;
    return /simpan\s+penawaran/i.test((el.textContent||'').trim());
  }

  document.addEventListener('click',async function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isSaveButton(btn))return;
    const fn=window.saveQuote;
    if(typeof fn!=='function')return;

    /* Stop the inline onclick="saveQuote()" from firing a second time. */
    ev.preventDefault();
    ev.stopImmediatePropagation();

    const r=document.querySelector('#pmDisc');
    const oldValue=r?.value;
    if(r)r.value=String(numeric(r.value));

    try{
      btn.disabled=true;
      await fn();
    }catch(e){
      console.error('[PM] quotation save bridge',e);
      if(typeof window.msg==='function')window.msg('Gagal menyimpan: '+(e?.message||e));
    }finally{
      btn.disabled=false;
      if(r){
        const value=numeric(r.value||oldValue);
        r.value=money(value);
      }
    }
  },true);
})();
