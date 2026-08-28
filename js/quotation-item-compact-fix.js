/* Priangan Multimedia - Compact quotation item editor
 * Item tetap diedit secara lengkap saat dibuka, tetapi setelah selesai
 * dapat/minimize menjadi satu baris ringkas: kode, nama, harga, ukuran/qty,
 * dan subtotal. Semua nilai tetap berada di state quotation.
 */
(function () {
  'use strict';

  const originalDrawItems = window.drawItems;
  if (typeof originalDrawItems !== 'function') return;

  const openState = new Map();

  function esc(v) {
    return String(v ?? '').replace(/[&<>\"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function money(v) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(Number(v) || 0);
  }

  function numberText(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return '-';
    return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
  }

  function summaryDimension(item) {
    const type = String(item.tipe || '').toLowerCase();
    const width = numberText(item.lebar);
    const height = numberText(item.tinggi);
    const length = numberText(item.panjang);

    if (type === 'luas' || /led|videotron/i.test(item.item || '')) {
      return `${width} × ${height} m`;
    }
    if (type === 'rigging' || /rigging|rig/i.test(item.item || '')) {
      return `${length} × ${height} m`;
    }
    if (type === 'level' || /level/i.test(item.item || '')) {
      return `${width} × ${height} m`;
    }
    return `Qty ${Number(item.qty) || 1}`;
  }

  function isComplete(item) {
    if (!item || !item.item) return false;
    const type = String(item.tipe || '').toLowerCase();
    if (type === 'luas') return Number(item.lebar) > 0 && Number(item.tinggi) > 0 && !!item.mulai && !!item.selesai;
    if (type === 'rigging') return Number(item.panjang) > 0 && Number(item.tinggi) > 0 && !!item.mulai && !!item.selesai;
    if (type === 'level') return Number(item.tinggi) > 0 && !!item.mulai && !!item.selesai;
    return Number(item.qty) > 0 && !!item.mulai && !!item.selesai;
  }

  function enhance() {
    const cards = document.querySelectorAll('#items .item');
    cards.forEach((card, index) => {
      const item = Array.isArray(window.items) ? window.items[index] : null;
      if (!item || card.dataset.compactReady === '1') return;

      const key = String(item.id);
      const head = card.querySelector('.itemhead');
      if (!head) return;

      card.dataset.compactReady = '1';
      card.dataset.itemKey = key;

      const body = document.createElement('div');
      body.className = 'item-body-compact';
      while (card.children.length > 1) body.appendChild(card.children[1]);
      card.appendChild(body);

      const summary = document.createElement('button');
      summary.type = 'button';
      summary.className = 'item-collapse-toggle';
      summary.setAttribute('aria-label', 'Buka atau tutup detail item');
      summary.innerHTML = `
        <span class="item-collapse-text">
          <span class="item-summary-main"><b>${esc(item.kode || '-')}</b><strong>${esc(item.item || 'Belum memilih produk / jasa')}</strong></span>
          <span class="item-summary-meta"><span>${money(item.harga || 0)}</span><span>${esc(summaryDimension(item))}</span><span>Subtotal ${money(window.subtotal ? window.subtotal(item) : 0)}</span></span>
        </span>
        <span class="item-chevron">⌃</span>`;
      head.insertBefore(summary, head.querySelector('.btn'));

      const setCollapsed = (collapsed) => {
        openState.set(key, !collapsed);
        body.hidden = collapsed;
        summary.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        const chevron = summary.querySelector('.item-chevron');
        if (chevron) chevron.textContent = collapsed ? '⌄' : '⌃';
        card.classList.toggle('is-collapsed', collapsed);
      };

      summary.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(!openState.get(key));
      });

      // Item baru kosong tetap terbuka. Item yang sudah lengkap otomatis
      // diringkas agar form panjang tidak memenuhi layar.
      const shouldCollapse = openState.has(key) ? !openState.get(key) : isComplete(item);
      setCollapsed(shouldCollapse);
    });
  }

  window.drawItems = function () {
    originalDrawItems.apply(this, arguments);
    requestAnimationFrame(enhance);
  };

  const style = document.createElement('style');
  style.id = 'quotation-item-compact-style';
  style.textContent = `
    #items .item { position:relative; }
    #items .item > .grid.g2,
    #items .item .dim,
    #items .item .sched > .grid.g2 {
      grid-template-columns:minmax(0,1fr) !important;
    }
    #items .itemhead {
      display:flex;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
    }
    #items .itemhead .item-collapse-toggle {
      order:2;
      flex:1 1 300px;
      min-width:0;
      text-align:left;
      border:0;
      background:transparent;
      color:inherit;
      padding:4px 0;
      cursor:pointer;
    }
    #items .itemhead .btn {
      order:3;
      margin-left:auto;
    }
    #items .item-collapse-text {
      display:flex;
      flex-direction:column;
      gap:5px;
      min-width:0;
    }
    #items .item-summary-main {
      display:flex;
      align-items:center;
      gap:10px;
      min-width:0;
    }
    #items .item-summary-main b {
      color:var(--blue);
      white-space:nowrap;
      font-size:13px;
    }
    #items .item-summary-main strong {
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      font-size:15px;
    }
    #items .item-summary-meta {
      display:flex;
      align-items:center;
      gap:14px;
      flex-wrap:wrap;
      color:var(--muted);
      font-size:12px;
    }
    #items .item-summary-meta span:first-child {
      color:var(--txt);
      font-weight:700;
    }
    #items .item-summary-meta span:last-child {
      color:var(--green);
      font-weight:700;
    }
    #items .item-chevron {
      float:right;
      font-size:18px;
      color:var(--blue);
      margin-left:8px;
    }
    #items .item-body-compact[hidden] { display:none !important; }
    #items .item.is-collapsed { padding-bottom:12px; }
    @media (max-width:600px) {
      #items .itemhead .item-collapse-toggle { flex:1 1 calc(100% - 80px); }
      #items .itemhead .btn { flex:0 0 auto; }
      #items .item .field input,
      #items .item .field select {
        width:100%;
        box-sizing:border-box;
      }
      #items .item-summary-main { gap:7px; }
      #items .item-summary-main strong { font-size:14px; }
      #items .item-summary-meta { gap:8px 12px; }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('click', () => requestAnimationFrame(enhance), true);
})();
