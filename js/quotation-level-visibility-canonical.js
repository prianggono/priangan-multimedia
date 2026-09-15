/* Priangan Multimedia — LED Level UI bridge
 * Keeps Level selector visible and populated.
 * Level options are hidden only from Product/Jasa, never from Jenis Level.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_VISIBILITY_CANONICAL__)return;
  window.__PM_LEVEL_VISIBILITY_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const isLevelMaster=m=>{if(!m)return false;const t=`${S(m.item)} ${S(m.kategori)} ${S(m.kode)}`.toLowerCase();return /level/.test(t)&&!/led\s*tv|televisi/.test(t)&&m.aktif!==false;};

  function hydrateLevelOptions(select){
    if(!select)return;
    const levelMasters=masters().filter(isLevelMaster);
    if(!levelMasters.length)return;
    const selected=S(select.value);
    const existing=new Set([...select.options].map(o=>S(o.value)));
    levelMasters.forEach(m=>{
      const id=S(m.id);
      if(existing.has(id))return;
      const o=document.createElement('option');
      o.value=id;
      o.textContent=`[${S(m.kode)}] ${S(m.item)}`;
      select.appendChild(o);
    });
    if([...select.options].some(o=>S(o.value)===selected))select.value=selected;
    [...select.options].forEach(o=>o.hidden=false);
  }

  function syncProductSelect(select){
    if(!select||select.matches('.pm-led-level-master'))return;
    [...select.options].forEach(o=>{
      const m=masters().find(x=>S(x.kode)===S(o.value));
      if(isLevelMaster(m))o.hidden=true;
    });
  }

  function syncBox(box){
    if(!box)return;
    const toggle=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const select=box.querySelector('.pm-led-level-master');
    hydrateLevelOptions(select);
    const on=!!toggle?.checked;
    if(fields)fields.style.display=on?'grid':'none';
    if(total)total.style.display=on&&!!S(select?.value)?'flex':'none';
  }

  function syncAll(){
    const root=document.querySelector('#items');
    if(!root)return;
    root.querySelectorAll(':scope > .item select').forEach(syncProductSelect);
    root.querySelectorAll(':scope > .item .pm-led-level-box').forEach(syncBox);
  }

  document.addEventListener('change',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-enabled,.pm-led-level-master'))syncBox(box);
  },true);
  document.addEventListener('input',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-height,.pm-led-level-price'))syncBox(box);
  },true);

  [0,250,750,1500].forEach(ms=>setTimeout(syncAll,ms));
  window.addEventListener('load',syncAll);
  window.__PM_LEVEL_VISIBILITY_API={syncAll,syncBox,hydrateLevelOptions};
})();