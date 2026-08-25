/*
 * Priangan Multimedia - Level 120-200 pricing fix
 *
 * Khusus item LED-LVL-120-200 / Level 120-200 cm:
 * subtotal = harga x lebar level x durasi.
 * Tinggi level tetap ditampilkan sebagai informasi, tetapi tidak
 * ikut mengalikan harga.
 */
(function () {
  function isLevel120200(item) {
    const code = String(item?.kode || '').toUpperCase();
    const text = String(item?.item || '').toLowerCase();
    return code === 'LED-LVL-120-200' || /level\s*120\s*[-–—]\s*200/.test(text);
  }

  const originalSubtotal = subtotal;
  subtotal = function (item) {
    if (isLevel120200(item)) {
      const duration = days(item.mulai, item.selesai);
      const price = Number(item.harga) || 0;

      // Harga x lebar level. Durasi tetap mengikuti jadwal pemakaian.
      const led = items.find((row) => /led|videotron/i.test(row.item || ''));
      const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;

      return width * price * duration;
    }

    return originalSubtotal(item);
  };

  const originalDimFields = dimFields;
  dimFields = function (item) {
    if (isLevel120200(item)) {
      const led = items.find((row) => /led|videotron/i.test(row.item || ''));
      const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;

      return `
        <div class="dim level-special">
          <div class="field">
            <label>Lebar Level (otomatis)</label>
            <input value="${width ? width + ' m' : '-'}" readonly>
          </div>
          <div class="field">
            <label>Tinggi Level (m)</label>
            <input type="number" min="0" step="0.01" value="${item.tinggi || 0}" onchange="upd(${item.id},'tinggi',this.value)">
            <small class="calc-note">Untuk Level 120–200 cm, tinggi tidak dikalikan ke harga.</small>
          </div>
        </div>`;
    }

    return originalDimFields(item);
  };

  // Pastikan ikon kalender terlihat jelas pada tema gelap.
  const style = document.createElement('style');
  style.textContent = `
    input[type="date"] {
      color-scheme: dark;
    }

    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1) brightness(1.4);
      opacity: 1;
      cursor: pointer;
    }

    .calc-note {
      display: block;
      margin-top: 6px;
      color: #8fa5c8;
      font-size: 11px;
      line-height: 1.35;
    }
  `;
  document.head.appendChild(style);

  // Render ulang setelah patch diterapkan agar fungsi subtotal baru langsung dipakai.
  if (typeof drawItems === 'function' && document.getElementById('items')) {
    drawItems();
  }
})();
