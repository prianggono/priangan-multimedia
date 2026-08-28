/* Priangan Multimedia - Compact quotation item editor
 * Each quotation item is one vertical column on all screen sizes.
 * Item body can be collapsed to a compact summary without losing values.
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

      const selected = item.item || 'Belum memilih produk / jasa';
      const summary = document.createElement('button');
      summary.type = 'button';
      summary.className = 'item-collapse-toggle';
      summary.setAttribute('aria-expanded', 'true');
      summary.innerHTML = `<span class="item-collapse-text"><b>${esc(selected)}</b><small>${esc(item.kode || 'Belum dipilih')} · ${money(item.harga || 0)}</small></span><span class="item-chevron">⌃</span>`;
      head.insertBefore(summary, head.querySelector('.btn'));

      const setCollapsed = (collapsed) => {
        openState.set(key, !collapsed);
        body.hidden = collapsed;
        summary.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        summary.querySelector('.item-chevron').textContent = collapsed ? '⌄' : '⌃';
        card.classList.toggle('is-collapsed', collapsed);
      };

      summary.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCollapsed(!openState.get(key));
      });

      // Newly added/selected items stay open. Existing items may retain state.
      setCollapsed(openState.has(key) ? !openState.get(key) : false);
    });
  }

  window.drawItems = function () {
    originalDrawItems.apply(this, arguments);
    requestAnimationFrame(enhance);
  };

  // Force the quotation editor itself to one column, including the two-field
  // dimension and schedule groups. This keeps mobile and desktop consistent.
  const style = document.createElement('style');
  style.id = 'quotation-item-compact-style';
  style.textContent = `
    #items .item { position: relative; }
    #items .item > .grid.g2,
    #items .item .dim,
    #items .item .sched > .grid.g2 {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    #items .itemhead { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    #items .itemhead .item-collapse-toggle { order:2; flex:1 1 220px; min-width:0; text-align:left; border:0; background:transparent; color:inherit; padding:4px 0; cursor:pointer; }
    #items .itemhead .btn { order:3; margin-left:auto; }
    #items .item-collapse-text { display:flex; flex-direction:column; gap:3px; min-width:0; }
    #items .item-collapse-text b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    #items .item-collapse-text small { color:var(--muted); font-size:12px; }
    #items .item-chevron { float:right; font-size:18px; color:var(--blue); margin-left:8px; }
    #items .item-body-compact[hidden] { display:none !important; }
    #items .item.is-collapsed { padding-bottom:12px; }
    @media (max-width:600px) {
      #items .itemhead .item-collapse-toggle { flex-basis:calc(100% - 70px); }
      #items .itemhead .btn { flex:0 0 auto; }
      #items .item .field input,
      #items .item .field select { width:100%; box-sizing:border-box; }
    }
  `;
  document.head.appendChild(style);

  // Re-enhance after Edit/route changes even if drawItems was invoked before
  // this fix attached.
  document.addEventListener('click', () => requestAnimationFrame(enhance), true);
})();
