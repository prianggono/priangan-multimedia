/* Priangan Multimedia — stability final fix
 * Single last-loaded safety layer. Keeps existing UI, but makes quotation state,
 * Master Harga units, edit/reload, history totals and discount calculations use
 * one consistent source of truth.
 */
(function () {
  'use strict';

  const S = v => String(v ?? '').trim();
  const N = v => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const r = S(v).replace(/[^0-9,.-]/g, '');
    if (!r) return 0;
    const n = Number(r.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const M = v => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(N(v));
  const E = v => S(v).replace(/[&<>"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));
  const units = new Set(['unit','units','pcs','pc','buah','set']);
  const areas = new Set(['m2','m²','meter2','meterpersegi','luas']);

  function db() {
    try { if (typeof window.db !== 'undefined' && window.db) return window.db; } catch (_) {}
    try { if (typeof window.supabase !== 'undefined') return null; } catch (_) {}
    return window.__PRIANGAN_QUOTE_DB || null;
  }

  function masters() { return Array.isArray(window.masters) ? window.masters : []; }
  function stateItems() { return Array.isArray(window.items) ? window.items : []; }
  function days(a, b) {
    if (!a || !b) return 1;
    const x = new Date(S(a) + 'T00:00:00'), y = new Date(S(b) + 'T00:00:00');
    const d = Math.round((y - x) / 86400000);
    return d >= 0 ? d + 1 : 1;
  }
  function masterFor(code) { return masters().find(m => S(m.kode) === S(code)) || null; }
  function ruleFor(master, savedType) {
    const sat = S(master?.satuan).toLowerCase().replace(/\s+/g, '');
    if (units.has(sat)) return 'qty';
    if (areas.has(sat)) return 'luas';
    const t = (S(master?.kode) + ' ' + S(master?.item) + ' ' + S(master?.kategori)).toLowerCase();
    if (/rigging|rig/.test(t)) return 'rigging';
    if (/level/.test(t)) return 'level';
    if (/led|videotron/.test(t)) return 'luas';
    return S(savedType).toLowerCase() || 'qty';
  }
  function itemSubtotal(item, all) {
    const type = S(item.tipe).toLowerCase();
    const price = N(item.harga);
    const dur = days(item.mulai, item.selesai);
    if (type === 'luas') return N(item.lebar) * N(item.tinggi) * price * dur;
    if (type === 'rigging') return ((N(item.panjang) * 2) + (N(item.tinggi) * 2)) * price * dur;
    if (type === 'level') {
      const led = all.find(x => x !== item && /led|videotron/i.test(S(x.item)));
      return (led ? N(led.lebar) : N(item.lebar)) * N(item.tinggi) * price * dur;
    }
    return (N(item.qty) || 1) * price * dur;
  }

  /* Keep add/remove/pick state on window.items. This is intentional: the old
     app.js has a private lexical `items` array, while the later fixes use the
     window state. New/edit navigation must never create a second source. */
  const originalAdd = window.addItem;
  window.addItem = function () {
    const a = stateItems();
    a.push({ id: Date.now() + Math.random(), kode:'', item:'', harga:0, qty:1, lebar:0, tinggi:0, panjang:0, mulai:'', selesai:'', tipe:'qty' });
    window.items = a;
    window.__pmItems = a;
    if (typeof window.drawItems === 'function') window.drawItems();
  };

  const originalRemove = window.removeItem;
  window.removeItem = function (id) {
    window.items = stateItems().filter(x => String(x.id) !== String(id));
    window.__pmItems = window.items;
    if (typeof window.drawItems === 'function') window.drawItems();
  };

  const originalPick = window.pick;
  window.pick = function (id, kode) {
    const master = masterFor(kode), a = stateItems(), item = a.find(x => String(x.id) === String(id));
    if (!master || !item) return;
    item.kode = master.kode;
    item.item = master.item;
    item.harga = N(master.harga_jual);
    item.tipe = ruleFor(master, item.tipe);
    if (item.tipe === 'qty') {
      item.lebar = 0;
      item.tinggi = 0;
      item.panjang = 0;
      item.qty = N(item.qty) || 1;
    }
    window.items = a;
    window.__pmItems = a;
    if (typeof window.drawItems === 'function') window.drawItems();
  };

  /* Navigation guard: quotation creation always starts with exactly one blank
     item; edit navigation temporarily suppresses that automatic blank item. */
  const originalGo = window.go;
  if (typeof originalGo === 'function' && !window.__PM_STABILITY_GO_PATCHED) {
    window.go = function (target) {
      if (target !== 'quotation') return originalGo.apply(this, arguments);
      const edit = !!(window.__pmPendingEdit || window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
      if (edit) window.__pmSuppressAutoAdd = true;
      try { return originalGo.apply(this, arguments); }
      finally { window.__pmSuppressAutoAdd = false; }
    };
    window.__PM_STABILITY_GO_PATCHED = true;
  }

  /* Replace the quotation editor entry point. The old editor correctly reads
     the database, but its window.items assignment did not update app.js's
     private lexical items array. This version loads once, preserves DB order,
     and redraws the normal quotation form without an extra blank item. */
  async function editQuotationStable(id) {
    const d = db();
    if (!d) return typeof window.msg === 'function' ? window.msg('Supabase belum terhubung.') : null;
    try {
      const [qr, ir] = await Promise.all([
        d.from('penawaran').select('*').eq('id', id).single(),
        d.from('penawaran_items').select('*').eq('penawaran_id', id).order('id', { ascending: true })
      ]);
      if (qr.error) throw qr.error;
      if (ir.error) throw ir.error;
      const row = qr.data || {};
      const saved = ir.data || [];
      if (!saved.length) throw new Error('Penawaran ini belum memiliki item.');

      const loaded = saved.map((x, index) => {
        const master = masterFor(x.kode);
        const type = ruleFor(master, x.tipe_perhitungan || x.tipe);
        return {
          id: Date.now() + index + Math.random(),
          __savedItemId: x.id,
          kode: S(x.kode),
          item: S(x.item || x.nama_item),
          harga: N(x.harga_jual ?? x.harga),
          qty: N(x.qty ?? x.jumlah) || 1,
          lebar: N(x.lebar),
          tinggi: N(x.tinggi),
          panjang: N(x.panjang),
          mulai: S(x.tanggal_mulai),
          selesai: S(x.tanggal_selesai),
          tipe: type
        };
      });

      window.__pmPendingEdit = true;
      window.__pmEditingQuotationId = id;
      window.__PM_EDIT_QUOTATION_ID = id;
      window.__pmEditingQuotationNumber = S(row.nomor_penawaran || row.nomor || id);
      window.items = loaded;
      window.__pmItems = loaded;

      if (typeof originalGo === 'function') originalGo('quotation');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      /* quotationPage may have rendered a legacy blank row before the state was
         installed. drawItems replaces the complete #items DOM, so that row is
         removed atomically here. */
      window.items = loaded;
      window.__pmItems = loaded;
      if (typeof window.drawItems === 'function') window.drawItems();

      const set = (sel, value) => { const el = document.querySelector(sel); if (el) el.value = value ?? ''; };
      set('#qc', row.nama_client);
      set('#qp', row.perusahaan);
      set('#qw', row.whatsapp || row.telepon);
      set('#qe', row.email);
      set('#qeve', row.nama_event || row.event_name || row.event || row.project);
      set('#qs', row.tanggal_mulai);
      set('#qe2', row.tanggal_selesai);

      await new Promise(r => requestAnimationFrame(r));
      const disc = N(row.diskon);
      const rp = document.querySelector('#pmDisc');
      const pct = document.querySelector('#pmDiscPct');
      if (rp) rp.value = disc;
      if (pct) {
        const base = loaded.reduce((sum, x) => sum + itemSubtotal(x, loaded), 0);
        pct.value = base ? (disc / base * 100).toFixed(2) : '0';
        rp?.dispatchEvent(new Event('input', { bubbles:true }));
      }
      if (typeof window.msg === 'function') window.msg(`Mode edit aktif: ${window.__pmEditingQuotationNumber} — ${loaded.length} item.`);
    } catch (e) {
      window.__pmPendingEdit = false;
      window.__pmEditingQuotationId = null;
      window.__PM_EDIT_QUOTATION_ID = null;
      console.error('[PM] stable edit error', e);
      if (typeof window.msg === 'function') window.msg('Gagal membuka penawaran: ' + (e.message || e));
    } finally {
      window.__pmPendingEdit = false;
    }
  }
  window.editQuotation = editQuotationStable;

  /* History is read-only in this layer. It calculates the displayed total from
     the saved item rows, so an old corrupted header total can never inflate the
     history screen. No UPDATE is performed while rendering history, preventing
     request storms/freezes. */
  async function renderHistoryStable() {
    const d = db();
    if (!d) return;
    const c = document.querySelector('#content');
    if (!c) return;
    c.innerHTML = '<div class="card"><div class="empty">Memuat riwayat...</div></div>';
    try {
      const [qr, ir] = await Promise.all([
        d.from('penawaran').select('*').order('id', { ascending:false }),
        d.from('penawaran_items').select('*').order('id', { ascending:true })
      ]);
      if (qr.error) throw qr.error;
      if (ir.error) throw ir.error;
      const rows = qr.data || [];
      const byQuote = new Map();
      (ir.data || []).forEach(x => {
        const key = String(x.penawaran_id);
        if (!byQuote.has(key)) byQuote.set(key, []);
        byQuote.get(key).push(x);
      });
      const calcQuote = row => {
        const its = byQuote.get(String(row.id)) || [];
        let base = 0;
        its.forEach(x => {
          const m = masterFor(x.kode);
          const type = ruleFor(m, x.tipe_perhitungan || x.tipe);
          const item = { tipe:type, harga:N(x.harga_jual ?? x.harga), qty:N(x.qty ?? x.jumlah)||1, lebar:N(x.lebar), tinggi:N(x.tinggi), panjang:N(x.panjang), mulai:S(x.tanggal_mulai || row.tanggal_mulai), selesai:S(x.tanggal_selesai || row.tanggal_selesai) };
          base += itemSubtotal(item, its.map(y => ({...y, item:S(y.item || y.nama_item), lebar:N(y.lebar)})));
        });
        const discount = Math.max(0, Math.min(base, N(row.diskon)));
        return { base, discount, total:Math.max(0, base-discount), items:its };
      };
      const rowsHtml = rows.map(row => {
        const x = calcQuote(row);
        const status = S(row.status || 'DRAFT').toUpperCase();
        const sent = ['TERKIRIM','PUBLISHED','SENT'].includes(status);
        const date = S(row.tanggal_penawaran || row.tanggal || row.created_at || row.tanggal_mulai).slice(0,10) || '-';
        const actions = `<div class="pmHistoryActions">
          <button type="button" class="btn sm" onclick="editQuotation(${Number(row.id)})">Edit</button>
          ${sent ? '<span class="pm-sent-note">Sudah diberikan</span>' : `<button type="button" class="btn green sm" onclick="publishQuotation(${Number(row.id)})">Publish</button>`}
          <button type="button" class="btn secondary sm" onclick="inputDP(${Number(row.id)})">DP</button>
          <button type="button" class="btn red sm" onclick="deleteQuotation(${Number(row.id)})">Hapus</button>
        </div>`;
        return `<tr><td>${E(row.nomor_penawaran || row.nomor || '-')}</td><td>${E(date)}</td><td>${E(row.nama_client || '-')}</td><td>${E(row.perusahaan || '-')}</td><td>${E(row.nama_event || row.event_name || row.event || row.project || '-')}</td><td>${M(x.total)}</td><td><span class="pm-status ${sent?'sent':'draft'}">${E(sent?'TERKIRIM':status)}</span></td><td>${actions}</td></tr>`;
      }).join('');
      c.innerHTML = `<div class="head"><div><h1>Riwayat Penawaran</h1><p>Penawaran tersimpan di Supabase.</p></div><button class="btn" onclick="go('quotation')">+ Buat Penawaran</button></div><div class="card"><div class="scroll"><table class="table pm-history-table"><thead><tr><th>No</th><th>Tanggal</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rowsHtml || '<tr><td colspan="8" class="empty">Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
    } catch (e) {
      console.error('[PM] stable history error', e);
      c.innerHTML = `<div class="card"><div class="empty">Gagal membaca riwayat: ${E(e.message || e)}</div></div>`;
    }
  }
  window.renderHistory = renderHistoryStable;

  const style = document.createElement('style');
  style.textContent = `.pm-history-table{width:100%}.pm-history-table td,.pm-history-table th{vertical-align:middle}.pmHistoryActions{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pmHistoryActions .btn.sm{padding:6px 10px;font-size:12px;white-space:nowrap}.pm-sent-note{font-size:11px;color:#7dd3fc;white-space:nowrap}`;
  document.head.appendChild(style);

  window.__PM_STABILITY_FINAL_FIX = 'v1';
})();
