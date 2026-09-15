/* Priangan Multimedia — Level default + centimeter input
 * Master Harga supplies the initial/default Level price.
 * UI uses centimeters so operators can type 150 directly.
 * Stored item.level_tinggi remains in meters for compatibility.
 * Manual Level price edits remain authoritative.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_MASTER_DEFAULT__) return;
  window.__PM_LEVEL_MASTER_DEFAULT__ = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const raw = S(v).replace(/[^0-9,.-]/g,'');
    const normalized = raw.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };
  const CM = v => Math.max(0, N(v));
  const masters = () => Array.isArray(window.masters) ? window.masters : [];
  const items = () => Array.isArray(window.items) ? window.items : [];
  const money = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));

  function isLevelMaster(m){
    if(!m) return false;
    const t = `${S(m.item)} ${S(m.kategori)} ${S(m.kode)}`.toLowerCase();
    return /level/.test(t) && String(m.aktif).toLowerCase() !== 'false';
  }

  function range(m){
    const match = S(m.kode).match(/(\d+)\s*[-_]\s*(\d+)/);
    return match ? {min:Number(match[1]), max:Number(match[2])} : null;
  }

  function masterForCentimeters(cm){
    const candidates = masters()
      .filter(isLevelMaster)
      .map(m => ({m, r:range(m)}))
      .filter(x => x.r && cm >= x.r.min && cm <= x.r.max)
      .sort((a,b) => (a.r.max-a.r.min) - (b.r.max-b.r.min));
    return candidates[0]?.m || null;
  }

  function cardItem(target){
    const card = target?.closest?.('.item');
    if(!card) return {card:null,item:null};
    return {card,item:items().find(x => String(x.id) === String(card.dataset.itemId)) || null};
  }

  function applyDefault(item){
    if(!item?.level_enabled) return null;
    if(item.__level_price_auto === false && N(item.level_harga) > 0) return null;
    const master = masterForCentimeters(CM(N(item.level_tinggi) * 100));
    if(!master) return null;
    const price = N(master.harga_jual);
    if(price <= 0) return null;
    item.level_harga = price;
    item.level_master_harga_id = master.id;
    item.__level_price_auto = true;
    return master;
  }

  function render(card,item){
    if(!card || !item) return;
    const height = card.querySelector('.pm-led-level-height');
    const price = card.querySelector('.pm-led-level-price');
    const width = card.querySelector('.pm-led-level-width');
    const total = card.querySelector('.pm-led-level-subtotal');
    if(width) width.value = String(N(item.lebar));
    if(height){
      height.type = 'text';
      height.inputMode = 'numeric';
      height.setAttribute('autocomplete','off');
      height.setAttribute('inputmode','numeric');
      height.value = N(item.level_tinggi) > 0 ? String((N(item.level_tinggi)*100).toLocaleString('id-ID',{maximumFractionDigits:2})) : '';
      height.disabled = !item.level_enabled;
    }
    if(price){
      price.value = item.level_harga > 0 ? String(N(item.level_harga)) : '';
      price.disabled = !item.level_enabled;
      if(!item.level_harga) price.placeholder = 'Harga Master';
    }
    if(total){
      const subtotal = item.level_enabled ? N(item.lebar) * N(item.level_harga) * Math.max(1,N(item.qty)||1) : 0;
      total.textContent = money(subtotal);
      total.parentElement.style.display = item.level_enabled && N(item.level_harga) > 0 ? 'flex' : 'none';
    }
  }

  function handleHeight(input){
    const {card,item}=cardItem(input);
    if(!card || !item) return;
    const cm=CM(input.value);
    item.level_tinggi = cm / 100;
    if(item.__level_price_auto !== false){
      applyDefault(item);
    }
    render(card,item);
    if(typeof window.__PM_QUOTATION_UI_API?.updateTotal === 'function') window.__PM_QUOTATION_UI_API.updateTotal();
  }

  document.addEventListener('focusin', function(e){
    const input=e.target;
    if(!input?.matches?.('.pm-led-level-height')) return;
    input.type='text';
    input.inputMode='numeric';
    input.setAttribute('inputmode','numeric');
    input.value=N((cardItem(input).item?.level_tinggi || 0))*100 || '';
  }, true);

  document.addEventListener('change', function(e){
    const t=e.target;
    if(t?.matches?.('.pm-led-level-enabled')){
      const {card,item}=cardItem(t);
      if(item?.level_enabled) applyDefault(item);
      render(card,item);
    }
    if(t?.matches?.('.pm-led-level-height')) handleHeight(t);
  }, true);

  document.addEventListener('input', function(e){
    const t=e.target;
    if(!t?.matches?.('.pm-led-level-height')) return;
    handleHeight(t);
  }, true);

  function boot(){
    items().forEach(item=>{ if(item?.level_enabled) applyDefault(item); });
    document.querySelectorAll('#items > .item').forEach(card=>{
      const item=items().find(x=>String(x.id)===String(card.dataset.itemId));
      if(item?.level_enabled) render(card,item);
    });
  }

  window.addEventListener('load', boot);
  setTimeout(boot, 600);
})();
