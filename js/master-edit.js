/* Master Harga editor
 * Loaded after app.js so it can extend the existing UI without changing
 * quotation, CSV import, or other modules.
 */

(function () {
  function masterEditorMarkup(row = null) {
    const editing = !!row;
    const id = row?.id ?? '';

    return `
      <div id="masterForm" class="card master-editor" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
          <div>
            <b>${editing ? 'Edit Master Harga' : 'Tambah Master Harga'}</b>
            <div style="color:var(--muted);font-size:12px;margin-top:3px">
              ${editing ? 'Perbarui data item dan harga lalu tekan Simpan.' : 'Masukkan produk/jasa baru ke Master Harga.'}
            </div>
          </div>
          ${editing ? `<span class="badge ok">EDIT #${esc(row.id)}</span>` : ''}
        </div>

        <input type="hidden" id="mmid" value="${esc(id)}">
        <div class="grid g2">
          <div class="field"><label>Kode</label><input id="mk" autocomplete="off" value="${esc(row?.kode || '')}"></div>
          <div class="field"><label>Item</label><input id="mi" autocomplete="off" value="${esc(row?.item || '')}"></div>
          <div class="field"><label>Kategori</label><input id="mc" autocomplete="off" value="${esc(row?.kategori || '')}"></div>
          <div class="field"><label>Satuan</label><input id="ms" autocomplete="off" value="${esc(row?.satuan || '')}"></div>
          <div class="field"><label>Harga Jual</label><input id="mh" type="number" min="0" step="1" value="${Number(row?.harga_jual) || 0}"></div>
          <div class="field"><label>Aktif</label>
            <select id="ma">
              <option value="true" ${isActive(row?.aktif) ? 'selected' : ''}>YA</option>
              <option value="false" ${row && !isActive(row.aktif) ? 'selected' : ''}>TIDAK</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="btn secondary" type="button" onclick="closeMasterEditor()">Batal</button>
          <button class="btn" type="button" onclick="saveMasterEditor()">Simpan</button>
        </div>
      </div>`;
  }

  function closeMasterEditor() {
    document.getElementById('masterForm')?.remove();
  }

  function masterFormOverride() {
    closeMasterEditor();
    $('#content').insertAdjacentHTML('afterbegin', masterEditorMarkup());
    document.getElementById('mk')?.focus();
  }

  function editMaster(id) {
    const row = masters.find((item) => String(item.id) === String(id));
    if (!row) return msg('Data master tidak ditemukan.');

    closeMasterEditor();
    $('#content').insertAdjacentHTML('afterbegin', masterEditorMarkup(row));
    document.getElementById('mh')?.focus();
    document.getElementById('mh')?.select();
  }

  async function saveMasterEditor() {
    if (!db) return msg('Supabase belum terhubung.');

    const idValue = document.getElementById('mmid')?.value.trim() || '';
    const kode = document.getElementById('mk')?.value.trim() || '';
    const item = document.getElementById('mi')?.value.trim() || '';

    if (!kode || !item) return msg('Kode dan Item wajib diisi.');

    const harga = Number(document.getElementById('mh')?.value);
    if (!Number.isFinite(harga) || harga < 0) return msg('Harga Jual harus berupa angka 0 atau lebih.');

    const payload = {
      kode,
      item,
      kategori: document.getElementById('mc')?.value.trim() || '',
      satuan: document.getElementById('ms')?.value.trim() || '',
      harga_jual: harga,
      aktif: document.getElementById('ma')?.value === 'true'
    };

    const saveButton = document.querySelector('#masterForm .actions .btn:not(.secondary)');
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Menyimpan...';
    }

    try {
      let result;

      if (idValue) {
        result = await db
          .from('master_harga')
          .update(payload)
          .eq('id', idValue)
          .select('*')
          .single();
      } else {
        result = await db
          .from('master_harga')
          .insert([payload])
          .select('*')
          .single();
      }

      if (result.error) {
        console.error('Master harga save error:', result.error);
        msg('Gagal menyimpan: ' + result.error.message);
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.textContent = 'Simpan';
        }
        return;
      }

      const saved = result.data;
      const index = masters.findIndex((row) => String(row.id) === String(saved?.id));
      if (index >= 0) masters[index] = saved;
      else if (saved) masters.push(saved);

      // Update harga pada item penawaran yang sedang terbuka jika kodenya sama.
      if (saved?.kode && Array.isArray(items)) {
        items.forEach((quoteItem) => {
          if (String(quoteItem.kode) === String(saved.kode)) {
            quoteItem.item = saved.item;
            quoteItem.harga = Number(saved.harga_jual) || 0;
          }
        });
      }

      closeMasterEditor();
      render();
      msg(idValue ? 'Harga berhasil diperbarui.' : 'Master harga berhasil ditambahkan.');
    } catch (error) {
      console.error('Master harga save exception:', error);
      msg('Gagal menyimpan: ' + (error.message || error));
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Simpan';
      }
    }
  }

  // Ganti halaman Master Harga yang lama dengan versi yang memiliki tombol Edit.
  window.masterPage = function () {
    $('#content').innerHTML = `
      <div class="head">
        <div>
          <h1>Master Harga</h1>
          <p>Produk dan jasa. Harga dapat diedit langsung kapan saja.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input type="file" id="csvInput" accept=".csv,text/csv" style="display:none">
          <button class="btn secondary" type="button" onclick="document.getElementById('csvInput').click()">Import CSV</button>
          <button class="btn" type="button" onclick="masterForm()">+ Tambah Item</button>
        </div>
      </div>

      <div class="card">
        <div class="scroll">
          <table class="table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Item</th>
                <th>Kategori</th>
                <th>Satuan</th>
                <th>Harga</th>
                <th>Aktif</th>
                <th style="text-align:right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${masters.map((row) => `
                <tr>
                  <td>${esc(row.kode)}</td>
                  <td>${esc(row.item)}</td>
                  <td>${esc(row.kategori)}</td>
                  <td>${esc(row.satuan)}</td>
                  <td><b>${money(row.harga_jual)}</b></td>
                  <td>${activeLabel(row.aktif)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <button class="btn sm secondary" type="button" onclick="editMaster(${Number(row.id)})">Edit</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="7" class="empty">Belum ada data.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  window.masterForm = masterFormOverride;
  window.editMaster = editMaster;
  window.closeMasterEditor = closeMasterEditor;
  window.saveMasterEditor = saveMasterEditor;
})();
