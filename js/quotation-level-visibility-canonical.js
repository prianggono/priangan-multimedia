/* Priangan Multimedia — LED Level visibility bridge.
 * One purpose: when Gunakan Level is checked, always show the Level selector.
 * Selecting a Level remains optional; no selection = Rp0 and no Level charge.
 */
(function(){
  'use strict';
  if(window.__PM_LEVEL_VISIBILITY_CANONICAL__)return;
  window.__PM_LEVEL_VISIBILITY_CANONICAL__=true;
  const sync=box=>{
    if(!box)return;
    const toggle=box.querySelector('.pm-led-level-enabled');
    const fields=box.querySelector('.pm-led-level-fields');
    const total=box.querySelector('.pm-led-level-total');
    const on=!!toggle?.checked;
    if(fields)fields.style.display=on?'grid':'none';
    if(total)total.style.display=on&&!!box.querySelector('.pm-led-level-master')?.value?'flex':'none';
  };
  const syncAll=()=>document.querySelectorAll('#items > .item .pm-led-level-box').forEach(sync);
  document.addEventListener('change',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-enabled,.pm-led-level-master'))requestAnimationFrame(()=>sync(box));
  },true);
  document.addEventListener('input',e=>{
    const box=e.target?.closest?.('.pm-led-level-box');
    if(box&&e.target.matches('.pm-led-level-height,.pm-led-level-price'))requestAnimationFrame(()=>sync(box));
  },true);
  const root=document.querySelector('#content');
  if(root){const ob=new MutationObserver(()=>requestAnimationFrame(syncAll));ob.observe(root,{childList:true,subtree:true});}
  [0,100,300,700,1200].forEach(ms=>setTimeout(syncAll,ms));
  window.addEventListener('load',syncAll);
})();
