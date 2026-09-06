/* Priangan Multimedia — quotation final integration fix v1
 * Fixes two runtime issues without changing customer-facing pricing:
 * 1) Preview / Cetak A4 always opens a preview, with a safe fallback if the
 *    legacy print engine fails before creating #pmPrintPreview.
 * 2) Internal margin reads harga_modal directly from master_harga and maps
 *    quotation items by master id/code/item using normalized matching.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_FINAL_INTEGRATION_V1) return;
  window.__PM_QUOTATION_FINAL_INTEGRATION_V1 = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = v => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.max(0, Math.round(N(v))));
  const norm = v => S(v).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

  function getItems() {
    try { if (typeof items !== 'undefined' && Array.isArray(items)) return items; } catch (_) {}
    return Array.isArray(window.items) ? window.items : [];
  }
  function getMasters() {
    try { if (typeof masters !== 'undefined' && Array.isArray(masters)) return masters; } catch (_) {}
    return Array.isArray(window.masters) ? window.masters : [];
  }
  function getDB() {
    try { if (typeof db !== 'undefined' && db) return db; } catch (_) {}
    return window.db || window.__PM_STABLE_DB || window.__PRIANGAN_QUOTE_DB || null;
  }

  function duration(a, b) {
    if (!a || !b) return 1;
    const x = new Date(S(a) + 'T00:00:00');
    const y = new Date(S(b) + 'T00:00:00');
    const d = Math.round((y - x) / 86400000);
    return d >= 0 ? d + 1 : 1;
  }

  function findMaster(item, list) {
    const masterId = item?.master_id ?? item?.masterId ?? item?.id_master ?? item?.master_harga_id;
    if (masterId != null) {
      const byId = list.find(m => String(m.id) === String(masterId));
      if (byId) return byId;
    }
    const code = norm(item?.kode);
    if (code) {
      const byCode = list.find(m => norm(m.kode) === code);
      if (byCode) return byCode;
    }
    const name = norm(item?.item);
    if (name) {
      const byName = list.find(m => norm(m.item) === name);
      if (byName) return byName;
    }
    return null;
  }

  function itemCost(item, master) {
    const unit = N(item?.harga_modal ?? master?.harga_modal);
    const days = duration(item?.mulai ?? item?.tanggal_mulai, item?.selesai ?? item?.tanggal_selesai);
    const qty = Math.max(1, N(item?.qty ?? item?.jumlah) || 1);
    const w = N(item?.lebar), h = N(item?.tinggi), l = N(item?.panjang);
    const type = S(item?.tipe ?? item?.tipe_perhitungan ?? master?.tipe_perhitungan ?? master?.tipe).toLowerCase();
    if (type === 'luas') return w * h * unit * days;
    if (type === 'rigging') return ((l * 2) + (h * 2)) * unit * days;
    if (type === 'level') return w * unit * days;
    return qty * unit * days;
  }

  let marginTimer = null;
  async function renderMargin() {
    const totalEl = document.querySelector('#total');
    if (!totalEl) return;
    let card = totalEl.closest('.card');
    if (!card) return;
    let box = document.querySelector('#pmInternalMargin');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pmInternalMargin';
      box.className = 'no-print pm-internal-margin';
      card.insertAdjacentElement('afterend', box);
    }

    const current = getItems().filter(i => i && (S(i.kode) || S(i.item)));
    if (!current.length) {
      box.innerHTML = '<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge warn">DATA BELUM ADA</span></div><div class="pm-margin-state warn">Tambahkan item untuk menghitung margin.</div>';
      return;
    }

    let list = getMasters();
    const database = getDB();
    if (database) {
      try {
        const r = await database.from('master_harga').select('id,kode,item,harga_modal,harga_jual,aktif');
        if (!r.error && Array.isArray(r.data) && r.data.length) list = r.data;
      } catch (_) {}
    }

    const mapped = current.map(item => ({ item, master: findMaster(item, list) }));
    const missing = mapped.filter(x => N(x.item?.harga_modal) <= 0 && N(x.master?.harga_modal) <= 0);
    mapped.forEach(({ item, master }) => {
      if (master && N(item.harga_modal) <= 0) item.harga_modal = N(master.harga_modal);
      if (master && !item.master_id && master.id != null) item.master_id = master.id;
    });

    const cost = mapped.reduce((sum, x) => sum + itemCost(x.item, x.master), 0);
    const revenue = Math.max(0, N(window.__pmNetTotal) || N(totalEl.textContent));
    const profit = revenue - cost;
    const margin = revenue > 0 ? profit / revenue * 100 : 0;
    const ready = missing.length === 0;
    const pass = ready && margin >= 20;
    const tone = !ready ? 'warn' : pass ? 'good' : 'bad';

    box.innerHTML = `<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge ${tone}">${ready ? margin.toFixed(2) + '%' : 'DATA MODAL BELUM LENGKAP'}</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>${M(cost)}</b></div><div><span>Laba Kotor</span><b>${M(profit)}</b></div><div><span>Margin</span><b class="${tone}">${ready ? margin.toFixed(2) + '%' : '—'}</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state ${tone}">${!ready ? missing.map(x => S(x.item.item || x.item.kode)).join(', ') + ' belum memiliki harga modal di Master Harga.' : pass ? '✓ Margin memenuhi batas internal minimum 20%.' : '⚠ Margin di bawah batas internal minimum 20%.'}</div>`;
  }

  function scheduleMargin() {
    clearTimeout(marginTimer);
    marginTimer = setTimeout(() => renderMargin(), 120);
  }
  document.addEventListener('input', scheduleMargin, true);
  document.addEventListener('change', scheduleMargin, true);
  document.addEventListener('click', scheduleMargin, true);
  [0, 300, 800, 1500, 3000].forEach(ms => setTimeout(renderMargin, ms));

  function fallbackPreview(error) {
    console.error('Quotation preview fallback:', error);
    const old = document.getElementById('pmPrintPreview');
    if (old) old.remove();
    const qs = s => document.querySelector(s)?.value?.trim() || '';
    const safe = v => S(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const money = v => M(v);
    const list = getItems().filter(i => i && i.kode && i.item);
    const total = Math.max(0, N(window.__pmNetTotal) || N(document.querySelector('#total')?.textContent));
    const rows = list.map((i, n) => `<tr><td>${n+1}</td><td><b>${safe(i.item)}</b><small>${safe(i.kode)}</small></td><td>${safe(i.qty || 1)}</td><td>${money(i.harga || i.harga_jual)}</td></tr>`).join('');
    const overlay = document.createElement('div');
    overlay.id = 'pmPrintPreview';
    overlay.innerHTML = `<div class="pm-print-toolbar"><div><strong>Preview Surat Penawaran</strong><span>A4 Portrait</span></div><div class="pm-print-actions"><button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button><button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button></div></div><div class="pm-print-scroll"><main class="pm-a4" id="pmPrintArea"><div class="pm-top-accent"></div><header class="pm-letterhead"><div class="pm-logo-wrap"><div class="logo-fallback">PM</div></div><div class="pm-brand"><div class="pm-brand-name">PRIANGAN MULTIMEDIA</div><div class="pm-brand-sub">SALES & QUOTATION</div></div><div class="pm-doc-tag"><span>QUOTATION</span></div></header><div class="pm-title-row"><div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div></div><section class="pm-info-card"><div class="pm-info-section"><div class="pm-section-label">DITUJUKAN KEPADA</div><div class="pm-client-name">${safe(qs('#qc'))}</div><div>${safe(qs('#qp'))}</div></div><div class="pm-info-section pm-event-section"><div class="pm-section-label">EVENT / PROJECT</div><div class="pm-event-name">${safe(qs('#qeve'))}</div></div></section><p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga sebagai berikut:</p><table class="pm-items"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty</th><th>Subtotal</th></tr></thead><tbody>${rows}<tr class="pm-total"><td colspan="3" class="right">GRAND TOTAL</td><td class="right">${money(total)}</td></tr></tbody></table><section class="pm-terms"><div class="pm-section-heading"><span>01</span><strong>SYARAT & KETENTUAN</strong></div><div class="pm-terms-body">${safe('Penawaran harga berlaku sesuai kesepakatan dan spesifikasi event.')}</div></section><section class="pm-signature"><div class="pm-signature-label">HORMAT KAMI,</div><div class="pm-signature-box"><div class="pm-signature-line"></div><strong>PRIANGAN MULTIMEDIA</strong></div></section></main></div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('pm-preview-open');
  }

  async function openPreview() {
    if (document.getElementById('pmPrintPreview')) return;
    const fn = window.printQuote;
    if (typeof fn !== 'function') return fallbackPreview(new Error('printQuote tidak tersedia'));
    let settled = false;
    try {
      const result = fn.call(window);
      if (result && typeof result.then === 'function') await Promise.race([result, new Promise(resolve => setTimeout(resolve, 4500))]);
      settled = !!document.getElementById('pmPrintPreview');
    } catch (error) {
      if (!document.getElementById('pmPrintPreview')) return fallbackPreview(error);
      settled = true;
    }
    if (!settled && !document.getElementById('pmPrintPreview')) fallbackPreview(new Error('Engine preview tidak membuat jendela preview'));
  }

  document.addEventListener('click', function (event) {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const label = S(button.textContent).replace(/\s+/g, ' ').toLowerCase();
    if (!(label.includes('preview') && label.includes('cetak') && label.includes('a4'))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPreview().catch(err => fallbackPreview(err));
  }, true);
})();
