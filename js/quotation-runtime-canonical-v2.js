/* Priangan Multimedia — Quotation Domain Core
 * Single authority for quotation calculation, discount, save, preview and A4 print.
 * Do not add quotation fix/final/v2 patch files. Edit this file instead.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_DOMAIN_CORE__) return;
  window.__PM_QUOTATION_DOMAIN_CORE__ = true;

  const S = (v) => String(v ?? '').trim();
  const N = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = S(v).replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    s = s.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = (v) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Math.max(0, Math.round(N(v))));
  const E = (v) => S(v).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
  const items = () => Array.isArray(window.items) ? window.items : [];
  const masters = () => Array.isArray(window.masters) ? window.masters : [];
  const msg = (text) => typeof window.msg === 'function' ? window.msg(text) : console.warn(text);

  const days = (a, b) => {
    if (!a || !b) return 1;
    const diff = Math.round((new Date(S(b) + 'T00:00:00') - new Date(S(a) + 'T00:00:00')) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  };

  function masterFor(item) {
    const id = item?.master_id ?? item?.masterId ?? item?.id_master ?? item?.master_harga_id;
    if (id != null) {
      const byId = masters().find((m) => String(m.id) === String(id));
      if (byId) return byId;
    }
    return masters().find((m) => S(m.kode) === S(item?.kode))
      || masters().find((m) => S(m.item).toLowerCase() === S(item?.item).toLowerCase())
      || null;
  }

  function typeOf(item) {
    const master = masterFor(item);
    const sat = S(master?.satuan).toLowerCase().replace(/\s+/g, '');
    if (['unit', 'units', 'pcs', 'pc', 'buah', 'set'].includes(sat)) return 'qty';
    if (['m2', 'm²', 'meter2', 'meterpersegi', 'luas'].includes(sat)) return 'luas';
    const text = `${S(item?.item)} ${S(master?.kategori)} ${S(item?.kode)}`.toLowerCase();
    if (/rigging|rig/.test(text)) return 'rigging';
    if (/level/.test(text)) return 'level';
    if (/led|videotron/.test(text)) return 'luas';
    return S(item?.tipe || item?.tipe_perhitungan) || 'qty';
  }

  function itemSubtotal(item) {
    const price = N(item?.harga ?? item?.harga_jual);
    const duration = days(item?.mulai ?? item?.tanggal_mulai, item?.selesai ?? item?.tanggal_selesai);
    const type = typeOf(item);
    const qty = Math.max(1, N(item?.qty ?? item?.jumlah) || 1);
    const width = N(item?.lebar);
    const height = N(item?.tinggi);
    const length = N(item?.panjang);
    if (type === 'luas') return width * height * price * duration;
    if (type === 'rigging') return ((length * 2) + (height * 2)) * price * duration;
    if (type === 'level') {
      const led = items().find((x) => x !== item && /led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`));
      return (led ? N(led.lebar) : width) * price * duration;
    }
    return qty * price * duration;
  }

  function baseTotal() {
    return Math.round(items().filter((x) => x && S(x.kode) && S(x.item)).reduce((sum, x) => sum + itemSubtotal(x), 0));
  }

  function discountState() {
    const base = Math.max(0, baseTotal());
    const pctEl = document.querySelector('#pmDiscPct');
    const rpEl = document.querySelector('#pmDisc');
    let mode = window.__PM_DISC_MODE || 'rp';
    if (pctEl && document.activeElement === pctEl) mode = 'pct';
    if (rpEl && document.activeElement === rpEl) mode = 'rp';
    const pct = Math.max(0, Math.min(100, N(pctEl?.value ?? window.__pmDiscountPct)));
    const rp = Math.max(0, N(rpEl?.value ?? window.__pmDiscountValue));
    const nominal = mode === 'pct' ? Math.round(base * pct / 100) : Math.min(base, Math.round(rp));
    return { base, rp: nominal, pct: base ? (nominal / base) * 100 : 0, total: Math.max(0, base - nominal) };
  }

  function ensureDiscountUI() {
    const totalEl = document.querySelector('#total');
    if (!totalEl || document.querySelector('#pmDiscount')) return;
    const sum = totalEl.closest('.sum');
    if (!sum?.parentElement) return;
    const box = document.createElement('div');
    box.id = 'pmDiscount';
    box.className = 'pm-quotation-discount card';
    box.innerHTML = '<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="text" inputmode="decimal" autocomplete="off" value="0"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="text" inputmode="numeric" autocomplete="off" value="Rp 0"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">Rp 0</b></div>';
    sum.parentElement.insertBefore(box, sum.nextSibling);
    const pct = box.querySelector('#pmDiscPct');
    const rp = box.querySelector('#pmDisc');
    pct.addEventListener('input', () => { window.__PM_DISC_MODE = 'pct'; sync(); });
    pct.addEventListener('change', () => { window.__PM_DISC_MODE = 'pct'; sync(); });
    pct.addEventListener('blur', () => { pct.value = String(Math.max(0, Math.min(100, N(pct.value)))); sync(); });
    rp.addEventListener('focus', () => { rp.value = String(N(rp.value) || ''); });
    rp.addEventListener('input', () => { window.__PM_DISC_MODE = 'rp'; sync(); });
    rp.addEventListener('blur', () => { rp.value = M(rp.value); sync(); });
  }

  function sync() {
    const base = baseTotal();
    ensureDiscountUI();
    const d = discountState();
    const total = document.querySelector('#total');
    const grand = document.querySelector('#pmGrand');
    const pct = document.querySelector('#pmDiscPct');
    const rp = document.querySelector('#pmDisc');
    if (total) total.textContent = M(d.total);
    if (grand) grand.textContent = M(d.total);
    if (pct && document.activeElement !== pct) pct.value = d.rp ? String(Number(d.pct.toFixed(2))) : '0';
    if (rp && document.activeElement !== rp) rp.value = M(d.rp);
    window.__pmDiscountBase = base;
    window.__pmDiscountValue = d.rp;
    window.__pmDiscountPct = d.pct;
    window.__pmNetTotal = d.total;
    renderMargin();
    return d;
  }

  function renderMargin() {
    const totalEl = document.querySelector('#total');
    if (!totalEl) return;
    const host = totalEl.closest('.card');
    if (!host) return;
    let box = document.querySelector('#pmInternalMargin');
    if (!box) {
      box = document.createElement('section');
      box.id = 'pmInternalMargin';
      box.className = 'no-print pm-internal-margin';
      host.insertAdjacentElement('afterend', box);
    }
    const rows = items().filter((x) => x && S(x.kode) && S(x.item));
    if (!rows.length) {
      box.innerHTML = '<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge warn">DATA BELUM ADA</span></div><div class="pm-margin-state warn">Tambahkan item untuk menghitung margin.</div>';
      return;
    }
    const missing = rows.filter((x) => N(x.harga_modal) <= 0 && N(masterFor(x)?.harga_modal) <= 0);
    const cost = rows.reduce((sum, x) => {
      const unit = N(x.harga_modal) || N(masterFor(x)?.harga_modal);
      const d = days(x.mulai, x.selesai);
      const q = Math.max(1, N(x.qty) || 1), w = N(x.lebar), h = N(x.tinggi), l = N(x.panjang), t = typeOf(x);
      if (t === 'luas') return sum + w * h * unit * d;
      if (t === 'rigging') return sum + ((l * 2) + (h * 2)) * unit * d;
      if (t === 'level') {
        const led = rows.find((y) => y !== x && /led|videotron/i.test(`${S(y.item)} ${S(y.kode)}`));
        return sum + (led ? N(led.lebar) : w) * unit * d;
      }
      return sum + q * unit * d;
    }, 0);
    const revenue = N(window.__pmNetTotal);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const ready = missing.length === 0;
    const pass = ready && margin >= 20;
    const tone = !ready ? 'warn' : pass ? 'good' : 'bad';
    box.innerHTML = `<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge ${tone}">${ready ? margin.toFixed(2) + '%' : 'DATA MODAL BELUM LENGKAP'}</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>${M(cost)}</b></div><div><span>Laba Kotor</span><b>${M(profit)}</b></div><div><span>Margin</span><b class="${tone}">${ready ? margin.toFixed(2) + '%' : '—'}</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state ${tone}">${!ready ? missing.map((x) => E(x.item || x.kode)).join(', ') + ' belum memiliki harga modal di Master Harga.' : pass ? '✓ Margin memenuhi batas internal minimum 20%.' : '⚠ Margin di bawah batas internal minimum 20%.'}</div>`;
  }

  function dateID(value) {
    if (!value) return '-';
    const d = new Date(S(value) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? E(value) : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function preview() {
    if (document.getElementById('pmPrintPreview')) return;
    const rows = items().filter((x) => x && S(x.kode) && S(x.item));
    const client = S(document.querySelector('#qc')?.value);
    const company = S(document.querySelector('#qp')?.value);
    const eventName = S(document.querySelector('#qeve')?.value);
    if (!rows.length) return msg('Pilih minimal 1 Produk / Jasa terlebih dahulu.');
    if (!client || !company || !eventName) return msg('Isi Client, Perusahaan, dan Nama Event terlebih dahulu.');
    const d = sync();
    const t = window.template && typeof window.template === 'object' ? window.template : {};
    const number = S(window.__pmEditingQuotationNumber || window.__PM_EDIT_QUOTATION_NUMBER || window.__PM_LAST_QUOTATION_NUMBER) || `PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const htmlRows = rows.map((item, index) => {
      const type = typeOf(item);
      let quantity = N(item.qty) || 1;
      if (type === 'luas') quantity = `${N(item.lebar)} × ${N(item.tinggi)} m²`;
      else if (type === 'level') {
        const led = rows.find((x) => x !== item && /led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`));
        quantity = `${led ? N(led.lebar) : N(item.lebar)} m`;
      } else if (type === 'rigging') quantity = `${N(item.panjang)} × ${N(item.tinggi)} m`;
      return `<tr><td class="center">${index + 1}</td><td><strong>${E(item.item)}</strong><div class="code">${E(item.kode)}</div></td><td class="center">${E(quantity)}</td><td class="center">${E(item.mulai || item.selesai ? dateID(item.mulai) + ' - ' + dateID(item.selesai) : '-')}</td><td class="right nowrap">${M(item.harga)}</td><td class="right nowrap">${M(itemSubtotal(item))}</td></tr>`;
    }).join('');
    const overlay = document.createElement('div');
    overlay.id = 'pmPrintPreview';
    overlay.innerHTML = `<div class="pm-print-toolbar"><div><strong>Preview Surat Penawaran</strong><span>A4 Portrait • ${E(number)}</span></div><div class="pm-print-actions"><button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button><button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button></div></div><div class="pm-print-scroll"><main class="pm-a4" id="pmPrintArea"><div class="pm-top-accent"></div><header class="pm-letterhead"><div class="pm-logo-wrap">${t.logo_url ? `<img class="logo" src="${E(t.logo_url)}" alt="Logo">` : '<div class="logo-fallback">PM</div>'}</div><div class="pm-brand"><div class="pm-brand-name">${E(t.kop_text || 'PRIANGAN MULTIMEDIA')}</div><div class="pm-brand-sub">SALES & QUOTATION</div>${t.alamat ? `<p>${E(t.alamat)}</p>` : ''}<p>${E(t.telepon || t.whatsapp || '')}${t.email ? ' • ' + E(t.email) : ''}</p></div><div class="pm-doc-tag"><span>QUOTATION</span><strong>${E(number)}</strong></div></header><div class="pm-title-row"><div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div><div class="pm-date-box"><span>TANGGAL</span><strong>${dateID(new Date().toISOString().slice(0, 10))}</strong></div></div><section class="pm-info-card"><div class="pm-info-section"><div class="pm-section-label">DITUJUKAN KEPADA</div><div class="pm-client-name">${E(client)}</div><div>${E(company)}</div><div>${E(S(document.querySelector('#qw')?.value))}</div><div>${E(S(document.querySelector('#qe')?.value))}</div></div><div class="pm-info-section pm-event-section"><div class="pm-section-label">EVENT / PROJECT</div><div class="pm-event-name">${E(eventName)}</div><div class="pm-period-label">PERIODE</div><div>${dateID(document.querySelector('#qs')?.value)} — ${dateID(document.querySelector('#qe2')?.value)}</div></div></section><p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga untuk kebutuhan event / project tersebut sebagai berikut:</p><table class="pm-items"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${htmlRows}${d.rp > 0 ? `<tr class="pm-discount-row"><td colspan="5" class="right">DISKON (${Math.round(d.pct)}%)</td><td class="right">- ${M(d.rp)}</td></tr>` : ''}<tr class="pm-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">${M(d.total)}</td></tr></tbody></table><section class="pm-terms"><div class="pm-section-heading"><span>01</span><strong>SYARAT &amp; KETENTUAN</strong></div><div class="pm-terms-body">${E(t.ketentuan || 'Penawaran harga berlaku sesuai kesepakatan dan spesifikasi event.').replace(/\r?\n/g, '<br>')}</div></section><section class="pm-signature"><div class="pm-signature-label">HORMAT KAMI,</div><div class="pm-signature-box">${t.ttd_url ? `<img class="signature" src="${E(t.ttd_url)}" alt="TTD">` : ''}<div class="pm-signature-line"></div><strong>${E(t.nama_penandatangan || '____________________________')}</strong>${t.jabatan_penandatangan ? `<div class="pm-signature-role">${E(t.jabatan_penandatangan)}</div>` : ''}</div></section><footer class="pm-footer"><div>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.</div><strong>${E(t.kop_text || 'PRIANGAN MULTIMEDIA')}</strong></footer></main></div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('pm-preview-open');
    forceA4Layout();
  }

  function closePreview() {
    document.getElementById('pmPrintPreview')?.remove();
    document.body.classList.remove('pm-preview-open');
  }

  async function executePreview() {
    const area = document.getElementById('pmPrintArea');
    if (!area) return msg('Area A4 tidak ditemukan.');
    const images = [...area.querySelectorAll('img')];
    await Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; img.removeEventListener('load', finish); img.removeEventListener('error', finish); resolve(); };
      img.addEventListener('load', finish); img.addEventListener('error', finish); setTimeout(finish, 2500);
    })));
    forceA4Layout();
    const no = S(area.querySelector('.pm-doc-tag strong')?.textContent || window.__PM_LAST_QUOTATION_NUMBER || 'Penawaran');
    document.title = `Penawaran - ${no}`;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.print();
  }

  function forceA4Layout() {
    const id = 'pmQuotationDomainPrintStyles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        #pmPrintPreview .pm-a4{width:210mm!important;min-width:210mm!important;min-height:297mm!important;box-sizing:border-box!important;margin:0 auto!important;position:relative!important;background:#fff!important;overflow:visible!important}
        #pmPrintPreview .pm-letterhead{display:flex!important;visibility:visible!important;opacity:1!important;position:relative!important;width:100%!important;min-height:118px!important;height:auto!important;overflow:visible!important;break-inside:avoid!important;page-break-inside:avoid!important}
        #pmPrintPreview .pm-letterhead *{visibility:visible!important;opacity:1!important}
        #pmPrintPreview .pm-top-accent{display:block!important;visibility:visible!important}
        @page{size:A4 portrait;margin:0}
        @media print{
          html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important;min-width:210mm!important}
          #pmPrintPreview{position:absolute!important;inset:0!important;width:210mm!important;min-height:297mm!important;display:block!important;background:#fff!important;overflow:visible!important}
          #pmPrintPreview .pm-print-toolbar{display:none!important}
          #pmPrintPreview .pm-print-scroll{display:block!important;width:210mm!important;height:auto!important;overflow:visible!important;margin:0!important;padding:0!important}
          #pmPrintPreview .pm-a4{display:block!important;width:210mm!important;min-width:210mm!important;min-height:297mm!important;height:auto!important;margin:0!important;padding:13mm 14mm 11mm!important;box-sizing:border-box!important;overflow:visible!important;box-shadow:none!important}
          #pmPrintPreview .pm-top-accent{display:block!important;height:4px!important;visibility:visible!important}
          #pmPrintPreview .pm-letterhead{display:flex!important;min-height:118px!important;height:auto!important;max-height:none!important;visibility:visible!important;opacity:1!important}
          #pmPrintPreview .pm-title-row,#pmPrintPreview .pm-info-card,#pmPrintPreview .pm-opening,#pmPrintPreview .pm-items{break-inside:avoid!important;page-break-inside:avoid!important}
          #pmPrintPreview .pm-items .pm-discount-row{display:table-row!important;visibility:visible!important}
        }
      `;
      document.head.appendChild(style);
    }
    const area = document.getElementById('pmPrintArea');
    if (!area) return;
    const head = area.querySelector('.pm-letterhead');
    area.style.width = '210mm'; area.style.minHeight = '297mm'; area.style.boxSizing = 'border-box';
    if (head) {
      head.style.display = 'flex'; head.style.visibility = 'visible'; head.style.opacity = '1'; head.style.minHeight = '118px'; head.style.height = 'auto'; head.style.overflow = 'visible';
      head.querySelectorAll('*').forEach((el) => { el.style.visibility = 'visible'; el.style.opacity = '1'; });
    }
  }

  function DB() {
    try { if (typeof db !== 'undefined' && db) return db; } catch (_) {}
    return window.__PM_STABLE_DB || window.__PRIANGAN_QUOTE_DB || window.__PRIANGAN_EDIT_DB || null;
  }

  async function deleteOldChildren(d, quoteId) {
    const old = await d.from('penawaran_items').select('id').eq('penawaran_id', quoteId);
    if (old.error) throw old.error;
    const ids = (old.data || []).map((x) => x.id).filter(Boolean);
    if (ids.length) {
      const schedules = await d.from('penawaran_jadwal').delete().in('item_id', ids);
      if (schedules.error) throw schedules.error;
    }
    const deleted = await d.from('penawaran_items').delete().eq('penawaran_id', quoteId);
    if (deleted.error) throw deleted.error;
  }

  async function saveQuotation() {
    const d = DB();
    if (!d) return msg('Supabase belum terhubung.');
    const client = S(document.querySelector('#qc')?.value);
    const company = S(document.querySelector('#qp')?.value);
    const phone = S(document.querySelector('#qw')?.value);
    const email = S(document.querySelector('#qe')?.value);
    const eventName = S(document.querySelector('#qeve')?.value);
    const startDate = document.querySelector('#qs')?.value || null;
    const endDate = document.querySelector('#qe2')?.value || null;
    const sourceRows = items().filter((x) => x && S(x.kode) && S(x.item));
    if (!client || !company || !eventName) return msg('Client, Perusahaan, dan Nama Event wajib diisi.');
    if (!sourceRows.length) return msg('Tambahkan minimal 1 item.');
    if (sourceRows.some((x) => !x.mulai || !x.selesai)) return msg('Tanggal mulai dan selesai wajib diisi untuk semua item.');

    const state = sync();
    const editId = N(window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
    const number = S(window.__pmEditingQuotationNumber || window.__PM_EDIT_QUOTATION_NUMBER) || `PM-${Date.now().toString().slice(-6)}`;
    const payload = {
      nomor_penawaran: number,
      nama_client: client,
      perusahaan: company,
      telepon_wa: phone,
      telepon: phone,
      whatsapp: phone,
      email,
      nama_event: eventName,
      event_name: eventName,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      subtotal: state.base,
      diskon: state.rp,
      diskon_persen: state.pct,
      diskon_nominal: state.rp,
      total: state.total,
      grand_total: state.total,
      status: 'DRAFT'
    };

    let quoteId = editId || null;
    if (editId) {
      const updated = await d.from('penawaran').update(payload).eq('id', editId).select('id').single();
      if (updated.error) throw updated.error;
      quoteId = updated.data.id;
      await deleteOldChildren(d, quoteId);
    } else {
      const inserted = await d.from('penawaran').insert([payload]).select('id').single();
      if (inserted.error) throw inserted.error;
      quoteId = inserted.data.id;
    }

    const itemPayload = sourceRows.map((item) => ({
      penawaran_id: quoteId,
      kode: item.kode,
      item: item.item,
      nama_item: item.item,
      harga_jual: N(item.harga),
      harga: N(item.harga),
      harga_modal: N(item.harga_modal) || 0,
      tipe_perhitungan: typeOf(item),
      tipe: typeOf(item),
      qty: Math.max(1, N(item.qty) || 1),
      jumlah: Math.max(1, N(item.qty) || 1),
      lebar: N(item.lebar) || null,
      tinggi: N(item.tinggi) || null,
      panjang: N(item.panjang) || null,
      tanggal_mulai: item.mulai,
      tanggal_selesai: item.selesai,
      durasi: days(item.mulai, item.selesai),
      subtotal: itemSubtotal(item)
    }));
    const itemResult = await d.from('penawaran_items').insert(itemPayload).select('id');
    if (itemResult.error) throw itemResult.error;

    const savedItems = itemResult.data || [];
    const schedulePayload = savedItems.map((saved, index) => {
      const item = sourceRows[index];
      const duration = days(item.mulai, item.selesai);
      return {
        item_id: saved.id,
        penawaran_item_id: saved.id,
        penawaran_id: quoteId,
        qty: Math.max(1, N(item.qty) || 1),
        tanggal_mulai: item.mulai,
        tanggal_selesai: item.selesai,
        durasi_hari: duration,
        durasi: duration,
        subtotal: itemSubtotal(item)
      };
    });
    if (schedulePayload.length) {
      const scheduleResult = await d.from('penawaran_jadwal').insert(schedulePayload);
      if (scheduleResult.error) throw scheduleResult.error;
    }

    const itemCheck = await d.from('penawaran_items').select('subtotal').eq('penawaran_id', quoteId);
    if (itemCheck.error) throw itemCheck.error;
    const savedSubtotal = (itemCheck.data || []).reduce((sum, row) => sum + N(row.subtotal), 0);
    const verify = await d.from('penawaran').select('id,subtotal,diskon,diskon_persen,diskon_nominal,total,grand_total,nama_event').eq('id', quoteId).single();
    if (verify.error) throw verify.error;
    const saved = verify.data || {};
    const ok = Math.round(savedSubtotal) === Math.round(state.base)
      && Math.round(N(saved.subtotal)) === Math.round(state.base)
      && Math.round(N(saved.diskon_nominal)) === Math.round(state.rp)
      && Math.round(N(saved.total)) === Math.round(state.total)
      && Math.round(N(saved.grand_total)) === Math.round(state.total)
      && Math.round(N(saved.diskon_persen)) === Math.round(state.pct);
    if (!ok) throw new Error('Verifikasi database gagal: nilai item/subtotal/diskon/total berbeda dari form.');

    window.__pmEditingQuotationId = null;
    window.__PM_EDIT_QUOTATION_ID = null;
    window.__pmEditingQuotationNumber = null;
    window.__PM_EDIT_QUOTATION_NUMBER = null;
    window.__PM_LAST_QUOTATION_NUMBER = number;
    msg((editId ? 'Penawaran berhasil diperbarui: ' : 'Penawaran berhasil disimpan: ') + number);
    if (typeof load === 'function') await load();
    window.items = [];
    if (typeof go === 'function') go('history'); else { window.page = 'history'; if (typeof render === 'function') render(); }
  }

  window.saveQuote = saveQuotation;
  window.printQuote = preview;
  window.closePrintPreview = closePreview;
  window.executePrintPreview = executePreview;
  window.__PM_QUOTATION_CORE = {
    N, M, days, masterFor, typeOf, itemSubtotal, baseTotal, discountState, sync, renderMargin, saveQuotation
  };

  function boot() {
    ensureDiscountUI();
    sync();
    forceA4Layout();
  }
  [0, 150, 350, 700, 1200].forEach((ms) => setTimeout(boot, ms));
  document.addEventListener('input', (e) => {
    if (e.target?.id === 'pmDiscPct' || e.target?.id === 'pmDisc' || e.target?.closest?.('#items')) {
      clearTimeout(window.__pmQuotationSyncTimer);
      window.__pmQuotationSyncTimer = setTimeout(sync, 40);
    }
  }, true);
  document.addEventListener('change', (e) => {
    if (e.target?.closest?.('#items')) {
      clearTimeout(window.__pmQuotationSyncTimer);
      window.__pmQuotationSyncTimer = setTimeout(sync, 40);
    }
  }, true);
  document.addEventListener('click', (e) => {
    if (e.target?.closest?.('[data-p="quotation"]')) {
      window.__PM_DISC_MODE = 'rp';
      window.__pmDiscountBase = 0;
      window.__pmDiscountValue = 0;
      window.__pmDiscountPct = 0;
      window.__pmNetTotal = 0;
      window.__pmEditingQuotationId = null;
      window.__PM_EDIT_QUOTATION_ID = null;
      window.__pmEditingQuotationNumber = null;
      window.__PM_EDIT_QUOTATION_NUMBER = null;
      setTimeout(boot, 80);
    }
  }, true);
  window.addEventListener('beforeprint', () => { forceA4Layout(); sync(); }, true);
})();