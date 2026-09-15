/* Priangan Multimedia — LED Level final authority
 * Single owner for Level UI on LED quotation cards.
 * Removes legacy Level UI created by quotation-ui-canonical.js.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_LEVEL_DIRECT_V5__) return;
  window.__PM_QUOTATION_LEVEL_DIRECT_V5__ = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v)
      .replace(/[^0-9,.-]/g,'')
      .replace(/\.(?=\d{3}(?:\D|$))/g,'')
      .replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = v => new Intl.NumberFormat('id-ID', {
    style:'currency', currency:'IDR', maximumFractionDigits:0
  }).format(Math.max(0, Math.round(N(v))));

  const items = () => Array.isArray(window.items) ? window.items : [];
  const cardItem = card => items().find(x => String(x.id) === String(card?.dataset.itemId));
  const isLEDText = it => /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/i.test(
    `${S(it?.item)} ${S(it?.kode)}`
  );
  const isLEDCard = card => !!card?.querySelector('.pm-led-set-field') || isLEDText(cardItem(card));
  const qty = it => Math.max(1, Math.round(N(it?.qty ?? it?.jumlah) || 1));

  function rentalDays(it){
    const start = S(it?.mulai ?? it?.tanggal_mulai);
    const end = S(it?.selesai ?? it?.tanggal_selesai);
    if(!start || !end) return 1;
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    if(Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 1;
    return Math.max(1, Math.round((b-a)/86400000) + 1);
  }

  function levelSubtotal(it){
    if(!it?.level_enabled) return 0;
    return N(it.lebar) * N(it.level_harga) * qty(it);
  }

  function ledSubtotal(it){
    return N(it.lebar) * N(it.tinggi) * N(it.harga ?? it.harga_jual) * qty(it) * rentalDays(it);
  }

  function baseSubtotal(it){
    if(isLEDText(it)) return Math.max(0, ledSubtotal(it) + levelSubtotal(it));
    const fn = window.__PM_QUOTATION_CORE?.itemSubtotal;
    return typeof fn === 'function' ? Math.max(0, N(fn(it))) : 0;
  }

  function discountNet(it){
    const base = baseSubtotal(it);
    const pct = Math.max(0, Math.min(100, N(it?.diskon_persen)));
    const rp = pct > 0
      ? Math.min(base, Math.round(base * pct / 100))
      : Math.min(base, Math.max(0, N(it?.diskon_nominal)));
    return Math.max(0, base - rp);
  }

  function markup(it){
    const on = !!it?.level_enabled;
    return `
      <div class="pm-led-level-head">
        <label class="pm-led-level-toggle">
          <input type="checkbox" class="pm-led-level-enabled" ${on ? 'checked' : ''}>
          <span>Gunakan Level</span>
        </label>
        <span class="pm-led-level-note">Opsional</span>
      </div>
      <div class="pm-led-level-fields">
        <div class="field">
          <label>Lebar Level (m)</label>
          <input class="pm-led-level-width" value="${N(it?.lebar)}" readonly>
        </div>
        <div class="field">
          <label>Tinggi Level (m)</label>
          <input class="pm-led-level-height" type="number" min="0" step="0.01"
                 value="${N(it?.level_tinggi) || 0}" ${on ? '' : 'disabled'}>
        </div>
        <div class="field">
          <label>Harga Level / m</label>
          <input class="pm-led-level-price" type="number" min="0" step="1"
                 value="${N(it?.level_harga) || ''}" placeholder="Masukkan harga" ${on ? '' : 'disabled'}>
        </div>
      </div>
      <div class="pm-led-level-total" style="display:${on && N(it?.level_harga) > 0 ? 'flex' : 'none'}">
        <span>Subtotal Level</span>
        <b class="pm-led-level-subtotal">${M(levelSubtotal(it))}</b>
      </div>`;
  }

  function addStyle(){
    if(document.getElementById('pm-led-level-direct-v5-style')) return;
    const st = document.createElement('style');
    st.id = 'pm-led-level-direct-v5-style';
    st.textContent = `
      #content .pm-led-level-box{margin-top:12px;padding:12px 14px;border:1px solid rgba(77,124,255,.28);border-radius:12px;background:rgba(64,89,150,.06)}
      #content .pm-led-level-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #content .pm-led-level-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}
      #content .pm-led-level-width[readonly]{opacity:.8}
      #content .pm-led-level-total{align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}
      #content .pm-led-level-total b{color:#35e6a5}
      #content .pm-led-level-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
      #content .pm-led-level-note{font-size:12px;color:var(--muted,#9aa7bd)}
      @media(max-width:760px){#content .pm-led-level-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function updateBox(card,it){
    const box = card?.querySelector('.pm-led-level-box');
    if(!box) return;
    const on = !!it?.level_enabled;
    const active = document.activeElement;
    const toggle = box.querySelector('.pm-led-level-enabled');
    const w = box.querySelector('.pm-led-level-width');
    const h = box.querySelector('.pm-led-level-height');
    const p = box.querySelector('.pm-led-level-price');
    const fields = box.querySelector('.pm-led-level-fields');
    const total = box.querySelector('.pm-led-level-total');
    const subtotal = box.querySelector('.pm-led-level-subtotal');

    if(toggle) toggle.checked = on;
    if(w) w.value = String(N(it?.lebar));
    if(h){
      h.disabled = !on;
      if(active !== h) h.value = N(it?.level_tinggi) || 0;
    }
    if(p){
      p.disabled = !on;
      if(active !== p) p.value = it?.level_harga ? String(N(it.level_harga)) : '';
    }
    if(fields) fields.style.display = 'grid';
    if(total) total.style.display = on && N(it?.level_harga) > 0 ? 'flex' : 'none';
    if(subtotal) subtotal.textContent = M(levelSubtotal(it));
  }

  function bind(card,it,box){
    if(box.dataset.pmLevelBound === '1') return;
    box.dataset.pmLevelBound = '1';

    box.querySelector('.pm-led-level-enabled')?.addEventListener('change', e => {
      it.level_enabled = !!e.target.checked;
      if(!it.level_enabled){
        it.level_harga = 0;
        it.level_tinggi = 0;
      }
      updateBox(card,it);
      recalc();
    });

    box.querySelector('.pm-led-level-height')?.addEventListener('input', e => {
      it.level_tinggi = Math.max(0, N(e.target.value));
      updateBox(card,it);
      recalc();
    });

    box.querySelector('.pm-led-level-price')?.addEventListener('input', e => {
      it.level_harga = Math.max(0, N(e.target.value));
      updateBox(card,it);
      recalc();
    });
  }

  function render(card,it){
    if(!card || !it || !isLEDCard(card)) return;

    let box = card.querySelector('.pm-led-level-box');

    /* Remove the old canonical Level UI completely. */
    if(box && box.querySelector('.pm-led-level-master')){
      box.remove();
      box = null;
    }

    if(!box){
      const dim = card.querySelector('.pm-item-body .dim');
      if(!dim) return;
      box = document.createElement('div');
      box.className = 'pm-led-level-box';
      box.innerHTML = markup(it);
      dim.insertAdjacentElement('afterend', box);
      bind(card,it,box);
    } else {
      updateBox(card,it);
    }
  }

  function recalc(){
    const rows = items().filter(x => S(x?.kode) && S(x?.item));
    const subtotal = rows.reduce((sum,it) => sum + baseSubtotal(it), 0);
    const itemDiscount = rows.reduce((sum,it) => sum + (baseSubtotal(it) - discountNet(it)), 0);
    const net = Math.max(0, subtotal - itemDiscount);
    const globalDiscount = Math.min(net, Math.max(0, N(window.__pmDiscountValue)));
    const total = Math.max(0, net - globalDiscount);

    window.__pmDiscountBase = net;
    window.__pmItemDiscountTotal = itemDiscount;
    window.__pmNetTotal = total;

    const totalEl = document.querySelector('#total');
    const grandEl = document.querySelector('#pmGrand');
    if(totalEl) totalEl.textContent = M(total);
    if(grandEl) grandEl.textContent = M(total);

    document.querySelectorAll('#items > .item').forEach(card => {
      const it = cardItem(card);
      if(!it) return;
      const sub = card.querySelector('.pm-item-body > .sum b');
      if(sub) sub.textContent = M(discountNet(it));
      const discRp = card.querySelector('.pm-item-discount-rp');
      if(discRp) discRp.value = M(baseSubtotal(it) - discountNet(it));
      updateBox(card,it);
    });
    return total;
  }

  function hydrate(){
    addStyle();
    const container = document.querySelector('#items');
    if(!container) return;
    container.querySelectorAll(':scope > .item').forEach(card => {
      const it = cardItem(card);
      if(it) render(card,it);
    });
    recalc();
  }

  function installObserver(){
    const container = document.querySelector('#items');
    if(!container || container.dataset.pmLevelObserverV5 === '1') return;
    container.dataset.pmLevelObserverV5 = '1';
    const observer = new MutationObserver(() => {
      clearTimeout(window.__PM_LED_LEVEL_TIMER_V5);
      window.__PM_LED_LEVEL_TIMER_V5 = setTimeout(hydrate, 0);
    });
    observer.observe(container,{childList:true,subtree:true});
    window.__PM_LED_LEVEL_OBSERVER_V5 = observer;
  }

  function boot(){
    addStyle();
    hydrate();
    installObserver();
    setTimeout(() => { hydrate(); installObserver(); }, 100);
    setTimeout(() => { hydrate(); }, 300);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  } else {
    boot();
  }

  window.__PM_QUOTATION_LEVEL_API = {hydrate,recalc,render,levelSubtotal};
})();
