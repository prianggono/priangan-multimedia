/* Priangan Multimedia — Invoice additional item / overtime fix
 * Additional items belong ONLY to the invoice. They never modify penawaran_items or master_harga.
 */
(function () {
  'use strict';

  const KEY = 'PM_INVOICE_EXTRA_ITEMS';
  const S = v => String(v ?? '').trim();
  const N = v => {
    const n = Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const E = v => S(v).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  const M = v => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(N(v));
  const toast = t => typeof window.msg === 'function' ? window.msg(t) : alert(t);

  function store() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function saveStore(x) { localStorage.setItem(KEY, JSON.stringify(x)); }
  function extras(id) { return store()[String(id)] || []; }
  function baseTotal(row) { return N(row?.grand_total ?? row?.total); }
  function extrasTotal(id) { return extras(id).reduce((s, x) => s + N(x.subtotal), 0); }
  function totalWithExtras(row) { return baseTotal(row) + extrasTotal(row?.id); }

  function makeItem(type, name, qty, unitPrice) {
    const q = Math.max(0, N(qty));
    const p = Math.max(0, N(unitPrice));
    return {
      id: 'extra-' + Date.now() + '-' + Math.random().toString(36).slice(2,8),
      invoice_item: true,
      tipe: type,
      item: S(name) || (type === 'overtime' ? 'Overtime' : 'Item Tambahan'),
      kode: type === 'overtime' ? 'OVERTIME' : 'ADD-INV',
      qty: q || 1,
      satuan: type === 'overtime' ? 'jam' : 'unit',
      harga: p,
      subtotal: (q || 1) * p
    };
  }

  function qtyText(x) {
    return `${N(x.qty) || 1} ${E(x.satuan || 'unit')}`;
  }

  function renderItems() {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci?.row) return;
    const target = document.getElementById('invoiceItems');
    if (!target) return;

    const base = ci.baseItems || [];
    const add = extras(ci.row.id);
    const all = base.concat(add);
    ci.items = all;
    const baseTotalValue = baseTotal(ci.row);
    const extraTotal = add.reduce((s,x) => s + N(x.subtotal), 0);
    const grand = baseTotalValue + extraTotal;

    target.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
        <div><b>Item Invoice</b><div style="font-size:12px;color:var(--muted);margin-top:3px">Item tambahan hanya berlaku pada invoice ini.</div></div>
        <button class="btn sm" type="button" onclick="invoiceAddItem()">+ Tambah Item</button>
      </div>
      <div class="scroll"><table class="table"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Harga</th><th>Subtotal</th><th>Aksi</th></tr></thead><tbody>
      ${all.map((i,idx)=>`<tr>
        <td>${idx+1}</td>
        <td><strong>${E(i.item || '-')}</strong><div style="color:var(--muted);font-size:12px">${E(i.kode || '')}${i.invoice_item ? ' • Invoice only' : ''}</div></td>
        <td>${i.invoice_item ? qtyText(i) : E(window.__PM_INVOICE_EXTRA_QTY?.(i) || String(N(i.qty) || 1))}</td>
        <td>${M(i.harga_jual ?? i.harga)}</td>
        <td><strong>${M(i.subtotal)}</strong></td>
        <td>${i.invoice_item ? `<button class="btn sm secondary" type="button" onclick="invoiceRemoveItem('${E(i.id)}')">Hapus</button>` : '<span style="color:var(--muted);font-size:11px">Penawaran</span>'}</td>
      </tr>`).join('') || '<tr><td colspan="6">Tidak ada item.</td></tr>'}
      <tr><td colspan="4" style="text-align:right"><strong>GRAND TOTAL</strong></td><td><strong>${M(grand)}</strong></td><td></td></tr>
      </tbody></table></div>`;

    const paid = N(window.__PM_INVOICE_EXTRA_PAID?.() || 0);
    const paidEl = document.getElementById('invPaid');
    const totalEl = document.getElementById('invTotal');
    const balanceEl = document.getElementById('invBalance');
    if (totalEl) totalEl.textContent = M(grand);
    if (paidEl) paidEl.textContent = M(paid);
    if (balanceEl) balanceEl.textContent = M(Math.max(0, grand - paid));
  }

  function openAddDialog() {
    const old = document.getElementById('pmInvoiceAddDialog');
    if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'pmInvoiceAddDialog';
    box.innerHTML = `<style>
      #pmInvoiceAddDialog{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:18px}
      .pm-add-box{width:min(520px,100%);background:#10192d;border:1px solid #2b3a5c;border-radius:16px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.45);color:#fff}
      .pm-add-box h3{margin:0 0 5px}.pm-add-help{font-size:12px;color:#9fb0cc;margin-bottom:16px}.pm-add-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pm-add-box label{display:block;font-size:12px;color:#aebbd2;margin-bottom:6px}.pm-add-box input,.pm-add-box select{width:100%;box-sizing:border-box;background:#071022;color:#fff;border:1px solid #2b3a5c;border-radius:9px;padding:11px}.pm-add-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.pm-add-actions button{border:0;border-radius:9px;padding:10px 15px;font-weight:700;cursor:pointer}.pm-add-cancel{background:#1b2945;color:#fff}.pm-add-save{background:#00c98b;color:#fff}@media(max-width:600px){.pm-add-row{grid-template-columns:1fr}}
    </style>
    <div class="pm-add-box">
      <h3>Tambah Item ke Invoice</h3>
      <div class="pm-add-help">Item ini hanya ditambahkan ke invoice dan tidak mengubah penawaran maupun price list.</div>
      <div class="field"><label>Jenis</label><select id="pmAddType"><option value="normal">Item Tambahan</option><option value="overtime">Overtime</option></select></div>
      <div class="field" style="margin-top:12px"><label>Keterangan</label><input id="pmAddName" placeholder="Contoh: Overtime Operator"></div>
      <div class="pm-add-row" style="margin-top:12px">
        <div><label id="pmAddQtyLabel">Jumlah</label><input id="pmAddQty" type="number" min="0" step="0.5" value="1"></div>
        <div><label>Harga</label><input id="pmAddPrice" type="number" min="0" step="1000" value="0"></div>
      </div>
      <div id="pmAddPreview" style="margin-top:12px;text-align:right;font-weight:700;color:#00d4a8">Subtotal: Rp 0</div>
      <div class="pm-add-actions"><button class="pm-add-cancel" type="button" onclick="invoiceCloseAddItem()">Batal</button><button class="pm-add-save" type="button" onclick="invoiceSaveAddItem()">Tambahkan</button></div>
    </div>`;
    document.body.appendChild(box);
    const type = box.querySelector('#pmAddType'), name = box.querySelector('#pmAddName'), qty = box.querySelector('#pmAddQty'), price = box.querySelector('#pmAddPrice'), label = box.querySelector('#pmAddQtyLabel'), preview = box.querySelector('#pmAddPreview');
    const calc = () => {
      const q = Math.max(0, N(qty.value)) || 0;
      const p = Math.max(0, N(price.value)) || 0;
      preview.textContent = 'Subtotal: ' + M(q * p);
    };
    type.addEventListener('change', () => {
      if (type.value === 'overtime') { name.value = name.value || 'Overtime'; label.textContent = 'Kelebihan Jam'; qty.step = '0.5'; }
      else { label.textContent = 'Jumlah'; qty.step = '1'; }
      calc();
    });
    [qty,price].forEach(x => x.addEventListener('input', calc));
    name.focus();
  }

  function addItem() {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci?.row) return toast('Invoice belum dipilih.');
    openAddDialog();
  }
  function saveAddItem() {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci?.row) return;
    const type = document.getElementById('pmAddType')?.value || 'normal';
    const name = S(document.getElementById('pmAddName')?.value) || (type === 'overtime' ? 'Overtime' : 'Item Tambahan');
    const qty = Math.max(0, N(document.getElementById('pmAddQty')?.value));
    const price = Math.max(0, N(document.getElementById('pmAddPrice')?.value));
    if (qty <= 0) return toast(type === 'overtime' ? 'Kelebihan jam harus lebih dari 0.' : 'Jumlah harus lebih dari 0.');
    if (price < 0) return toast('Harga tidak valid.');
    const item = makeItem(type, name, qty, price);
    const data = store();
    data[String(ci.row.id)] = [...(data[String(ci.row.id)] || []), item];
    saveStore(data);
    document.getElementById('pmInvoiceAddDialog')?.remove();
    renderItems();
  }
  function removeItem(id) {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci?.row) return;
    const data = store();
    data[String(ci.row.id)] = (data[String(ci.row.id)] || []).filter(x => String(x.id) !== String(id));
    saveStore(data);
    renderItems();
  }

  function patchCurrentTotal() {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci?.row) return;
    // Only mutate the in-memory row used by invoice.js preview. The database quotation remains untouched.
    ci.row.grand_total = totalWithExtras(ci.row);
    if (window.currentInvoice && window.currentInvoice.row === ci.row) window.currentInvoice.row.grand_total = ci.row.grand_total;
  }

  function captureCurrentFromExisting() {
    const target = document.getElementById('invoiceItems');
    if (!target) return false;
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    if (!ci) return false;
    // invoice.js has already loaded and assigned its item array to its closure; we recover the DOM table
    // only as a display source and keep the real base items via the exposed hook below when available.
    return true;
  }

  function patchOpenForm() {
    if (window.__PM_INVOICE_EXTRA_PATCHED) return;
    if (typeof window.invoiceEdit !== 'function') return false;
    const originalEdit = window.invoiceEdit;
    window.invoiceEdit = function (id) {
      const row = (window.__PM_INVOICE_EXTRA_QUOTATIONS || []).find(x => Number(x.id) === Number(id));
      window.__PM_INVOICE_EXTRA_CURRENT = { row: row || null, baseItems: [], items: [] };
      originalEdit(id);
      const wait = (attempts) => {
        const target = document.getElementById('invoiceItems');
        if (!target && attempts < 40) return setTimeout(() => wait(attempts + 1), 75);
        if (!target) return;
        // Recover base items from the rendered table is intentionally avoided for calculations.
        // Instead, additional rows are appended to the existing table and totals are adjusted separately.
        decorateExistingItems();
      };
      wait(0);
    };
    window.__PM_INVOICE_EXTRA_PATCHED = true;
    return true;
  }

  function decorateExistingItems() {
    const ci = window.__PM_INVOICE_EXTRA_CURRENT;
    const target = document.getElementById('invoiceItems');
    if (!ci?.row || !target) return;
    const add = extras(ci.row.id);
    const table = target.querySelector('table');
    if (!table) return setTimeout(decorateExistingItems, 100);
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Remove prior extra rows if any, then append fresh ones before GRAND TOTAL.
    tbody.querySelectorAll('tr[data-pm-invoice-extra="1"]').forEach(x => x.remove());
    const totalRow = Array.from(tbody.querySelectorAll('tr')).find(tr => /GRAND TOTAL/i.test(tr.textContent || ''));
    add.forEach((i, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.pmInvoiceExtra = '1';
      tr.innerHTML = `<td>${tbody.querySelectorAll('tr').length}</td><td><strong>${E(i.item)}</strong><div style="color:var(--muted);font-size:12px">${E(i.kode)} • Invoice only</div></td><td>${qtyText(i)}</td><td>${M(i.harga)}</td><td><strong>${M(i.subtotal)}</strong></td>`;
      if (totalRow) tbody.insertBefore(tr, totalRow); else tbody.appendChild(tr);
    });
    patchCurrentTotal();
    const baseGrand = baseTotal(ci.row);
    const grand = baseGrand + add.reduce((s,x)=>s+N(x.subtotal),0);
    const last = Array.from(tbody.querySelectorAll('tr')).find(tr => /GRAND TOTAL/i.test(tr.textContent || ''));
    if (last) {
      const cells = last.querySelectorAll('td');
      if (cells.length) cells[cells.length - 1].textContent = M(grand);
    }
    const totalEl = document.getElementById('invTotal');
    const paidEl = document.getElementById('invPaid');
    const balanceEl = document.getElementById('invBalance');
    if (totalEl) totalEl.textContent = M(grand);
    const paid = N((window.__PM_INVOICE_EXTRA_PAYMENT || 0));
    if (paidEl) paidEl.textContent = M(paid);
    if (balanceEl) balanceEl.textContent = M(Math.max(0, grand - paid));

    if (!target.querySelector('[onclick="invoiceAddItem()"]')) {
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px';
      head.innerHTML = '<button class="btn sm" type="button" onclick="invoiceAddItem()">+ Tambah Item</button>';
      target.insertBefore(head, target.firstChild);
    }
  }

  // Wrap preview so the existing A4 preview receives invoice-only items and invoice total.
  function patchPreview() {
    if (window.__PM_INVOICE_EXTRA_PREVIEW_PATCHED || typeof window.previewInvoice !== 'function') return;
    const original = window.previewInvoice;
    window.previewInvoice = async function () {
      const ci = window.__PM_INVOICE_EXTRA_CURRENT;
      if (!ci?.row) return original();
      const add = extras(ci.row.id);
      const originalTotal = ci.row.grand_total;
      ci.row.grand_total = baseTotal(ci.row) + add.reduce((s,x)=>s+N(x.subtotal),0);
      try {
        // The existing preview reads currentInvoice.items. Add our rows to the same in-memory list when possible.
        if (window.currentInvoice && Array.isArray(window.currentInvoice.items)) {
          const existing = window.currentInvoice.items.filter(x => !x.invoice_item);
          window.currentInvoice.items = existing.concat(add);
        }
        await original();
      } finally {
        ci.row.grand_total = originalTotal;
      }
    };
    window.__PM_INVOICE_EXTRA_PREVIEW_PATCHED = true;
  }

  // Keep invoice totals/list consistent after returning to the invoice page.
  function patchInvoicePage() {
    if (window.__PM_INVOICE_EXTRA_PAGE_PATCHED || typeof window.invoicePage !== 'function') return;
    const original = window.invoicePage;
    window.invoicePage = async function () {
      const r = await original();
      const rows = document.querySelectorAll('#content table tbody tr');
      rows.forEach(tr => {
        const btn = tr.querySelector('button[onclick^="invoiceEdit("]');
        if (!btn) return;
        const m = String(btn.getAttribute('onclick')).match(/invoiceEdit\((\d+)\)/);
        if (!m) return;
        const id = m[1];
        const extra = extras(id).reduce((s,x)=>s+N(x.subtotal),0);
        if (!extra) return;
        const cells = tr.querySelectorAll('td');
        // Total column is before Dibayar. Do not touch quotation database; only display invoice aggregate here.
        if (cells.length >= 6) {
          const totalCell = cells[4];
          if (totalCell) totalCell.innerHTML = `${M((N(String(totalCell.textContent).replace(/[^0-9]/g,'')) || 0) + extra)}<div style="font-size:11px;color:var(--muted)">+ item invoice ${M(extra)}</div>`;
        }
      });
      return r;
    };
    window.__PM_INVOICE_EXTRA_PAGE_PATCHED = true;
  }

  // Since invoice.js keeps its state private, capture the selected quotation from the button id and DOM.
  function install() {
    patchOpenForm();
    patchPreview();
    patchInvoicePage();
    if (!window.__PM_INVOICE_EXTRA_OBSERVER) {
      const obs = new MutationObserver(() => {
        patchOpenForm(); patchPreview(); patchInvoicePage();
        const ci = window.__PM_INVOICE_EXTRA_CURRENT;
        if (ci?.row && document.getElementById('invoiceItems')) decorateExistingItems();
      });
      obs.observe(document.body, {childList:true, subtree:true});
      window.__PM_INVOICE_EXTRA_OBSERVER = obs;
    }
  }

  window.invoiceAddItem = addItem;
  window.invoiceSaveAddItem = saveAddItem;
  window.invoiceRemoveItem = removeItem;
  window.invoiceCloseAddItem = () => document.getElementById('pmInvoiceAddDialog')?.remove();
  window.__PM_INVOICE_EXTRA_GET = extras;

  install();
  setTimeout(install, 250);
  setTimeout(install, 1000);
})();