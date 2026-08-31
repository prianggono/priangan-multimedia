/* Priangan Multimedia — safe Master Harga unit rule.
 * Does NOT replace pick(), does NOT access window.items, and does NOT add another calculation system.
 * It only corrects an already-rendered quotation item when Master Harga says satuan=unit/pcs/buah/set.
 */
(function(){
  'use strict';
  const norm=v=>String(v??'').trim().toLowerCase();
  const unit=v=>['unit','units','pcs','pc','buah','set'].includes(norm(v));
  const cache=new Map();
  const db=()=>window.db||window.__PRIANGAN_QUOTE_DB||null;
  async function master(code){
    code=String(code||'').trim(); if(!code)return null;
    if(cache.has(code))return cache.get(code);
    const local=Array.isArray(window.masters)?window.masters.find(m=>norm(m?.kode)===norm(code)):null;
    if(local){cache.set(code,local);return local;}
    const d=db(); if(!d)return null;
    try{const r=await d.from('master_harga').select('kode,satuan,harga_jual,item').eq('kode',code).maybeSingle();if(!r.error&&r.data){cache.set(code,r.data);return r.data;}}catch(e){console.warn('[PM] master unit lookup failed',e)}
    return null;
  }
  async function fix(card){
    if(!card)return;
    const select=card.querySelector('select');
    const code=select?.value;
    if(!code)return;
    const m=await master(code);
    if(!unit(m?.satuan))return;
    const field=[...card.querySelectorAll('.field')].find(x=>norm(x.querySelector('label')?.textContent).includes('tipe perhitungan'));
    const input=field?.querySelector('select,input');
    if(!input||norm(input.value)==='qty')return;
    input.value='qty';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function scan(){document.querySelectorAll('#items .item').forEach(fix);}
  document.addEventListener('change',e=>{if(e.target.closest?.('#items .item select'))fix(e.target.closest('#items .item'));},true);
  const observer=new MutationObserver(()=>{if(document.getElementById('items'))scan();});
  observer.observe(document.body,{childList:true,subtree:true});
  window.__PM_SAFE_MASTER_UNIT_RULE=true;
  setTimeout(scan,250);setTimeout(scan,800);setTimeout(scan,1500);
})();