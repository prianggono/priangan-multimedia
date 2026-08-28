/* Priangan Multimedia - Compact quotation item UI
 * IMPORTANT: app.js keeps `items` as a lexical variable, not window.items.
 * Therefore this fix intentionally reads the rendered item card DOM instead of
 * relying on window.items. It runs after every drawItems() render.
 */
(function () {
  'use strict';

  const originalDrawItems = window.drawItems;
  if (typeof originalDrawItems !== 'function') {
    console.warn('[PM] quotation compact: drawItems belum tersedia');
    return;
  }

  const collapsedState = new Map();
  let enhancing = false;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);

  const money = (value) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(Number(value) || 0);

  const text = (value) => String(value ?? '').trim();

  function fieldInput(card, labelText) {
    const wanted = labelText.toLowerCase();
    for (const field of card.querySelectorAll('.field')) {
      const label = text(field.querySelector('label')?.textContent).toLowerCase();
      if (label === wanted || label.includes(wanted)) {
        return field.querySelector('input,select,textarea');
      }
    }
    return null;
  }

  function parseMoney(value) {
    return Number(String(value ?? '').replace(/[^0-9-]/g, '')) || 0;
  }

  function selectedProduct(card) {
    const select = card.querySelector('select');
    const option = select?.selectedOptions?.[0];
    const raw = text(option?.textContent);
    const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
    return {
      code: text(select?.value) || text(match?.[1]) || '-',
      name: text(match?.[2]) || (raw && !raw.startsWith('--') ? raw : 'Belum memilih produk / jasa')
    };
  }

  function getType(card, productName) {
    const type = text(fieldInput(card, 'Tipe Perhitungan')?.value).toLowerCase();
    if (type) return type;
    if (/led|videotron/i.test(productName)) return 'luas';
    if (/rigging|rig/i.test(productName)) return 'rigging';
    if (/level/i.test(productName)) return 'level';
    return 'qty';
  }

  function dimension(card, type, productName) {
    const width = text(fieldInput(card, 'Lebar Videotron')?.value || fieldInput(card, 'Lebar Level')?.value);
    const height = text(fieldInput(card, 'Tinggi Videotron')?.value || fieldInput(card, 'Tinggi Level')?.value || fieldInput(card, 'Tinggi Rigging')?.value);
    const length = text(fieldInput(card, 'Panjang Rigging')?.value);
    const qty = text(fieldInput(card, 'Jumlah (Qty)')?.value) || '1';

    if (type === 'luas' || /led|videotron/i.test(productName)) {
      return width && height ? `${width} × ${height} m` : 'Ukuran belum diisi';
    }
    if (type === 'rigging' || /rigging|rig/i.test(productName)) {
      return length && height ? `${length} × ${height} m` : 'Ukuran belum diisi';
    }
    if (type === 'level' || /level/i.test(productName)) {
      return width && height ? `${width} × ${height} m` : (height ? `${height} m` : 'Ukuran belum diisi');
    }
    return `Qty ${qty}`;
  }

  function subtotal(card) {
    const sum = card.querySelector('.sum b');
    return parseMoney(sum?.textContent);
  }

  function isComplete(card, productName, type) {
    const select = card.querySelector('select');
    const start = fieldInput(card, 'Tanggal Mulai')?.value;
    const end = fieldInput(card, 'Tanggal Selesai')?.value;
    if (!select?.value || !start || !end) return false;

    if (type === 'luas' || /led|videotron/i.test(productName)) {
      return Number(fieldInput(card, 'Lebar Videotron')?.value) > 0 && Number(fieldInput(card, 'Tinggi Videotron')?.value) > 0;
    }
    if (type === 'rigging' || /rigging|rig/i.test(productName)) {
      return Number(fieldInput(card, 'Panjang Rigging')?.value) > 0 && Number(fieldInput(card, 'Tinggi Rigging')?.value) > 0;
    }
    if (type === 'level' || /level/i.test(productName)) {
      return Number(fieldInput(card, 'Tinggi Level')?.value) > 0;
    }
    return Number(fieldInput(card, 'Jumlah (Qty)')?.value || 1) > 0;
  }

  function enhance() {
    if (enhancing) return;
    const container = document.querySelector('#items');
    if (!container) return;

    enhancing = true;
    try {
      const cards = Array.from(container.querySelectorAll(':scope > .item'));

      cards.forEach((card, index) => {
        if (card.dataset.compactReady === '1') return;

        const head = card.querySelector(':scope > .itemhead');
        if (!head) return;

        const product = selectedProduct(card);
        const type = getType(card, product.name);
        const priceInput = fieldInput(card, 'Harga Jual');
        const price = parseMoney(priceInput?.value);
        const subtotalValue = subtotal(card);
        const sizeQty = dimension(card, type, product.name);
        const key = `${index}|${product.code}`;

        // Keep the original full form intact inside one body wrapper.
        const body = document.createElement('div');
        body.className = 'pm-item-details';
        const originalChildren = Array.from(card.children);
        originalChildren.forEach((child) => {
          if (child !== head) body.appendChild(child);
        });
        card.appendChild(body);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'pm-item-summary';
        toggle.setAttribute('aria-label', 'Buka atau tutup detail item');
        toggle.innerHTML = `
          <span class="pm-item-summary-line">
            <b class="pm-item-code">${esc(product.code)}</b>
            <strong class="pm-item-name">${esc(product.name)}</strong>
            <span class="pm-item-price">${money(price)}</span>
            <span class="pm-item-size">${esc(sizeQty)}</span>
            <span class="pm-item-subtotal">${money(subtotalValue)}</span>
          </span>
          <span class="pm-item-arrow" aria-hidden="true">⌄</span>`;

        // Summary is placed immediately after ITEM # and before Hapus.
        head.insertBefore(toggle, head.querySelector('.btn'));
        card.dataset.compactReady = '1';
        card.dataset.compactKey = key;

        const setCollapsed = (collapsed) => {
          collapsedState.set(key, collapsed);
          body.hidden = collapsed;
          toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
          toggle.querySelector('.pm-item-arrow').textContent = collapsed ? '⌄' : '⌃';
          card.classList.toggle('pm-item-collapsed', collapsed);
        };

        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setCollapsed(!body.hidden);
        });

        // Completed item = collapsed by default. New/incomplete item = open.
        const complete = isComplete(card, product.name, type);
        const initialCollapsed = collapsedState.has(key) ? collapsedState.get(key) : complete;
        setCollapsed(initialCollapsed);
      });
    } finally {
      enhancing = false;
    }
  }

  window.drawItems = function () {
    originalDrawItems.apply(this, arguments);
    requestAnimationFrame(enhance);
  };

  const style = document.createElement('style');
  style.id = 'pm-item-compact-style-v3';
  style.textContent = `
    #items > .item.pm-item-collapsed {
      padding-bottom: 12px !important;
    }

    #items > .item .pm-item-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1 1 auto;
      min-width: 0;
      margin: 0;
      padding: 5px 0;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }

    #items > .item .pm-item-summary-line {
      display: grid;
      grid-template-columns: auto minmax(120px, 1.6fr) auto minmax(90px, 1fr) auto;
      align-items: center;
      gap: 10px;
      min-width: 0;
      width: 100%;
    }

    #items > .item .pm-item-code {
      color: var(--blue);
      white-space: nowrap;
      font-size: 13px;
    }

    #items > .item .pm-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 15px;
    }

    #items > .item .pm-item-price,
    #items > .item .pm-item-size,
    #items > .item .pm-item-subtotal {
      white-space: nowrap;
      font-size: 12px;
    }

    #items > .item .pm-item-price { font-weight: 700; }
    #items > .item .pm-item-size { color: var(--muted); }
    #items > .item .pm-item-subtotal { color: var(--green); font-weight: 800; }

    #items > .item .pm-item-arrow {
      flex: 0 0 auto;
      color: var(--blue);
      font-size: 20px;
      line-height: 1;
    }

    #items > .item .pm-item-details[hidden] {
      display: none !important;
    }

    #items > .item .itemhead {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
    }

    #items > .item .itemhead > .blue {
      flex: 0 0 auto;
      white-space: nowrap;
    }

    #items > .item .itemhead > .btn {
      flex: 0 0 auto;
      margin-left: 0;
    }

    @media (max-width: 700px) {
      #items > .item .itemhead {
        flex-wrap: wrap;
      }

      #items > .item .pm-item-summary {
        order: 2;
        flex-basis: 100%;
        width: 100%;
        padding: 6px 0 2px;
      }

      #items > .item .itemhead > .btn {
        order: 1;
        margin-left: auto;
      }

      #items > .item .pm-item-summary-line {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 4px 10px;
      }

      #items > .item .pm-item-code { grid-column: 1; grid-row: 1; }
      #items > .item .pm-item-name { grid-column: 1 / -1; grid-row: 2; }
      #items > .item .pm-item-price { grid-column: 1; grid-row: 3; }
      #items > .item .pm-item-size { grid-column: 2; grid-row: 3; text-align: right; }
      #items > .item .pm-item-subtotal { grid-column: 1 / -1; grid-row: 4; }

      #items > .item .pm-item-arrow {
        position: absolute;
        right: 16px;
        bottom: 16px;
      }
    }
  `;
  document.head.appendChild(style);

  // Also enhance after navigation/rendering, because quotationPage may call
  // drawItems before this observer sees the new #items element.
  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(document.body, { childList: true, subtree: true });

  requestAnimationFrame(enhance);
})();
