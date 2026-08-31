/* Priangan Multimedia — Master Harga satuan is the source of truth for quotation billing.
 * IMPORTANT: this patch does not alter existing non-unit rules. It only forces Qty
 * when the selected Master Harga explicitly has satuan = unit/unit(s).
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim().toLowerCase();
  const isUnit=v=>['unit','units','buah','pcs','pc','set'].includes(S(v));

  function applyUnitRule(card){
    if(!card) return;
    const select=card.querySelector('select');
    if(!select) return;
    const code=select.value;
    if(!code) return;

    const master=(window.masters||[]).find(m=>String(m.kode)===String(code));
    if(!master || !isUnit(master.satuan)) return;

    const fields=[...card.querySelectorAll('.field')];
    const typeField=fields.find(f=>/tipe perhitungan/i.test(S(f.querySelector('label')?.textContent)));
    const type=typeField?.querySelector('select,input');
    if(type && S(type.value)!=='qty'){
      type.value='qty';
      type.dispatchEvent(new Event('input',{bubbles:true}));
      type.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function scan(){document.querySelectorAll('#items .item').forEach(applyUnitRule);}

  function patchPick(){
    if(typeof window.pick!=='function' || window.__PM_MASTER_SATUAN_PICK_PATCH) return;
    const original=window.pick;
    window.pick=function(){
      const result=original.apply(this,arguments);
      setTimeout(scan,0);
      return result;
    };
    window.__PM_MASTER_SATUAN_PICK_PATCH=true;
  }

  patchPick();
  document.addEventListener('change',e=>{
    if(e.target.matches('#items .item select')) setTimeout(()=>applyUnitRule(e.target.closest('.item')),0);
  },true);
  const observer=new MutationObserver(()=>{patchPick();scan();});
  observer.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
  scan();
})();