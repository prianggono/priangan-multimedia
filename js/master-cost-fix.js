/* Master Harga — Harga Modal + Harga Jual
 * Loaded after master-edit.js so the Master Harga UI has one consistent editor.
 */
(function () {
  function costForm(row = null) {
    const editing = !!row;
    const id = row?.id ?? '';
    const hargaModal = row?.harga_modal == null ? 0 : Number(row.harga_modal) || 0;
    const hargaJual = row?.harga_jual == null ? 0 : Number(row.harga_jual) || 0;

    return `
      <div id="masterForm" class="card master-editor" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
          <div>
            <b>${editing ? 'Edit Master Harga' : 'Tambah Master Harga'}</b>
            <div style="color:var(--muted);font-size:12px;margin-top:3px">
              ${editing ? 'Perbarui harga modal, harga jual, dan data item lalu tekan Simpan.' : 'Masukkan produk/jasa baru beserta harga modal dan harga jual.'}
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
          <div class="field"><label>Harga Modal</label><input id="hm" type="number" min="0" step="1" value="${hargaModal}"></div>
          <div class="field"><label>Harga Jual</label><input id="mh" type="number" min="0" step="1" value="${hargaJual}"></div>
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

  function closeCostEditor() {
    document.getElementById('masterForm')?.remove();
  }

  function masterFormCost() {
    closeCostEditor();
    $('#content').insertAdjacentHTML('afterbegin', costForm());
    document.getElementById('mk')?.focus();
  }

  function editMasterCost(id) {
    const row = masters.find((item) => String(item.id) === String(id));
    if (!row) return msg('Data master tidak ditemukan.');
    closeCostEditor();
    $('#content').insertAdjacentHTML('afterbegin', costForm(row));
    document.getElementById('hm')?.focus();
    document.getElementById('hm')?.select();
  }

  async function saveMasterCost() {
    if (!db) return msg('Supabase belum terhubung.');

    const idValue = document.getElementById('mmid')?.value.trim() || '';
    const kode = document.getElementById('mk')?.value.trim() || '';
    const item = document.getElementById('mi')?.value.trim() || '';
    if (!kode || !item) return msg('Kode dan Item wajib diisi.');

    const hargaModal = Number(document.getElementById('hm')?.value);
    const hargaJual = Number(document.getElementById('mh')?.value);
    if (!Number.isFinite(hargaModal) || hargaModal < 0) return msg('Harga Modal harus berupa angka 0 atau lebih.');
    if (!Number.isFinite(hargaJual) || hargaJual < 0) return msg('Harga Jual harus berupa angka 0 atau lebih.');

    const payload = {
      kode,
      item,
      kategori: document.getElementById('mc')?.value.trim() || '',
      satuan: document.getElementById('ms')?.value.trim() || '',
      harga_modal: hargaModal,
      harga_jual: hargaJual,
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
        result = await db.from('master_harga').update(payload).eq('id', idValue).select('*').single();
      } else {
        result = await db.from('master_harga').insert([payload]).select('*').single();
      }

      if (result.error) {
        console.error('Master harga save error:', result.error);
        const text = String(result.error.message || result.error);
        if (/harga_modal|schema cache|column/i.test(text)) {
          msg('Kolom harga_modal belum ada di Supabase. Tambahkan kolom tersebut lalu coba lagi.');
        } else {
          msg('Gagal menyimpan: ' + text);
        }
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

      if (saved?.kode && Array.isArray(items)) {
        items.forEach((quoteItem) => {
          if (String(quoteItem.kode) === String(saved.kode)) {
            quoteItem.item = saved.item;
            quoteItem.harga = Number(saved.harga_jual) || 0;
          }
        });
      }

      closeCostEditor();
      render();
      msg(idValue ? 'Harga modal dan harga jual berhasil diperbarui.' : 'Master harga berhasil ditambahkan.');
    } catch (error) {
      console.error('Master harga save exception:', error);
      msg('Gagal menyimpan: ' + (error.message || error));
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Simpan';
      }
    }
  }

  window.masterPage = function () {
    $('#content').innerHTML = `
      <div class="head">
        <div>
          <h1>Master Harga</h1>
          <p>Produk dan jasa. Harga modal dan harga jual dapat diedit kapan saja.</p>
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
                <th>Harga Modal</th>
                <th>Harga Jual</th>
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
                  <td>${money(row.harga_modal)}</td>
                  <td><b>${money(row.harga_jual)}</b></td>
                  <td>${activeLabel(row.aktif)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <button class="btn sm secondary" type="button" onclick="editMaster(${Number(row.id)})">Edit</button>
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="8" class="empty">Belum ada data.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  window.masterForm = masterFormCost;
  window.editMaster = editMasterCost;
  window.closeMasterEditor = closeCostEditor;
  window.saveMasterEditor = saveMasterCost;
})();
