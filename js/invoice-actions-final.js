/* Priangan Multimedia — Invoice actions FINAL v4
 * Single action handler. The visible + Tambah Item / + Overtime toolbar is
 * intentionally owned by invoice-ui-final and stays at the BOTTOM of the card.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_ACTIONS_FINAL_V4)return;
  window.__PM_INVOICE_ACTIONS_FINAL_V4=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);

  function getDb(){
    try{if(typeof db!=='undefined'&&db)return db}catch(_){}
    return window.__PRIANGAN_QUOTE_DB||window.db||null;
  }

  async function setState(id){
    id=Number(id||0);if(!id)return null;
    const old=window.__PM_INVOICE_ADD_STATE;
    if(old&&Number(old.id)===id&&old.row)return old;
    const d=getDb();if(!d)return null;
    try{
      const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
      if(r.error||!r.data){console.error('[PM invoice actions]',r.error);return null}
      const state={id,row:r.data,baseTotal:N(r.data.grand_total??r.data.total)};
      window.__PM_INVOICE_ADD_ID=id;
      window.__PM_INVOICE_ADD_STATE=state;
      return state;
    }catch(e){console.error('[PM invoice actions]',e);return null}
  }

  function patchInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function'||window.__PM_INVOICE_ACTIONS_EDIT_V4)return;
    const original=window.invoiceEdit;
    window.invoiceEdit=async function(id){
      window.__PM_INVOICE_ADD_ID=Number(id);
      await setState(id);
      return original(id);
    };
    window.__PM_INVOICE_ACTIONS_EDIT_V4=true;
  }

  function currentId(){return Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||0)}

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
        const dialog=document.getElementById('pmInvoiceAddDialog');if(!dialog)return false;
        const source=dialog.querySelector('#pmxSource');
        if(source){source.value=mode==='overtime'?'overtime':'master';source.dispatchEvent(new Event('change',{bubbles:true}))}
        const title=dialog.querySelector('.pmx h3');
        if(title)title.textContent=mode==='overtime'?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice';
        return true;
      };
      [0,50,200].forEach(ms=>setTimeout(apply,ms));
    }catch(e){console.error('[PM invoice open]',e);toast('Gagal membuka form: '+(e.message||e));}
  }

  window.__PM_OPEN_INVOICE_ADDITIONAL=open;
  window.__PM_OPEN_INVOICE_OVERTIME=()=>open('overtime');

  // Handles the single bottom toolbar rendered by invoice-ui-final.
  document.addEventListener('click',function(e){
    const b=e.target?.closest?.('[data-pm-final-add],[data-pm-safe-overtime]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(b.matches('[data-pm-safe-overtime]')?'overtime':'master');
  },true);

  function recoverId(){
    if(currentId())return;
    const b=document.querySelector('button[onclick*="invoiceEdit("]');if(!b)return;
    const m=S(b.getAttribute('onclick')).match(/invoiceEdit\(\s*(\d+)\s*\)/);
    if(m){window.__PM_INVOICE_ADD_ID=Number(m[1]);setState(Number(m[1]));}
  }

  function boot(){patchInvoiceEdit();recoverId();}
  boot();[100,400,1000,2000].forEach(ms=>setTimeout(boot,ms));
})();