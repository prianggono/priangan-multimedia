/* Priangan Multimedia — Level master default bridge
 * Uses Master Harga only as the initial/default Level price.
 * Manual Level price edits remain authoritative.
 * Does not create observers or redraw quotation cards.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_MASTER_DEFAULT__) return;
  window.__PM_LEVEL_MASTER_DEFAULT__ = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const masters = () => Array.isArray(window.masters) ? window.masters : [];
  const items = () => Array.isArray(window.items) ? window.items : [];

  function levelMaster(m){
    if(!m) return false;
    const t = `${S(m.item)} ${S(m.kategori)} ${S(m.kode)}`.toLowerCase();
    return /level/.test(t) && String(m.aktif).toLowerCase() !== 'false';
  }

  function range(m){
    const match = S(m.kode).match(/(\d+)\s*[-_]\s*(\d+)/);
    return match ? { min:Number(match[1]), max:Number(match[2]) } : null;
  }

  function masterForHeight(height){
    const cm = N(height) * 100;
    if(cm <= 0) return null;
    const candidates = masters()
      .filter(levelMaster)
      .map(m => ({m, r:range(m)}))
      .filter(x => x.r && cm >= x.r.min && cm <= x.r.max)
      .sort((a,b) => (a.r.max-a.r.min) - (b.r.max-b.r.min));
    return candidates[0]?.m || null;
  }

  function applyDefault(item){
    if(!item?.level_enabled) return;
    if(item.__level_price_auto === false && N(item.level_harga) > 0) return;
    const m = masterForHeight(item.level_tinggi);
    if(!m) return;
    const price = N(m.harga_jual);
    if(price <= 0) return;
    item.level_harga = price;
    item.level_master_harga_id = m.id;
    item.__level_price_auto = true;
  }

  function cardItem(target){
    const card = target?.closest?.('.item');
    if(!card) return null;
    return items().find(x => String(x.id) === String(card.dataset.itemId)) || null;
  }

  function syncCard(card, item){
    if(!card || !item) return;
    const p = card.querySelector('.pm-led-level-price');
    if(p && document.activeElement !== p) p.value = item.level_harga ? String(N(item.level_harga)) : '';
    const t = card.querySelector('.pm-led-level-subtotal');
    if(t){
      const total = N(item.lebar) * N(item.level_harga) * Math.max(1, N(item.qty) || 1);
      t.textContent = new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(total)));
    }
  }

  function handle(target){
    const card = target?.closest?.('.item');
    const item = cardItem(target);
    if(!card || !item) return;
    applyDefault(item);
    syncCard(card,item);
    if(typeof window.__PM_QUOTATION_UI_API?.updateTotal === 'function') window.__PM_QUOTATION_UI_API.updateTotal();
  }

  document.addEventListener('change', function(e){
    if(e.target?.matches?.('.pm-led-level-enabled, .pm-led-level-height')) handle(e.target);
  });
  document.addEventListener('input', function(e){
    if(e.target?.matches?.('.pm-led-level-height')) handle(e.target);
  });

  function boot(){
    const list = items();
    list.forEach(item => {
      if(item?.level_enabled && N(item.level_harga) <= 0) applyDefault(item);
    });
    document.querySelectorAll('#items > .item').forEach(card => {
      const item = items().find(x => String(x.id) === String(card.dataset.itemId));
      if(item?.level_enabled){ applyDefault(item); syncCard(card,item); }
    });
  }
  window.addEventListener('load', boot);
  setTimeout(boot, 600);
})();
