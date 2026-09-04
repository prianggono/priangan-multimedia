/* Priangan Multimedia — AUTHORITATIVE invoice preview totals
 * The Invoice Editor is the source of truth for invoice total and payments.
 * This fixes the preview renderer that still uses the original quotation total.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_AUTHORITATIVE_FINAL)return;
  window.__PM_INVOICE_AUTHORITATIVE_FINAL=true;

  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function editor(){
    const total=N(document.getElementById('invTotal')?.textContent||document.getElementById('invTotal')?.value);
    const paid=N(document.getElementById('invPaid')?.textContent||document.getElementById('invPaid')?.value);
    return {total,paid,balance:Math.max(0,total-paid)};
  }

  function patch(root){
    if(!root)return;
    const {total,paid,balance}=editor();
    if(!total)return;

    const totalCell=root.querySelector('.pm-inv-total td:last-child');
    if(totalCell) totalCell.textContent=M(total);

    const boxes=[...root.querySelectorAll('.pm-inv-paybox')];
    if(boxes[0]){
      const rows=[...boxes[0].querySelectorAll('.pm-inv-payrow')];
      for(const r of rows){
        const label=String(r.firstElementChild?.textContent||'').trim().toLowerCase();
        const value=r.lastElementChild;
        if(!value)continue;
        if(label==='total')value.textContent=M(total);
        else if(label==='sudah dibayar'||label==='downpayment'||label==='down payment')value.textContent=M(paid);
        else if(label==='sisa tagihan')value.textContent=M(balance);
      }
    }

    // Fallback: locate labels anywhere in the preview.
    [...root.querySelectorAll('*')].forEach(el=>{
      if(el.children.length) return;
      const label=String(el.textContent||'').trim().toLowerCase();
      let value=null;
      if(label==='total invoice'||label==='grand total')value=total;
      else if(label==='downpayment'||label==='down payment'||label==='sudah dibayar')value=paid;
      else if(label==='sisa tagihan')value=balance;
      if(value===null)return;
      const p=el.parentElement;if(!p)return;
      const leaves=[...p.children].filter(x=>x!==el && x.children.length===0);
      if(leaves.length)leaves[leaves.length-1].textContent=M(value);
    });
  }

  function installAppendHook(){
    const body=document.body;
    if(!body||body.__pmInvoiceAppendHook)return;
    body.__pmInvoiceAppendHook=true;
    const native=body.appendChild.bind(body);
    body.appendChild=function(node){
      if(node && node.id==='pmInvoicePreview'){
        // Patch after invoice.js has generated the complete preview HTML,
        // but before the preview becomes visible to the user.
        setTimeout(()=>patch(node),0);
        setTimeout(()=>patch(node),25);
        setTimeout(()=>patch(node),100);
        setTimeout(()=>patch(node),300);
        setTimeout(()=>patch(node),800);
      }
      return native(node);
    };
  }

  function installPreviewWrapper(){
    if(typeof window.previewInvoice!=='function')return false;
    if(window.previewInvoice.__pmAuthoritative)return true;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      const root=document.getElementById('pmInvoicePreview');
      [0,25,100,300,800,1500,2500].forEach(ms=>setTimeout(()=>patch(root),ms));
      return result;
    };
    wrapped.__pmAuthoritative=true;
    window.previewInvoice=wrapped;
    return true;
  }

  installAppendHook();
  if(!installPreviewWrapper()){
    const mo=new MutationObserver(()=>{
      installAppendHook();
      if(installPreviewWrapper())mo.disconnect();
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
    [50,150,300,600,1000,2000].forEach(ms=>setTimeout(installPreviewWrapper,ms));
    setTimeout(()=>mo.disconnect(),5000);
  }
})();
