/* Priangan Multimedia — Invoice Domain Core
 * Single authority for invoice list, editor, payments and A4 preview.
 * Editor renderer and document renderer are deliberately separated.
 * Visual language follows the quotation document.
 */
(function () {
  'use strict';
  if (window.__PM_INVOICE_DOMAIN_CORE_V2) return;
  window.__PM_INVOICE_DOMAIN_CORE_V2 = true;

  const S = (v) => String(v ?? '').trim();
  const N = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = S(v).replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    s = s.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = (v) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(N(v))));
  const E = (v) => S(v).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
  const DB = () => window.db || window.__PM_STABLE_DB || null;
  const msg = (t) => typeof window.msg === 'function' ? window.msg(t) : console.warn('[PM]', t);
  const moneyDate = () => new Date().toISOString().slice(0, 10);

  function setPage() {
    if (typeof window.pmSetCurrentPage === 'function') window.pmSetCurrentPage('invoice');
  }

  function dateText(v) {
    const raw = S(v);
    if (!raw) return '-';
    const d = new Date(raw.slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return E(raw);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function periodText(a, b) {
    if (!a && !b) return '-';
    const aa = S(a).slice(0, 10);
    const bb = S(b || a).slice(0, 10);
    const ax = new Date(aa + 'T00:00:00');
    const bx = new Date(bb + 'T00:00:00');
    if (Number.isNaN(ax.getTime()) || Number.isNaN(bx.getTime())) return E(a || b || '-');
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const ay = ax.getFullYear(), by = bx.getFullYear();
    const am = ax.getMonth(), bm = bx.getMonth();
    const ad = ax.getDate(), bd = bx.getDate();
    if (ay === by && am === bm && ad === bd) return `${ad} ${months[am]} ${ay}`;
    if (ay === by && am === bm) return `${ad}-${bd} ${months[am]} ${ay}`;
    if (ay === by) return `${ad} ${months[am]}-${bd} ${months[bm]} ${ay}`;
    return `${ad} ${months[am]} ${ay}-${bd} ${months[bm]} ${by}`;
  }

  function days(a, b) {
    if (!a || !b) return 1;
    const x = new Date(S(a).slice(0, 10) + 'T00:00:00');
    const y = new Date(S(b).slice(0, 10) + 'T00:00:00');
    const n = Math.round((y - x) / 86400000);
    return n >= 0 ? n + 1 : 1;
  }

  function isLED(i) {
    const text = `${S(i?.item)} ${S(i?.kode)} ${S(i?.kategori)}`.toLowerCase();
    if (/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(text)) return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(text);
  }

  function levelCm(v) {
    const n = N(v);
    return n > 0 && n < 10 ? Math.round(n * 100) : Math.round(n);
  }

  function levelAmount(i) {
    if (!i?.level_enabled) return 0;
    return N(i.lebar) * N(i.level_harga) * Math.max(1, N(i.qty ?? i.jumlah) || 1);
  }

  function itemAmount(i) {
    const saved = N(i?.subtotal);
    if (saved > 0) return saved;
    const price = N(i?.harga_jual ?? i?.harga);
    const qty = Math.max(1, N(i?.qty ?? i?.jumlah) || 1);
    const dur = days(i?.tanggal_mulai, i?.tanggal_selesai);
    const w = N(i?.lebar), h = N(i?.tinggi), l = N(i?.panjang);
    const type = S(i?.tipe_perhitungan || i?.tipe).toLowerCase();
    let base;
    if (isLED(i)) base = w * h * price * qty * dur + levelAmount(i);
    else if (type === 'luas') base = w * h * price * dur;
    else if (type === 'rigging') base = ((l * 2) + (h * 2)) * price * dur;
    else base = qty * price * dur;
    const pct = Math.max(0, Math.min(100, N(i?.diskon_persen)));
    const disc = pct > 0
      ? Math.min(base, Math.round(base * pct / 100))
      : Math.min(base, Math.max(0, N(i?.diskon_nominal)));
    return Math.max(0, base - disc);
  }

  function itemName(i) {
    const base = S(i?.item || i?.nama_item || '-').replace(/\s*\+\s*Level.*$/i, '');
    return i?.level_enabled && levelCm(i.level_tinggi)
      ? `${base} + Level ${levelCm(i.level_tinggi)} cm`
      : base;
  }

  function qtyText(i) {
    const type = S(i?.tipe_perhitungan || i?.tipe).toLowerCase();
    if (isLED(i)) return `${N(i.lebar)} × ${N(i.tinggi)} m²`;
    if (type === 'rigging') return `${N(i.panjang)} × ${N(i.tinggi)} m`;
    if (type === 'level') return `${N(i.lebar)} m`;
    if (type === 'overtime') return `${N(i.qty)} jam`;
    return `${Math.max(1, N(i.qty ?? i.jumlah) || 1)} ${S(i.satuan || 'unit')}`;
  }

  function priceHtml(i) {
    const price = E(M(i?.harga_jual ?? i?.harga));
    return i?.level_enabled && N(i.level_harga) > 0
      ? `${price}<div class="pm-inv-level-price">Level: ${E(M(i.level_harga))}/m</div>`
      : price;
  }

  function parsePack(raw) {
    return S(raw).replace(/\\n/g, '\n').split(/\r?\n/).map(S).filter(Boolean).map((line) => {
      let m = line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);
      if (!m) m = line.match(/^(.+?)\s+-\s*(.*?)\s*$/);
      return m ? { name: S(m[1]), qty: S(m[2]) || '-' } : { name: line, qty: '-' };
    });
  }

  let current = null;

  async function load(id) {
    const d = DB();
    if (!d) throw new Error('Supabase belum terhubung.');
    const [q, p, ex, items, masters, template] = await Promise.all([
      d.from('penawaran').select('*').eq('id', id).single(),
      d.from('pembayaran_penawaran').select('*').eq('penawaran_id', id).order('id'),
      d.from('penawaran_invoice_items').select('*').eq('penawaran_id', id).order('id'),
      d.from('penawaran_items').select('*').eq('penawaran_id', id).order('id'),
      d.from('master_harga').select('*').eq('aktif', true).order('id'),
      d.from('template_surat').select('*').eq('aktif', true).order('id', { ascending: false }).limit(1).maybeSingle()
    ]);
    if (q.error) throw q.error;
    if (p.error) throw p.error;
    if (ex.error) throw ex.error;
    if (items.error) throw items.error;
    return { q: q.data, p: p.data || [], ex: ex.data || [], items: items.data || [], masters: masters.data || [], template: template.data || {} };
  }

  const paid = (rows) => rows.reduce((sum, row) => sum + N(row.nominal), 0);
  const extrasTotal = (rows) => rows.reduce((sum, row) => sum + N(row.subtotal), 0);
  const quoteTotal = (q) => Math.max(0, N(q?.grand_total ?? q?.total));

  function packageHtml(i) {
    const master = (current?.masters || []).find((m) => S(m.kode) === S(i?.kode));
    const rows = parsePack(master?.isi_paket);
    if (!rows.length) return '';
    return `<div class="pm-inv-pack"><div class="pm-inv-pack-title">ISI PAKET</div>${rows.map((r) => `<span><b>${E(r.name)}</b><em>${E(r.qty)}</em></span>`).join('')}</div>`;
  }

  function documentItemRow(i, n) {
    return `<tr><td class="center">${n}</td><td><strong>${E(itemName(i))}</strong><div class="pm-inv-code">${E(i.kode || '')}</div>${packageHtml(i)}</td><td class="center">${E(qtyText(i))}</td><td class="center">${E(periodText(i.tanggal_mulai || current.q.tanggal_mulai, i.tanggal_selesai || current.q.tanggal_selesai))}</td><td class="right nowrap">${priceHtml(i)}</td><td class="right nowrap">${M(itemAmount(i))}</td></tr>`;
  }

  function editorItemRow(i, n) {
    return `<tr><td class="center">${n}</td><td><strong>${E(itemName(i))}</strong><div class="pm-inv-code">${E(i.kode || '')}</div></td><td class="center">${E(qtyText(i))}</td><td class="center">${E(periodText(i.tanggal_mulai || current.q.tanggal_mulai, i.tanggal_selesai || current.q.tanggal_selesai))}</td><td class="right nowrap">${priceHtml(i)}</td><td class="right nowrap">${M(itemAmount(i))}</td></tr>`;
  }

  function extraRow(x, n) {
    return `<tr><td class="center">${n}</td><td><strong>${E(x.nama_item || 'Item Tambahan')}</strong><div class="pm-inv-code">${E(x.kode || 'ADD-INV')}</div></td><td class="center">${E(x.qty ?? 1)} ${E(x.satuan || '')}</td><td class="center">${E(periodText(x.tanggal_mulai || current.q.tanggal_mulai, x.tanggal_selesai || current.q.tanggal_mulai))}</td><td class="right nowrap">${M(x.harga)}</td><td class="right nowrap">${M(x.subtotal)}</td></tr>`;
  }

  async function invoicePage() {
    setPage();
    const c = document.querySelector('#content');
    if (!c) return;
    try {
      const d = DB();
      if (!d) throw new Error('Supabase belum terhubung.');
      const [q, p, x] = await Promise.all([
        d.from('penawaran').select('*').order('id', { ascending: false }),
        d.from('pembayaran_penawaran').select('*'),
        d.from('penawaran_invoice_items').select('*')
      ]);
      if (q.error) throw q.error;
      if (p.error) throw p.error;
      if (x.error) throw x.error;
      const paidMap = new Map();
      const extraMap = new Map();
      (p.data || []).forEach((r) => paidMap.set(r.penawaran_id, (paidMap.get(r.penawaran_id) || 0) + N(r.nominal)));
      (x.data || []).forEach((r) => {
        if (!extraMap.has(r.penawaran_id)) extraMap.set(r.penawaran_id, []);
        extraMap.get(r.penawaran_id).push(r);
      });
      c.innerHTML = `<div class="head"><div><h1>Invoice</h1><p>Sumber data: Supabase.</p></div><button class="btn secondary" id="pmInvRefresh" type="button">↻ Refresh</button></div><div class="card"><div class="scroll"><table class="table"><thead><tr><th>No. Invoice</th><th>Penawaran</th><th>Client</th><th>Event</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${(q.data || []).map((r) => {
        const ex = extraMap.get(r.id) || [];
        const paidNow = paidMap.get(r.id) || 0;
        const total = quoteTotal(r) + extrasTotal(ex);
        const status = r.status_invoice === 'DIBATALKAN'
          ? 'DIBATALKAN'
          : r.nomor_invoice && paidNow >= total && total > 0
            ? 'LUNAS'
            : r.nomor_invoice
              ? (r.status_invoice || 'DITERBITKAN')
              : 'BELUM DIBUAT';
        return `<tr><td><strong>${E(r.nomor_invoice || '-')}</strong></td><td>${E(r.nomor_penawaran || '-')}</td><td>${E(r.nama_client || '-')}<div class="muted">${E(r.perusahaan || '')}</div></td><td>${E(r.nama_event || r.event_name || '-')}</td><td>${M(total)}</td><td>${M(paidNow)}</td><td>${M(Math.max(0, total - paidNow))}</td><td>${E(status)}</td><td><div class="actions"><button class="btn sm" type="button" data-edit="${r.id}">${r.nomor_invoice ? 'Edit / Lihat' : 'Buat Invoice'}</button>${total > paidNow ? `<button class="btn sm secondary" type="button" data-pay="${r.id}">${paidNow ? 'Pelunasan' : 'Input DP'}</button>` : ''}${r.nomor_invoice ? `<button class="btn sm green" type="button" data-preview="${r.id}">Preview Invoice</button>` : ''}</div></td></tr>`;
      }).join('') || '<tr><td colspan="9" class="empty">Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
      c.querySelector('#pmInvRefresh')?.addEventListener('click', invoicePage);
      c.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openForm(Number(b.dataset.edit))));
      c.querySelectorAll('[data-pay]').forEach((b) => b.addEventListener('click', () => openPaymentModal(Number(b.dataset.pay))));
      c.querySelectorAll('[data-preview]').forEach((b) => b.addEventListener('click', () => previewForId(Number(b.dataset.preview))));
    } catch (e) {
      console.error('[PM] invoice page', e);
      c.innerHTML = `<div class="card"><div class="empty">Gagal membaca invoice: ${E(e.message || e)}</div></div>`;
    }
  }

  async function openForm(id) {
    setPage();
    try {
      const d = await load(id);
      current = { ...d, id, paid: paid(d.p) };
      const rows = d.items.map((item, index) => editorItemRow(item, index + 1)).join('') || '<tr><td colspan="6">Tidak ada item.</td></tr>';
      const qTotal = quoteTotal(d.q);
      const total = qTotal + extrasTotal(d.ex);
      const today = moneyDate();
      document.querySelector('#content').innerHTML = `<div class="head"><div><h1>${d.q.nomor_invoice ? 'Edit Invoice' : 'Buat Invoice'}</h1><p>${E(d.q.nomor_penawaran || '-')} • ${E(d.q.nama_event || d.q.event_name || '-')}</p></div><button class="btn secondary" type="button" id="pmInvBack">Kembali</button></div><div class="card"><div class="grid g2"><div class="field"><label>No. Invoice</label><input id="invNo" readonly value="${E(d.q.nomor_invoice || 'Otomatis saat simpan')}"></div><div class="field"><label>Tanggal Invoice</label><input id="invDate" type="date" value="${E(d.q.tanggal_invoice || today)}"></div><div class="field"><label>Jatuh Tempo</label><input id="invDue" type="date" value="${E(d.q.jatuh_tempo || d.q.tanggal_selesai || d.q.tanggal_mulai || today)}"></div><div class="field"><label>Status Invoice</label><select id="invStatus"><option>DRAFT</option><option>DITERBITKAN</option><option>LUNAS</option><option>DIBATALKAN</option></select></div></div></div><div class="card"><b>Item dari Penawaran</b><div class="scroll"><table class="table"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="card"><b>Item Tambahan Invoice</b><div id="invoiceExtras"></div><div class="actions"><button class="btn sm" type="button" id="pmInvAddItem">+ Tambah Item</button><button class="btn sm secondary" type="button" id="pmInvAddOvertime">+ Overtime</button></div></div><div class="card"><div class="grid g2"><div class="field"><label>Catatan Invoice</label><textarea id="invNotes">${E(d.q.catatan_invoice || '')}</textarea></div><div><div class="sum"><span>Total Penawaran</span><b>${M(qTotal)}</b></div><div class="sum"><span>Tambahan</span><b id="invExtraTotal">${M(extrasTotal(d.ex))}</b></div><div class="sum"><span>Total Invoice</span><b id="invTotal">${M(total)}</b></div><div class="sum"><span>Sudah Dibayar</span><b>${M(current.paid)}</b></div><div class="sum"><span>Sisa</span><b id="invBalance">${M(Math.max(0, total - current.paid))}</b></div></div></div></div><div class="actions"><button class="btn secondary" type="button" id="pmInvCancel">Batal</button><button class="btn green" type="button" id="pmInvSave">Simpan Invoice</button><button class="btn" type="button" id="pmInvPreview">Preview / Cetak</button></div>`;
      document.querySelector('#invStatus').value = d.q.status_invoice || 'DRAFT';
      document.querySelector('#pmInvBack')?.addEventListener('click', invoicePage);
      document.querySelector('#pmInvCancel')?.addEventListener('click', invoicePage);
      document.querySelector('#pmInvSave')?.addEventListener('click', saveInvoice);
      document.querySelector('#pmInvPreview')?.addEventListener('click', previewInvoice);
      document.querySelector('#pmInvAddItem')?.addEventListener('click', invoiceAddItem);
      document.querySelector('#pmInvAddOvertime')?.addEventListener('click', invoiceAddOvertime);
      renderExtras();
    } catch (e) {
      console.error('[PM] invoice form', e);
      msg('Gagal membuka invoice: ' + (e.message || e));
    }
  }

  function renderExtras() {
    if (!current) return;
    const c = document.querySelector('#invoiceExtras');
    if (!c) return;
    c.innerHTML = current.ex.map((x, i) => `<div class="card" data-extra-index="${i}"><div class="grid g2"><div class="field"><label>Item</label><input data-f="nama_item" value="${E(x.nama_item || '')}"></div><div class="field"><label>Harga</label><input type="number" data-f="harga" value="${N(x.harga)}"></div><div class="field"><label>Qty</label><input type="number" data-f="qty" value="${N(x.qty) || 1}"></div><div class="field"><label>Satuan</label><input data-f="satuan" value="${E(x.satuan || 'unit')}"></div><div class="field"><label>Tipe</label><select data-f="tipe_perhitungan"><option value="qty">Qty</option><option value="luas">Luas</option><option value="rigging">Rigging</option><option value="overtime">Overtime</option></select></div><div class="field"><label>Subtotal</label><input data-out readonly value="${M(x.subtotal)}"></div></div><div class="actions"><button class="btn sm danger" type="button" data-remove-extra="${i}">Hapus</button></div></div>`).join('') || '<div class="empty">Belum ada item tambahan.</div>';
    c.querySelectorAll('[data-extra-index]').forEach((card) => {
      const x = current.ex[Number(card.dataset.extraIndex)];
      card.querySelectorAll('[data-f]').forEach((el) => {
        if (el.dataset.f === 'tipe_perhitungan') {
          el.value = x.tipe_perhitungan || 'qty';
        } else {
          el.value = x[el.dataset.f] ?? el.value;
        }
        el.addEventListener('input', () => {
          x[el.dataset.f] = el.value;
          x.subtotal = Math.round(extraSubtotal(x));
          const out = card.querySelector('[data-out]');
          if (out) out.value = M(x.subtotal);
          updateSummary();
        });
        if (el.tagName === 'SELECT') {
          el.addEventListener('change', () => {
            x[el.dataset.f] = el.value;
            x.subtotal = Math.round(extraSubtotal(x));
            const out = card.querySelector('[data-out]');
            if (out) out.value = M(x.subtotal);
            updateSummary();
          });
        }
      });
    });
    c.querySelectorAll('[data-remove-extra]').forEach((b) => b.addEventListener('click', () => invoiceRemoveItem(Number(b.dataset.removeExtra))));
  }

  function extraSubtotal(x) {
    const type = S(x.tipe_perhitungan || 'qty').toLowerCase();
    const qty = Math.max(1, N(x.qty) || 1);
    const w = N(x.lebar), h = N(x.tinggi), l = N(x.panjang), p = N(x.harga);
    const dur = days(x.tanggal_mulai, x.tanggal_selesai);
    const basis = type === 'luas' ? w * h : type === 'rigging' ? 2 * (l + h) : qty;
    return basis * p * (type === 'overtime' ? 1 : dur);
  }

  function updateSummary() {
    if (!current) return;
    const total = quoteTotal(current.q) + extrasTotal(current.ex);
    [['#invExtraTotal', extrasTotal(current.ex)], ['#invTotal', total], ['#invBalance', Math.max(0, total - current.paid)]].forEach(([selector, value]) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = M(value);
    });
  }

  function invoiceAddItem() {
    if (!current) return;
    current.ex.push({ kode: 'ADD-INV', nama_item: 'Item Tambahan', source: 'manual', tipe_perhitungan: 'qty', qty: 1, satuan: 'unit', harga: 0, tanggal_mulai: current.q.tanggal_mulai, tanggal_selesai: current.q.tanggal_selesai, subtotal: 0 });
    renderExtras();
    updateSummary();
  }

  function invoiceAddOvertime() {
    if (!current) return;
    current.ex.push({ kode: 'ADD-OT', nama_item: 'Overtime', source: 'manual', tipe_perhitungan: 'overtime', qty: 1, satuan: 'jam', harga: 0, tanggal_mulai: current.q.tanggal_mulai, tanggal_selesai: current.q.tanggal_mulai, subtotal: 0 });
    renderExtras();
    updateSummary();
  }

  function invoiceRemoveItem(i) {
    if (!current) return;
    current.ex.splice(i, 1);
    renderExtras();
    updateSummary();
  }

  async function saveInvoice() {
    if (!current) return;
    try {
      const payload = {
        nomor_invoice: S(current.q.nomor_invoice),
        tanggal_invoice: S(document.querySelector('#invDate')?.value),
        jatuh_tempo: S(document.querySelector('#invDue')?.value),
        status_invoice: S(document.querySelector('#invStatus')?.value || 'DRAFT'),
        catatan_invoice: S(document.querySelector('#invNotes')?.value)
      };
      const items = current.ex.map((x) => ({
        master_harga_id: x.master_harga_id ?? null,
        kode: S(x.kode || 'ADD-INV'),
        nama_item: S(x.nama_item || 'Item Tambahan'),
        source: S(x.source || 'manual'),
        tipe_perhitungan: S(x.tipe_perhitungan || 'qty'),
        qty: Math.max(0, N(x.qty) || 1),
        satuan: S(x.satuan || 'unit'),
        harga: Math.max(0, N(x.harga)),
        lebar: x.lebar == null ? null : N(x.lebar),
        tinggi: x.tinggi == null ? null : N(x.tinggi),
        panjang: x.panjang == null ? null : N(x.panjang),
        tanggal_mulai: x.tanggal_mulai || null,
        tanggal_selesai: x.tanggal_selesai || null,
        durasi: Math.max(1, N(x.durasi) || 1),
        basis: Math.max(0, N(x.basis) || 1),
        subtotal: Math.max(0, N(x.subtotal))
      }));
      const result = await DB().rpc('save_invoice_atomic', {
        p_penawaran_id: current.id,
        p_invoice: payload,
        p_items: items
      });
      if (result.error) throw result.error;
      const saved = await DB().from('penawaran').select('nomor_invoice').eq('id', current.id).single();
      if (saved.error) throw saved.error;
      window.__PM_LAST_INVOICE_NUMBER = S(saved.data?.nomor_invoice || payload.nomor_invoice);
      msg('Invoice berhasil disimpan.');
      await invoicePage();
    } catch (e) {
      console.error('[PM] invoice save', e);
      msg('Gagal menyimpan invoice: ' + (e.message || e));
    }
  }

  function closePaymentModal() {
    document.querySelector('#pmPaymentModal')?.remove();
    document.body.classList.remove('pm-payment-modal-open');
  }

  async function openPaymentModal(id) {
    try {
      const d = await load(id);
      const total = quoteTotal(d.q) + extrasTotal(d.ex);
      const already = paid(d.p);
      const balance = Math.max(0, total - already);
      if (balance <= 0) return msg('Tidak ada sisa pembayaran.');
      closePaymentModal();
      const root = document.createElement('div');
      root.id = 'pmPaymentModal';
      root.innerHTML = `<div class="pm-payment-backdrop"><div class="pm-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="pmPaymentTitle"><div class="pm-payment-head"><div><strong id="pmPaymentTitle">Input Pembayaran</strong><span>Sisa tagihan ${E(M(balance))}</span></div><button type="button" class="pm-payment-close" id="pmPaymentClose">×</button></div><div class="pm-payment-body"><div class="field"><label>Nominal Pembayaran</label><input id="pmPaymentAmount" type="number" min="1" max="${Math.round(balance)}" step="1" value="${Math.round(balance)}"></div><div class="field"><label>Metode Pembayaran</label><select id="pmPaymentMethod"><option>Transfer</option><option>Tunai</option><option>QRIS</option><option>Lainnya</option></select></div></div><div class="pm-payment-actions"><button type="button" class="btn secondary" id="pmPaymentCancel">Batal</button><button type="button" class="btn green" id="pmPaymentSave">Simpan Pembayaran</button></div></div></div>`;
      document.body.appendChild(root);
      document.body.classList.add('pm-payment-modal-open');
      const save = async () => {
        const nominal = N(document.querySelector('#pmPaymentAmount')?.value);
        const method = S(document.querySelector('#pmPaymentMethod')?.value || 'Transfer');
        if (!Number.isFinite(nominal) || nominal <= 0 || nominal > balance) return msg('Nominal pembayaran tidak valid.');
        try {
          const r = await DB().from('pembayaran_penawaran').insert([{
            penawaran_id: id,
            tanggal_bayar: moneyDate(),
            jenis: already ? 'PELUNASAN' : 'DP',
            nominal,
            metode: method,
            catatan: null
          }]);
          if (r.error) throw r.error;
          closePaymentModal();
          msg('Pembayaran berhasil dicatat.');
          await invoicePage();
        } catch (e) {
          console.error('[PM] payment save', e);
          msg('Gagal menyimpan pembayaran: ' + (e.message || e));
        }
      };
      root.querySelector('#pmPaymentClose').onclick = closePaymentModal;
      root.querySelector('#pmPaymentCancel').onclick = closePaymentModal;
      root.querySelector('#pmPaymentSave').onclick = save;
      root.querySelector('.pm-payment-backdrop').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closePaymentModal();
      });
      root.querySelector('#pmPaymentAmount')?.focus();
    } catch (e) {
      console.error('[PM] payment modal', e);
      msg('Gagal membuka pembayaran: ' + (e.message || e));
    }
  }

  function closePreview() {
    document.querySelector('#pmInvoiceDocumentPreview')?.remove();
    document.body.classList.remove('pm-invoice-preview-open');
    window.__PM_CURRENT_INVOICE_PREVIEW = null;
  }

  async function previewForId(id) {
    try {
      await openForm(id);
      await previewInvoice();
    } catch (e) {
      console.error('[PM] invoice preview', e);
      msg('Gagal membuka preview: ' + (e.message || e));
    }
  }

  async function previewInvoice() {
    if (!current) return;
    try {
      const d = await load(current.id);
      current = { ...d, id: current.id, paid: paid(d.p) };
      closePreview();
      const quote = d.q;
      const total = quoteTotal(quote) + extrasTotal(d.ex);
      const packageCount = d.items.reduce((sum,item)=>sum+parsePack((d.masters||[]).find(m=>S(m.kode)===S(item?.kode))?.isi_paket).length,0);
      const densityScore = d.items.length + d.ex.length + Math.ceil(packageCount/2);
      const density = densityScore<=6?'normal':densityScore<=10?'compact-1':densityScore<=15?'compact-2':densityScore<=21?'compact-3':densityScore<=28?'compact-4':'compact-5';
      const rows = d.items.map((item, index) => documentItemRow(item, index + 1)).join('');
      const extraRows = d.ex.map((item, index) => extraRow(item, d.items.length + index + 1)).join('');
      const template = d.template || {};
      const root = document.createElement('div');
      root.id = 'pmInvoiceDocumentPreview';
      const headerSrc = new URL('header 1.png', document.baseURI).href;
      const invoiceNo = S(quote.nomor_invoice || 'Invoice');
      const invoiceDate = dateText(quote.tanggal_invoice || moneyDate());
      const dueDate = dateText(quote.jatuh_tempo || quote.tanggal_selesai || quote.tanggal_mulai || moneyDate());
      root.innerHTML = `<div class="pm-inv-toolbar"><div><strong>Preview Invoice</strong><span>A4 Portrait • ${E(invoiceNo)}</span></div><div class="pm-inv-actions"><button class="btn secondary" type="button" id="pmInvClose">Tutup</button><button class="btn green" type="button" id="pmInvPrint">Cetak / Simpan PDF</button></div></div><div class="pm-inv-scroll"><main class="pm-inv-a4 pm-order-density-${density}"><header class="pm-inv-head"><img class="pm-inv-head-image" src="${E(headerSrc)}" alt="Priangan Multimedia"><div class="pm-inv-doc"><div>INVOICE</div><b>${E(invoiceNo)}</b><div class="pm-inv-dates">TANGGAL: ${E(invoiceDate)}<br>JATUH TEMPO: ${E(dueDate)}</div></div></header><section class="pm-inv-info"><div class="pm-inv-box"><div class="pm-inv-label">DITUJUKAN KEPADA</div><div class="pm-inv-client">${E(quote.nama_client || '-')}</div><div>${E(quote.perusahaan || '')}</div><div>${E(quote.telepon_wa || quote.telepon || quote.whatsapp || '')}</div><div>${E(quote.email || '')}</div></div><div class="pm-inv-box"><div class="pm-inv-label">EVENT / PROJECT</div><div class="pm-inv-client">${E(quote.nama_event || quote.event_name || '-')}</div><div class="pm-inv-period-label">PERIODE</div><div>${E(periodText(quote.tanggal_mulai, quote.tanggal_selesai))}</div></div></section><table class="pm-inv-table"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${rows}${extraRows}<tr class="pm-inv-extra-total"><td colspan="5" class="right">Tambahan Invoice</td><td class="right">${M(extrasTotal(d.ex))}</td></tr><tr class="pm-inv-total"><td colspan="5" class="right"><strong>TOTAL</strong></td><td class="right">${M(total)}</td></tr></tbody></table><section class="pm-inv-pay"><div class="pm-inv-paybox"><div class="pm-inv-label">PEMBAYARAN</div><div class="pm-inv-payrow"><span>Total Invoice</span><b>${M(total)}</b></div><div class="pm-inv-payrow"><span>Downpayment</span><b>${M(paid(d.p))}</b></div><div class="pm-inv-payrow"><span>Sisa</span><b class="pm-inv-balance">${M(Math.max(0, total - paid(d.p)))}</b></div></div><div class="pm-inv-paybox"><div class="pm-inv-label">REKENING</div><div class="pm-inv-bank-details"><span>Bank</span><b>BCA • 1394575278</b><span>a.n.</span><b>Ganjar Rahmadhita</b></div></div></section><div class="pm-inv-bottom-row">${template.nama_penandatangan ? `<div class="pm-inv-sign"><div>HORMAT KAMI,</div>${template.ttd_url ? `<img src="${E(template.ttd_url)}" alt="TTD">` : ''}<div class="pm-inv-line"></div><strong>${E(template.nama_penandatangan)}</strong><div>${E(template.jabatan_penandatangan || '')}</div></div>` : ''}</div><div class="pm-inv-footer">Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.<strong>PRIANGAN MULTIMEDIA</strong></div></main></div>`;
      document.body.appendChild(root);
      document.body.classList.add('pm-invoice-preview-open');
      window.__PM_CURRENT_INVOICE_PREVIEW = root;
      window.__PM_INVOICE_PRINT_NUMBER = invoiceNo;
      window.__PM_PRINT_FILENAME = `${invoiceNo}.pdf`;
      document.title = invoiceNo;
      root.querySelector('#pmInvClose').onclick = closePreview;
      root.querySelector('#pmInvPrint').onclick = async () => {
        const oldTitle = document.title;
        document.title = `${invoiceNo}`;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        window.print();
        setTimeout(() => { document.title = oldTitle; }, 700);
      };
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
          closePreview();
          document.removeEventListener('keydown', escHandler);
        }
      }, { once: true });
    } catch (e) {
      console.error('[PM] invoice preview', e);
      msg('Gagal membuka preview: ' + (e.message || e));
    }
  }

  window.invoicePage = invoicePage;
  window.invoiceEdit = (id) => openForm(Number(id));
  window.invoiceAddItem = invoiceAddItem;
  window.invoiceAddOvertime = invoiceAddOvertime;
  window.invoiceRemoveItem = invoiceRemoveItem;
  window.saveInvoice = saveInvoice;
  window.inputDP = openPaymentModal;
  window.inputPelunasan = openPaymentModal;
  window.previewInvoice = previewInvoice;
  window.previewInvoiceById = previewForId;
  window.openPaymentModal = openPaymentModal;
  window.closePaymentModal = closePaymentModal;
  window.closeInvoicePreview = closePreview;

  const nav = document.querySelector('[data-p="invoice"]');
  if (nav && !nav.dataset.pmInvoiceCoreV2) {
    nav.dataset.pmInvoiceCoreV2 = '1';
    nav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      setPage();
      invoicePage();
    }, true);
  }
})();