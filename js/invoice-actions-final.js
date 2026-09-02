/* Priangan Multimedia — Invoice actions FINAL v3
 * Single, live action layer for + Tambah Item and + Overtime.
 * This is deliberately self-contained: it creates the buttons, wires clicks,
 * keeps the active quotation id, and delegates the form to invoice-ui-final.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_ACTIONS_FINAL_V3)return;
  window.__PM_INVOICE_ACTIONS_FINAL_V3=true;

  const S=v=>String(v??'').trim();
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);

  function getDb(){
    try{if(typeof db!=='undefined'&&db)return db;}catch(e){}
    return window.__PRIANGAN_QUOTE_DB||window.db||null;
  }

  async function setState(id){
    id=Number(id||0);
    if(!id)return null;
    const old=window.__PM_INVOICE_ADD_STATE;
    if(old&&Number(old.id)===id&&old.row)return old;
    const d=getDb();
    if(!d)return null;
    try{
      const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
      if(r.error||!r.data){console.error('[PM invoice actions]',r.error);return null;}
      const state={id,row:r.data,baseTotal:Number(r.data.grand_total??r.data.total??0)||0};
      window.__PM_INVOICE_ADD_ID=id;
      window.__PM_INVOICE_ADD_STATE=state;
      return state;
    }catch(e){console.error('[PM invoice actions]',e);return null;}
  }

  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function'||window.__PM_INVOICE_ACTIONS_EDIT_V3)return;
    const original=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      window.__PM_INVOICE_ADD_ID=Number(id);
      await setState(id);
      return original(id);
    };
    window.__PM_INVOICE_ACTIONS_EDIT_V3=true;
  }

  function currentId(){
    return Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||0);
  }

  function ensureToolbar(){
    const target=document.getElementById('invoiceItems');
    if(!target)return;
    let bar=document.getElementById('pmInvoiceActions');
    if(bar&&bar.isConnected)return;
    bar=document.createElement('div');
    bar.id='pmInvoiceActions';
    bar.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin:0 0 14px;position:relative;z-index:5;pointer-events:auto';
    bar.innerHTML='<button class="btn" type="button" data-pm-final-add style="cursor:pointer;pointer-events:auto">+ TAMBAH ITEM</button><button class="btn" type="button" data-pm-safe-overtime style="cursor:pointer;pointer-events:auto">+ OVERTIME</button>';
    target.insertBefore(bar,target.firstChild);
  }

  async function open(mode){
    const id=currentId();
    if(!id)return toast('Invoice belum dipilih. Buka Edit / Lihat invoice terlebih dahulu.');
    const state=await setState(id);
    if(!state?.row)return toast('Data invoice tidak ditemukan.');

    const fn=window.invoiceAddItem;
    if(typeof fn!=='function')return toast('Form invoice belum siap.');
    try{
      fn();
      const apply=()=>{
        const dialog=document.getElementById('pmInvoiceAddDialog');
        if(!dialog)return false;
        const source=dialog.querySelector('#pmxSource');
        if(source){
          source.value=mode==='overtime'?'overtime':'master';
          source.dispatchEvent(new Event('change',{bubbles:true}));
        }
        const title=dialog.querySelector('.pmx h3');
        if(title)title.textContent=mode==='overtime'?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice';
        return true;
      };
      setTimeout(apply,0);setTimeout(apply,50);setTimeout(apply,200);
    }catch(e){console.error('[PM invoice open]',e);toast('Gagal membuka form: '+(e.message||e));}
  }

  window.__PM_OPEN_INVOICE_ADDITIONAL=open;
  window.__PM_OPEN_INVOICE_OVERTIME=()=>open('overtime');

  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('#pmInvoiceActions [data-pm-final-add],#pmInvoiceActions [data-pm-safe-overtime],[data-pm-final-add],[data-pm-safe-overtime]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(b.matches('[data-pm-safe-overtime]')?'overtime':'master');
  },true);

  function recoverId(){
    if(currentId())return;
    const b=document.querySelector('button[onclick*="invoiceEdit("]');
    if(!b)return;
    const m=S(b.getAttribute('onclick')).match(/invoiceEdit\(\s*(\d+)\s*\)/);
    if(m){window.__PM_INVOICE_ADD_ID=Number(m[1]);setState(Number(m[1]));}
  }

  patchInvoiceEdit();
  [100,400,1000,2000].forEach(ms=>setTimeout(()=>{patchInvoiceEdit();recoverId();ensureToolbar();},ms));

  let queued=false;
  function observe(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;patchInvoiceEdit();recoverId();ensureToolbar();});
  }
  new MutationObserver(observe).observe(document.body,{childList:true,subtree:true});
  ensureToolbar();
})();