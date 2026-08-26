/* Final finance correction.
 * Uses item.harga_modal only when it is actually > 0; otherwise falls back to
 * the current Master Harga cost. This prevents the default 0 in older rows from
 * hiding the real cost and producing a false 100% margin.
 */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  const num = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[m]);
  const money = (v) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(num(v));
  const pct = (v) => `${num(v).toFixed(2)}%`;
  const q = (s) => document.querySelector(s);

  function getDb() {
    if (typeof db !== 'undefined' && db) return db;
    const cfg = window.PRIANGAN_CONFIG || {};
    const url = clean(localStorage.getItem('SUPABASE_URL') || cfg.SUPABASE_URL);
    const key = clean(localStorage.getItem('SUPABASE_ANON_KEY') || cfg.SUPABASE_ANON_KEY);
    if (!url || !key || !window.supabase?.createClient) return null;
    if (!window.__PM_FINANCE_FIX_DB) window.__PM_FINANCE_FIX_DB = window.supabase.createClient(url, key);
    return window.__PM_FINANCE_FIX_DB;
  }

  function dateValue(row) {
    return row.tanggal_penawaran || row.tanggal || row.created_at || row.tanggal_mulai || '';
  }

  function dateText(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function startOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  }

  function endOfMonth() {
    const d = new Date();
    const last = new Date(d.getFullYear(), d.getMonth()+1, 0);
    return `${last.getFullYear()}-${String(last.getMonth()+1).padStart(2,'0')}-${String(last.getDate()).padStart(2,'0')}`;
  }

  function getCost(item, master) {
    const itemCost = num(item.harga_modal ?? item.modal);
    return itemCost > 0 ? itemCost : num(master?.harga_modal);
  }

  function calcItemCost(item, master) {
    const cost = getCost(item, master);
    if (cost <= 0) return 0;
    const tipe = clean(item.tipe_perhitungan || item.tipe).toLowerCase();
    const qty = Math.max(1, num(item.qty ?? item.jumlah ?? 1));
    const lebar = num(item.lebar);
    const tinggi = num(item.tinggi);
    const panjang = num(item.panjang);
    const durasi = Math.max(1, num(item.durasi || 1));
    if (tipe === 'luas') return lebar * tinggi * cost * durasi;
    if (tipe === 'rigging') return ((panjang * 2) + (tinggi * 2)) * cost * durasi;
    if (tipe === 'level') return lebar * tinggi * cost * durasi;
    return qty * cost * durasi;
  }

  async function loadFinance(from = startOfMonth(), to = endOfMonth()) {
    try {
      const database = getDb();
      if (!database) throw new Error('Supabase belum terhubung.');

      const [quotesResult, itemsResult, mastersResult] = await Promise.all([
        database.from('penawaran').select('*').order('id', { ascending:false }),
        database.from('penawaran_items').select('*').order('id'),
        database.from('master_harga').select('*').order('id')
      ]);
      if (quotesResult.error) throw quotesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (mastersResult.error) throw mastersResult.error;

      const masterMap = new Map((mastersResult.data || []).map((m) => [clean(m.kode), m]));
      const itemsByQuote = new Map();
      (itemsResult.data || []).forEach((item) => {
        const key = String(item.penawaran_id ?? '');
        if (!itemsByQuote.has(key)) itemsByQuote.set(key, []);
        itemsByQuote.get(key).push(item);
      });

      const rows = (quotesResult.data || []).filter((quote) => {
        const d = String(dateValue(quote)).slice(0,10);
        return (!from || d >= from) && (!to || d <= to);
      }).map((quote) => {
        const details = (itemsByQuote.get(String(quote.id)) || []).map((item) => {
          const master = masterMap.get(clean(item.kode));
          return { item, master, cost: calcItemCost(item, master) };
        });
        const beforeDiscount = num(quote.subtotal ?? quote.total_sebelum_diskon ?? quote.total_harga ?? quote.grand_total ?? quote.total);
        const discount = num(quote.diskon ?? quote.discount ?? quote.nilai_diskon ?? quote.discount_amount);
        const omzet = num(quote.grand_total ?? quote.total ?? quote.total_harga) || Math.max(0, beforeDiscount - discount);
        const modal = details.reduce((sum, row) => sum + row.cost, 0);
        const laba = omzet - modal;
        return {
          nomor: quote.nomor_penawaran || quote.nomor || '-',
          client: quote.nama_client || quote.client_name || quote.client || '-',
          event: quote.nama_event || quote.event_name || quote.event || quote.project || '-',
          status: String(quote.status || 'DRAFT').toUpperCase(),
          tanggal: dateValue(quote),
          discount,
          omzet,
          modal,
          laba,
          margin: omzet > 0 ? (laba / omzet) * 100 : 0
        };
      });

      const omzet = rows.reduce((s,r) => s + r.omzet, 0);
      const modal = rows.reduce((s,r) => s + r.modal, 0);
      const laba = omzet - modal;
      const discount = rows.reduce((s,r) => s + r.discount, 0);
      const margin = omzet > 0 ? (laba / omzet) * 100 : 0;
      const statuses = rows.reduce((m,r) => { m[r.status] = (m[r.status] || 0) + 1; return m; }, {});

      q('#title').textContent = 'Laporan Keuangan';
      document.querySelectorAll('.nav').forEach((b) => b.classList.toggle('active', b.dataset.p === 'finance'));
      q('#content').innerHTML = `
        <div class="head">
          <div><h1>Laporan Keuangan</h1><p>Omzet, harga modal, laba kotor dan margin — data internal.</p></div>
          <button class="btn secondary" type="button" onclick="financePage()">↻ Refresh</button>
        </div>
        <div class="card" style="margin-bottom:16px">
          <div class="grid g2">
            <div class="field"><label>Dari Tanggal</label><input id="financeFrom" type="date" value="${esc(from)}"></div>
            <div class="field"><label>Sampai Tanggal</label><input id="financeTo" type="date" value="${esc(to)}"></div>
          </div>
          <div class="actions"><button class="btn" type="button" onclick="applyFinanceFilter()">Terapkan Filter</button><button class="btn secondary" type="button" onclick="financeCurrentMonth()">Bulan Ini</button></div>
        </div>
        <div class="grid g4">
          <div class="card stat"><small>Omzet</small><strong>${money(omzet)}</strong></div>
          <div class="card stat"><small>Total Modal</small><strong>${money(modal)}</strong></div>
          <div class="card stat"><small>Laba Kotor</small><strong style="color:#00e0a4">${money(laba)}</strong></div>
          <div class="card stat"><small>Margin</small><strong>${pct(margin)}</strong></div>
        </div>
        <div class="grid g4" style="margin-top:16px">
          <div class="card stat"><small>Penawaran</small><strong>${rows.length}</strong></div>
          <div class="card stat"><small>Total Diskon</small><strong>${money(discount)}</strong></div>
          <div class="card stat"><small>DRAFT</small><strong>${statuses.DRAFT || 0}</strong></div>
          <div class="card stat"><small>TERKIRIM / DEAL</small><strong>${(statuses.TERKIRIM||0)+(statuses.SENT||0)+(statuses.PUBLISHED||0)+(statuses.DEAL||0)}</strong></div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="scroll"><table class="table"><thead><tr><th>Tanggal</th><th>No</th><th>Client</th><th>Event</th><th>Status</th><th>Omzet</th><th>Modal</th><th>Laba</th><th>Margin</th></tr></thead><tbody>
            ${rows.map((r) => `<tr><td>${esc(dateText(r.tanggal))}</td><td>${esc(r.nomor)}</td><td>${esc(r.client)}</td><td>${esc(r.event)}</td><td>${esc(r.status)}</td><td>${money(r.omzet)}</td><td>${money(r.modal)}</td><td><b>${money(r.laba)}</b></td><td><b>${pct(r.margin)}</b></td></tr>`).join('') || '<tr><td colspan="9" class="empty">Belum ada data pada periode ini.</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card" style="margin-top:16px"><b>Privasi harga modal</b><p style="color:var(--muted);margin:8px 0 0">Harga modal hanya tampil di modul laporan internal. Harga modal tidak pernah dimasukkan ke surat penawaran atau preview A4 client.</p></div>`;
    } catch (error) {
      console.error('Finance fix error:', error);
      q('#content').innerHTML = `<div class="card" style="border-color:#b42318;color:#ffb4ab"><b>Gagal memuat laporan keuangan</b><p>${esc(error?.message || error)}</p></div>`;
    }
  }

  window.financePage = () => loadFinance();
  window.applyFinanceFilter = () => loadFinance(q('#financeFrom')?.value || '', q('#financeTo')?.value || '');
  window.financeCurrentMonth = () => loadFinance(startOfMonth(), endOfMonth());
})();
