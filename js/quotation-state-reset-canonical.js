/* Priangan Multimedia — reset transient quotation discount state on new quote. */
(function(){
'use strict';
if(window.__PM_QUOTATION_STATE_RESET_CANONICAL)return;
window.__PM_QUOTATION_STATE_RESET_CANONICAL=true;
function reset(){window.__PM_DISC_MODE='rp';window.__pmDiscountBase=0;window.__pmDiscountValue=0;window.__pmDiscountPct=0;window.__pmNetTotal=0;window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null}
document.addEventListener('click',e=>{const t=e.target?.closest?.('button,a,[data-p]');if(!t)return;const p=String(t.getAttribute('data-p')||'').toLowerCase(),o=String(t.getAttribute('onclick')||'').toLowerCase();if(p==='quotation'||/go\s*\(\s*['"]quotation['"]\s*\)/.test(o))reset()},true);
})();