/* Priangan Multimedia — Canonical print preparation for quotation Level.
 * Ensure the live quotation UI is synchronized BEFORE printQuote builds the A4 preview.
 * This avoids stale expanded-card names when the item was loaded from History.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_PRINT_LEVEL_CANONICAL__)return;
  window.__PM_QUOTATION_PRINT_LEVEL_CANONICAL__=true;

  function syncBeforePrint(){
    try{
      const api=window.__PM_QUOTATION_UI_API;
      if(typeof api?.enhance==='function')api.enhance();
    }catch(e){console.error('[PM] quotation print pre-sync',e);}

    // The print builder reads the live quotation DOM. Make LED display names
    // authoritative from window.items immediately, without waiting for RAF.
    try{
      const list=Array.isArray(window.items)?window.items:[];
      const masters=Array.isArray(window.masters)?window.masters:[];
      const S=v=>String(v??'').trim();
      const masterFor=item=>{
        const id=item?.level_master_harga_id;
        return id==null?null:masters.find(m=>String(m.id)===String(id))||null;
      };
      list.forEach(item=>{
        if(!item?.level_enabled)return;
        const lm=masterFor(item);
        if(!lm)return;
        const name=`${S(item.item)||'Item'} + ${S(lm.item)}`;
        document.querySelectorAll('#items > .item').forEach(card=>{
          if(String(card.dataset.itemId)!==String(item.id))return;
          const el=card.querySelector('.pm-item-display-name');
          if(el)el.textContent=name;
        });
      });
    }catch(e){console.error('[PM] quotation print level name sync',e);}
  }

  function install(){
    const fn=window.printQuote;
    if(typeof fn!=='function')return false;
    if(fn.__pmPrintLevelPreSync)return true;
    const wrapped=function(){
      syncBeforePrint();
      return fn.apply(this,arguments);
    };
    wrapped.__pmPrintLevelPreSync=true;
    window.printQuote=wrapped;
    return true;
  }

  [0,100,250,500,1000,1500].forEach(ms=>setTimeout(install,ms));
  window.addEventListener('load',install);
  window.__PM_QUOTATION_PRINT_LEVEL_API={syncBeforePrint,install};
})();
