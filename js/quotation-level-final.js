/* Priangan Multimedia — Final LED Level controller
 * Level is configured directly inside the current LED card.
 * The checkbox is the only switch: checked = use Level.
 * No Level dropdown is required for the calculation.
 * Level charge = LED width × Level price × LED set; no day multiplier.
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
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const isLEDCard=card=>!!card?.querySelector('.pm-led-set-field');

  function populate(card,item){
    const box=card?.querySelector('.pm-led-level-box');
    if(!box||!item)return;
    const toggle=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const width=box.querySelector('.pm-led-level-width');
    const height=box.querySelector('.pm-led-level-height');
    const price=box.querySelector('.pm-led-level-price');
    const subtotal=box.querySelector('.pm-led-level-subtotal');

    if(toggle)toggle.checked=!!item.level_enabled;
    if(width)width.value=`${N(item.lebar)} m`;
    if(height)height.value=N(item.level_tinggi)||0;
    if(price)price.value=item.level_harga?String(N(item.level_harga)):'';

    const valid=!!item.level_enabled&&N(item.level_harga)>0;
    if(fields)fields.style.display=item.level_enabled?'grid':'none';
    if(total)total.style.display=valid?'flex':'none';
    if(subtotal)subtotal.textContent=money(N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1));
  }

  function ensureBox(card,item){
    if(!isLEDCard(card))return;
    let box=card.querySelector('.pm-led-level-box');
    if(!box){
      const dim=card.querySelector('.pm-item-body .dim');
      if(!dim)return;
      box=document.createElement('div');
      box.className='pm-led-level-box';
      box.innerHTML=`
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
      dim.insertAdjacentElement('afterend',box);

      box.querySelector('.pm-led-level-enabled')?.addEventListener('change',e=>{
        item.level_enabled=!!e.target.checked;
        if(!item.level_enabled){
          item.level_tinggi=0;
          item.level_harga=0;
          item.level_master_harga_id=null;
        }
        populate(card,item);
        if(typeof window.updateTotal==='function')window.updateTotal();
      });
      box.querySelector('.pm-led-level-height')?.addEventListener('input',e=>{
        item.level_tinggi=Math.max(0,N(e.target.value));
        populate(card,item);
        if(typeof window.updateTotal==='function')window.updateTotal();
      });
      box.querySelector('.pm-led-level-price')?.addEventListener('input',e=>{
        item.level_harga=Math.max(0,N(e.target.value));
        item.level_master_harga_id=item.level_master_harga_id??null;
        populate(card,item);
        if(typeof window.updateTotal==='function')window.updateTotal();
      });
    }
    populate(card,item);
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
  window.__PM_QUOTATION_LEVEL_API={hydrateAll,ensureBox,populate,wrapDraw};
})();