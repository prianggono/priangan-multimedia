/* Robust CSV importer for Master Harga
 * Supports:
 * Kode, Item, Kategori, Satuan, Harga Modal, Harga Jual, Aktif
 *
 * Existing rows are updated by Kode; new rows are inserted.
 */

function csvNormalizeHeader(value) {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()\-\/]+/g, '_')
    .replace(/_+/g, '_');
}

function csvDetectDelimiter(text) {
  const firstLine = String(text ?? '').split(/\r?\n/)[0] || '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;

  for (const delimiter of candidates) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < firstLine.length; i++) {
      const ch = firstLine[i];
      if (ch === '"') {
        if (quoted && firstLine[i + 1] === '"') i++;
        else quoted = !quoted;
      } else if (ch === delimiter && !quoted) {
        count++;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }
  return best;
}

function csvParse(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  text = String(text ?? '').replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"' && cell.length === 0) {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some(v => String(v).trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.replace(/\r$/, ''));
  if (row.some(v => String(v).trim() !== '')) rows.push(row);

  return rows;
}

function csvValue(obj, aliases) {
  for (const key of aliases) {
    const normalized = csvNormalizeHeader(key);
    if (Object.prototype.hasOwnProperty.call(obj, normalized)) {
      return String(obj[normalized] ?? '').trim();
    }
  }
  return '';
}

function csvPrice(value) {
  const s = String(value ?? '').trim();
  if (!s) return 0;

  // Supports values such as:
  // 550000
  // 550.000
  // Rp 550.000
  // Rp 550,000
  // 550,000
  const digits = s.replace(/[^0-9]/g, '');
  return Number(digits) || 0;
}

function csvBoolean(value) {
  const s = String(value ?? '').trim().toUpperCase();

  if (['TIDAK', 'NO', 'FALSE', '0', 'NONAKTIF', 'INACTIVE', 'OFF'].includes(s)) {
    return false;
  }

  if (['YA', 'YES', 'TRUE', '1', 'AKTIF', 'ACTIVE', 'ON'].includes(s)) {
    return true;
  }

  return true;
}

async function handleCSVImport(e) {
  const input = e?.target;
  const file = input?.files?.[0];
  if (!file) return;

  if (input.dataset.csvBusy === '1') return;
  input.dataset.csvBusy = '1';

  try {
    if (typeof db === 'undefined' || !db) {
      msg('Supabase belum terhubung.');
      return;
    }

    msg('Membaca CSV...');

    const text = await file.text();
    if (!text.trim()) {
      msg('File CSV kosong.');
      return;
    }

    const delimiter = csvDetectDelimiter(text);
    const rows = csvParse(text, delimiter);

    if (rows.length < 2) {
      msg('CSV harus memiliki header dan minimal 1 data.');
      return;
    }

    const headers = rows[0].map(csvNormalizeHeader);

    const hasKode = headers.includes('kode') || headers.includes('code');
    const hasItem = headers.includes('item') || headers.includes('nama_item') || headers.includes('nama');

    if (!hasKode || !hasItem) {
      msg('Header CSV harus memiliki Kode dan Item.');
      console.error('Header CSV:', headers);
      return;
    }

    const payload = [];
    const errors = [];
    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = String(rows[i][idx] ?? '').trim();
      });

      const kode = csvValue(obj, ['kode', 'code']);
      const item = csvValue(obj, ['item', 'nama_item', 'nama']);

      if (!kode && !item) continue;

      if (!kode || !item) {
        errors.push(`Baris ${i + 1}: Kode/Item kosong`);
        continue;
      }

      const key = kode.toLowerCase();
      if (seen.has(key)) {
        errors.push(`Baris ${i + 1}: kode ${kode} duplikat di CSV`);
        continue;
      }
      seen.add(key);

      const hargaModalRaw = csvValue(obj, [
        'harga_modal',
        'harga_modal_jual',
        'modal',
        'harga_beli',
        'cost_price',
        'cost'
      ]);

      const hargaJualRaw = csvValue(obj, [
        'harga_jual',
        'harga',
        'price',
        'selling_price'
      ]);

      const aktifRaw = csvValue(obj, ['aktif', 'status', 'active']);

      payload.push({
        kode,
        item,
        kategori: csvValue(obj, ['kategori', 'category']),
        satuan: csvValue(obj, ['satuan', 'unit']),
        harga_modal: csvPrice(hargaModalRaw),
        harga_jual: csvPrice(hargaJualRaw),
        aktif: csvBoolean(aktifRaw)
      });
    }

    if (!payload.length) {
      msg('Tidak ada data valid untuk di-import.');
      return;
    }

    console.log('CSV payload:', payload);
    msg(`Memeriksa ${payload.length} item...`);

    // Get existing rows by Kode. We intentionally do not use upsert(onConflict)
    // because an older database may not yet have a UNIQUE constraint on kode.
    const codes = payload.map(row => row.kode);
    const existingByCode = new Map();

    for (let i = 0; i < codes.length; i += 100) {
      const batchCodes = codes.slice(i, i + 100);
      const lookup = await db
        .from('master_harga')
        .select('id,kode')
        .in('kode', batchCodes);

      if (lookup.error) {
        console.error('Lookup master_harga error:', lookup.error);
        msg('Gagal membaca Master Harga: ' + lookup.error.message);
        return;
      }

      (lookup.data || []).forEach(row => {
        existingByCode.set(String(row.kode).toLowerCase(), row);
      });
    }

    const toInsert = [];
    const toUpdate = [];

    payload.forEach(row => {
      const existing = existingByCode.get(row.kode.toLowerCase());
      if (existing) {
        toUpdate.push({ ...row, id: existing.id });
      } else {
        toInsert.push(row);
      }
    });

    msg(`Menyimpan ${payload.length} item...`);

    // Insert new items in batches.
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const result = await db.from('master_harga').insert(batch);

      if (result.error) {
        console.error('Supabase CSV insert error:', result.error);
        msg('Gagal menambahkan data: ' + result.error.message);
        return;
      }
    }

    // Update existing items individually by primary key.
    // This guarantees that an imported CSV can update existing prices without
    // requiring a UNIQUE constraint on kode.
    for (let i = 0; i < toUpdate.length; i++) {
      const row = toUpdate[i];
      const { id, ...updatePayload } = row;

      const result = await db
        .from('master_harga')
        .update(updatePayload)
        .eq('id', id);

      if (result.error) {
        console.error('Supabase CSV update error:', result.error);
        msg(`Gagal memperbarui kode ${row.kode}: ${result.error.message}`);
        return;
      }
    }

    await load();
    render();

    const insertedCount = toInsert.length;
    const updatedCount = toUpdate.length;
    const skippedCount = errors.length;

    let resultMessage = `Import selesai: ${insertedCount} item baru, ${updatedCount} item diperbarui`;
    if (skippedCount) resultMessage += `, ${skippedCount} baris dilewati`;
    resultMessage += '.';

    msg(resultMessage);

    console.log('CSV import sukses:', {
      delimiter,
      total: payload.length,
      inserted: insertedCount,
      updated: updatedCount,
      errors
    });
  } catch (err) {
    console.error('CSV import exception:', err);
    msg('Gagal import CSV: ' + (err?.message || err));
  } finally {
    input.dataset.csvBusy = '0';
    input.value = '';
  }
}

window.handleCSVImport = handleCSVImport;

document.addEventListener('change', function (event) {
  const input = event.target;
  if (input && input.id === 'csvInput' && input.files && input.files.length) {
    handleCSVImport(event);
  }
});
