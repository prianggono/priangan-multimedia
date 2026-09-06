/* Priangan Multimedia — final quotation UI repair
 * 1) Keep Diskon (%) and Diskon (Rp) synchronized.
 * 2) Never leave a non-zero nominal discount paired with 0%.
 * 3) Preview handling is owned by quotation-final-integration-fix.js.
 * Presentation/UI only; no database schema changes.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_FINAL_UI_FIX_V2) return;
  window.__PM_QUOTATION_FINAL_UI_FIX_V2 = true;

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

    if (rpValue > 0 && pctValue === 0) {
      syncFromRp();
      return;
    }

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

  document.addEventListener('blur', (event) => {
    if (event.target?.id === 'pmDiscPct') syncFromPct();
    if (event.target?.id === 'pmDisc') syncFromRp();
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

  let ticks = 0;
  const timer = setInterval(() => {
    patchFields();
    reconcile();
    if (++ticks > 120) clearInterval(timer);
  }, 250);
})();
