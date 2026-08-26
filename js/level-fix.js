/*
 * Priangan Multimedia - Level 120-200 pricing fix
 *
 * KHUSUS Level 120-200 cm:
 *   subtotal = harga per meter x lebar LED/level x jumlah hari
 * Tinggi level hanya informasi visual dan TIDAK ikut mengalikan harga.
 *
 * Penting:
 * - Lebar Level selalu mengikuti lebar item LED/Videotron yang dipakai.
 * - Nilai lebar disinkronkan ke item level supaya subtotal, preview A4,
 *   dan penyimpanan penawaran memakai angka yang sama.
 */
(function () {
  'use strict';

  function isLevel120200(item) {
    const code = String(item?.kode || '').trim().toUpperCase();
    const text = String(item?.item || '').toLowerCase();
    return code === 'LED-LVL-120-200' || /level\s*120\s*[-–—]\s*200/.test(text);
  }

  function getLedWidth() {
    if (!Array.isArray(window.items)) return 0;
    const led = window.items.find((row) => {
      const text = `${row?.item || ''} ${row?.kode || ''} ${row?.tipe || ''}`.toLowerCase();
      return /led|videotron/.test(text) && Number(row?.lebar) > 0;
    });
    return led ? Number(led.lebar) || 0 : 0;
  }

  function syncLevelWidths() {
    if (!Array.isArray(window.items)) return;
    const width = getLedWidth();
    if (!width) return;
    window.items.forEach((item) => {
      if (isLevel120200(item)) item.lebar = width;
    });
  }

  // app.js declares `items`, so expose the helper without replacing the array.
  window.syncLevelWidths = syncLevelWidths;

  if (typeof subtotal === 'function') {
    const originalSubtotal = subtotal;
    subtotal = function (item) {
      if (isLevel120200(item)) {
        syncLevelWidths();
        const duration = typeof days === 'function' ? days(item.mulai, item.selesai) : 1;
        const price = Number(item.harga) || 0;
        const width = Number(item.lebar) || getLedWidth();
        return width * price * duration;
      }
      return originalSubtotal(item);
    };
  }

  if (typeof dimFields === 'function') {
    const originalDimFields = dimFields;
    dimFields = function (item) {
      if (isLevel120200(item)) {
        syncLevelWidths();
        const width = Number(item.lebar) || getLedWidth();
        return `
          <div class="dim level-special">
            <div class="field">
              <label>Lebar Level (otomatis dari LED)</label>
              <input value="${width ? width + ' m' : '-'}" readonly>
            </div>
            <div class="field">
              <label>Tinggi Level (m)</label>
              <input type="number" min="0" step="0.01" value="${item.tinggi || 0}" onchange="upd(${item.id},'tinggi',this.value)">
              <small class="calc-note">Level 120–200 cm dihitung berdasarkan lebar LED × harga/m × jumlah hari. Tinggi tidak ikut dihitung.</small>
            </div>
          </div>`;
      }
      return originalDimFields(item);
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    input[type="date"] { color-scheme: dark; }
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1) brightness(1.4);
      opacity: 1;
      cursor: pointer;
    }
    .calc-note {
      display:block;
      margin-top:6px;
      color:#8fa5c8;
      font-size:11px;
      line-height:1.35;
    }
  `;
  document.head.appendChild(style);

  // app.js is loaded immediately before this file. Recalculate once after patching.
  if (typeof window.syncLevelWidths === 'function') window.syncLevelWidths();
  if (typeof drawItems === 'function' && document.getElementById('items')) drawItems();
})();
