/* Priangan Multimedia — FINAL SAFE PATCH
 * Scope: quotation edit persistence + invoice extra-item UI/handlers.
 * IMPORTANT: observer is guarded; never rewrite the same DOM repeatedly.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);

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

  function patchSave(){
    if(typeof window.__saveEditedQuotation!=='function') return false;
    if(window.__PM_SAFE_SAVE_PATCHED) return true;
    const original=window.saveQuote;
    window.saveQuote=async function(){
      if(window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID){
        window.__pmEditingQuotationId=String(window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
        return window.__saveEditedQuotation();
      }
      return typeof original==='function' ? original() : toast('Fungsi simpan penawaran tidak tersedia.');
    };
    window.__PM_SAFE_SAVE_PATCHED=true;
    document.addEventListener('click',function(e){
      const b=e.target.closest?.('button[onclick="saveQuote()"]');
      if(!b || (!window.__pmEditingQuotationId && !window.__PM_EDIT_QUOTATION_ID)) return;
      e.preventDefault();e.stopImmediatePropagation();
      window.__pmEditingQuotationId=String(window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
      window.__saveEditedQuotation();
    },true);
    return true;
  }

  async function invoiceState(id){
    const cur=window.__PM_INVOICE_ADD_STATE;
    if(cur?.id===Number(id)&&cur.row)return cur;
    let d=null;try{if(typeof db!=='undefined'&&db)d=db}catch(_){}
    if(!d)d=window.__PRIANGAN_QUOTE_DB||null;
    if(!d)return null;
    try{const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();if(!r.error&&r.data){window.__PM_INVOICE_ADD_STATE={id:Number(id),row:r.data,baseTotal:N(r.data.grand_total??r.data.total)};return window.__PM_INVOICE_ADD_STATE}}catch(e){console.error('[PM] invoice state',e)}
    return null;
  }

  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function')return false;
    if(window.__PM_SAFE_INVOICE_EDIT_PATCHED)return true;
    const old=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      window.__PM_INVOICE_ADD_ID=Number(id);
      await invoiceState(id);
      const r=old(id);
      setTimeout(decorateInvoiceButtons,300);
      setTimeout(decorateInvoiceButtons,900);
      return r;
    };
    window.__PM_SAFE_INVOICE_EDIT_PATCHED=true;
    return true;
  }

  function decorateInvoiceButtons(){
    const target=document.getElementById('invoiceItems');
    if(!target)return;
    let wrap=target.querySelector('[data-pm-safe-invoice-actions]');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.dataset.pmSafeInvoiceActions='1';
      wrap.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;flex-wrap:wrap';
      target.insertBefore(wrap,target.firstChild);
    }
    /* DO NOT assign innerHTML on every observer callback. That creates a DOM mutation,
       which retriggers the observer forever and makes Chrome show Page Unresponsive. */
    if(!wrap.querySelector('[data-pm-safe-add]')){
      wrap.innerHTML='<button class="btn sm" type="button" data-pm-safe-add>+ Tambah Item</button><button class="btn sm secondary" type="button" data-pm-safe-overtime>+ Overtime</button>';
    }
    const add=wrap.querySelector('[data-pm-safe-add]');
    const overtime=wrap.querySelector('[data-pm-safe-overtime]');
    if(add&&!add.__pmWired){add.onclick=()=>openAdditional('master');add.__pmWired=true}
    if(overtime&&!overtime.__pmWired){overtime.onclick=()=>openAdditional('overtime');overtime.__pmWired=true}
    target.querySelectorAll('button[onclick="invoiceAddItem()"],button[data-pm-add-main]').forEach(b=>{
      const w=b.closest('[data-pm-add-main]');
      if(w&&w!==wrap)w.remove();else if(b.parentElement!==wrap)b.remove();
    });
  }

  async function prepareCurrent(){
    if(window.__PM_INVOICE_ADD_STATE?.row)return window.__PM_INVOICE_ADD_STATE;
    const id=window.__PM_INVOICE_ADD_ID;
    return id?invoiceState(id):null;
  }

  function wireDialog(mode){
    const el=document.getElementById('pmInvoiceAddDialog');if(!el)return;
    const source=el.querySelector('#pmxSource');
    const sourceField=source?.closest('.pmx-field');
    if(sourceField)sourceField.style.display='none';
    if(source){source.value=mode==='overtime'?'overtime':'master';source.dispatchEvent(new Event('change',{bubbles:true}))}
    const save=el.querySelector('.pmx-save');
    if(save&&!save.__pmWired){
      save.onclick=async function(e){
        e.preventDefault();e.stopPropagation();
        const s=await prepareCurrent();
        if(!s?.row)return toast('Invoice belum dipilih.');
        if(typeof window.invoiceSaveAddItem==='function'){try{await window.invoiceSaveAddItem()}catch(err){console.error('[PM] invoice add error',err);toast('Gagal menambahkan item: '+(err.message||err))}}else toast('Fungsi Tambahkan ke Invoice belum siap.');
      };
      save.__pmWired=true;
    }
  }

  function openAdditional(mode){
    (async()=>{
      const s=await prepareCurrent();
      if(!s?.row)return toast('Invoice belum dipilih. Silakan buka Edit / Lihat invoice terlebih dahulu.');
      if(typeof window.__PM_ORIGINAL_INVOICE_ADD_ITEM!=='function'&&typeof window.invoiceAddItem==='function')window.__PM_ORIGINAL_INVOICE_ADD_ITEM=window.invoiceAddItem;
      if(typeof window.__PM_ORIGINAL_INVOICE_ADD_ITEM==='function'){
        window.__PM_ORIGINAL_INVOICE_ADD_ITEM();
        setTimeout(()=>wireDialog(mode),30);
      }else toast('Form Tambah Item belum siap.');
    })();
  }

  function captureInvoiceId(){
    const b=document.querySelector('[onclick^="invoiceEdit("]');
    if(b){const m=S(b.getAttribute('onclick')).match(/invoiceEdit\((\d+)\)/);if(m)window.__PM_INVOICE_ADD_ID=Number(m[1])}
  }

  let scheduled=false;
  function scheduleBoot(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{scheduled=false;boot()},0);
  }
  function boot(){
    patchEdit();patchSave();patchInvoiceEdit();captureInvoiceId();decorateInvoiceButtons();
    if(!window.__PM_SAFE_OBSERVER){
      const ob=new MutationObserver(()=>scheduleBoot());
      ob.observe(document.getElementById('content')||document.body,{childList:true,subtree:true});
      window.__PM_SAFE_OBSERVER=true;
    }
  }
  boot();setTimeout(boot,250);setTimeout(boot,1000);setTimeout(boot,2500);
})();