/* Priangan Multimedia — quotation discount edit repair.
 * A saved quotation must reopen with the same discount percentage and amount.
 * If legacy layers leave % at 0 while a non-zero Rupiah discount is present,
 * reconstruct the integer percentage from the quotation base.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_EDIT_REPAIR_FINAL)return;
window.__PM_QUOTATION_DISCOUNT_EDIT_REPAIR_FINAL=true;
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v)||0)));
function textMoney(v){return N(v)}
function repair(){
 const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc'),t=document.querySelector('#total');
 if(!p||!r)return;
 if(document.activeElement===p)return;
 const rp=textMoney(r.value), shown=textMoney(t?.textContent);
 let base=Math.max(0,N(window.__pmDiscountBase));
 if(!base && shown>0)base=shown;
 /* In the broken edit state Total still shows the pre-discount base while Rp
    contains the saved discount. In that case Total is already the base. */
 if(base>0 && rp>0){
   const pct=Math.max(0,Math.min(100,Math.round(rp/base*100)));
   const current=S(p.value);
   if(!/^\d{1,3}$/.test(current)||Number(current)===0){
     p.value=String(pct);
     window.__PM_DISC_MODE='pct';
     window.__pmDiscountBase=base;
     window.__pmDiscountValue=Math.round(base*pct/100);
     window.__pmDiscountPct=pct;
     window.__pmNetTotal=Math.max(0,base-window.__pmDiscountValue);
     const g=document.querySelector('#pmGrand');
     const net=window.__pmNetTotal;
     if(g)g.textContent=M(net);
     if(t)t.textContent=M(net);
   }
 }
}
function boot(){repair()}
const mo=new MutationObserver(boot);mo.observe(document.body,{childList:true,subtree:true});
[50,150,300,500,800,1200,2000,3000].forEach(ms=>setTimeout(boot,ms));
})();
