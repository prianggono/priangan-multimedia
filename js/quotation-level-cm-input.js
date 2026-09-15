/* Priangan Multimedia — Level height in centimeters.
 * UI uses cm for easy operator entry: 150 = 1.5 m internally.
 * No observer, no timer and no redraw loop.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_CM_INPUT__) return;
  window.__PM_LEVEL_CM_INPUT__ = true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const n=Number(S(v).replace(/[^0-9-]/g,''));
    return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0})
    .format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];

  function levelMasterForCm(cm){
    if(cm<=0) return null;
    return masters().filter(m=>{
      const text=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();
      if(!/level/.test(text) || String(m?.aktif).toLowerCase()==='false') return false;
      const match=S(m?.kode).match(/(\d+)\s*[-_]\s*(\d+)/);
      return match && cm>=Number(match[1]) && cm<=Number(match[2]);
    })[0] || null;
  }

  function cardItem(input){
    const card=input?.closest?.('.item');
    if(!card) return null;
    return items().find(x=>String(x.id)===String(card.dataset.itemId))||null;
  }

  function activate(input){
    if(!input?.matches?.('.pm-led-level-height')) return;
    input.type='text';
    input.inputMode='numeric';
    input.autocomplete='off';
    const label=input.closest('.field')?.querySelector('label');
    if(label) label.textContent='Tinggi Level (cm)';

    const item=cardItem(input);
    if(item && document.activeElement===input){
      const cm=Math.round(Math.max(0,N(item.level_tinggi)*100));
      input.value=cm?String(cm):'';
    }
  }

  function updateCard(input,item){
    const card=input.closest('.item');
    if(!card) return;
    const total=card.querySelector('.pm-led-level-subtotal');
    if(total){
      const value=N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1);
      total.textContent=money(value);
    }
    if(typeof window.__PM_QUOTATION_UI_API?.updateTotal==='function'){
      window.__PM_QUOTATION_UI_API.updateTotal();
    }
  }

  document.addEventListener('focusin',e=>{
    if(e.target?.matches?.('.pm-led-level-height')) activate(e.target);
  },true);

  document.addEventListener('input',e=>{
    const input=e.target;
    if(!input?.matches?.('.pm-led-level-height')) return;

    activate(input);
    const raw=S(input.value).replace(/[^0-9]/g,'');
    if(input.value!==raw) input.value=raw;

    const cm=N(raw);
    const item=cardItem(input);
    if(!item) return;

    /* Store meters internally, while the operator enters centimeters. */
    item.level_tinggi=cm>0?cm/100:0;

    /* Master is only the default price. Manual price remains authoritative. */
    if(item.__level_price_auto!==false || N(item.level_harga)<=0){
      const master=levelMasterForCm(cm);
      if(master && N(master.harga_jual)>0){
        item.level_harga=N(master.harga_jual);
        item.level_master_harga_id=master.id;
        item.__level_price_auto=true;
      }
    }

    updateCard(input,item);
    e.stopImmediatePropagation();
  },true);

  document.addEventListener('change',e=>{
    if(!e.target?.matches?.('.pm-led-level-height')) return;
    activate(e.target);
  },true);
})();
