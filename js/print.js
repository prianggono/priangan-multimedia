/* Professional A4 quotation preview / print */

async function printQuote() {
  try {
    const qs = (selector) => document.querySelector(selector);
    const currentItems = (typeof items !== 'undefined' && Array.isArray(items)) ? items : [];
    let currentTemplate = (typeof template !== 'undefined' && template) ? { ...template } : {};

    // Always read the latest template before printing.
    try {
      if (typeof db !== 'undefined' && db) {
        const latest = await db
          .from('template_surat')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!latest.error && latest.data) currentTemplate = latest.data;
      }
    } catch (templateError) {
      console.warn('Template refresh before print failed:', templateError);
    }

    // If the DB read is temporarily unavailable, use the saved template backup.
    if (!currentTemplate.ttd_url) {
      try {
        const backup = JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}');
        if (backup && backup.ttd_url) currentTemplate = { ...currentTemplate, ...backup };
      } catch (_) {}
    }

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

    const level120200 = (item) => {
      const code = String(item?.kode || '').trim().toUpperCase();
      const text = String(item?.item || '').toLowerCase();
      return code === 'LED-LVL-120-200' || /level\s*120\s*[-–—]\s*200/.test(text);
    };

    const findLedWidth = () => {
      const led = validItems.find((row) => {
        const text = `${row?.item || ''} ${row?.kode || ''}`.toLowerCase();
        return /led|videotron/.test(text) && Number(row?.lebar) > 0;
      });
      return led ? Number(led.lebar) || 0 : 0;
    };

    // Keep the Level width synchronized with the actual LED width used in this quote.
    const ledWidth = findLedWidth();
    validItems.forEach((item) => {
      if (level120200(item) && ledWidth > 0) item.lebar = ledWidth;
    });

    const itemSubtotal = (item) => {
      const price = Number(item.harga) || 0;
      const dayCount = duration(item.mulai, item.selesai);
      const qty = Number(item.qty) || 1;

      if (level120200(item)) {
        // LEVEL 120–200: price/m x LED width x days. Height is display-only.
        return (Number(item.lebar) || ledWidth || 0) * price * dayCount;
      }

      if (item.tipe === 'luas') {
        return (Number(item.lebar) || 0) * (Number(item.tinggi) || 0) * price * dayCount;
      }

      if (item.tipe === 'rigging') {
        const perimeter = ((Number(item.panjang) || 0) * 2) + ((Number(item.tinggi) || 0) * 2);
        return perimeter * price * dayCount;
      }

      return qty * price * dayCount;
    };

    const formatMoney = (value) => new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(Number(value) || 0);

    const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);

    const dateID = (value) => {
      if (!value) return '-';
      const d = new Date(value + 'T00:00:00');
      if (Number.isNaN(d.getTime())) return safe(value);
      return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    };

    const multiline = (value) => safe(value).replace(/\r?\n/g, '<br>');
    const total = validItems.reduce((sum, item) => sum + itemSubtotal(item), 0);
    const number = 'PM-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
    const today = new Date().toISOString().slice(0, 10);

    const rows = validItems.map((item, index) => {
      let qtyText = String(item.qty || 1);
      if (item.tipe === 'luas') qtyText = `${item.lebar || 0} × ${item.tinggi || 0} m²`;
      else if (level120200(item)) qtyText = `${item.lebar || ledWidth || 0} m`;
      else if (item.tipe === 'rigging') qtyText = `${item.panjang || 0} × ${item.tinggi || 0} m`;
      const schedule = item.mulai || item.selesai ? `${dateID(item.mulai)} - ${dateID(item.selesai)}` : '-';
      return `<tr>
        <td class="center row-no">${index + 1}</td>
        <td><strong>${safe(item.item || '-')}</strong><div class="code">${safe(item.kode || '')}</div></td>
        <td class="center">${safe(qtyText)}</td>
        <td class="center schedule">${safe(schedule)}</td>
        <td class="right nowrap">${formatMoney(item.harga)}</td>
        <td class="right nowrap strong-price">${formatMoney(itemSubtotal(item))}</td>
      </tr>`;
    }).join('');

    async function resolveSignatureUrl(rawValue) {
      const raw = String(rawValue || '').trim();
      if (!raw) return '';
      if (/^(data:|blob:)/i.test(raw)) return raw;

      // A complete HTTP URL can be used directly.
      if (/^https?:\/\//i.test(raw)) return raw;

      if (typeof db === 'undefined' || !db) return raw;

      // Accept either "bucket/path" or just "path".
      const parts = raw.split('/').filter(Boolean);
      const candidates = [];
      if (parts.length > 1) candidates.push([parts[0], parts.slice(1).join('/')]);
      ['surat-assets', 'templates', 'assets'].forEach((bucket) => candidates.push([bucket, raw]));

      for (const [bucket, path] of candidates) {
        try {
          const publicResult = db.storage.from(bucket).getPublicUrl(path);
          const publicUrl = publicResult?.data?.publicUrl;
          if (publicUrl) return publicUrl;
        } catch (_) {}
        try {
          const signedResult = await db.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signedResult.error && signedResult.data?.signedUrl) return signedResult.data.signedUrl;
        } catch (_) {}
      }
      return raw;
    }

    const logoUrl = String(currentTemplate.logo_url || '').trim();
    const signatureUrl = await resolveSignatureUrl(currentTemplate.ttd_url);

    const logo = logoUrl
      ? `<img class="logo" src="${safe(logoUrl)}" alt="Logo Priangan Multimedia" onerror="this.closest('.pm-logo-wrap')?.classList.add('logo-error'); this.remove();">`
      : '<div class="logo-fallback">PM</div>';

    const signatureImage = signatureUrl
      ? `<img class="signature" src="${safe(signatureUrl)}" alt="Tanda tangan ${safe(currentTemplate.nama_penandatangan || '')}" onerror="this.dataset.failed='1';this.style.display='none';">`
      : '';

    const signerName = currentTemplate.nama_penandatangan || '____________________________';
    const signerRole = currentTemplate.jabatan_penandatangan || '';

    const telp = String(currentTemplate.telepon || '').trim();
    const wa = String(currentTemplate.whatsapp || '').trim();
    let contactLine = '';
    if (telp && wa && telp !== wa) contactLine = `Telp ${safe(telp)}  •  WA ${safe(wa)}`;
    else if (telp || wa) contactLine = `Telp / WA ${safe(telp || wa)}`;
    if (currentTemplate.email) contactLine += `${contactLine ? '  •  ' : ''}${safe(currentTemplate.email)}`;

    const old = document.getElementById('pmPrintPreview');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pmPrintPreview';
    overlay.innerHTML = `
      <div class="pm-print-toolbar">
        <div><strong>Preview Surat Penawaran</strong><span>A4 Portrait • ${safe(number)}</span></div>
        <div class="pm-print-actions">
          <button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button>
          <button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button>
        </div>
      </div>
      <div class="pm-print-scroll">
        <main class="pm-a4" id="pmPrintArea">
          <div class="pm-top-accent"></div>
          <header class="pm-letterhead">
            <div class="pm-logo-wrap">${logo}</div>
            <div class="pm-brand">
              <div class="pm-brand-name">${safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA')}</div>
              <div class="pm-brand-sub">SALES & QUOTATION</div>
              ${currentTemplate.alamat ? `<p>${safe(currentTemplate.alamat)}</p>` : ''}
              ${contactLine ? `<p>${contactLine}</p>` : ''}
              ${currentTemplate.website ? `<p class="website">${safe(currentTemplate.website)}</p>` : ''}
            </div>
            <div class="pm-doc-tag"><span>QUOTATION</span><strong>${safe(number)}</strong></div>
          </header>

          <div class="pm-title-row">
            <div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div>
            <div class="pm-date-box"><span>TANGGAL</span><strong>${dateID(today)}</strong></div>
          </div>

          <section class="pm-info-card">
            <div class="pm-info-section">
              <div class="pm-section-label">DITUJUKAN KEPADA</div>
              <div class="pm-client-name">${safe(client)}</div>
              <div>${safe(perusahaan)}</div>
              ${whatsapp ? `<div>WA / Telp: ${safe(whatsapp)}</div>` : ''}
              ${email ? `<div>${safe(email)}</div>` : ''}
            </div>
            <div class="pm-info-section pm-event-section">
              <div class="pm-section-label">EVENT / PROJECT</div>
              <div class="pm-event-name">${safe(eventName)}</div>
              <div class="pm-period-label">PERIODE</div>
              <div>${dateID(startDate)} — ${dateID(endDate)}</div>
            </div>
          </section>

          <p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga untuk kebutuhan event / project tersebut sebagai berikut:</p>

          <table class="pm-items">
            <thead><tr><th class="col-no">No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${rows}
              <tr class="pm-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">${formatMoney(total)}</td></tr>
            </tbody>
          </table>

          <section class="pm-terms">
            <div class="pm-section-heading"><span>01</span><strong>SYARAT & KETENTUAN</strong></div>
            <div class="pm-terms-body">${multiline(currentTemplate.ketentuan || '1. Downpayment minimum 50%.\n2. Pelunasan 50% dilakukan setelah unit terpasang.\n3. Pembayaran DP yang telah dilakukan tidak dapat dikembalikan.\n4. Perubahan jumlah atau spesifikasi dapat mempengaruhi nilai penawaran.')}</div>
          </section>

          <section class="pm-signature">
            <div class="pm-signature-label">HORMAT KAMI,</div>
            <div class="pm-signature-box">
              ${signatureImage}
              <div class="pm-signature-line"></div>
              <strong>${safe(signerName)}</strong>
              ${signerRole ? `<div class="pm-signature-role">${safe(signerRole)}</div>` : ''}
            </div>
          </section>

          <footer class="pm-footer"><div>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.</div><strong>${safe(currentTemplate.kop_text || 'PRIANGAN MULTIMEDIA')}</strong></footer>
        </main>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('pm-preview-open');

    // Wait for the signature to finish loading, then retry through the existing
    // storage resolver if the first URL cannot be displayed.
    const signature = overlay.querySelector('.signature');
    if (signature) {
      await new Promise((resolve) => {
        if (signature.complete) return resolve();
        signature.addEventListener('load', resolve, { once: true });
        signature.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 2500);
      });
      if (signature.naturalWidth === 0 && typeof window.pmRetryTTD === 'function') {
        try { await window.pmRetryTTD(); } catch (_) {}
      }
    }
  } catch (error) {
    console.error('A4 preview error:', error);
    if (typeof msg === 'function') msg('Preview A4 gagal: ' + (error.message || error));
  }
}

function closePrintPreview() {
  document.getElementById('pmPrintPreview')?.remove();
  document.body.classList.remove('pm-preview-open');
}

async function executePrintPreview() {
  const area = document.getElementById('pmPrintArea');
  if (!area) {
    if (typeof msg === 'function') msg('Area A4 tidak ditemukan.');
    return;
  }

  const images = Array.from(area.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
      setTimeout(done, 3000);
    });
  }));

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.print();
}

window.printQuote = printQuote;
window.closePrintPreview = closePrintPreview;
window.executePrintPreview = executePrintPreview;
