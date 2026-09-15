/* Priangan Multimedia — LED Level visibility bridge.
 * One purpose: when Gunakan Level is checked, show the Level selector.
 * Hydrates Level options after Master Harga is available.
 * No DOM-wide MutationObserver: quotation UI owns redraws.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_VISIBILITY_CANONICAL__)return;
  window.__PM_LEVEL_VISIBILITY_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const isLevelMaster=m=>{if(!m)return false;const t=`${S(m.item)} ${S(m.kategori)} ${S(m.kode)}`.toLowerCase();return /level/.test(t)&&!/led\s*tv|televisi/.test(t);};

  function hydrateOptions(select){
    if(!select)return;
    const levelMasters=masters().filter(isLevelMaster);
    if(!levelMasters.length)return;
    const selected=S(select.value);
    const wanted=`<option value="">Tanpa Level</option>`+levelMasters.map(m=>`<option value="${E(m.id)}">[${E(m.kode)}] ${E(m.item)}</option>`).join('');
    const currentCount=select.options.length;
    const expectedCount=levelMasters.length+1;
    if(currentCount===expectedCount){
      const allPresent=levelMasters.every(m=>[...select.options].some(o=>String(o.value)===String(m.id)));
      if(allPresent)return;
    }
    select.innerHTML=wanted;
    if([...select.options].some(o=>String(o.value)===selected))select.value=selected;
  }

  function sync(box){
    if(!box)return;
    const toggle=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const select=box.querySelector('.pm-led-level-master');
    hydrateOptions(select);
    const on=!!toggle?.checked;
    if(fields)fields.style.display=on?'grid':'none';
    if(total)total.style.display=on&&!!select?.value?'flex':'none';
  }

  const syncAll=()=>document.querySelectorAll('#items > .item .pm-led-level-box').forEach(sync);
  document.addEventListener('change',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-enabled,.pm-led-level-master'))requestAnimationFrame(()=>sync(box));
  },true);
  document.addEventListener('input',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-height,.pm-led-level-price'))requestAnimationFrame(()=>sync(box));
  },true);
  [100,300,700,1200,1800].forEach(ms=>setTimeout(syncAll,ms));
  window.addEventListener('load',syncAll);
})();