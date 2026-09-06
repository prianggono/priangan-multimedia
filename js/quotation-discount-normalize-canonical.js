/* Priangan Multimedia — discount percentage canonical normalization v4.
 * INTEGER ONLY: 0–100.
 * The percentage field is deliberately type=text so Backspace/Delete and typing
 * behave like a normal numeric text field. Capture-phase handlers prevent older
 * quotation listeners from rewriting the field while the user is typing.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V4)return;
window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V4=true;
const S=v=>String(v??'').trim();
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(Number(v)||0)));
function currentPct(){return Math.max(0,Math.min(100,Math.trunc(Number(window.__pmDiscountPct)||0)))}
function repairValue(p){
  if(document.activeElement===p)return;
  const raw=S(p.value);
  if(!/^\d{1,3}$/.test(raw)||Number(raw)>100)p.value=String(currentPct());
}
function applyPct(p){
  const base=Math.max(0,Number(window.__pmDiscountBase)||0);
  const raw=S(p.value).replace(/[^0-9]/g,'');
  const x=raw===''?0:Math.max(0,Math.min(100,parseInt(raw,10)||0));
  const d=Math.round(base*x/100);
  window.__PM_DISC_MODE='pct';
  window.__pmDiscountPct=x;
  window.__pmDiscountValue=d;
  window.__pmNetTotal=Math.max(0,base-d);
  const r=document.querySelector('#pmDisc'),t=document.querySelector('#total'),g=document.querySelector('#pmGrand');
  if(r)r.value=M(d);
  if(t)t.textContent=M(window.__pmNetTotal);
  if(g)g.textContent=M(window.__pmNetTotal);
}
function setup(){
 const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
 if(!p||!r)return;
 p.type='text';p.inputMode='numeric';p.autocomplete='off';p.maxLength=3;
 p.setAttribute('pattern','[0-9]{0,3}');
 if(p.dataset.pmIntegerDiscount==='4'){repairValue(p);return}
 p.dataset.pmIntegerDiscount='4';
 repairValue(p);
 p.addEventListener('focus',()=>{
   const raw=S(p.value);
   if(raw==='0'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)p.value=String(currentPct()||'');
 },true);
 p.addEventListener('keydown',e=>{
   const allowed=['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab'];
   if(allowed.includes(e.key)||e.ctrlKey||e.metaKey)return;
   if(!/^[0-9]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 p.addEventListener('input',e=>{
   e.stopImmediatePropagation();
   const raw=S(p.value).replace(/[^0-9]/g,'').slice(0,3);
   p.value=raw;
   window.__PM_DISC_MODE='pct';
   if(raw!=='')applyPct(p);
 },true);
 p.addEventListener('change',e=>{e.stopImmediatePropagation();},true);
 p.addEventListener('blur',e=>{
   e.stopImmediatePropagation();
   const raw=S(p.value).replace(/[^0-9]/g,'');
   const x=raw===''?0:Math.max(0,Math.min(100,parseInt(raw,10)||0));
   p.value=String(x);
   applyPct(p);
 },true);
}
const mo=new MutationObserver(setup);mo.observe(document.body,{childList:true,subtree:true});
[0,100,300,700,1200].forEach(ms=>setTimeout(setup,ms));
})();
