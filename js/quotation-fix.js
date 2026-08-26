/* Reliable quotation save flow.
 * This file intentionally sits after app.js so it can replace the fragile
 * saveQuote handler without touching the rest of the UI.
 */
(function () {
  'use strict';

  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => Array.from(root.querySelectorAll(s));

  function clean(v) {
    return String(v ?? '').trim();
  }

  function num(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = clean(v).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function days(start, end) {
    if (!start || !end) return 1;
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    const diff = Math.round((b - a) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  }

  function getDb() {
    const cfg = window.PRIANGAN_CONFIG || {};
    const url = clean(localStorage.getItem('SUPABASE_URL') || cfg.SUPABASE_URL);
    const key = clean(localStorage.getItem('SUPABASE_ANON_KEY') || cfg.SUPABASE_ANON_KEY);
    if (!url || !key || !window.supabase?.createClient) return null;
    if (!window.__PRIANGAN_QUOTE_DB) {
      window.__PRIANGAN_QUOTE_DB = window.supabase.createClient(url, key);
    }
    return window.__PRIANGAN_QUOTE_DB;
  }

  function show(text) {
    if (typeof window.msg === 'function') window.msg(text);
    else alert(text);
  }

  function getFieldByLabel(root, labelText) {
    const fields = qa('.field', root);
    const wanted = labelText.toLowerCase();
    for (const field of fields) {
      const label = clean(q('label', field)?.textContent).toLowerCase();
      if (label === wanted || label.includes(wanted)) return q('input, select, textarea', field);
    }
    return null;
  }

  function readQuotationItems() {
    const cards = qa('#items .item');
    return cards.map((card) => {
      const select = q('select', card);
      const option = select?.selectedOptions?.[0];
      const selectedValue = clean(select?.value);
      const optionText = clean(option?.textContent);
      const match = optionText.match(/^\[([^\]]+)\]\s*(.*)$/);
      const kode = selectedValue || (match ? clean(match[1]) : '');
      const itemName = match ? clean(match[2]) : optionText.replace(/^--.*?--$/, '');
      const hargaInput = getFieldByLabel(card, 'Harga Jual');
      const tipeInput = getFieldByLabel(card, 'Tipe Perhitungan');
      const qtyInput = getFieldByLabel(card, 'Jumlah (Qty)');
      const lebarInput = getFieldByLabel(card, 'Lebar Videotron');
      const tinggiInput = getFieldByLabel(card, 'Tinggi');
      const panjangInput = getFieldByLabel(card, 'Panjang Rigging');
      const mulaiInput = getFieldByLabel(card, 'Tanggal Mulai');
      const selesaiInput = getFieldByLabel(card, 'Tanggal Selesai');
      const subtotalText = clean(q('.sum b', card)?.textContent);

      const tipe = clean(tipeInput?.value) || 'qty';
      const qty = Math.max(1, num(qtyInput?.value || 1));
      const lebar = num(lebarInput?.value || 0);
      const tinggi = num(tinggiInput?.value || 0);
      const panjang = num(panjangInput?.value || 0);
      const harga = num(hargaInput?.value || 0);
      const mulai = clean(mulaiInput?.value);
      const selesai = clean(selesaiInput?.value);
      const durasi = days(mulai, selesai);

      let subtotal = num(subtotalText);
      if (!subtotal) {
        if (tipe === 'luas') subtotal = lebar * tinggi * harga * durasi;
        else if (tipe === 'rigging') subtotal = (((panjang * 2) + (tinggi * 2)) * harga * durasi);
        else if (tipe === 'level') subtotal = lebar * tinggi * harga * durasi;
        else subtotal = qty * harga * durasi;
      }

      return {
        kode,
        item: itemName,
        harga_jual: harga,
        tipe_perhitungan: tipe,
        qty,
        lebar: lebar || null,
        tinggi: tinggi || null,
        panjang: panjang || null,
        tanggal_mulai: mulai || null,
        tanggal_selesai: selesai || null,
        durasi,
        subtotal
      };
    });
  }

  async function reliableSaveQuote() {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (button?.dataset.busy === '1') return;

    const db = getDb();
    if (!db) {
      show('Supabase belum terhubung. Buka Pengaturan dan cek URL + Publishable/Anon Key.');
      return;
    }

    if (button) {
      button.dataset.busy = '1';
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Menyimpan...';
    }

    try {
      const client = clean(q('#qc')?.value);
      const perusahaan = clean(q('#qp')?.value);
      const whatsapp = clean(q('#qw')?.value);
      const email = clean(q('#qe')?.value);
      const eventName = clean(q('#qeve')?.value);
      const startDate = clean(q('#qs')?.value) || null;
      const endDate = clean(q('#qe2')?.value) || null;

      if (!client || !perusahaan || !eventName) {
        show('Client, Perusahaan, dan Nama Event wajib diisi.');
        return;
      }
      if (startDate && endDate && endDate < startDate) {
        show('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
        return;
      }

      const items = readQuotationItems().filter((row) => row.kode && row.item);
      if (!items.length) {
        show('Pilih minimal 1 Produk / Jasa.');
        return;
      }

      const total = items.reduce((sum, row) => sum + num(row.subtotal), 0);
      const nomor = 'PM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

      const quotePayload = {
        nomor_penawaran: nomor,
        nama_client: client,
        perusahaan,
        telepon: whatsapp,
        whatsapp,
        email,
        event_name: eventName,
        tanggal_mulai: startDate,
        tanggal_selesai: endDate,
        total,
        status: 'DRAFT'
      };

      const quoteResult = await db.from('penawaran').insert(quotePayload).select('id').single();
      if (quoteResult.error) throw new Error('Penawaran: ' + quoteResult.error.message);
      const quoteId = quoteResult.data?.id;
      if (!quoteId) throw new Error('ID penawaran tidak dikembalikan oleh Supabase.');

      const itemPayload = items.map((row) => ({
        penawaran_id: quoteId,
        kode: row.kode,
        item: row.item,
        harga_jual: row.harga_jual,
        tipe_perhitungan: row.tipe_perhitungan,
        qty: row.qty,
        lebar: row.lebar,
        tinggi: row.tinggi,
        panjang: row.panjang,
        subtotal: row.subtotal
      }));

      const itemResult = await db.from('penawaran_items').insert(itemPayload).select('id');
      if (itemResult.error) {
        console.error('penawaran_items error:', itemResult.error);
        throw new Error('Item penawaran: ' + itemResult.error.message);
      }

      const itemRows = itemResult.data || [];
      if (itemRows.length !== items.length) {
        throw new Error('Jumlah item yang tersimpan tidak sesuai.');
      }

      const schedulePayload = items.map((row, index) => ({
        penawaran_item_id: itemRows[index].id,
        qty: row.qty,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        durasi: row.durasi,
        subtotal: row.subtotal
      }));

      const scheduleResult = await db.from('penawaran_jadwal').insert(schedulePayload);
      if (scheduleResult.error) {
        console.error('penawaran_jadwal error:', scheduleResult.error);
        throw new Error('Jadwal penawaran: ' + scheduleResult.error.message);
      }

      show('Penawaran berhasil disimpan: ' + nomor);
      if (typeof window.go === 'function') window.go('history');
    } catch (error) {
      console.error('Reliable save quotation error:', error);
      show('Gagal menyimpan penawaran: ' + (error?.message || error));
    } finally {
      if (button) {
        button.dataset.busy = '0';
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Simpan Penawaran';
      }
    }
  }

  function install() {
    window.saveQuote = reliableSaveQuote;
    window.__PRIANGAN_QUOTE_SAVE_FIXED = true;

    // Keep the button reliable even if another script re-renders the quotation UI.
    document.addEventListener('click', (event) => {
      const target = event.target.closest?.('button[onclick="saveQuote()"]');
      if (!target) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      reliableSaveQuote();
    }, true);
  }

  install();
})();
