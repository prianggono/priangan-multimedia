/* Priangan Multimedia — Final LED Level controller
 * One owner for Level UI. Product selector hides Level masters; the Level
 * selector itself always shows all active Level masters.
 * Level is attached to the current LED item: width × saved/edited Level price × Set.
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
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const isLevel=m=>{if(!m)return false;const t=`${S(m.item)} ${S(m.kategori)} ${S(m.kode)}`.toLowerCase();return /level/.test(t)&&!/led\s*tv|televisi/.test(t);};
  const isLEDCard=card=>!!card?.querySelector('.pm-led-set-field');
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));

  function masterOptions(selected){
    const rows=masters().filter(m=>isLevel(m));
    return `<option value="">Tanpa Level</option>`+rows.map(m=>`<option value="${S(m.id)}">[${S(m.kode)}] ${S(m.item)}</option>`).join('');
  }

  function hydrateSelect(select,item){
    if(!select)return;
    const selected=S(item?.level_master_harga_id);
    const desired=masterOptions(selected);
    const existing=[...select.options].map(o=>String(o.value)).join('|');
    const next=[...select.options].filter(o=>isLevel(masters().find(m=>String(m.id)===String(o.value))));
    const expected=[...masters().filter(isLevel)].map(m=>String(m.id)).join('|');
    if(existing.replace(/^\|?/,'')===expected && select.options.length===masters().filter(isLevel).length+1)return;
    select.innerHTML=desired;
    if(selected && [...select.options].some(o=>String(o.value)===selected))select.value=selected;
  }

  function populate(card,item){
    const box=card?.querySelector('.pm-led-level-box');
    if(!box||!item)return;
    const toggle=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const select=box.querySelector('.pm-led-level-master');
    const width=box.querySelector('.pm-led-level-width');
    const height=box.querySelector('.pm-led-level-height');
    const price=box.querySelector('.pm-led-level-price');
    const subtotal=box.querySelector('.pm-led-level-subtotal');

    hydrateSelect(select,item);
    if(toggle)toggle.checked=!!item.level_enabled;
    if(width)width.value=`${N(item.lebar)} m`;
    if(height)height.value=N(item.level_tinggi)||0;
    if(price)price.value=item.level_harga?String(N(item.level_harga)):'';

    const valid=!!item.level_enabled&&!!select?.value&&N(item.level_harga)>0;
    if(fields)fields.style.display=item.level_enabled?'grid':'none';
    if(total)total.style.display=valid?'flex':'none';
    if(subtotal)subtotal.textContent=`Rp ${Math.round(N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1)).toLocaleString('id-ID')}`;
  }

  function productSelect(select){return !!select&&!select.classList.contains('pm-led-level-master');}
  function hideOnlyProductLevelOptions(){
    document.querySelectorAll('#items > .item select').forEach(select=>{
      if(!productSelect(select))return;
      [...select.options].forEach(o=>{
        const m=masters().find(x=>S(x.kode)===S(o.value));
        if(isLevel(m))o.hidden=true;
      });
    });
  }

  function hydrateAll(){
    const container=document.querySelector('#items');
    if(!container)return;
    hideOnlyProductLevelOptions();
    container.querySelectorAll(':scope > .item').forEach(card=>{
      const item=cardItem(card);
      if(item&&card.querySelector('.pm-led-level-box'))populate(card,item);
    });
  }

  function onLevelChange(e){
    const el=e.target;
    const box=el?.closest?.('.pm-led-level-box');
    if(!box)return;
    const card=el.closest('.item');
    const item=cardItem(card);
    if(!item)return;

    if(el.matches('.pm-led-level-enabled')){
      item.level_enabled=!!el.checked;
      if(!el.checked){item.level_master_harga_id=null;item.level_tinggi=0;item.level_harga=0;}
      populate(card,item);
      return;
    }

    if(el.matches('.pm-led-level-master')){
      const id=S(el.value);
      item.level_master_harga_id=id?Number(id):null;
      const lm=masters().find(m=>String(m.id)===id&&isLevel(m));
      if(lm){
        item.level_enabled=true;
        if(!(N(item.level_harga)>0))item.level_harga=N(lm.harga_jual);
      }else{
        item.level_enabled=false;
        item.level_harga=0;
      }
      if(typeof window.updateTotal==='function')window.updateTotal();
      populate(card,item);
      requestAnimationFrame(()=>{
        if(typeof window.drawItems==='function')window.drawItems();
      });
    }
  }

  document.addEventListener('change',onLevelChange,true);

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
  window.__PM_QUOTATION_LEVEL_API={hydrateAll,populate,wrapDraw};
})();