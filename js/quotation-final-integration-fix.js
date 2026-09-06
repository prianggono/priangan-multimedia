/* Priangan Multimedia — quotation final integration fix v2
 *
 * Fixes:
 * 1) Preview / Cetak A4 no longer depends on the legacy async print engine.
 *    The preview is built synchronously from the current quotation state, so
 *    a slow/hanging template query cannot prevent the preview from opening.
 * 2) Internal margin uses harga_modal from master_harga with positive-value
 *    fallback, normalized code/name matching, and safer calculation rules.
 * 3) Prevents duplicate preview handlers from opening two previews.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_FINAL_INTEGRATION_V2) return;
  window.__PM_QUOTATION_FINAL_INTEGRATION_V2 = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v)
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = v => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(N(v))));
  const norm = v => S(v)
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

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
    if (masterId != null && S(masterId)) {
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

  function positive(a, b) {
    const x = N(a);
    return x > 0 ? x : N(b);
  }

  function itemCost(item, master) {
    const unit = positive(item?.harga_modal, master?.harga_modal);
    if (unit <= 0) return 0;

    const days = duration(
      item?.mulai ?? item?.tanggal_mulai,
      item?.selesai ?? item?.tanggal_selesai
    );
    const qty = Math.max(1, N(item?.qty ?? item?.jumlah) || 1);
    const w = N(item?.lebar), h = N(item?.tinggi), l = N(item?.panjang);
    const type = S(
      item?.tipe ?? item?.tipe_perhitungan ?? master?.tipe_perhitungan ?? master?.tipe
    ).toLowerCase();

    if (type === 'luas') return w * h * unit * days;
    if (type === 'rigging') return ((l * 2) + (h * 2)) * unit * days;
    if (type === 'level') return w * unit * days;
    return qty * unit * days;
  }

  let marginTimer = null;
  let marginRun = 0;

  async function renderMargin() {
    const totalEl = document.querySelector('#total');
    if (!totalEl) return;

    const card = totalEl.closest('.card');
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

    const run = ++marginRun;
    let list = getMasters();
    const database = getDB();

    if (database) {
      try {
        const r = await database
          .from('master_harga')
          .select('id,kode,item,harga_modal,harga_jual,aktif,tipe_perhitungan,tipe,satuan')
          .eq('aktif', true);
        if (!r.error && Array.isArray(r.data) && r.data.length) list = r.data;
      } catch (_) {}
    }

    if (run !== marginRun) return;

    const mapped = current.map(item => ({ item, master: findMaster(item, list) }));

    mapped.forEach(({ item, master }) => {
      const modal = positive(item.harga_modal, master?.harga_modal);
      if (modal > 0 && N(item.harga_modal) <= 0) item.harga_modal = modal;
      if (master && !item.master_id && master.id != null) item.master_id = master.id;
      if (master) {
        if (!item.tipe && master.tipe_perhitungan) item.tipe = master.tipe_perhitungan;
        if (!item.satuan && master.satuan) item.satuan = master.satuan;
      }
    });

    const missing = mapped.filter(({ item, master }) => positive(item?.harga_modal, master?.harga_modal) <= 0);
    const cost = mapped.reduce((sum, x) => sum + itemCost(x.item, x.master), 0);
    const revenue = Math.max(0, N(window.__pmNetTotal) || N(totalEl.textContent));
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const ready = missing.length === 0;
    const pass = ready && margin >= 20;
    const tone = !ready ? 'warn' : pass ? 'good' : 'bad';
    const missingNames = missing
      .map(x => S(x.item.item || x.item.kode))
      .filter(Boolean)
      .join(', ');

    box.innerHTML = `<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge ${tone}">${ready ? margin.toFixed(2) + '%' : 'DATA MODAL BELUM LENGKAP'}</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>${M(cost)}</b></div><div><span>Laba Kotor</span><b>${M(profit)}</b></div><div><span>Margin</span><b class="${tone}">${ready ? margin.toFixed(2) + '%' : '—'}</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state ${tone}">${!ready ? missingNames + ' belum memiliki harga modal di Master Harga.' : pass ? '✓ Margin memenuhi batas internal minimum 20%.' : '⚠ Margin di bawah batas internal minimum 20%.'}</div>`;
  }

  function scheduleMargin() {
    clearTimeout(marginTimer);
    marginTimer = setTimeout(() => renderMargin(), 120);
  }

  document.addEventListener('input', scheduleMargin, true);
  document.addEventListener('change', scheduleMargin, true);
  document.addEventListener('click', scheduleMargin, true);
  [0, 300, 800, 1500, 3000].forEach(ms => setTimeout(renderMargin, ms));

  function safe(v) {
    return S(v).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function dateID(value) {
    if (!value) return '-';
    const d = new Date(S(value) + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return safe(value);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function buildPreview() {
    const old = document.getElementById('pmPrintPreview');
    if (old) old.remove();

    const qs = selector => document.querySelector(selector)?.value?.trim() || '';
    const currentItems = getItems().filter(i => i && i.kode && i.item);
    if (!currentItems.length) {
      if (typeof window.msg === 'function') window.msg('Pilih minimal 1 Produk / Jasa terlebih dahulu.');
      return false;
    }

    const currentTemplate = (() => {
      try { if (typeof template !== 'undefined' && template) return { ...template }; } catch (_) {}
      return window.template && typeof window.template === 'object' ? { ...window.template } : {};
    })();

    const client = qs('#qc');
    const perusahaan = qs('#qp');
    const whatsapp = qs('#qw');
    const email = qs('#qe');
    const eventName = qs('#qeve');
    const startDate = qs('#qs');
    const endDate = qs('#qe2');

    if (!client || !perusahaan || !eventName) {
      if (typeof window.msg === 'function') window.msg('Isi Client, Perusahaan, dan Nama Event terlebih dahulu.');
      return false;
    }

    const level120200 = item => {
      const code = S(item?.kode).toUpperCase();
      const text = S(item?.item).toLowerCase();
      return code === 'LED-LVL-120-200' || /level\s*120\s*[-–—]\s*200/.test(text);
    };

    const ledWidth = (() => {
      const led = currentItems.find(row => /led|videotron/i.test(`${row?.item || ''} ${row?.kode || ''}`) && N(row?.lebar) > 0);
      return led ? N(led.lebar) : 0;
    })();

    const subtotal = item => {
      const price = N(item.harga);
      const days = duration(item.mulai, item.selesai);
      const qty = Math.max(1, N(item.qty) || 1);
      if (level120200(item)) return N(item.lebar) * price * days || ledWidth * price * days;
      if (S(item.tipe).toLowerCase() === 'luas') return N(item.lebar) * N(item.tinggi) * price * days;
      if (S(item.tipe).toLowerCase() === 'rigging') return ((N(item.panjang) * 2) + (N(item.tinggi) * 2)) * price * days;
      return qty * price * days;
    };

    const rows = currentItems.map((item, index) => {
      let qtyText = S(item.qty || 1);
      if (S(item.tipe).toLowerCase() === 'luas') qtyText = `${N(item.lebar)} × ${N(item.tinggi)} m²`;
      else if (level120200(item)) qtyText = `${N(item.lebar) || ledWidth} m`;
      else if (S(item.tipe).toLowerCase() === 'rigging') qtyText = `${N(item.panjang)} × ${N(item.tinggi)} m`;
      const schedule = item.mulai || item.selesai ? `${dateID(item.mulai)} - ${dateID(item.selesai)}` : '-';
      return `<tr><td class="center row-no">${index + 1}</td><td><strong>${safe(item.item)}</strong><div class="code">${safe(item.kode)}</div></td><td class="center">${safe(qtyText)}</td><td class="center schedule">${safe(schedule)}</td><td class="right nowrap">${M(item.harga)}</td><td class="right nowrap strong-price">${M(subtotal(item))}</td></tr>`;
    }).join('');

    const total = currentItems.reduce((sum, item) => sum + subtotal(item), 0);
    const number = 'PM-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
    const today = new Date().toISOString().slice(0, 10);
    const logo = S(currentTemplate.logo_url)
      ? `<img class="logo" src="${safe(currentTemplate.logo_url)}" alt="Logo" onerror="this.remove();">`
      : '<div class="logo-fallback">PM</div>';

    const telp = S(currentTemplate.telepon);
    const wa = S(currentTemplate.whatsapp);
    let contactLine = '';
    if (telp && wa && telp !== wa) contactLine = `Telp ${safe(telp)} • WA ${safe(wa)}`;
    else if (telp || wa) contactLine = `Telp / WA ${safe(telp || wa)}`;
    if (currentTemplate.email) contactLine += `${contactLine ? ' • ' : ''}${safe(currentTemplate.email)}`;

    const overlay = document.createElement('div');
    overlay.id = 'pmPrintPreview';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#111827;display:flex;flex-direction:column;width:100vw;height:100vh;overflow:hidden;';
    overlay.innerHTML = `<div class="pm-print-toolbar"><div><strong>Preview Surat Penawaran</strong><span>A4 Portrait • ${safe(number)}</span></div><div class="pm-print-actions"><button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button><button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button></div></div><div class="pm-print-scroll"><main class="pm-a4" id="pmPrintArea"><div class="pm-top-accent"></div><header class="pm-letterhead"><div class="pm-logo-wrap">${logo}</div><div class="pm-brand"><div class="pm-brand-name">${safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA')}</div><div class="pm-brand-sub">SALES & QUOTATION</div>${currentTemplate.alamat ? `<p>${safe(currentTemplate.alamat)}</p>` : ''}${contactLine ? `<p>${contactLine}</p>` : ''}${currentTemplate.website ? `<p class="website">${safe(currentTemplate.website)}</p>` : ''}</div><div class="pm-doc-tag"><span>QUOTATION</span><strong>${safe(number)}</strong></div></header><div class="pm-title-row"><div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div><div class="pm-date-box"><span>TANGGAL</span><strong>${dateID(today)}</strong></div></div><section class="pm-info-card"><div class="pm-info-section"><div class="pm-section-label">DITUJUKAN KEPADA</div><div class="pm-client-name">${safe(client)}</div><div>${safe(perusahaan)}</div>${whatsapp ? `<div>WA / Telp: ${safe(whatsapp)}</div>` : ''}${email ? `<div>${safe(email)}</div>` : ''}</div><div class="pm-info-section pm-event-section"><div class="pm-section-label">EVENT / PROJECT</div><div class="pm-event-name">${safe(eventName)}</div><div class="pm-period-label">PERIODE</div><div>${dateID(startDate)} — ${dateID(endDate)}</div></div></section><p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga untuk kebutuhan event / project tersebut sebagai berikut:</p><table class="pm-items"><thead><tr><th class="col-no">No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${rows}<tr class="pm-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">${M(total)}</td></tr></tbody></table><section class="pm-terms"><div class="pm-section-heading"><span>01</span><strong>SYARAT & KETENTUAN</strong></div><div class="pm-terms-body">${String(currentTemplate.ketentuan || '1. Downpayment minimum 50%.\n2. Pelunasan 50% dilakukan setelah unit terpasang.\n3. Pembayaran DP yang telah dilakukan tidak dapat dikembalikan.').replace(/\r?\n/g, '<br>')}</div></section><section class="pm-signature"><div class="pm-signature-label">HORMAT KAMI,</div><div class="pm-signature-box"><div class="pm-signature-line"></div><strong>${safe(currentTemplate.nama_penandatangan || '____________________________')}</strong>${currentTemplate.jabatan_penandatangan ? `<div class="pm-signature-role">${safe(currentTemplate.jabatan_penandatangan)}</div>` : ''}</div></section><footer class="pm-footer"><div>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.</div><strong>${safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA')}</strong></footer></main></div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('pm-preview-open');
    return true;
  }

  // One capture-phase handler owns the button. Do not call the legacy
  // printQuote() here: that function performs a network template read first,
  // which was the reason the button could remain waiting without a preview.
  document.addEventListener('click', function (event) {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const label = S(button.textContent).replace(/\s+/g, ' ').toLowerCase();
    if (!(label.includes('preview') && label.includes('cetak') && label.includes('a4'))) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { buildPreview(); } catch (error) {
      console.error('Quotation preview error:', error);
      if (typeof window.msg === 'function') window.msg('Preview A4 gagal: ' + (error.message || error));
    }
  }, true);
})();
