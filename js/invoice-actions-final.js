/* Priangan Multimedia — FINAL invoice actions bridge
 * This file is intentionally the LAST invoice patch loaded.
 * It does not replace the invoice calculation engine; it only guarantees:
 * 1) current invoice state is available,
 * 2) Add Item / Overtime buttons always open the active invoice form,
 * 3) the correct source mode is selected,
 * 4) save uses the existing invoice-only additional-item engine.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_ACTIONS_FINAL_V2)return;
  window.__PM_INVOICE_ACTIONS_FINAL_V2=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);

  function getDb(){
    try{if(typeof db!=='undefined'&&db)return db;}catch(_){}
    return window.__PRIANGAN_QUOTE_DB||window.db||null;
  }

  async function setInvoiceState(id){
    id=Number(id);
    if(!id)return null;
    const cur=window.__PM_INVOICE_ADD_STATE;
    if(cur?.id===id&&cur.row)return cur;
    const d=getDb();
    if(!d)return null;
    try{
      const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
      if(r.error||!r.data){console.error('[PM] invoice state:',r.error);return null;}
      window.__PM_INVOICE_ADD_ID=id;
      window.__PM_INVOICE_ADD_STATE={id,row:r.data,baseTotal:N(r.data.grand_total??r.data.total)};
      return window.__PM_INVOICE_ADD_STATE;
    }catch(e){console.error('[PM] invoice state:',e);return null;}
  }

  /* Keep the active quotation id whenever Invoice is opened. */
  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function')return;
    if(window.__PM_INVOICE_ACTIONS_EDIT_PATCHED)return;
    const original=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      window.__PM_INVOICE_ADD_ID=Number(id);
      await setInvoiceState(id);
      return original(id);
    };
    window.__PM_INVOICE_ACTIONS_EDIT_PATCHED=true;
  }

  /* Some older patches also wrap invoiceEdit. Re-check once after boot. */
  patchInvoiceEdit();
  setTimeout(patchInvoiceEdit,300);
  setTimeout(patchInvoiceEdit,1000);

  function currentId(){
    const id=Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id);
    return id||0;
  }

  async function ensureCurrent(){
    const id=currentId();
    if(!id)return null;
    return setInvoiceState(id);
  }

  function prepareDialog(mode){
    const el=document.getElementById('pmInvoiceAddDialog');
    if(!el)return false;
    const source=el.querySelector('#pmxSource');
    if(source){
      source.value=mode==='overtime'?'overtime':'master';
      source.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const title=el.querySelector('.pmx h3');
    if(title)title.textContent=mode==='overtime'?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice';

    const save=el.querySelector('.pmx-save,#pmxSaveButton');
    if(save&&!save.__pmFinalSave){
      save.__pmFinalSave=true;
      save.addEventListener('click',async function(e){
        e.preventDefault();
        e.stopImmediatePropagation();
        const s=await ensureCurrent();
        if(!s?.row)return toast('Invoice belum dipilih. Silakan buka Edit / Lihat invoice terlebih dahulu.');
        if(typeof window.invoiceSaveAddItem!=='function')return toast('Fungsi penyimpanan item invoice belum siap.');
        try{await window.invoiceSaveAddItem();}
        catch(err){console.error('[PM] invoice add save:',err);toast('Gagal menambahkan item: '+(err.message||err));}
      },true);
    }
    return true;
  }

  async function open(mode){
    const s=await ensureCurrent();
    if(!s?.row){
      return toast('Invoice belum dipilih. Silakan buka Edit / Lihat invoice terlebih dahulu.');
    }

    /* invoice-ui-final / invoice-quotation-form-match-fix may expose the form.
       Prefer the currently active implementation rather than recursively calling
       our own bridge. */
    const fn=window.invoiceAddItem;
    if(typeof fn!=='function')return toast('Form Tambah Item belum siap.');

    try{
      fn();
      setTimeout(()=>prepareDialog(mode),0);
      setTimeout(()=>prepareDialog(mode),50);
      setTimeout(()=>prepareDialog(mode),200);
    }catch(e){
      console.error('[PM] open invoice addition:',e);
      toast('Gagal membuka form: '+(e.message||e));
    }
  }

  /* Expose one stable API for all older patches. */
  window.__PM_OPEN_INVOICE_ADDITIONAL=open;
  window.__PM_OPEN_INVOICE_OVERTIME=()=>open('overtime');

  /* Direct delegated handlers win over old inline/onclick handlers. */
  document.addEventListener('click',function(e){
    const target=e.target?.closest?.('[data-pm-safe-add],[data-pm-safe-overtime],[data-pm-final-add]');
    if(!target)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(target.matches('[data-pm-safe-overtime]')?'overtime':'master');
  },true);

  /* If a previous patch created the toolbar, make sure its buttons are wired too. */
  function wireExisting(){
    document.querySelectorAll('[data-pm-safe-add]').forEach(b=>{b.type='button';b.dataset.pmFinalReady='1';});
    document.querySelectorAll('[data-pm-safe-overtime]').forEach(b=>{b.type='button';b.dataset.pmFinalReady='1';});
    document.querySelectorAll('[data-pm-final-add]').forEach(b=>{b.type='button';b.dataset.pmFinalReady='1';});
  }
  wireExisting();
  new MutationObserver(wireExisting).observe(document.body,{childList:true,subtree:true});

  /* If the page is already in an invoice edit screen when this script loads,
     recover its id from the invoice list's edit button if possible. */
  function recoverId(){
    if(currentId())return;
    const b=document.querySelector('[onclick^="invoiceEdit("]');
    if(b){
      const m=S(b.getAttribute('onclick')).match(/invoiceEdit\(\s*(\d+)\s*\)/);
      if(m){window.__PM_INVOICE_ADD_ID=Number(m[1]);setInvoiceState(Number(m[1]));}
    }
  }
  recoverId();
  setTimeout(recoverId,250);
  setTimeout(recoverId,1000);
})();