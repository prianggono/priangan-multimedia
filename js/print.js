/* Robust A4 preview / print.
 * IMPORTANT: this file is loaded BEFORE app.js.
 * A real function declaration is used so app.js can safely register
 * window.printQuote = printQuote without throwing ReferenceError.
 */

function printQuote() {
  try {
    const qs = (selector) => document.querySelector(selector);
    const currentItems = (typeof items !== 'undefined' && Array.isArray(items)) ? items : [];
    const currentTemplate = (typeof template !== 'undefined' && template) ? template : {};

    const client = qs('#qc')?.value?.trim() || '';
    const perusahaan = qs('#qp')?.value?.trim() || '';
    const whatsapp = qs('#qw')?.value?.trim() || '';
    const email = qs('#qe')?.value?.trim() || '';
    const eventName = qs('#qeve')?.value?.trim() || '';
    const startDate = qs('#qs')?.value || '';
    const endDate = qs('#qe2')?.value || '';

    if (!client || !perusahaan || !eventName) {
      if (typeof msg === 'function') msg('Isi Client, Perusahaan, dan Nama Event terlebih dahulu.');
      return;
    }

    const validItems = currentItems.filter((item) => item && item.kode && item.item);
    if (!validItems.length) {
      if (typeof msg === 'function') msg('Pilih minimal 1 Produk / Jasa terlebih dahulu.');
      return;
    }

    const duration = (start, end) => {
      if (!start || !end) return 1;
      const a = new Date(start + 'T00:00:00');
      const b = new Date(end + 'T00:00:00');
      const diff = Math.round((b - a) / 86400000);
      return diff >= 0 ? diff + 1 : 1;
    };

    const itemSubtotal = (item) => {
      const price = Number(item.harga) || 0;
      const days = duration(item.mulai, item.selesai);
      const qty = Number(item.qty) || 1;

      if (item.tipe === 'luas') {
        return (Number(item.lebar) || 0) * (Number(item.tinggi) || 0) * price * days;
      }

      if (item.tipe === 'rigging') {
        const perimeter = ((Number(item.panjang) || 0) * 2) + ((Number(item.tinggi) || 0) * 2);
        return perimeter * price * days;
      }

      if (item.tipe === 'level') {
        const led = validItems.find((row) => /led|videotron/i.test(row.item || ''));
        const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;
        return width * (Number(item.tinggi) || 0) * price * days;
      }

      return qty * price * days;
    };

    const formatMoney = (value) => new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);

    const dateID = (value) => {
      if (!value) return '-';
      const d = new Date(value + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return safe(value);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    };

    const multiline = (value) => safe(value).replace(/\r?\n/g, '<br>');

    const total = validItems.reduce((sum, item) => sum + itemSubtotal(item), 0);
    const number = 'PM-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);

    const rows = validItems.map((item, index) => {
      let qtyText = String(item.qty || 1);
      if (item.tipe === 'luas') qtyText = `${item.lebar || 0} × ${item.tinggi || 0} m²`;
      else if (item.tipe === 'level') qtyText = `${item.lebar || 0} × ${item.tinggi || 0} m`;
      else if (item.tipe === 'rigging') qtyText = `${item.panjang || 0} × ${item.tinggi || 0} m`;

      const schedule = item.mulai || item.selesai
        ? `${dateID(item.mulai)} - ${dateID(item.selesai)}`
        : '-';

      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>
            <strong>${safe(item.item || '-')}</strong>
            <div class="code">${safe(item.kode || '')}</div>
          </td>
          <td class="center">${safe(qtyText)}</td>
          <td class="center">${safe(schedule)}</td>
          <td class="right">${formatMoney(item.harga)}</td>
          <td class="right">${formatMoney(itemSubtotal(item))}</td>
        </tr>`;
    }).join('');

    const logo = currentTemplate.logo_url
      ? `<img class="logo" src="${safe(currentTemplate.logo_url)}" alt="Logo">`
      : '';

    const signature = currentTemplate.ttd_url
      ? `<img class="signature" src="${safe(currentTemplate.ttd_url)}" alt="TTD">`
      : '<div class="signature-space"></div>';

    const old = document.getElementById('pmPrintPreview');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pmPrintPreview';
    overlay.innerHTML = `
      <div class="pm-print-toolbar">
        <div>
          <strong>Preview Surat Penawaran</strong>
          <span>A4 Portrait • ${safe(number)}</span>
        </div>
        <div class="pm-print-actions">
          <button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button>
          <button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button>
        </div>
      </div>

      <div class="pm-print-scroll">
        <main class="pm-a4" id="pmPrintArea">
          <header class="pm-letterhead">
            ${logo}
            <div class="pm-brand">
              <h1>${safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA')}</h1>
              <p>${safe(currentTemplate.alamat || '')}</p>
              <p>${safe(currentTemplate.telepon || '')}${currentTemplate.whatsapp ? ' | WA ' + safe(currentTemplate.whatsapp) : ''}${currentTemplate.email ? ' | ' + safe(currentTemplate.email) : ''}</p>
            </div>
          </header>

          <h2 class="pm-title">SURAT PENAWARAN HARGA</h2>

          <table class="pm-meta">
            <tr><td>Nomor</td><td>${safe(number)}</td></tr>
            <tr><td>Tanggal</td><td>${dateID(new Date().toISOString().slice(0, 10))}</td></tr>
            <tr><td>Kepada Yth.</td><td><strong>${safe(client)}</strong></td></tr>
            <tr><td>Perusahaan</td><td>${safe(perusahaan)}</td></tr>
            <tr><td>Event / Project</td><td><strong>${safe(eventName)}</strong></td></tr>
            <tr><td>Periode</td><td>${dateID(startDate)} - ${dateID(endDate)}</td></tr>
            ${whatsapp ? `<tr><td>WhatsApp</td><td>${safe(whatsapp)}</td></tr>` : ''}
            ${email ? `<tr><td>Email</td><td>${safe(email)}</td></tr>` : ''}
          </table>

          <p class="pm-opening">
            Dengan hormat,<br>
            Bersama ini kami sampaikan penawaran harga untuk kebutuhan event/project tersebut sebagai berikut:
          </p>

          <table class="pm-items">
            <thead>
              <tr>
                <th>No.</th>
                <th>Produk / Jasa</th>
                <th>Qty / Dimensi</th>
                <th>Jadwal</th>
                <th>Harga</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="pm-total">
                <td colspan="5" class="right">GRAND TOTAL</td>
                <td class="right">${formatMoney(total)}</td>
              </tr>
            </tbody>
          </table>

          <section class="pm-terms">
            <strong>Syarat & Ketentuan</strong>
            <div>${multiline(currentTemplate.ketentuan || '1. Downpayment minimum 50%.\n2. Pelunasan 50% dilakukan setelah unit terpasang.\n3. Pembayaran DP yang telah dilakukan tidak dapat dikembalikan.\n4. Perubahan jumlah atau spesifikasi dapat mempengaruhi nilai penawaran.')}</div>
          </section>

          <section class="pm-signature">
            <p>Hormat kami,</p>
            ${signature}
            <strong>${safe(currentTemplate.nama_penandatangan || '')}</strong>
            <div>${safe(currentTemplate.jabatan_penandatangan || '')}</div>
          </section>

          <footer>${safe(currentTemplate.website || '')}</footer>
        </main>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('pm-preview-open');
  } catch (error) {
    console.error('A4 preview error:', error);
    if (typeof msg === 'function') msg('Preview A4 gagal: ' + (error.message || error));
  }
}

function closePrintPreview() {
  document.getElementById('pmPrintPreview')?.remove();
  document.body.classList.remove('pm-preview-open');
}

function executePrintPreview() {
  const area = document.getElementById('pmPrintArea');
  if (!area) {
    if (typeof msg === 'function') msg('Area A4 tidak ditemukan.');
    return;
  }
  window.print();
}

window.printQuote = printQuote;
window.closePrintPreview = closePrintPreview;
window.executePrintPreview = executePrintPreview;
