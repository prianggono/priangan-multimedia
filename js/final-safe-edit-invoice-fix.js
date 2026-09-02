/* Priangan Multimedia — FINAL SAFE PATCH
 * Keeps quotation edit/save protection and invoice state only.
 * Invoice action buttons are rendered by invoice-ui-final at the BOTTOM of the item card.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);

  function patchEdit(){
    if(typeof window.editQuotation!=='function'||window.__PM_SAFE_EDIT_PATCHED)return;
    const old=window.editQuotation;
    window.editQuotation=async function(id){
      window.__pmEditingQuotationId=String(id);
      window.__PM_EDIT_QUOTATION_ID=String(id);
      return old(id);
    };
    window.__PM_SAFE_EDIT_PATCHED=true;
  }

  function patchSave(){
    if(typeof window.__saveEditedQuotation!=='function'||window.__PM_SAFE_SAVE_PATCHED)return;
    const original=window.saveQuote;
    window.saveQuote=async function(){
      if(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID){
        window.__pmEditingQuotationId=String(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
        return window.__saveEditedQuotation();
      }
      return typeof original==='function'?original():toast('Fungsi simpan penawaran tidak tersedia.');
    };
    window.__PM_SAFE_SAVE_PATCHED=true;
    document.addEventListener('click',function(e){
      const b=e.target.closest?.('button[onclick="saveQuote()"]');
      if(!b||(!window.__pmEditingQuotationId&&!window.__PM_EDIT_QUOTATION_ID))return;
      e.preventDefault();e.stopImmediatePropagation();
      window.__pmEditingQuotationId=String(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
      window.__saveEditedQuotation();
    },true);
  }

  async function invoiceState(id){
    id=Number(id||0);if(!id)return null;
    const cur=window.__PM_INVOICE_ADD_STATE;
    if(cur?.id===id&&cur.row)return cur;
    let d=null;try{if(typeof db!=='undefined'&&db)d=db}catch(_){}
    if(!d)d=window.__PRIANGAN_QUOTE_DB||window.db||null;
    if(!d)return null;
    try{
      const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
      if(!r.error&&r.data){
        window.__PM_INVOICE_ADD_ID=id;
        window.__PM_INVOICE_ADD_STATE={id,row:r.data,baseTotal:N(r.data.grand_total??r.data.total)};
        return window.__PM_INVOICE_ADD_STATE;
      }
    }catch(e){console.error('[PM] invoice state',e)}
    return null;
  }

  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function'||window.__PM_SAFE_INVOICE_EDIT_PATCHED)return;
    const old=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      window.__PM_INVOICE_ADD_ID=Number(id);
      await invoiceState(id);
      return old(id);
    };
    window.__PM_SAFE_INVOICE_EDIT_PATCHED=true;
  }

  function recoverInvoiceId(){
    if(Number(window.__PM_INVOICE_ADD_ID||0))return;
    const b=document.querySelector('button[onclick*="invoiceEdit("]');
    if(!b)return;
    const m=S(b.getAttribute('onclick')).match(/invoiceEdit\(\s*(\d+)\s*\)/);
    if(m){window.__PM_INVOICE_ADD_ID=Number(m[1]);invoiceState(Number(m[1]));}
  }

  function boot(){patchEdit();patchSave();patchInvoiceEdit();recoverInvoiceId();}
  boot();
  [250,700,1500,2500].forEach(ms=>setTimeout(boot,ms));
})();