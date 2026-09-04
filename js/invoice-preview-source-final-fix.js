/* Priangan Multimedia — invoice preview source-of-truth FINAL
 * PreviewInvoice originally reads the quotation row total. The invoice editor,
 * however, can have invoice-only additions (e.g. Overtime). Before the original
 * preview renderer runs, copy the CURRENT editor total into its source row.
 * Payment remains sourced from pembayaran_penawaran through the existing module.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_PREVIEW_SOURCE_FINAL)return;
  window.__PM_INVOICE_PREVIEW_SOURCE_FINAL=true;

  function N(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim().replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }

  function install(){
    if(typeof window.previewInvoice!=='function') return false;
    if(window.previewInvoice.__pmSourceFinalWrapped) return true;
    const original=window.previewInvoice;
    const wrapped=async function(){
      try{
        const row=window.__PM_INVOICE_ADD_STATE?.row || window.currentInvoice?.row;
        const totalEl=document.getElementById('invTotal');
        const paidEl=document.getElementById('invPaid');
        const currentTotal=N(totalEl?.textContent || totalEl?.value);
        const currentPaid=N(paidEl?.textContent || paidEl?.value);

        // The editor total is the authoritative invoice total. This includes
        // invoice-only rows such as Overtime that are not in the quotation.
        if(row && currentTotal>0){
          row.grand_total=currentTotal;
          row.total=currentTotal;
          row.total_dibayar=currentPaid;
          row.sisa_pembayaran=Math.max(0,currentTotal-currentPaid);
        }

        // Keep the module's active state in sync as well.
        if(window.__PM_INVOICE_ADD_STATE?.row && currentTotal>0){
          window.__PM_INVOICE_ADD_STATE.row.grand_total=currentTotal;
          window.__PM_INVOICE_ADD_STATE.row.total=currentTotal;
          window.__PM_INVOICE_ADD_STATE.row.total_dibayar=currentPaid;
          window.__PM_INVOICE_ADD_STATE.row.sisa_pembayaran=Math.max(0,currentTotal-currentPaid);
        }
      }catch(e){console.warn('[PM] invoice preview source fix',e)}
      return original.apply(this,arguments);
    };
    wrapped.__pmSourceFinalWrapped=true;
    window.previewInvoice=wrapped;
    return true;
  }

  if(!install()){
    [50,150,300,600,1000,2000].forEach(ms=>setTimeout(install,ms));
    const mo=new MutationObserver(install);
    mo.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>mo.disconnect(),5000);
  }
})();
