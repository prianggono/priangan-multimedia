/* Priangan Multimedia — LED Level UI behavior fix
 * Checkbox ON must reveal the optional Level selector immediately.
 * No cost is added until a Level master is actually selected.
 * Scoped observer only watches direct quotation item replacements.
 */
(function(){
  'use strict';
  if(window.__PM_LED_LEVEL_UI_FIX__)return;
  window.__PM_LED_LEVEL_UI_FIX__=true;
  const S=v=>String(v??'').trim();
  const items=()=>Array.isArray(window.items)?window.items:[];
  const fixCard=(card)=>{
    const id=card?.dataset?.itemId;
    const item=items().find(x=>String(x.id)===String(id));
    const box=card?.querySelector?.('.pm-led-level-box');
    const toggle=box?.querySelector?.('.pm-led-level-enabled');
    const fields=box?.querySelector?.('.pm-led-level-fields');
    const total=box?.querySelector?.('.pm-led-level-total');
    if(!box||!toggle)return;
    if(toggle.checked){
      if(item)item.level_enabled=true;
      if(fields)fields.style.display='grid';
      if(total)total.style.display='flex';
    }else{
      if(item && !item.level_master_harga_id)item.level_enabled=false;
      if(fields)fields.style.display='none';
      if(total)total.style.display='none';
    }
  };
  const fixAll=()=>document.querySelectorAll('#items > .item').forEach(fixCard);
  const schedule=()=>requestAnimationFrame(()=>requestAnimationFrame(fixAll));
  document.addEventListener('change',e=>{
    if(!e.target?.closest?.('#items'))return;
    schedule();
  },true);
  let observed=null;
  const attach=()=>{
    const c=document.querySelector('#items');
    if(!c||observed===c)return;
    if(observed)observed.disconnect();
    observed=new MutationObserver(()=>schedule());
    observed.observe(c,{childList:true,subtree:false});
    schedule();
  };
  [0,150,400,800,1500].forEach(ms=>setTimeout(attach,ms));
  window.addEventListener('load',()=>{attach();schedule();});
  const st=document.createElement('style');st.id='pmLedLevelUiFixStyles';st.textContent='#content #items .pm-led-level-box .pm-led-level-enabled:checked ~ .pm-led-level-fields{display:grid!important}#content #items .pm-led-level-box .pm-led-level-enabled:checked ~ .pm-led-level-total{display:flex!important}';document.head.appendChild(st);
  window.__PM_LED_LEVEL_UI_FIX_API={fixAll,attach};
})();
