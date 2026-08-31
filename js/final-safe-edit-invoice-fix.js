/* Priangan Multimedia — FINAL SAFE PATCH
 * Scope: only fixes Edit Penawaran persistence and Invoice extra-item UI/handlers.
 * Does not replace existing quotation/invoice logic or master prices.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);

  /* 1) History -> Edit must explicitly mark the original quotation as EDIT MODE. */
  function patchEdit(){
    if(typeof window.editQuotation!=='function') return false;
    if(window.__PM_SAFE_EDIT_PATCHED) return true;
    const old=window.editQuotation;
    window.editQuotation=async function(id){
      window.__pmEditingQuotationId=String(id);
      window.__PM_EDIT_QUOTATION_ID=String(id);
      return old(id);
    };
    window.__PM_SAFE_EDIT_PATCHED=true;
    return true;
  }

  /* 2) Invoice: guarantee state exists before the additional-item dialog opens. */
  async function invoiceState(id){
    const cur=window.__PM_INVOICE_ADD_STATE;
    if(cur?.id===Number(id)&&cur.row) return cur;
    let d=null;
    try{ if(typeof db!=='undefined'&&db)d=db; }catch(_){}
    if(!d) d=window.__PRIANGAN_QUOTE_DB||null;
    let row=null;
    if(d){try{const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();if(!r.error)row=r.data;}catch(_){}
    }
    if(row){window.__PM_INVOICE_ADD_STATE={id:Number(id),row,baseTotal:N(row.grand_total??row.total)};return window.__PM_INVOICE_ADD_STATE;}
    return null;
  }

  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function') return false;
    if(window.__PM_SAFE_INVOICE_EDIT_PATCHED) return true;
    const old=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      await invoiceState(id);
      const r=old(id);
      setTimeout(()=>decorateInvoiceButtons(),300);
      setTimeout(()=>decorateInvoiceButtons(),900);
      return r;
    };
    window.__PM_SAFE_INVOICE_EDIT_PATCHED=true;
    return true;
  }

  /* Keep exactly two actions on the invoice item list. */
  function decorateInvoiceButtons(){
    const target=document.getElementById('invoiceItems');
    if(!target) return;
    let wrap=target.querySelector('[data-pm-safe-invoice-actions]');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.dataset.pmSafeInvoiceActions='1';
      wrap.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;flex-wrap:wrap';
      target.insertBefore(wrap,target.firstChild);
    }
    wrap.innerHTML='<button class="btn sm" type="button" data-pm-safe-add>+ Tambah Item</button><button class="btn sm secondary" type="button" data-pm-safe-overtime>+ Overtime</button>';
    wrap.querySelector('[data-pm-safe-add]').onclick=()=>openAdditional('master');
    wrap.querySelector('[data-pm-safe-overtime]').onclick=()=>openAdditional('overtime');
    /* Hide duplicate add buttons created by older fixes, without touching the item table. */
    target.querySelectorAll('button[onclick="invoiceAddItem()"],button[data-pm-add-main]').forEach(b=>{
      const w=b.closest('[data-pm-add-main]');
      if(w && w!==wrap) w.remove(); else if(b.parentElement!==wrap) b.remove();
    });
  }

  async function prepareCurrent(){
    let s=window.__PM_INVOICE_ADD_STATE;
    if(s?.row)return s;
    const id=window.__PM_INVOICE_ADD_ID;
    if(id)return invoiceState(id);
    return null;
  }

  function wireDialog(mode){
    const el=document.getElementById('pmInvoiceAddDialog');
    if(!el)return;
    const source=el.querySelector('#pmxSource');
    const sourceField=source?.closest('.pmx-field');
    if(sourceField) sourceField.style.display='none';
    if(source){
      source.value=mode==='overtime'?'overtime':'master';
      source.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const save=el.querySelector('.pmx-save');
    if(save){
      save.onclick=async function(e){
        e.preventDefault();e.stopPropagation();
        const s=await prepareCurrent();
        if(!s?.row)return toast('Invoice belum dipilih.');
        if(typeof window.invoiceSaveAddItem==='function'){
          try{await window.invoiceSaveAddItem();}catch(err){console.error(err);toast('Gagal menambahkan item: '+(err.message||err));}
        }else toast('Fungsi Tambahkan ke Invoice belum siap.');
      };
    }
  }

  function openAdditional(mode){
    const run=async()=>{
      const s=await prepareCurrent();
      if(!s?.row)return toast('Invoice belum dipilih. Silakan buka Edit / Lihat invoice terlebih dahulu.');
      if(typeof window.__PM_ORIGINAL_INVOICE_ADD_ITEM!=='function' && typeof window.invoiceAddItem==='function') window.__PM_ORIGINAL_INVOICE_ADD_ITEM=window.invoiceAddItem;
      if(typeof window.__PM_ORIGINAL_INVOICE_ADD_ITEM==='function'){
        window.__PM_ORIGINAL_INVOICE_ADD_ITEM();
        setTimeout(()=>wireDialog(mode),30);
      }else toast('Form Tambah Item belum siap.');
    };
    run();
  }

  function captureInvoiceId(){
    /* The invoice edit button always carries its numeric id. This is only a fallback for state recovery. */
    const b=document.querySelector('[onclick^="invoiceEdit("]');
    if(b){const m=S(b.getAttribute('onclick')).match(/invoiceEdit\((\d+)\)/);if(m)window.__PM_INVOICE_ADD_ID=Number(m[1]);}
  }

  function boot(){
    patchEdit();patchInvoiceEdit();captureInvoiceId();decorateInvoiceButtons();
    if(!window.__PM_SAFE_OBSERVER){
      const ob=new MutationObserver(()=>{patchEdit();patchInvoiceEdit();captureInvoiceId();decorateInvoiceButtons();});
      ob.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
      window.__PM_SAFE_OBSERVER=true;
    }
  }
  boot();
  setTimeout(boot,250);setTimeout(boot,1000);setTimeout(boot,2500);
})();
