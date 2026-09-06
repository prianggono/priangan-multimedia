/* Priangan Multimedia — discount percentage canonical normalization.
 * Percentage is INTEGER ONLY: 0–100. No decimal percentages.
 * Never rewrite the active field on every keystroke; this prevents 10 becoming 100.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V2)return;
window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V2=true;
const S=v=>String(v??'').trim();
const N=v=>{const n=Number(S(v).replace(/[^0-9-]/g,''));return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(Number(v)||0)));
function setup(){
 const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
 if(!p||!r)return;
 p.type='number';p.inputMode='numeric';p.step='1';p.min='0';p.max='100';
 if(p.dataset.pmIntegerDiscount)return;
 p.dataset.pmIntegerDiscount='1';
 const clamp=()=>Math.max(0,Math.min(100,Math.trunc(N(p.value))));
 const apply=()=>{
   const base=Math.max(0,Number(window.__pmDiscountBase)||0),x=clamp(),d=Math.round(base*x/100);
   p.value=String(x);r.value=M(d);
   window.__PM_DISC_MODE='pct';window.__pmDiscountPct=x;window.__pmDiscountValue=d;window.__pmNetTotal=Math.max(0,base-d);
   const t=document.querySelector('#total'),g=document.querySelector('#pmGrand');
   if(t)t.textContent=M(window.__pmNetTotal);if(g)g.textContent=M(window.__pmNetTotal);
 };
 p.addEventListener('input',()=>{
   const raw=p.value.replace(/[^0-9]/g,'');
   if(p.value!==raw)p.value=raw;
   window.__PM_DISC_MODE='pct';
 });
 p.addEventListener('blur',apply);
}
const mo=new MutationObserver(setup);mo.observe(document.body,{childList:true,subtree:true});
[0,100,300,700,1200].forEach(ms=>setTimeout(setup,ms));
})();
