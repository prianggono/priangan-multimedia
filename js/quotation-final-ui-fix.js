/* Priangan Multimedia — final quotation UI repair
 * 1) Keep Diskon (%) and Diskon (Rp) synchronized.
 * 2) Never leave a non-zero nominal discount paired with 0%.
 * 3) Route the Preview / Cetak A4 button through a reliable click handler.
 * Presentation/UI only; no database schema changes.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_FINAL_UI_FIX_V1) return;
  window.__PM_QUOTATION_FINAL_UI_FIX_V1 = true;

  const num = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const s = String(value ?? '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(num(value))));

  const fields = () => ({
    pct: document.querySelector('#pmDiscPct'),
    rp: document.querySelector('#pmDisc'),
    total: document.querySelector('#total'),
    grand: document.querySelector('#pmGrand')
  });

  function getBase(pct, rp) {
    let base = num(window.__pmDiscountBase);
    if (base > 0) return base;

    // Prefer the visible total when no explicit base has been exposed yet.
    const visibleTotal = num(pct?.dataset?.base || '') || num(document.querySelector('#pmDiscountBase')?.textContent);
    if (visibleTotal > 0) base = visibleTotal;

    const net = num(document.querySelector('#total')?.textContent);
    const p = num(pct?.value);
    const r = num(rp?.value);
    if (!base && p > 0 && p < 100 && net > 0) base = Math.round(net / (1 - p / 100));
    if (!base && r > 0 && net > 0) base = net + r;
    if (!base && net > 0) base = net;
    return Math.max(0, base);
  }

  function apply(base, discount) {
    const { pct, rp, total, grand } = fields();
    if (!pct || !rp) return;
    base = Math.max(0, Math.round(num(base)));
    discount = Math.max(0, Math.min(base, Math.round(num(discount))));
    const p = base ? (discount / base) * 100 : 0;
    const pText = Number.isInteger(p) ? String(p) : String(Number(p.toFixed(2)));
    pct.value = pText;
    rp.value = money(discount);
    const net = Math.max(0, base - discount);
    if (total) total.textContent = money(net);
    if (grand) grand.textContent = money(net);
    window.__pmDiscountBase = base;
    window.__pmDiscountPct = p;
    window.__pmDiscountValue = discount;
    window.__pmNetTotal = net;
  }

  function syncFromPct() {
    const { pct, rp } = fields();
    if (!pct || !rp) return;
    const base = getBase(pct, rp);
    const p = Math.max(0, Math.min(100, num(pct.value)));
    apply(base, Math.round(base * p / 100));
  }

  function syncFromRp() {
    const { pct, rp } = fields();
    if (!pct || !rp) return;
    const base = getBase(pct, rp);
    apply(base, Math.min(base, num(rp.value)));
  }

  function reconcile() {
    const { pct, rp } = fields();
    if (!pct || !rp) return;

    const pctValue = num(pct.value);
    const rpValue = num(rp.value);
    const base = getBase(pct, rp);
    if (!base) return;

    // While the user is editing one field, that field is authoritative.
    if (document.activeElement === pct) {
      const expected = Math.round(base * Math.max(0, Math.min(100, pctValue)) / 100);
      if (Math.abs(rpValue - expected) > 0) {
        rp.value = money(expected);
        window.__pmDiscountValue = expected;
        window.__pmNetTotal = Math.max(0, base - expected);
      }
      return;
    }
    if (document.activeElement === rp) {
      const expectedPct = base ? Math.min(100, Math.max(0, rpValue / base * 100)) : 0;
      const pText = Number.isInteger(expectedPct) ? String(expectedPct) : String(Number(expectedPct.toFixed(2)));
      if (num(pct.value) !== expectedPct) pct.value = pText;
      window.__pmDiscountPct = expectedPct;
      window.__pmDiscountValue = Math.round(Math.min(base, rpValue));
      window.__pmNetTotal = Math.max(0, base - Math.round(Math.min(base, rpValue)));
      return;
    }

    // On redraw/initial load, a non-zero nominal discount wins over a stale 0%.
    if (rpValue > 0 && pctValue === 0) {
      syncFromRp();
      return;
    }

    // Otherwise normalize both sides from the percentage.
    const expectedRp = Math.round(base * Math.max(0, Math.min(100, pctValue)) / 100);
    if (Math.abs(rpValue - expectedRp) > 0) apply(base, expectedRp);
  }

  function patchFields() {
    const { pct, rp } = fields();
    if (pct) {
      pct.type = 'text';
      pct.inputMode = 'decimal';
      pct.placeholder = '0';
      pct.setAttribute('autocomplete', 'off');
      pct.dataset.pmFinalDiscount = '1';
    }
    if (rp) {
      rp.type = 'text';
      rp.inputMode = 'numeric';
      rp.placeholder = 'Rp0';
      rp.setAttribute('autocomplete', 'off');
      rp.dataset.pmFinalDiscount = '1';
    }
  }

  // Capture phase is intentionally avoided here because an older discount
  // listener uses stopImmediatePropagation. Reconciliation below is resilient
  // to those older handlers and keeps the final DOM state correct.
  document.addEventListener('blur', (event) => {
    if (event.target?.id === 'pmDiscPct') syncFromPct();
    if (event.target?.id === 'pmDisc') syncFromRp();
  }, true);

  // Reliable Preview button. This runs before the inline onclick handler so a
  // stale/broken inline path cannot swallow the click.
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const label = String(button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!label.includes('preview') || !label.includes('cetak') || !label.includes('a4')) return;
    event.preventDefault();
    event.stopPropagation();
    try {
      reconcile();
      if (typeof window.printQuote === 'function') {
        Promise.resolve(window.printQuote()).catch((error) => {
          console.error('Final quotation preview error:', error);
          if (typeof window.msg === 'function') window.msg('Preview A4 gagal: ' + (error?.message || error));
        });
      } else if (typeof window.msg === 'function') {
        window.msg('Fungsi Preview A4 belum siap. Muat ulang halaman.');
      }
    } catch (error) {
      console.error('Final quotation preview handler error:', error);
      if (typeof window.msg === 'function') window.msg('Preview A4 gagal dibuka.');
    }
  }, true);

  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      patchFields();
      reconcile();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  [0, 150, 400, 800, 1500, 2500].forEach((ms) => setTimeout(() => {
    patchFields();
    reconcile();
  }, ms));

  // Some legacy handlers change input.value without emitting an observable
  // mutation. A lightweight interval closes that gap without touching the DB.
  let ticks = 0;
  const timer = setInterval(() => {
    patchFields();
    reconcile();
    if (++ticks > 120) clearInterval(timer);
  }, 250);
})();
