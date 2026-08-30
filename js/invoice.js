/* Priangan Multimedia — Invoice module
 * Invoice is linked 1:1 to an existing quotation (penawaran).
 * It never changes master_harga or quotation item prices.
 */
(function () {
  'use strict';

  const S = v => String(v ?? '').trim();
  const N = v => {
    const n = Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const E = v => S(v).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const M = v => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(N(v));
  const D = v => {
    if (!v) return '-';
    const x = new Date(String(v).slice(0,10) + 'T00:00:00');
    return Number.isNaN(x.getTime()) ? E(v) : x.toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'});
  };
  const today = () => new Date().toISOString().slice(0,10);
  const toast = t => typeof window.msg === 'function' ? window.msg(t) : alert(t);
  const DB = () => (typeof db !== 'undefined' && db) ? db : null;
  const getTemplate = () => {
    try {
      const local = JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}') || {};
      const globalTemplate = (typeof template !== 'undefined' && template) ? template : {};
      return { ...local, ...globalTemplate };
    } catch (_) {
      return (typeof template !== 'undefined' && template) ? template : {};
    }
  };

  let quotations = [];
  let currentInvoice = null;
  let paymentsCache = {};

  function invoiceStore() {
    try { return JSON.parse(localStorage.getItem('PM_INVOICE_FALLBACK') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function saveInvoiceStore(data) {
    localStorage.setItem('PM_INVOICE_FALLBACK', JSON.stringify(data));
  }

  async function loadQuotations() {
    const d = DB();
    if (!d) throw new Error('Supabase belum terhubung.');
    const r = await d.from('penawaran').select('*').order('id', { ascending:false });
    if (r.error) throw r.error;
    quotations = r.data || [];

    // Payment totals are read from the existing payment table. If the table is
    // not available yet, invoice creation still works and shows Rp 0 paid.
    paymentsCache = {};
    try {
      const p = await d.from('pembayaran_penawaran').select('penawaran_id,nominal,jenis,tanggal_bayar').order('id', { ascending:true });
      if (!p.error) {
        (p.data || []).forEach(x => {
          const id = String(x.penawaran_id);
          paymentsCache[id] = (paymentsCache[id] || 0) + N(x.nominal);
        });
      }
    } catch (_) {}
  }

  function getInvoiceMeta(row) {
    const local = invoiceStore()[String(row.id)] || {};
    return {
      nomor_invoice: S(row.nomor_invoice || local.nomor_invoice),
      tanggal_invoice: S(row.tanggal_invoice || local.tanggal_invoice),
      jatuh_tempo: S(row.jatuh_tempo || local.jatuh_tempo),
      status_invoice: S(row.status_invoice || local.status_invoice || (row.nomor_invoice ? 'DRAFT' : 'BELUM DIBUAT')),
      catatan_invoice: S(row.catatan_invoice || local.catatan_invoice)
    };
  }

  function invoiceNumber(rows) {
    const year = new Date().getFullYear();
    let max = 0;
    rows.forEach(row => {
      const n = S(getInvoiceMeta(row).nomor_invoice);
      const m = n.match(/^INV-(\d{4})-(\d+)$/i);
      if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]) || 0);
    });
    return `INV-${year}-${String(max + 1).padStart(4,'0')}`;
  }

  function totalOf(row) { return N(row.grand_total ?? row.total); }
  function paidOf(row) { return N(paymentsCache[String(row.id)] ?? row.total_dibayar); }

  async function ensureItems(rowId) {
    const d = DB();
    if (!d) return [];
    const r = await d.from('penawaran_items').select('*').eq('penawaran_id', rowId).order('id');
    if (r.error) throw r.error;
    return r.data || [];
  }

  function itemQtyText(i) {
    const tipe = S(i.tipe_perhitungan).toLowerCase();
    if (tipe === 'luas') return `${N(i.lebar)} × ${N(i.tinggi)} m²`;
    if (tipe === 'rigging') return `${N(i.panjang)} × ${N(i.tinggi)} m`;
    if (S(i.kode).toUpperCase() === 'LED-LVL-120-200') return `${N(i.lebar)} m`;
    return String(N(i.qty) || 1);
  }

  function openForm(row) {
    currentInvoice = { row, items: [] };
    const meta = getInvoiceMeta(row);
    const invNo = meta.nomor_invoice || invoiceNumber(quotations);
    const date = meta.tanggal_invoice || today();
    const due = meta.jatuh_tempo || date;

    document.getElementById('content').innerHTML = `
      <div class="head">
        <div><h1>${meta.nomor_invoice ? 'Edit Invoice' : 'Buat Invoice'}</h1><p>Invoice dibuat dari penawaran yang sudah tersimpan.</p></div>
        <button class="btn secondary" type="button" onclick="invoicePage()">Kembali</button>
      </div>
      <div class="card">
        <div class="grid g2">
          <div class="field"><label>No. Invoice</label><input id="invNo" value="${E(invNo)}" readonly></div>
          <div class="field"><label>Tanggal Invoice</label><input id="invDate" type="date" value="${E(date)}"></div>
          <div class="field"><label>Jatuh Tempo</label><input id="invDue" type="date" value="${E(due)}"></div>
          <div class="field"><label>Status Invoice</label><select id="invStatus"><option value="DRAFT">DRAFT</option><option value="DITERBITKAN">DITERBITKAN</option><option value="LUNAS">LUNAS</option><option value="DIBATALKAN">DIBATALKAN</option></select></div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <b>Referensi Penawaran</b>
        <div class="grid g2" style="margin-top:15px">
          <div class="field"><label>No. Penawaran</label><input value="${E(row.nomor_penawaran || row.nomor || '-')}" readonly></div>
          <div class="field"><label>Event / Project</label><input value="${E(row.event_name || row.nama_event || row.event || '-')}" readonly></div>
          <div class="field"><label>Client</label><input value="${E(row.nama_client || '-')}" readonly></div>
          <div class="field"><label>Perusahaan</label><input value="${E(row.perusahaan || '-')}" readonly></div>
        </div>
      </div>
      <div id="invoiceItems" class="card" style="margin-top:16px"><div class="empty">Memuat item...</div></div>
      <div class="card" style="margin-top:16px">
        <div class="grid g2">
          <div class="field"><label>Catatan Invoice</label><textarea id="invNotes" rows="4" placeholder="Catatan tambahan invoice">${E(meta.catatan_invoice)}</textarea></div>
          <div>
            <div class="sum"><span>Total Invoice</span><b id="invTotal">${M(totalOf(row))}</b></div>
            <div class="sum" style="margin-top:8px"><span>Sudah Dibayar</span><b style="color:#00d4a8" id="invPaid">${M(paidOf(row))}</b></div>
            <div class="sum" style="margin-top:8px"><span>Sisa Tagihan</span><b style="color:#ffbd2e" id="invBalance">${M(Math.max(0,totalOf(row)-paidOf(row)))}</b></div>
          </div>
        </div>
        <div class="actions no-print" style="margin-top:16px">
          <button class="btn secondary" type="button" onclick="invoicePage()">Batal</button>
          <button class="btn green" type="button" onclick="saveInvoice()">Simpan Invoice</button>
          <button class="btn" type="button" onclick="previewInvoice()">Preview / Cetak A4</button>
        </div>
      </div>`;
    document.getElementById('invStatus').value = meta.status_invoice || 'DRAFT';
    ensureItems(row.id).then(items => {
      currentInvoice.items = items;
      const target = document.getElementById('invoiceItems');
      if (!target) return;
      target.innerHTML = `
        <div class="scroll"><table class="table"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>
        ${items.map((i,idx)=>`<tr><td>${idx+1}</td><td><strong>${E(i.item || '-')}</strong><div style="color:var(--muted);font-size:12px">${E(i.kode || '')}</div></td><td>${E(itemQtyText(i))}</td><td>${M(i.harga_jual ?? i.harga)}</td><td><strong>${M(i.subtotal)}</strong></td></tr>`).join('') || '<tr><td colspan="5">Tidak ada item.</td></tr>'}
        <tr><td colspan="4" style="text-align:right"><strong>GRAND TOTAL</strong></td><td><strong>${M(totalOf(row))}</strong></td></tr>
        </tbody></table></div>`;
    }).catch(e => {
      console.error('Invoice items:', e);
      const target = document.getElementById('invoiceItems');
      if (target) target.innerHTML = '<div class="empty">Gagal memuat item penawaran.</div>';
    });
  }

  async function saveInvoice() {
    const row = currentInvoice?.row;
    if (!row) return toast('Penawaran invoice tidak ditemukan.');
    const no = S(document.getElementById('invNo')?.value);
    if (!no) return toast('Nomor invoice wajib ada.');

    const payload = {
      nomor_invoice: no,
      tanggal_invoice: document.getElementById('invDate')?.value || today(),
      jatuh_tempo: document.getElementById('invDue')?.value || document.getElementById('invDate')?.value || today(),
      status_invoice: document.getElementById('invStatus')?.value || 'DRAFT',
      catatan_invoice: document.getElementById('invNotes')?.value || ''
    };

    const d = DB();
    if (d) {
      const r = await d.from('penawaran').update(payload).eq('id', row.id);
      if (!r.error) {
        toast('Invoice berhasil disimpan.');
        await invoicePage();
        return;
      }
      console.warn('DB invoice save failed; fallback local:', r.error);
      if (!/column|schema|nomor_invoice|tanggal_invoice|jatuh_tempo/i.test(r.error.message || '')) return toast('Gagal menyimpan invoice: ' + r.error.message);
    }

    const store = invoiceStore();
    store[String(row.id)] = payload;
    saveInvoiceStore(store);
    toast('Invoice tersimpan di perangkat. Jalankan migration Invoice agar tersimpan permanen di database.');
    await invoicePage();
  }

  async function invoicePage() {
    const c = document.getElementById('content');
    if (!c) return;
    document.getElementById('title').textContent = 'Invoice';
    c.innerHTML = `<div class="head"><div><h1>Invoice</h1><p>Kelola invoice berdasarkan penawaran yang sudah dibuat.</p></div><button class="btn" type="button" onclick="invoicePage()">↻ Refresh</button></div><div class="card"><div class="empty">Memuat penawaran...</div></div>`;
    try { await loadQuotations(); } catch (e) { console.error(e); c.innerHTML = `<div class="card"><div class="empty">Gagal membaca penawaran: ${E(e.message || e)}</div></div>`; return; }

    c.innerHTML = `
      <div class="head"><div><h1>Invoice</h1><p>Satu penawaran hanya dapat memiliki satu nomor invoice.</p></div></div>
      <div class="card"><div class="scroll"><table class="table"><thead><tr><th>No. Invoice</th><th>Penawaran</th><th>Client</th><th>Event</th><th>Total</th><th>Dibayar</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${quotations.map(row => {
        const meta = getInvoiceMeta(row), total = totalOf(row), paid = paidOf(row), balance = Math.max(0,total-paid);
        const status = meta.nomor_invoice ? (meta.status_invoice || 'DRAFT') : 'BELUM DIBUAT';
        return `<tr>
          <td><strong>${E(meta.nomor_invoice || '-')}</strong>${meta.jatuh_tempo ? `<div style="font-size:11px;color:var(--muted)">Tempo ${D(meta.jatuh_tempo)}</div>` : ''}</td>
          <td>${E(row.nomor_penawaran || row.nomor || '-')}</td>
          <td>${E(row.nama_client || '-')}<div style="font-size:11px;color:var(--muted)">${E(row.perusahaan || '')}</div></td>
          <td>${E(row.event_name || row.nama_event || row.event || '-')}</td>
          <td>${M(total)}</td>
          <td style="color:#00d4a8">${M(paid)}<div style="font-size:11px;color:var(--muted)">Sisa ${M(balance)}</div></td>
          <td><span class="pm-status ${meta.nomor_invoice ? 'sent' : 'draft'}">${E(status)}</span></td>
          <td><button class="btn sm" type="button" onclick="invoiceEdit(${Number(row.id)})">${meta.nomor_invoice ? 'Edit / Lihat' : 'Buat Invoice'}</button></td>
        </tr>`;
      }).join('') || '<tr><td colspan="8" class="empty">Belum ada penawaran.</td></tr>'}
      </tbody></table></div></div>`;
  }

  async function previewInvoice() {
    const row = currentInvoice?.row;
    if (!row) return toast('Invoice belum dipilih.');
    const meta = {
      nomor_invoice: S(document.getElementById('invNo')?.value),
      tanggal_invoice: S(document.getElementById('invDate')?.value) || today(),
      jatuh_tempo: S(document.getElementById('invDue')?.value),
      status_invoice: S(document.getElementById('invStatus')?.value) || 'DRAFT',
      catatan_invoice: S(document.getElementById('invNotes')?.value)
    };
    if (!meta.nomor_invoice) return toast('Nomor invoice belum ada.');
    const items = currentInvoice.items || await ensureItems(row.id);
    const t = getTemplate();
    const paid = paidOf(row), total = totalOf(row), balance = Math.max(0,total-paid);
    const logoUrl = S(t.logo_url);
    const ttdUrl = S(t.ttd_url);
    const terms = S(t.ketentuan || 'DP sebesar 50% dari total nilai penawaran wajib dibayarkan sebagai tanda konfirmasi pemesanan.\nPelunasan sebesar 50% wajib dilakukan setelah seluruh unit/peralatan terpasang dan siap digunakan di lokasi acara.');
    const telp = S(t.telepon), wa = S(t.whatsapp), email = S(t.email);
    const contact = [telp ? `Telp ${telp}` : '', wa && wa !== telp ? `WA ${wa}` : '', email].filter(Boolean).join(' • ');
    const rows = items.map((i,idx)=>`<tr><td class="center">${idx+1}</td><td><strong>${E(i.item || '-')}</strong><div class="code">${E(i.kode || '')}</div></td><td class="center">${E(itemQtyText(i))}</td><td class="right">${M(i.harga_jual ?? i.harga)}</td><td class="right"><strong>${M(i.subtotal)}</strong></td></tr>`).join('');
    const old = document.getElementById('pmInvoicePreview'); if (old) old.remove();
    const overlay = document.createElement('div'); overlay.id = 'pmInvoicePreview';
    overlay.innerHTML = `<style>
      #pmInvoicePreview{position:fixed;inset:0;z-index:99999;background:#050914;color:#111827;display:flex;flex-direction:column;font-family:Arial,sans-serif}.pm-inv-toolbar{height:62px;flex:0 0 62px;background:#071022;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px}.pm-inv-toolbar strong{font-size:16px}.pm-inv-toolbar span{display:block;color:#9fb0cc;font-size:11px;margin-top:3px}.pm-inv-actions{display:flex;gap:8px}.pm-inv-actions button{border:0;border-radius:9px;padding:10px 15px;font-weight:700;cursor:pointer}.pm-inv-close{background:#17243d;color:#fff}.pm-inv-print{background:#00c98b;color:#fff}.pm-inv-scroll{overflow:auto;flex:1;padding:18px}.pm-inv-a4{width:794px;min-height:1123px;margin:0 auto;background:#fff;box-sizing:border-box;padding:32px 42px;position:relative}.pm-inv-accent{height:5px;background:#1f4ea3;margin:-32px -42px 25px}.pm-inv-head{display:grid;grid-template-columns:1fr auto;gap:25px;border-bottom:1px solid #d8e0eb;padding-bottom:16px}.pm-inv-brand{font-size:17px;font-weight:800;color:#172b5c}.pm-inv-sub{font-size:9px;color:#65748b;letter-spacing:1.2px;margin-top:3px}.pm-inv-contact{font-size:8px;color:#667085;margin-top:8px;line-height:1.5}.pm-inv-logo{max-width:130px;max-height:55px;object-fit:contain;margin-bottom:6px}.pm-inv-doc{text-align:right}.pm-inv-doc b{display:block;color:#1f4ea3;font-size:18px;letter-spacing:1px}.pm-inv-doc strong{display:block;font-size:12px;margin-top:5px}.pm-inv-dates{margin-top:8px;font-size:8px;color:#667085;line-height:1.6}.pm-inv-info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.pm-inv-box{border:1px solid #d8e0eb;border-radius:8px;padding:10px;font-size:9px;line-height:1.55}.pm-inv-label{font-size:7px;font-weight:800;color:#1f4ea3;letter-spacing:.7px;margin-bottom:3px}.pm-inv-client{font-size:11px;font-weight:800}.pm-inv-table{width:100%;border-collapse:collapse;margin-top:18px;font-size:8px}.pm-inv-table th{background:#172b5c;color:#fff;text-align:left;padding:7px}.pm-inv-table td{border:1px solid #d8e0eb;padding:7px}.pm-inv-table .center{text-align:center}.pm-inv-table .right{text-align:right}.pm-inv-total td{background:#edf4ff;font-weight:800}.pm-inv-pay{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}.pm-inv-paybox{border:1px solid #d8e0eb;border-radius:8px;padding:10px}.pm-inv-payrow{display:flex;justify-content:space-between;font-size:9px;margin:4px 0}.pm-inv-balance{font-size:13px;font-weight:800;color:#c78b00}.pm-inv-terms{margin-top:18px;border:1px solid #d8e0eb;border-radius:8px;padding:10px;font-size:7.5px;line-height:1.45}.pm-inv-terms ul{margin:4px 0 0;padding-left:16px}.pm-inv-sign{margin-top:25px;text-align:right;min-height:92px;font-size:9px}.pm-inv-sign img{display:block;width:auto;max-width:100px;height:42px;object-fit:contain;margin:2px 35px 0 auto}.pm-inv-line{width:120px;border-top:1px solid #374151;margin:2px 25px 4px auto}.pm-inv-footer{position:absolute;left:42px;right:42px;bottom:24px;border-top:1px solid #d8e0eb;padding-top:7px;font-size:7px;color:#7b8798;display:flex;justify-content:space-between}@media print{#pmInvoicePreview .pm-inv-toolbar{display:none}#pmInvoicePreview .pm-inv-scroll{padding:0;overflow:visible}#pmInvoicePreview .pm-inv-a4{margin:0;width:210mm;min-height:297mm;padding:11mm 14mm;box-shadow:none}#pmInvoicePreview .pm-inv-accent{margin:-11mm -14mm 9mm}}
    </style>
    <div class="pm-inv-toolbar"><div><strong>Preview Invoice</strong><span>A4 Portrait • ${E(meta.nomor_invoice)}</span></div><div class="pm-inv-actions"><button class="pm-inv-close" onclick="closeInvoicePreview()">Tutup</button><button class="pm-inv-print" onclick="printInvoicePreview()">Cetak / Simpan PDF</button></div></div>
    <div class="pm-inv-scroll"><main class="pm-inv-a4" id="pmInvoiceArea">
      <div class="pm-inv-accent"></div>
      <header class="pm-inv-head"><div>${logoUrl ? `<img class="pm-inv-logo" src="${E(logoUrl)}" onerror="this.style.display='none'">` : ''}<div class="pm-inv-brand">${E(t.kop_text || 'PRIANGAN MULTIMEDIA')}</div><div class="pm-inv-sub">AUDIO VISUAL • MULTIMEDIA • EVENT SUPPORT</div><div class="pm-inv-contact">${E(t.alamat || '')}${t.alamat && contact ? ' • ' : ''}${E(contact)}</div></div><div class="pm-inv-doc"><b>INVOICE</b><strong>${E(meta.nomor_invoice)}</strong><div class="pm-inv-dates">Tanggal: ${D(meta.tanggal_invoice)}<br>Jatuh Tempo: ${D(meta.jatuh_tempo)}</div></div></header>
      <section class="pm-inv-info"><div class="pm-inv-box"><div class="pm-inv-label">DITAGIHKAN KEPADA</div><div class="pm-inv-client">${E(row.nama_client || '-')}</div><div>${E(row.perusahaan || '-')}</div><div>${E(row.whatsapp || row.telepon || '')}</div><div>${E(row.email || '')}</div></div><div class="pm-inv-box"><div class="pm-inv-label">REFERENSI PENAWARAN / EVENT</div><div class="pm-inv-client">${E(row.nomor_penawaran || row.nomor || '-')}</div><div>${E(row.event_name || row.nama_event || row.event || '-')}</div><div>${D(row.tanggal_mulai)} — ${D(row.tanggal_selesai)}</div></div></section>
      <table class="pm-inv-table"><thead><tr><th style="width:28px">No.</th><th>Produk / Jasa</th><th style="width:90px">Qty / Dimensi</th><th style="width:105px">Harga</th><th style="width:115px">Subtotal</th></tr></thead><tbody>${rows}<tr class="pm-inv-total"><td colspan="4" class="right">TOTAL INVOICE</td><td class="right">${M(total)}</td></tr></tbody></table>
      <section class="pm-inv-pay"><div class="pm-inv-paybox"><div class="pm-inv-label">STATUS PEMBAYARAN</div><div class="pm-inv-payrow"><span>Total</span><strong>${M(total)}</strong></div><div class="pm-inv-payrow"><span>Sudah dibayar</span><strong>${M(paid)}</strong></div><div class="pm-inv-payrow"><span>Sisa tagihan</span><strong class="pm-inv-balance">${M(balance)}</strong></div></div><div class="pm-inv-paybox"><div class="pm-inv-label">PEMBAYARAN</div><div style="font-size:9px;line-height:1.55">${E(t.bank || t.rekening || t.payment_info || 'Pembayaran dilakukan melalui Bank BCA sesuai informasi pembayaran yang diberikan Priangan Multimedia.')}</div></div></section>
      <section class="pm-inv-terms"><strong>SYARAT & KETENTUAN</strong><ul>${terms.split(/\r?\n/).filter(Boolean).map(x=>`<li>${E(x.replace(/^[-•▪●]\s*/,'').replace(/^\d+[.)]\s*/,''))}</li>`).join('')}</ul>${meta.catatan_invoice ? `<div style="margin-top:5px"><strong>Catatan:</strong> ${E(meta.catatan_invoice)}</div>` : ''}</section>
      <section class="pm-inv-sign"><div>HORMAT KAMI,</div>${ttdUrl ? `<img src="${E(ttdUrl)}" onerror="this.style.display='none'">` : ''}<div class="pm-inv-line"></div><strong>${E(t.nama_penandatangan || '____________________________')}</strong><div>${E(t.jabatan_penandatangan || '')}</div></section>
      <footer class="pm-inv-footer"><span>Terima kasih atas kepercayaan dan kesempatan yang diberikan.</span><strong>${E(t.kop_text || 'PRIANGAN MULTIMEDIA')}</strong></footer>
    </main></div>`;
    document.body.appendChild(overlay);
  }

  function closeInvoicePreview() { document.getElementById('pmInvoicePreview')?.remove(); }
  function printInvoicePreview() { window.print(); }

  function installNav() {
    const nav = document.querySelector('.sidebar nav');
    if (!nav || nav.querySelector('[data-p="invoice"]')) return;
    const b = document.createElement('button');
    b.className = 'nav'; b.dataset.p = 'invoice'; b.type = 'button'; b.textContent = '▤ Invoice';
    nav.insertBefore(b, nav.querySelector('[data-p="finance"]') || null);
    b.addEventListener('click', () => {
      document.querySelectorAll('.nav').forEach(x => x.classList.toggle('active', x === b));
      invoicePage();
      document.querySelector('.sidebar')?.classList.remove('open');
    });
  }

  window.invoicePage = invoicePage;
  window.invoiceEdit = id => {
    const row = quotations.find(x => Number(x.id) === Number(id));
    if (row) openForm(row); else toast('Penawaran tidak ditemukan.');
  };
  window.saveInvoice = saveInvoice;
  window.previewInvoice = previewInvoice;
  window.closeInvoicePreview = closeInvoicePreview;
  window.printInvoicePreview = printInvoicePreview;

  installNav();
  const navObserver = new MutationObserver(installNav);
  navObserver.observe(document.body, { childList:true, subtree:true });
})();
