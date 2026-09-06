/* Priangan Multimedia — discount percentage canonical normalization v6.
 * INTEGER ONLY: 0–100. No MutationObserver.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V6)return;
window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V6=true;
const S=v=>String(v??'').trim();
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(Number(v)||0)));
const currentPct=()=>Math.max(0,Math.min(100,Math.trunc(Number(window.__pmDiscountPct)||0)));
function normalizeLabels(){document.querySelectorAll('.pm-discount-row td,.pm-discount-label').forEach(el=>{const m=S(el.textContent).match(/^(DISKON\s*\()\s*(\d+(?:[.,]\d+)?)\s*(%\))$/i);if(!m)return;const p=Math.max(0,Math.min(100,Math.round(Number(String(m[2]).replace(',','.'))||0)));const next=m[1]+p+m[3];if(el.textContent!==next)el.textContent=next;});}
function apply(p){const base=Math.max(0,Number(window.__pmDiscountBase)||0),raw=S(p.value).replace(/[^0-9]/g,'').slice(0,3),pct=raw===''?0:Math.max(0,Math.min(100,parseInt(raw,10)||0)),d=Math.round(base*pct/100),net=Math.max(0,base-d);window.__PM_DISC_MODE='pct';window.__pmDiscountPct=pct;window.__pmDiscountValue=d;window.__pmNetTotal=net;const r=document.querySelector('#pmDisc'),t=document.querySelector('#total'),g=document.querySelector('#pmGrand');if(r)r.value=M(d);if(t)t.textContent=M(net);if(g)g.textContent=M(net);normalizeLabels();}
function setup(){const p=document.querySelector('#pmDiscPct');if(!p)return;p.type='text';p.inputMode='numeric';p.autocomplete='off';p.maxLength=3;p.setAttribute('pattern','[0-9]{0,3}');if(p.dataset.pmIntegerDiscount==='6')return;p.dataset.pmIntegerDiscount='6';p.addEventListener('focus',()=>{const raw=S(p.value);if(raw==='0'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)p.value=String(currentPct()||'');},true);p.addEventListener('keydown',e=>{const allowed=['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab'];if(allowed.includes(e.key)||e.ctrlKey||e.metaKey)return;if(!/^[0-9]$/.test(e.key)){e.preventDefault();e.stopImmediatePropagation();}},true);p.addEventListener('input',e=>{e.stopImmediatePropagation();p.value=S(p.value).replace(/[^0-9]/g,'').slice(0,3);if(p.value!=='')apply(p);},true);p.addEventListener('change',e=>e.stopImmediatePropagation(),true);p.addEventListener('blur',e=>{e.stopImmediatePropagation();const raw=S(p.value).replace(/[^0-9]/g,'');p.value=raw===''?'0':String(Math.max(0,Math.min(100,parseInt(raw,10)||0)));apply(p);},true);}
function run(){setup();normalizeLabels();}
run();[100,300,700,1200,2000].forEach(ms=>setTimeout(run,ms));document.addEventListener('click',e=>{if(e.target.closest('[data-p="quotation"]')||e.target.closest('.pm-print'))setTimeout(run,50);},true);
})();
