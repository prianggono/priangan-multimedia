/*
 * Priangan Multimedia - Quotation persistence
 *
 * Canonical Supabase schema used by this file:
 *
 * clients
 *   id, nama_client, perusahaan, telepon, whatsapp, email, alamat
 *
 * penawaran
 *   id, nomor_penawaran, nama_client, perusahaan, telepon, whatsapp, email,
 *   event_name, tanggal_mulai, tanggal_selesai, tanggal_penawaran, total, status
 *
 * penawaran_items
 *   id, penawaran_id, kode, item, harga_jual, tipe_perhitungan, qty,
 *   lebar, tinggi, panjang, tanggal_mulai, tanggal_selesai, durasi, subtotal
 *
 * penawaran_jadwal
 *   id, penawaran_item_id, qty, tanggal_mulai, tanggal_selesai, durasi, subtotal
 *
 * Important:
 * - No schema probing.
 * - No retry that removes missing columns.
 * - No harga_modal is written to quotation tables.
 * - Client is saved before quotation so DRAFT is already available for follow-up.
 * - If quotation/item/schedule persistence fails, the error is shown directly.
 */
(function () {
  'use strict';

  const DB_SCHEMA = Object.freeze({
    clients: 'clients',
    quotations: 'penawaran',
    quotationItems: 'penawaran_items',
    schedules: 'penawaran_jadwal'
  });

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value ?? '').trim();

  function number(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = clean(value).replace(/[^0-9,.-]/g, '');
    if (!raw) return 0;
    const normalized = raw
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const result = Number(normalized);
    return Number.isFinite(result) ? result : 0;
  }

  function show(message) {
    if (typeof window.msg === 'function') window.msg(message);
    else window.alert(message);
  }

  function getDb() {
    const config = window.PRIANGAN_CONFIG || {};
    const url = clean(localStorage.getItem('SUPABASE_URL') || config.SUPABASE_URL);
    const key = clean(localStorage.getItem('SUPABASE_ANON_KEY') || config.SUPABASE_ANON_KEY);

    if (!url || !key || !window.supabase?.createClient) return null;

    if (!window.__PRIANGAN_QUOTE_DB) {
      window.__PRIANGAN_QUOTE_DB = window.supabase.createClient(url, key);
    }

    return window.__PRIANGAN_QUOTE_DB;
  }

  function inclusiveDays(start, end) {
    if (!start || !end) return 1;
    const a = new Date(`${start}T00:00:00`);
    const b = new Date(`${end}T00:00:00`);
    const diff = Math.round((b - a) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  }

  function fieldInput(root, labelText) {
    const wanted = clean(labelText).toLowerCase();
    for (const field of qa('.field', root)) {
      const label = clean(q('label', field)?.textContent).toLowerCase();
      if (label === wanted || label.includes(wanted)) {
        return q('input, select, textarea', field);
      }
    }
    return null;
  }

  function readItemCard(card) {
    const select = q('select', card);
    const option = select?.selectedOptions?.[0];
    const code = clean(select?.value);
    const optionText = clean(option?.textContent);
    const match = optionText.match(/^\[([^\]]+)\]\s*(.*)$/);

    const kode = code || clean(match?.[1]);
    const item = clean(match?.[2] || optionText);
    const harga = number(fieldInput(card, 'Harga Jual')?.value);
    const tipe = clean(fieldInput(card, 'Tipe Perhitungan')?.value) || 'qty';
    const qty = Math.max(1, number(fieldInput(card, 'Jumlah (Qty)')?.value || 1));
    const lebar = number(fieldInput(card, 'Lebar Videotron')?.value);
    const tinggi = number(fieldInput(card, 'Tinggi')?.value);
    const panjang = number(fieldInput(card, 'Panjang Rigging')?.value);
    const tanggalMulai = clean(fieldInput(card, 'Tanggal Mulai')?.value) || null;
    const tanggalSelesai = clean(fieldInput(card, 'Tanggal Selesai')?.value) || null;
    const durasi = inclusiveDays(tanggalMulai, tanggalSelesai);

    let subtotal = number(q('.sum b', card)?.textContent);
    if (!subtotal) {
      if (tipe === 'luas') subtotal = lebar * tinggi * harga * durasi;
      else if (tipe === 'rigging') subtotal = ((panjang * 2) + (tinggi * 2)) * harga * durasi;
      else if (tipe === 'level') subtotal = lebar * tinggi * harga * durasi;
      else subtotal = qty * harga * durasi;
    }

    return {
      kode,
      item,
      harga_jual: harga,
      tipe_perhitungan: tipe,
      qty,
      lebar: lebar || null,
      tinggi: tinggi || null,
      panjang: panjang || null,
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      durasi,
      subtotal
    };
  }

  function readQuotationItems() {
    return qa('#items .item').map(readItemCard);
  }

  function readForm() {
    return {
      nama_client: clean(q('#qc')?.value),
      perusahaan: clean(q('#qp')?.value),
      whatsapp: clean(q('#qw')?.value),
      email: clean(q('#qe')?.value),
      event_name: clean(q('#qeve')?.value),
      tanggal_mulai: clean(q('#qs')?.value) || null,
      tanggal_selesai: clean(q('#qe2')?.value) || null
    };
  }

  function generateQuotationNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const suffix = String(Date.now()).slice(-6);
    return `PM-${year}-${suffix}`;
  }

  function setSaveButtonState(busy) {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (!button) return;

    if (busy) {
      button.dataset.originalText = button.textContent;
      button.dataset.busy = '1';
      button.disabled = true;
      button.textContent = 'Menyimpan...';
    } else {
      button.dataset.busy = '0';
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Simpan Penawaran';
    }
  }

  async function saveClient(db, data) {
    const payload = {
      nama_client: data.nama_client,
      perusahaan: data.perusahaan,
      telepon: data.whatsapp,
      whatsapp: data.whatsapp,
      email: data.email,
      alamat: ''
    };

    const result = await db
      .from(DB_SCHEMA.clients)
      .insert(payload)
      .select('id, nama_client, perusahaan, telepon, whatsapp, email, alamat')
      .single();

    if (result.error) {
      throw new Error(`Client: ${result.error.message}`);
    }

    return result.data;
  }

  async function saveQuotation(db, data, client, items, total) {
    const today = new Date().toISOString().slice(0, 10);
    const nomor = generateQuotationNumber();

    // Only canonical columns are sent here.
    // Do not add aliases such as nama_event, event, project, tanggal, tgl_penawaran, etc.
    const payload = {
      nomor_penawaran: nomor,
      nama_client: client.nama_client,
      perusahaan: client.perusahaan,
      telepon: client.telepon || client.whatsapp || '',
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      event_name: data.event_name,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai,
      tanggal_penawaran: today,
      total,
      status: 'DRAFT'
    };

    const result = await db
      .from(DB_SCHEMA.quotations)
      .insert(payload)
      .select('id, nomor_penawaran, nama_client, perusahaan, telepon, whatsapp, email, event_name, tanggal_mulai, tanggal_selesai, tanggal_penawaran, total, status')
      .single();

    if (result.error) {
      throw new Error(`Penawaran: ${result.error.message}`);
    }

    const quotationId = result.data?.id;
    if (!quotationId) throw new Error('Penawaran tersimpan tetapi ID penawaran tidak dikembalikan.');

    return { ...result.data, id: quotationId, items };
  }

  async function saveQuotationItem(db, quotationId, item) {
    // harga_modal is deliberately NOT included.
    const payload = {
      penawaran_id: quotationId,
      kode: item.kode,
      item: item.item,
      harga_jual: item.harga_jual,
      tipe_perhitungan: item.tipe_perhitungan,
      qty: item.qty,
      lebar: item.lebar,
      tinggi: item.tinggi,
      panjang: item.panjang,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      durasi: item.durasi,
      subtotal: item.subtotal
    };

    const result = await db
      .from(DB_SCHEMA.quotationItems)
      .insert(payload)
      .select('id, penawaran_id, kode, item, harga_jual, tipe_perhitungan, qty, lebar, tinggi, panjang, tanggal_mulai, tanggal_selesai, durasi, subtotal')
      .single();

    if (result.error) {
      throw new Error(`Item ${item.kode || item.item}: ${result.error.message}`);
    }

    return result.data;
  }

  async function saveSchedule(db, quotationItemId, item) {
    const payload = {
      penawaran_item_id: quotationItemId,
      qty: item.qty,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      durasi: item.durasi,
      subtotal: item.subtotal
    };

    const result = await db
      .from(DB_SCHEMA.schedules)
      .insert(payload)
      .select('id, penawaran_item_id, qty, tanggal_mulai, tanggal_selesai, durasi, subtotal')
      .single();

    if (result.error) {
      throw new Error(`Jadwal ${item.kode || item.item}: ${result.error.message}`);
    }

    return result.data;
  }

  async function rollbackQuotation(db, quotationId) {
    if (!quotationId) return;
    const result = await db.from(DB_SCHEMA.quotations).delete().eq('id', quotationId);
    if (result.error) console.error('Rollback quotation gagal:', result.error);
  }

  async function reliableSaveQuote() {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (button?.dataset.busy === '1') return;

    const db = getDb();
    if (!db) {
      show('Supabase belum terhubung. Buka Pengaturan dan periksa URL + Anon Key.');
      return;
    }

    setSaveButtonState(true);
    let quotationId = null;

    try {
      const form = readForm();

      if (!form.nama_client || !form.perusahaan || !form.event_name) {
        throw new Error('Client, Perusahaan, dan Nama Event wajib diisi.');
      }

      if (form.tanggal_mulai && form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) {
        throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      }

      const quotationItems = readQuotationItems().filter((item) => item.kode && item.item);
      if (!quotationItems.length) throw new Error('Pilih minimal 1 Produk / Jasa.');

      const total = quotationItems.reduce((sum, item) => sum + number(item.subtotal), 0);

      // 1. Save contact immediately. DRAFT also creates a follow-up contact.
      const client = await saveClient(db, form);

      // 2. Save quotation header using canonical columns only.
      const quotation = await saveQuotation(db, form, client, quotationItems, total);
      quotationId = quotation.id;

      // 3. Save every item and its schedule using the real generated item ID.
      for (const item of quotationItems) {
        const savedItem = await saveQuotationItem(db, quotationId, item);
        await saveSchedule(db, savedItem.id, item);
      }

      show(`Penawaran ${quotation.nomor_penawaran} berhasil disimpan sebagai DRAFT.`);

      if (typeof window.go === 'function') window.go('history');
      setTimeout(() => renderHistory(db), 150);
    } catch (error) {
      console.error('Quotation save error:', error);
      if (quotationId) await rollbackQuotation(db, quotationId);
      show(`Gagal menyimpan penawaran: ${error?.message || error}`);
    } finally {
      setSaveButtonState(false);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function money(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(number(value));
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  async function renderHistory(db) {
    try {
      const result = await db
        .from(DB_SCHEMA.quotations)
        .select('id, nomor_penawaran, nama_client, perusahaan, telepon, whatsapp, email, event_name, tanggal_mulai, tanggal_selesai, tanggal_penawaran, total, status, created_at')
        .order('id', { ascending: false });

      if (result.error) throw result.error;

      const content = q('#content');
      if (!content) return;
      const rows = result.data || [];

      content.innerHTML = `
        <div class="head">
          <div>
            <h1>Riwayat Penawaran</h1>
            <p>Data penawaran tersimpan di Supabase.</p>
          </div>
          <button class="btn" onclick="go('quotation')">+ Buat Penawaran</button>
        </div>
        <div class="card">
          <div class="scroll">
            <table class="table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>Client</th>
                  <th>Perusahaan</th>
                  <th>Event</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    <td>${escapeHtml(row.nomor_penawaran)}</td>
                    <td>${formatDate(row.tanggal_penawaran)}</td>
                    <td>${escapeHtml(row.nama_client)}</td>
                    <td>${escapeHtml(row.perusahaan)}</td>
                    <td>${escapeHtml(row.event_name)}</td>
                    <td>${money(row.total)}</td>
                    <td>${escapeHtml(row.status || 'DRAFT')}</td>
                  </tr>
                `).join('') || '<tr><td colspan="7" class="empty">Belum ada penawaran.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (error) {
      console.error('History load error:', error);
      show(`Penawaran tersimpan, tetapi riwayat gagal dibaca: ${error?.message || error}`);
    }
  }

  function install() {
    window.saveQuote = reliableSaveQuote;
    window.__PRIANGAN_QUOTE_SAVE_FIXED = true;
    window.__PRIANGAN_QUOTE_SCHEMA = DB_SCHEMA;

    document.addEventListener('click', (event) => {
      const button = event.target.closest?.('button[onclick="saveQuote()"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      reliableSaveQuote();
    }, true);
  }

  install();
})();
