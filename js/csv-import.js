/*
 * Robust CSV importer for Master Harga.
 * Loaded after app.js so it safely replaces the old handleCSVImport().
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
  let s = String(value ?? '').trim();
  if (!s) return 0;

  // Indonesian/Excel currency formats: Rp 1.500.000, 1,500,000, etc.
  s = s.replace(/rp/gi, '').replace(/\s/g, '');
  const digits = s.replace(/[^0-9]/g, '');
  return Number(digits) || 0;
}

async function handleCSVImport(e) {
  const input = e?.target;
  const file = input?.files?.[0];
  if (!file) return;

  try {
    if (!db) {
      msg('Supabase belum terhubung. Periksa js/config.js.');
      return;
    }

    const text = await file.text();
    if (!text.trim()) {
      msg('File CSV kosong.');
      return;
    }

    const delimiter = csvDetectDelimiter(text);
    const rows = csvParse(text, delimiter);

    if (rows.length < 2) {
      msg('CSV harus memiliki header dan minimal 1 baris data.');
      return;
    }

    const headers = rows[0].map(csvNormalizeHeader);
    const required = ['kode', 'item'];
    const hasKode = headers.includes('kode') || headers.includes('code');
    const hasItem = headers.includes('item') || headers.includes('nama_item') || headers.includes('nama');

    if (!hasKode || !hasItem) {
      msg('Header CSV wajib memiliki: kode dan item.');
      console.error('Header CSV terbaca:', headers);
      return;
    }

    const payload = [];
    const errors = [];
    const seen = new Set();

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const obj = {};

      headers.forEach((header, index) => {
        obj[header] = String(cells[index] ?? '').trim();
      });

      const kode = csvValue(obj, ['kode', 'code']);
      const item = csvValue(obj, ['item', 'nama_item', 'nama']);

      if (!kode && !item) continue;

      if (!kode || !item) {
        errors.push(`Baris ${i + 1}: kode dan item wajib diisi.`);
        continue;
      }

      const duplicateKey = kode.toLowerCase();
      if (seen.has(duplicateKey)) {
        errors.push(`Baris ${i + 1}: kode ${kode} duplikat di dalam CSV.`);
        continue;
      }
      seen.add(duplicateKey);

      const aktifRaw = csvValue(obj, ['aktif', 'status', 'active']).toUpperCase();
      const aktif = ['TIDAK', 'NO', 'FALSE', 'NONAKTIF', 'INACTIVE'].includes(aktifRaw) ? 'TIDAK' : 'YA';

      payload.push({
        kode,
        item,
        kategori: csvValue(obj, ['kategori', 'category']),
        satuan: csvValue(obj, ['satuan', 'unit']),
        harga_jual: csvPrice(csvValue(obj, ['harga_jual', 'harga', 'price'])),
        aktif
      });
    }

    if (!payload.length) {
      msg(errors.length ? errors[0] : 'Tidak ada data valid untuk di-import.');
      return;
    }

    msg(`Mengunggah ${payload.length} item...`);

    // Insert in batches to avoid request-size problems with larger CSV files.
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < payload.length; i += batchSize) {
      const batch = payload.slice(i, i + batchSize);
      const result = await db.from('master_harga').insert(batch);

      if (result.error) {
        console.error('Supabase CSV import error:', result.error);
        msg(`Gagal import pada data ${i + 1}-${i + batch.length}: ${result.error.message}`);
        return;
      }

      imported += batch.length;
    }

    await load();
    render();

    const warning = errors.length ? ` ${errors.length} baris dilewati.` : '';
    msg(`Berhasil import ${imported} item.${warning}`);
    console.log({ delimiter, imported, skipped: errors.length, errors });
  } catch (err) {
    console.error('CSV import exception:', err);
    msg('Gagal membaca CSV: ' + (err?.message || err));
  } finally {
    // Allows importing the same file again without refreshing the page.
    if (input) input.value = '';
  }
}

window.handleCSVImport = handleCSVImport;
