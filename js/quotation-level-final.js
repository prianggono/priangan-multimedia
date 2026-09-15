/* Priangan Multimedia — Final LED Level controller
 * One owner for Level UI on LED items.
 * Level is configured directly in the LED card; no Level dropdown is used.
 * Checkbox ON = use Level. Level charge = LED width × Level price × Set.
 * Level is not multiplied by rental days.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_LEVEL_FINAL__)return;
  window.__PM_QUOTATION_LEVEL_FINAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const items=()=>Array.isArray(window.items)?window.items:[];
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));
  const isLEDCard=card=>!!card?.querySelector('.pm-led-set-field');

  function refreshQuotationTotals(card){
    /* Reuse canonical discount handler so this controller does not duplicate
       quotation-wide subtotal logic. */
    const pct=card?.querySelector('.pm-item-discount-pct');
    if(pct){pct.dispatchEvent(new Event('input',{bubbles:true}));return;}
    if(typeof window.drawItems==='function'){
      clearTimeout(window.__PM_LEVEL_REDRAW_TIMER);
      window.__PM_LEVEL_REDRAW_TIMER=setTimeout(()=>window.drawItems(),180);
    }
  }

  function directBoxMarkup(item){
    return `
      <div class="pm-led-level-head">
        <label class="pm-led-level-toggle">
          <input type="checkbox" class="pm-led-level-enabled" ${item.level_enabled?'checked':''}>
          <span>Gunakan Level</span>
        </label>
        <span class="pm-led-level-note">Opsional</span>
      </div>
      <div class="pm-led-level-fields" style="display:${item.level_enabled?'grid':'none'}">
        <div class="field">
          <label>Lebar Level</label>
          <input class="pm-led-level-width" value="${N(item.lebar)} m" readonly>
        </div>
        <div class="field">
          <label>Tinggi Level (m)</label>
          <input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(item.level_tinggi)||0}">
        </div>
        <div class="field">
          <label>Harga Level / m</label>
          <input class="pm-led-level-price" type="number" min="0" step="1" value="${N(item.level_harga)||''}" placeholder="Masukkan harga">
        </div>
      </div>
      <div class="pm-led-level-total" style="display:${item.level_enabled&&N(item.level_harga)>0?'flex':'none'}">
        <span>Subtotal Level</span>
        <b class="pm-led-level-subtotal">Rp 0</b>
      </div>`;
  }

  function bindBox(card,item,box){
    if(!box||box.dataset.pmDirectBound==='1')return;
    box.dataset.pmDirectBound='1';
    box.querySelector('.pm-led-level-enabled')?.addEventListener('change',e=>{
      item.level_enabled=!!e.target.checked;
      if(!item.level_enabled){
        item.level_tinggi=0;
        item.level_harga=0;
        item.level_master_harga_id=null;
      }
      renderBox(card,item);
      refreshQuotationTotals(card);
    });
    box.querySelector('.pm-led-level-height')?.addEventListener('input',e=>{
      item.level_tinggi=Math.max(0,N(e.target.value));
      renderBox(card,item,{preserveFocus:true});
      refreshQuotationTotals(card);
    });
    box.querySelector('.pm-led-level-price')?.addEventListener('input',e=>{
      item.level_harga=Math.max(0,N(e.target.value));
      renderBox(card,item,{preserveFocus:true});
      refreshQuotationTotals(card,item);
    });
  }

  function renderBox(card,item,opts={}){
    const box=card?.querySelector('.pm-led-level-box');
    if(!box||!item)return;
    const active=document.activeElement;
    const activeClass=active?.className||'';
    const enabled=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const width=box.querySelector('.pm-led-level-width');
    const height=box.querySelector('.pm-led-level-height');
    const price=box.querySelector('.pm-led-level-price');
    const subtotal=box.querySelector('.pm-led-level-subtotal');
    if(enabled)enabled.checked=!!item.level_enabled;
    if(width)width.value=`${N(item.lebar)} m`;
    if(height&&(!opts.preserveFocus||active!==height))height.value=N(item.level_tinggi)||0;
    if(price&&(!opts.preserveFocus||active!==price))price.value=item.level_harga?String(N(item.level_harga)):'';
    const valid=!!item.level_enabled&&N(item.level_harga)>0;
    if(fields)fields.style.display=item.level_enabled?'grid':'none';
    if(total)total.style.display=valid?'flex':'none';
    if(subtotal)subtotal.textContent=money(N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1));
    if(opts.preserveFocus&&active?.className===activeClass){try{active.focus();}catch(_){} }
  }

  function ensureBox(card,item){
    if(!isLEDCard(card))return;
    let box=card.querySelector('.pm-led-level-box');
    if(box&&!box.querySelector('.pm-led-level-height')){
      /* Replace legacy dropdown-based Level markup completely. */
      box.innerHTML=directBoxMarkup(item);
      box.dataset.pmDirectBound='';
    }
    if(!box){
      const dim=card.querySelector('.pm-item-body .dim');
      if(!dim)return;
      box=document.createElement('div');
      box.className='pm-led-level-box';
      box.innerHTML=directBoxMarkup(item);
      dim.insertAdjacentElement('afterend',box);
    }
    bindBox(card,item,box);
    renderBox(card,item);
  }

  function hideOnlyProductLevelOptions(){
    document.querySelectorAll('#items > .item > .pm-item-body select, #items > .item select.pm-product-select').forEach(select=>{
      [...select.options].forEach(o=>{
        const text=S(o.textContent).toLowerCase();
        const value=S(o.value).toLowerCase();
        if(/\blevel\b/.test(text)||/\bled-lvl-/.test(value))o.hidden=true;
      });
    });
  }

  function hydrateAll(){
    const container=document.querySelector('#items');
    if(!container)return;
    hideOnlyProductLevelOptions();
    container.querySelectorAll(':scope > .item').forEach(card=>{
      const item=cardItem(card);
      if(item)ensureBox(card,item);
    });
  }

  function wrapDraw(){
    const fn=window.drawItems;
    if(typeof fn!=='function'||fn.__pmLevelFinal)return false;
    const wrapped=function(){
      const r=fn.apply(this,arguments);
      requestAnimationFrame(hydrateAll);
      return r;
    };
    wrapped.__pmLevelFinal=true;
    window.drawItems=wrapped;
    return true;
  }

  hydrateAll();
  wrapDraw();
  window.addEventListener('load',()=>{hydrateAll();wrapDraw();});
  window.__PM_QUOTATION_LEVEL_API={hydrateAll,ensureBox,renderBox,wrapDraw};
})();