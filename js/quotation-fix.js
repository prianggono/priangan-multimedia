/*
 * Priangan Multimedia - Quotation persistence
 * Canonical quotation date column: tanggal_penawaran.
 * Core fields are never removed from a failed payload.
 * harga_modal is never written to quotation output data.
 */
(function () {
  'use strict';

  const DB = Object.freeze({ clients: 'clients', quotations: 'penawaran', items: 'penawaran_items', schedules: 'penawaran_jadwal' });
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value ?? '').trim();

  function num(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const raw = clean(value).replace(/[^0-9,.-]/g, '');
    if (!raw) return 0;
    const normalized = raw.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function notify(message) { if (typeof window.msg === 'function') window.msg(message); else window.alert(message); }

  function db() {
    const config = window.PRIANGAN_CONFIG || {};
    const url = clean(localStorage.getItem('SUPABASE_URL') || config.SUPABASE_URL);
    const key = clean(localStorage.getItem('SUPABASE_ANON_KEY') || config.SUPABASE_ANON_KEY);
    if (!url || !key || !window.supabase?.createClient) return null;
    if (!window.__PRIANGAN_QUOTE_DB) window.__PRIANGAN_QUOTE_DB = window.supabase.createClient(url, key);
    return window.__PRIANGAN_QUOTE_DB;
  }

  function days(start, end) {
    if (!start || !end) return 1;
    const a = new Date(`${start}T00:00:00`), b = new Date(`${end}T00:00:00`);
    const d = Math.round((b - a) / 86400000);
    return d >= 0 ? d + 1 : 1;
  }

  function inputByLabel(root, text) {
    const wanted = clean(text).toLowerCase();
    for (const field of qa('.field', root)) {
      const label = clean(q('label', field)?.textContent).toLowerCase();
      if (label === wanted || label.includes(wanted)) return q('input,select,textarea', field);
    }
    return null;
  }

  function readItem(card) {
    const select = q('select', card), option = select?.selectedOptions?.[0];
    const optionText = clean(option?.textContent), match = optionText.match(/^\[([^\]]+)\]\s*(.*)$/);
    const kode = clean(select?.value) || clean(match?.[1]);
    const item = clean(match?.[2] || optionText);
    const harga = num(inputByLabel(card, 'Harga Jual')?.value);
    const tipe = clean(inputByLabel(card, 'Tipe Perhitungan')?.value) || 'qty';
    const qty = Math.max(1, num(inputByLabel(card, 'Jumlah (Qty)')?.value || 1));
    const lebar = num(inputByLabel(card, 'Lebar Videotron')?.value);
    const tinggi = num(inputByLabel(card, 'Tinggi')?.value);
    const panjang = num(inputByLabel(card, 'Panjang Rigging')?.value);
    const tanggal_mulai = clean(inputByLabel(card, 'Tanggal Mulai')?.value) || null;
    const tanggal_selesai = clean(inputByLabel(card, 'Tanggal Selesai')?.value) || null;
    const durasi = days(tanggal_mulai, tanggal_selesai);
    let subtotal = num(q('.sum b', card)?.textContent);
    if (!subtotal) {
      if (tipe === 'luas' || tipe === 'level') subtotal = lebar * tinggi * harga * durasi;
      else if (tipe === 'rigging') subtotal = ((panjang * 2) + (tinggi * 2)) * harga * durasi;
      else subtotal = qty * harga * durasi;
    }
    return { kode, item, harga_jual: harga, tipe_perhitungan: tipe, qty, lebar: lebar || null, tinggi: tinggi || null, panjang: panjang || null, tanggal_mulai, tanggal_selesai, durasi, subtotal };
  }

  function readForm() {
    return {
      nama_client: clean(q('#qc')?.value), perusahaan: clean(q('#qp')?.value), whatsapp: clean(q('#qw')?.value), email: clean(q('#qe')?.value),
      nama_event: clean(q('#qeve')?.value), tanggal_mulai: clean(q('#qs')?.value) || null, tanggal_selesai: clean(q('#qe2')?.value) || null
    };
  }

  function quotationNumber() { return `PM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`; }

  function setBusy(busy) {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (!button) return;
    if (busy) { button.dataset.originalText = button.textContent; button.dataset.busy = '1'; button.disabled = true; button.textContent = 'Menyimpan...'; }
    else { button.dataset.busy = '0'; button.disabled = false; button.textContent = button.dataset.originalText || 'Simpan Penawaran'; }
  }

  async function saveClient(client) {
    const result = await db().from(DB.clients).insert({ nama_client: client.nama_client, perusahaan: client.perusahaan, telepon: client.whatsapp, whatsapp: client.whatsapp, email: client.email, alamat: '' }).select('id,nama_client,perusahaan,telepon,whatsapp,email,alamat').single();
    if (result.error) throw new Error(`Client: ${result.error.message}`);
    return result.data;
  }

  async function saveHeader(database, form, client, total) {
    const today = new Date().toISOString().slice(0, 10), nomor = quotationNumber();
    // IMPORTANT: the live schema uses tanggal_penawaran, not tgl_penawaran.
    // Do not dynamically remove core fields when Supabase reports an error.
    const payload = {
      nomor_penawaran: nomor, nama_client: client.nama_client, perusahaan: client.perusahaan,
      telepon: client.telepon || client.whatsapp || '', whatsapp: client.whatsapp || '', email: client.email || '',
      nama_event: form.nama_event, event_name: form.nama_event, tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai, tanggal_penawaran: today, total, status: 'DRAFT'
    };
    const result = await database.from(DB.quotations).insert(payload).select('id,nomor_penawaran,nama_client,perusahaan,telepon,whatsapp,email,nama_event,event_name,tanggal_mulai,tanggal_selesai,tanggal_penawaran,total,status').single();
    if (result.error) throw new Error(`Penawaran: ${result.error.message}`);
    if (!result.data?.id) throw new Error('Penawaran tersimpan tetapi ID tidak dikembalikan.');
    return result.data;
  }

  async function saveItem(database, quotationId, item) {
    // harga_modal is intentionally excluded from quotation data.
    const result = await database.from(DB.items).insert({ penawaran_id: quotationId, kode: item.kode, item: item.item, harga_jual: item.harga_jual, tipe_perhitungan: item.tipe_perhitungan, qty: item.qty, lebar: item.lebar, tinggi: item.tinggi, panjang: item.panjang, tanggal_mulai: item.tanggal_mulai, tanggal_selesai: item.tanggal_selesai, durasi: item.durasi, subtotal: item.subtotal }).select('id,penawaran_id,kode,item,harga_jual,tipe_perhitungan,qty,lebar,tinggi,panjang,tanggal_mulai,tanggal_selesai,durasi,subtotal').single();
    if (result.error) throw new Error(`Item ${item.kode || item.item}: ${result.error.message}`);
    return result.data;
  }

  async function saveSchedule(database, itemId, item) {
    const result = await database.from(DB.schedules).insert({ penawaran_item_id: itemId, qty: item.qty, tanggal_mulai: item.tanggal_mulai, tanggal_selesai: item.tanggal_selesai, durasi: item.durasi, subtotal: item.subtotal }).select('id,penawaran_item_id,qty,tanggal_mulai,tanggal_selesai,durasi,subtotal').single();
    if (result.error) throw new Error(`Jadwal ${item.kode || item.item}: ${result.error.message}`);
    return result.data;
  }

  async function rollback(database, quotationId) {
    if (!quotationId) return;
    const result = await database.from(DB.quotations).delete().eq('id', quotationId);
    if (result.error) console.error('Rollback penawaran gagal:', result.error);
  }

  async function saveQuoteFixed() {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (button?.dataset.busy === '1') return;
    const database = db();
    if (!database) { notify('Supabase belum terhubung. Periksa URL dan Anon Key di Pengaturan.'); return; }
    setBusy(true);
    let quotationId = null;
    try {
      const form = readForm();
      if (!form.nama_client || !form.perusahaan || !form.nama_event) throw new Error('Nama client, perusahaan, dan event wajib diisi.');
      if (form.tanggal_mulai && form.tanggal_selesai && form.tanggal_selesai < form.tanggal_mulai) throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      const items = qa('#items .item').map(readItem).filter((item) => item.kode && item.item);
      if (!items.length) throw new Error('Pilih minimal satu Produk / Jasa.');
      const total = items.reduce((sum, item) => sum + num(item.subtotal), 0);
      // Client is saved first so every DRAFT is available for follow-up.
      const client = await saveClient(form);
      const quotation = await saveHeader(database, form, client, total);
      quotationId = quotation.id;
      for (const item of items) { const savedItem = await saveItem(database, quotationId, item); await saveSchedule(database, savedItem.id, item); }
      notify(`Penawaran ${quotation.nomor_penawaran} berhasil disimpan sebagai DRAFT.`);
      if (typeof window.go === 'function') window.go('history');
    } catch (error) {
      console.error('Quotation save error:', error);
      if (quotationId) await rollback(database, quotationId);
      notify(`Gagal menyimpan penawaran: ${error?.message || error}`);
    } finally { setBusy(false); }
  }

  window.saveQuote = saveQuoteFixed;
  window.__PRIANGAN_QUOTE_SAVE_FIXED = true;
  window.__PRIANGAN_QUOTE_SCHEMA = DB;
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('button[onclick="saveQuote()"]');
    if (!button) return;
    event.preventDefault(); event.stopImmediatePropagation(); saveQuoteFixed();
  }, true);
})();
