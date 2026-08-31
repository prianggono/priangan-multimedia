/* Priangan Multimedia — TV is always billed by unit/qty.
 * TV size (43/50/55/65/75 inch, etc.) is a product specification,
 * not an area measurement. This patch only affects TV/LED TV items.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const isTV=text=>/\b(?:LED\s*)?TV\b|\bTV[-_ ]?\d{2,3}\b/i.test(S(text));
function forceTVQty(card){
 if(!card)return false;
 const sel=card.querySelector('select');
 const opt=sel?.selectedOptions?.[0];
 const text=[sel?.value,opt?.textContent,...card.querySelectorAll('input')].map(x=>typeof x==='string'?x:x?.value||'').join(' ');
 if(!isTV(text))return false;
 const field=[...card.querySelectorAll('.field')].find(f=>/tipe perhitungan/i.test(S(f.querySelector('label')?.textContent)));
 const type=field?.querySelector('select,input');
 if(!type)return false;
 type.value='qty';
 type.dispatchEvent(new Event('input',{bubbles:true}));
 type.dispatchEvent(new Event('change',{bubbles:true}));
 /* TV does not need LED dimensions for calculation. Keep the existing fields,
    but make the billing basis explicitly Qty/unit. */
 const labels=[...card.querySelectorAll('.field label')];
 labels.forEach(l=>{if(/lebar videotron|tinggi videotron|lebar level|tinggi level/i.test(S(l.textContent))){const f=l.closest('.field');if(f)f.dataset.pmTvDimension='ignored';}});
 return true;
}
function scan(){document.querySelectorAll('#items .item').forEach(forceTVQty)}
const originalPick=window.pick;
if(typeof originalPick==='function'&&!window.__PM_TV_PICK_PATCH){
 window.pick=function(id,code){const r=originalPick.apply(this,arguments);setTimeout(()=>{const card=document.querySelector(`#items .item button[onclick^="removeItem(${id}")]`)?.closest('.item');forceTVQty(card);scan()},0);return r};
 window.__PM_TV_PICK_PATCH=true;
}
document.addEventListener('change',e=>{if(e.target.matches('#items .item select'))setTimeout(()=>forceTVQty(e.target.closest('.item')),0)},true);
const observer=new MutationObserver(()=>scan());
observer.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
scan();
/* Invoice add-item form: TV master selection always switches the calculation to Qty. */
document.addEventListener('change',e=>{
 if(e.target.id!=='pmxMaster')return;
 const o=e.target.selectedOptions?.[0],text=o?.textContent||e.target.value;
 if(!isTV(text))return;
 const type=document.getElementById('pmxType');
 if(type){type.value='qty';type.dispatchEvent(new Event('input',{bubbles:true}));type.dispatchEvent(new Event('change',{bubbles:true}));}
},true);
})();