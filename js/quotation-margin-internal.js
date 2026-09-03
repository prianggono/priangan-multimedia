/* Priangan Multimedia — internal quotation margin guard.
 * Uses Master Harga cost data only; this panel is never included in customer output.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_MARGIN_INTERNAL) return;
  window.__PM_QUOTATION_MARGIN_INTERNAL = true;

  const number = (value) => {
    const clean = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/./g, '').replace(',', '.');
    const parsed = Number(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(number(value));
  const text = (value) => String(value ?? '').trim();

  function dayCount(start, end) {
    if (!start || !end) return 1;
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    const days = Math.round((b - a) / 86400000) + 1;
    return Number.isFinite(days) ? Math.max(1, days) : 1;
  }

  function currentMasters() {
    try {
      if (typeof masters !== 'undefined' && Array.isArray(masters)) return masters;
    } catch (_) {}
    return Array.isArray(window.masters) ? window.masters : [];
  }

  function currentItems() {
    try {
      if (typeof items !== 'undefined' && Array.isArray(items)) return items;
    } catch (_) {}
    return Array.isArray(window.items) ? window.items : [];
  }

  function typeFor(item, master) {
    return text(item.tipe || item.tipe_perhitungan || master?.tipe_perhitungan || master?.tipe || 'qty').toLowerCase();
  }

  function masterFor(item, allMasters) {
    const code = text(item.kode);
    return allMasters.find((master) => text(master.kode) === code) ||
      allMasters.find((master) => text(master.item) === text(item.item)) || null;
  }

  function itemCost(item, master) {
    const unitCost = number(item.harga_modal ?? master?.harga_modal);
    const days = dayCount(text(item.mulai || item.tanggal_mulai), text(item.selesai || item.tanggal_selesai));
    const qty = Math.max(1, number(item.qty ?? item.jumlah) || 1);
    const width = number(item.lebar);
    const height = number(item.tinggi);
    const length = number(item.panjang);
    const type = typeFor(item, master);

    if (type === 'luas') return width * height * unitCost * days;
    if (type === 'rigging') return ((length * 2) + (height * 2)) * unitCost * days;
    if (type === 'level') return width * unitCost * days;
    return qty * unitCost * days;
  }

  function render() {
    const totalElement = document.querySelector('#total');
    if (!totalElement) return;

    const card = totalElement.closest('.card');
    const discountBox = document.querySelector('#pmDiscount');
    if (!card || !discountBox) return;

    let panel = document.querySelector('#pmInternalMargin');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'pmInternalMargin';
      panel.className = 'no-print';
      panel.style.cssText = 'margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:10px;background:rgba(12,20,40,.45)';
      discountBox.insertAdjacentElement('afterend', panel);
    }

    const quoteItems = currentItems().filter((item) => text(item.kode) || text(item.item));
    const allMasters = currentMasters();
    const details = quoteItems.map((item) => ({ item, master: masterFor(item, allMasters) }));
    const missingCost = details.filter(({ master, item }) => number(item.harga_modal ?? master?.harga_modal) <= 0);
    const cost = details.reduce((sum, { item, master }) => sum + itemCost(item, master), 0);
    const revenue = number(window.__pmNetTotal ?? totalElement.textContent);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const ready = quoteItems.length > 0 && missingCost.length === 0;
    const passes = ready && margin >= 20;
    const tone = !ready ? '#fbbf24' : passes ? '#34d399' : '#fb7185';
    const state = !quoteItems.length
      ? 'Tambahkan item untuk menghitung margin.'
      : !ready
        ? 'Harga modal belum lengkap — margin belum dapat disetujui.'
        : passes
          ? 'Memenuhi batas internal minimum 20%.'
          : 'Di bawah batas internal minimum 20%.';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div><b>Kontrol Margin Internal</b><small style="display:block;margin-top:3px;color:var(--muted)">Tidak ditampilkan pada surat penawaran atau cetakan.</small></div>
        <strong style="color:${tone}">${ready ? margin.toFixed(2) + '%' : 'PERLU DATA MODAL'}</strong>
      </div>
      <div class="grid g2" style="margin-top:12px">
        <div class="sum"><span>Total Modal</span><b>${money(cost)}</b></div>
        <div class="sum"><span>Laba Kotor</span><b>${money(profit)}</b></div>
      </div>
      <div style="margin-top:10px;color:${tone};font-weight:700">Margin: ${ready ? margin.toFixed(2) + '%' : '—'} · ${state}</div>
      ${missingCost.length ? `<small style="display:block;margin-top:6px;color:var(--muted)">${missingCost.length} item belum memiliki harga modal pada Master Harga.</small>` : ''}
    `;
  }

  function schedule() {
    window.clearTimeout(window.__pmMarginRenderTimer);
    window.__pmMarginRenderTimer = window.setTimeout(render, 0);
  }

  document.addEventListener('input', schedule, true);
  document.addEventListener('change', schedule, true);
  document.addEventListener('click', schedule, true);
  [0, 250, 800].forEach((delay) => window.setTimeout(render, delay));
}());
