/*
 * Reliable quotation save + schema compatibility layer.
 * Loaded after app.js. It is intentionally defensive because the existing
 * Supabase project has columns whose names differ from the original UI code.
 */
(function () {
  'use strict';

  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => Array.from(root.querySelectorAll(s));

  const clean = (v) => String(v ?? '').trim();
  const num = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = clean(v)
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const days = (start, end) => {
    if (!start || !end) return 1;
    const a = new Date(start + 'T00:00:00');
    const b = new Date(end + 'T00:00:00');
    const diff = Math.round((b - a) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  };

  function show(text) {
    if (typeof window.msg === 'function') window.msg(text);
    else alert(text);
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

  function getFieldByLabel(root, labelText) {
    const wanted = labelText.toLowerCase();
    for (const field of qa('.field', root)) {
      const label = clean(q('label', field)?.textContent).toLowerCase();
      if (label === wanted || label.includes(wanted)) return q('input, select, textarea', field);
    }
    return null;
  }

  function readQuotationItems() {
    return qa('#items .item').map((card) => {
      const select = q('select', card);
      const option = select?.selectedOptions?.[0];
      const selectedValue = clean(select?.value);
      const optionText = clean(option?.textContent);
      const match = optionText.match(/^\[([^\]]+)\]\s*(.*)$/);
      const kode = selectedValue || (match ? clean(match[1]) : '');
      const itemName = match ? clean(match[2]) : optionText;

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
        else if (tipe === 'rigging') subtotal = ((panjang * 2) + (tinggi * 2)) * harga * durasi;
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

  function missingColumn(message) {
    const text = clean(message);
    let m = text.match(/Could not find the '([^']+)' column/i);
    if (m) return m[1];
    m = text.match(/column ['\"]([^'\"]+)['\"] does not exist/i);
    if (m) return m[1];
    return '';
  }

  function nullColumn(message) {
    const text = clean(message);
    const m = text.match(/null value in column ['\"]([^'\"]+)['\"] of relation/i);
    return m ? m[1] : '';
  }

  function valueForRequiredColumn(column, context) {
    const c = clean(column).toLowerCase();
    const map = {
      nomor_penawaran: context.nomor,
      nomor: context.nomor,
      no_penawaran: context.nomor,
      nama_client: context.client,
      client_name: context.client,
      client: context.client,
      nama_pelanggan: context.client,
      perusahaan: context.perusahaan,
      nama_perusahaan: context.perusahaan,
      company: context.perusahaan,
      nama_event: context.eventName,
      event_name: context.eventName,
      event: context.eventName,
      project: context.eventName,
      nama_project: context.eventName,
      telepon: context.whatsapp,
      whatsapp: context.whatsapp,
      no_telp: context.whatsapp,
      no_telepon: context.whatsapp,
      nomor_telepon: context.whatsapp,
      phone: context.whatsapp,
      email: context.email,
      alamat: context.alamat,
      tanggal: context.today,
      tanggal_penawaran: context.today,
      tgl_penawaran: context.today,
      tanggal_mulai: context.startDate,
      tanggal_selesai: context.endDate,
      start_date: context.startDate,
      end_date: context.endDate,
      total: context.total,
      grand_total: context.total,
      total_harga: context.total,
      status: 'DRAFT'
    };
    if (Object.prototype.hasOwnProperty.call(map, c)) return map[c];
    return undefined;
  }

  async function findClient(db, clientName) {
    const name = clean(clientName);
    if (!name) return null;
    try {
      const result = await db.from('clients').select('*').ilike('nama_client', name).limit(1);
      if (!result.error && result.data?.[0]) return result.data[0];
    } catch (e) {
      console.warn('Client lookup skipped:', e);
    }
    return null;
  }

  async function insertCompatible(db, table, payload, options = {}) {
    let working = Array.isArray(payload) ? payload.map((x) => ({ ...x })) : { ...payload };
    const removed = [];
    const maxRetries = 20;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await db.from(table).insert(working).select(options.select || '*');
      if (!result.error) return { ...result, removed };

      const missing = missingColumn(result.error.message);
      if (missing) {
        let existed = false;
        if (Array.isArray(working)) {
          existed = working.some((row) => Object.prototype.hasOwnProperty.call(row, missing));
          if (existed) working = working.map((row) => {
            const copy = { ...row };
            delete copy[missing];
            return copy;
          });
        } else {
          existed = Object.prototype.hasOwnProperty.call(working, missing);
          if (existed) delete working[missing];
        }
        if (!existed) return { ...result, removed };
        removed.push(missing);
        console.warn(`Kolom ${table}.${missing} tidak ada — diabaikan.`);
        continue;
      }

      const required = nullColumn(result.error.message);
      if (required && options.context) {
        const value = valueForRequiredColumn(required, options.context);
        if (value !== undefined && value !== null && clean(value) !== '') {
          if (Array.isArray(working)) {
            working = working.map((row) => ({ ...row, [required]: value }));
          } else {
            working[required] = value;
          }
          console.warn(`Kolom wajib ${table}.${required} diisi otomatis.`);
          continue;
        }
      }

      return { ...result, removed };
    }

    return { error: { message: `Gagal menyimpan ${table}: schema terlalu berbeda setelah ${maxRetries} percobaan.` } };
  }

  async function reliableSaveQuote() {
    const button = document.querySelector('button[onclick="saveQuote()"]');
    if (button?.dataset.busy === '1') return;

    const db = getDb();
    if (!db) return show('Supabase belum terhubung. Buka Pengaturan dan cek URL + Key.');

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

      const rows = readQuotationItems().filter((row) => row.kode && row.item);
      if (!rows.length) {
        show('Pilih minimal 1 Produk / Jasa.');
        return;
      }

      const total = rows.reduce((sum, row) => sum + num(row.subtotal), 0);
      const nomor = 'PM-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
      const clientRecord = await findClient(db, client);
      const clientId = clientRecord?.id ?? null;
      const today = new Date().toISOString().slice(0, 10);
      const clientAddress = clean(clientRecord?.alamat || clientRecord?.address);
      const context = { nomor, client, perusahaan, eventName, whatsapp, email, startDate, endDate, total, today, alamat: clientAddress };

      const quotePayload = {
        nomor_penawaran: nomor,
        nama_client: client,
        perusahaan,
        telepon: whatsapp,
        whatsapp,
        email,
        event_name: eventName,
        nama_event: eventName,
        event: eventName,
        project: eventName,
        tanggal_mulai: startDate,
        tanggal_selesai: endDate,
        total,
        grand_total: total,
        status: 'DRAFT',
        tanggal: today,
        tanggal_penawaran: today,
        tgl_penawaran: today,
        alamat: clientAddress
      };
      if (clientId !== null) {
        quotePayload.client_id = clientId;
        quotePayload.id_client = clientId;
      }

      const quoteResult = await insertCompatible(db, 'penawaran', quotePayload, { select: 'id', context });
      if (quoteResult.error) throw new Error('Penawaran: ' + quoteResult.error.message);

      const quoteId = quoteResult.data?.[0]?.id;
      if (!quoteId) throw new Error('ID penawaran tidak dikembalikan oleh Supabase.');

      const itemPayload = rows.map((row) => ({
        penawaran_id: quoteId,
        kode: row.kode,
        item: row.item,
        nama_item: row.item,
        harga_jual: row.harga_jual,
        harga: row.harga_jual,
        tipe_perhitungan: row.tipe_perhitungan,
        tipe: row.tipe_perhitungan,
        qty: row.qty,
        jumlah: row.qty,
        lebar: row.lebar,
        tinggi: row.tinggi,
        panjang: row.panjang,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        durasi: row.durasi,
        subtotal: row.subtotal
      }));

      const itemResult = await insertCompatible(db, 'penawaran_items', itemPayload, { select: 'id', context });
      if (itemResult.error) throw new Error('Item penawaran: ' + itemResult.error.message);

      const itemRows = itemResult.data || [];
      if (itemRows.length !== rows.length) {
        throw new Error(`Item penawaran tidak lengkap: ${itemRows.length}/${rows.length} tersimpan.`);
      }

      const schedulePayload = rows.map((row, index) => ({
        penawaran_item_id: itemRows[index].id,
        qty: row.qty,
        jumlah: row.qty,
        tanggal_mulai: row.tanggal_mulai,
        tanggal_selesai: row.tanggal_selesai,
        durasi: row.durasi,
        subtotal: row.subtotal
      }));

      if (schedulePayload.length) {
        const scheduleResult = await insertCompatible(db, 'penawaran_jadwal', schedulePayload, { select: 'id', context });
        if (scheduleResult.error) {
          console.error('Schedule save error:', scheduleResult.error);
          show('Penawaran & item tersimpan, tetapi jadwal gagal: ' + scheduleResult.error.message);
        }
      }

      const removed = [...(quoteResult.removed || []), ...(itemResult.removed || [])];
      show('Penawaran berhasil disimpan: ' + nomor + (removed.length ? ` (schema disesuaikan: ${removed.join(', ')})` : ''));

      if (typeof window.go === 'function') window.go('history');
      setTimeout(() => renderHistorySafe(db), 0);

    } catch (error) {
      console.error('Reliable quotation save error:', error);
      show('Gagal menyimpan penawaran: ' + (error?.message || error));
    } finally {
      if (button) {
        button.dataset.busy = '0';
        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Simpan Penawaran';
      }
    }
  }

  async function renderHistorySafe(db) {
    try {
      const result = await db.from('penawaran').select('*').order('id', { ascending: false });
      if (result.error) throw result.error;
      const rows = result.data || [];

      const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
      })[m]);
      const money = (v) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Number(v) || 0);

      const eventValue = (row) => row.nama_event ?? row.event_name ?? row.event ?? row.project ?? '-';
      const numberValue = (row) => row.nomor_penawaran ?? row.nomor ?? row.no_penawaran ?? '-';
      const clientValue = (row) => row.nama_client ?? row.client_name ?? row.client ?? '-';
      const companyValue = (row) => row.perusahaan ?? row.nama_perusahaan ?? row.company ?? '-';
      const totalValue = (row) => row.total ?? row.grand_total ?? row.total_harga ?? 0;

      const content = q('#content');
      if (!content) return;
      content.innerHTML = `
        <div class="head">
          <div><h1>Riwayat Penawaran</h1><p>Data tersimpan di Supabase.</p></div>
          <button class="btn" onclick="go('quotation')">+ Buat Penawaran</button>
        </div>
        <div class="card">
          <div class="scroll">
            <table class="table">
              <thead><tr><th>No</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    <td>${esc(numberValue(row))}</td>
                    <td>${esc(clientValue(row))}</td>
                    <td>${esc(companyValue(row))}</td>
                    <td>${esc(eventValue(row))}</td>
                    <td>${money(totalValue(row))}</td>
                    <td>${esc(row.status || 'DRAFT')}</td>
                  </tr>`).join('') || '<tr><td colspan="6">Belum ada penawaran.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (error) {
      console.error('Safe history error:', error);
      show('Penawaran tersimpan, tetapi riwayat gagal dibaca: ' + (error.message || error));
    }
  }

  function install() {
    window.saveQuote = reliableSaveQuote;
    window.__PRIANGAN_QUOTE_SAVE_FIXED = true;

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
