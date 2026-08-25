/* Print / A4 preview support.
   Loaded before app.js so printQuote exists when app.js initializes. */
(function () {
  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }

  function rupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function duration(start, end) {
    if (!start || !end) return 1;
    const a = new Date(start);
    const b = new Date(end);
    const diff = Math.round((b - a) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  }

  function getItems() {
    return typeof items !== 'undefined' && Array.isArray(items) ? items : [];
  }

  function getTemplate() {
    return typeof template !== 'undefined' && template ? template : {};
  }

  function itemSubtotal(item) {
    const price = Number(item?.harga) || 0;
    const days = duration(item?.mulai, item?.selesai);
    const qty = Number(item?.qty) || 1;

    if (item?.tipe === 'luas') {
      return (Number(item.lebar) || 0) * (Number(item.tinggi) || 0) * price * days;
    }
    if (item?.tipe === 'rigging') {
      const perimeter = ((Number(item.panjang) || 0) * 2) + ((Number(item.tinggi) || 0) * 2);
      return perimeter * price * days;
    }
    if (item?.tipe === 'level') {
      const led = getItems().find(function (row) {
        return /led|videotron/i.test(row.item || '');
      });
      const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;
      return width * (Number(item.tinggi) || 0) * price * days;
    }
    return qty * price * days;
  }

  function multiline(value) {
    return safe(value).replace(/\r?\n/g, '<br>');
  }

  window.printQuote = function printQuote() {
    const qs = function (selector) { return document.querySelector(selector); };
    const currentItems = getItems();
    const currentTemplate = getTemplate();

    const client = qs('#qc')?.value?.trim() || '-';
    const perusahaan = qs('#qp')?.value?.trim() || '-';
    const whatsapp = qs('#qw')?.value?.trim() || '';
    const email = qs('#qe')?.value?.trim() || '';
    const eventName = qs('#qeve')?.value?.trim() || '-';
    const startDate = qs('#qs')?.value || '';
    const endDate = qs('#qe2')?.value || '';
    const total = currentItems.reduce(function (sum, item) {
      return sum + itemSubtotal(item);
    }, 0);

    const number = 'PM-' + Date.now().toString().slice(-6);
    const rows = currentItems.map(function (item, index) {
      return '<tr>' +
        '<td class="no">' + (index + 1) + '</td>' +
        '<td><b>' + safe(item.item || '-') + '</b><br><small>' + safe(item.kode || '') + '</small></td>' +
        '<td class="center">' + safe(item.qty || 1) + '</td>' +
        '<td class="right">' + rupiah(item.harga) + '</td>' +
        '<td class="right">' + rupiah(itemSubtotal(item)) + '</td>' +
      '</tr>';
    }).join('');

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900');
    if (!popup) {
      if (typeof msg === 'function') msg('Popup diblokir browser. Izinkan popup untuk Preview A4.');
      else alert('Popup diblokir browser. Izinkan popup untuk Preview A4.');
      return;
    }

    const logo = currentTemplate.logo_url
      ? '<img class="logo" src="' + safe(currentTemplate.logo_url) + '" alt="Logo">'
      : '';

    const signature = currentTemplate.ttd_url
      ? '<img class="signature" src="' + safe(currentTemplate.ttd_url) + '" alt="TTD">'
      : '<div class="signature-space"></div>';

    popup.document.open();
    popup.document.write('<!doctype html><html lang="id"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Penawaran ' + safe(number) + '</title>' +
      '<style>' +
      '*{box-sizing:border-box}body{margin:0;background:#e5e7eb;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:11px}' +
      '.page{width:210mm;min-height:297mm;margin:12mm auto;background:#fff;padding:15mm 16mm;box-shadow:0 2px 12px rgba(0,0,0,.15)}' +
      '.letterhead{display:flex;gap:14px;align-items:center;border-bottom:3px solid #111827;padding-bottom:10px;margin-bottom:18px}' +
      '.logo{width:70px;height:70px;object-fit:contain}.brand{flex:1}.brand h1{font-size:20px;margin:0 0 4px;text-transform:uppercase}.brand p{margin:2px 0;color:#374151}.title{text-align:center;font-size:16px;font-weight:700;margin:18px 0 16px;text-transform:uppercase;text-decoration:underline}' +
      '.meta{display:grid;grid-template-columns:105px 1fr;gap:5px 10px;margin-bottom:15px}.meta b{font-weight:700}' +
      'table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #9ca3af;padding:7px 6px;vertical-align:top}th{background:#f3f4f6;text-align:center}.no{width:32px;text-align:center}.center{text-align:center}.right{text-align:right}.total td{font-weight:700;background:#f9fafb}' +
      '.terms{margin-top:18px;line-height:1.5}.terms h3{font-size:12px;margin:0 0 6px}.signature-box{width:220px;margin:35px 0 0 auto;text-align:center}.signature{display:block;max-width:170px;max-height:75px;margin:0 auto 5px;object-fit:contain}.signature-space{height:80px}' +
      '.footer{margin-top:28px;padding-top:8px;border-top:1px solid #d1d5db;font-size:9px;color:#4b5563;text-align:center}' +
      '.printbar{position:fixed;right:20px;top:20px;display:flex;gap:8px}.printbar button{border:0;border-radius:7px;padding:9px 14px;cursor:pointer;font-weight:700}.print{background:#2563eb;color:#fff}.close{background:#e5e7eb;color:#111827}' +
      '@page{size:A4;margin:0}@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:210mm;min-height:297mm;padding:15mm 16mm}.printbar{display:none}}' +
      '</style></head><body>' +
      '<div class="printbar"><button class="print" onclick="window.print()">Cetak / Simpan PDF</button><button class="close" onclick="window.close()">Tutup</button></div>' +
      '<main class="page">' +
      '<section class="letterhead">' + logo + '<div class="brand">' +
      '<h1>' + safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA') + '</h1>' +
      '<p>' + safe(currentTemplate.alamat || '') + '</p>' +
      '<p>' + safe(currentTemplate.telepon || '') + (currentTemplate.whatsapp ? ' | WA ' + safe(currentTemplate.whatsapp) : '') + (currentTemplate.email ? ' | ' + safe(currentTemplate.email) : '') + '</p>' +
      '</div></section>' +
      '<div class="title">Surat Penawaran Harga</div>' +
      '<div class="meta">' +
      '<b>Nomor</b><span>' + safe(number) + '</span>' +
      '<b>Kepada</b><span>' + safe(client) + '</span>' +
      '<b>Perusahaan</b><span>' + safe(perusahaan) + '</span>' +
      '<b>Event / Project</b><span>' + safe(eventName) + '</span>' +
      '<b>Periode</b><span>' + safe(startDate || '-') + (endDate ? ' s/d ' + safe(endDate) : '') + '</span>' +
      (whatsapp ? '<b>WhatsApp</b><span>' + safe(whatsapp) + '</span>' : '') +
      (email ? '<b>Email</b><span>' + safe(email) + '</span>' : '') +
      '</div>' +
      '<p>Dengan hormat, bersama ini kami sampaikan penawaran harga untuk kebutuhan event/project tersebut sebagai berikut:</p>' +
      '<table><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5">Belum ada item.</td></tr>') +
      '<tr class="total"><td colspan="4" class="right">TOTAL</td><td class="right">' + rupiah(total) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="terms"><h3>Syarat &amp; Ketentuan</h3>' +
      multiline(currentTemplate.ketentuan || '1. Downpayment minimum 50%.\n2. Pelunasan 50% wajib dilakukan setelah unit terpasang.\n3. Pembayaran DP yang telah dilakukan tidak dapat dikembalikan. Jika terjadi pembatalan, DP dapat dialihkan untuk acara/event berikutnya.\n4. Apabila pelunasan belum dilakukan, unit tidak akan diaktifkan.\n5. Pembayaran dilakukan melalui rekening Bank BCA sesuai informasi pada template.') +
      '</div>' +
      '<div class="signature-box">' +
      '<p>Hormat kami,</p>' + signature +
      '<b>' + safe(currentTemplate.nama_penandatangan || '') + '</b><br>' +
      safe(currentTemplate.jabatan_penandatangan || '') +
      '</div>' +
      '<div class="footer">' + safe(currentTemplate.website || '') + '</div>' +
      '</main></body></html>');
    popup.document.close();
  };
})();
