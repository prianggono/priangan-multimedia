/* Priangan Multimedia — final discount field normalization. */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL)return;
window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL=true;
const S=v=>String(v??'').trim(),N=v=>{const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0},M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
function normalize(){const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');if(!p||!r)return;const base=Math.max(0,N(window.__pmDiscountBase));if(!base)return;let x=Math.max(0,Math.min(100,N(p.value)));const d=Math.round(base*x/100);p.value=Number.isInteger(x)?String(x):String(Number(x.toFixed(2)));r.value=M(d);window.__pmDiscountPct=x;window.__pmDiscountValue=d;window.__pmNetTotal=Math.max(0,base-d);const t=document.querySelector('#total'),g=document.querySelector('#pmGrand');if(t)t.textContent=M(window.__pmNetTotal);if(g)g.textContent=M(window.__pmNetTotal)}
document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct')setTimeout(normalize,0)},true);
})();