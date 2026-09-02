/* Priangan Multimedia — Invoice actions final bridge.
 * Keeps Add Item / Overtime buttons working even when invoice UI patches load in different order.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_ACTIONS_FINAL)return;
  window.__PM_INVOICE_ACTIONS_FINAL=true;

  function getDb(){
    try{ if(typeof db!=='undefined'&&db)return db; }catch(_){}
    return window.__PRIANGAN_QUOTE_DB||window.db||null;
  }
  async function ensureInvoiceState(){
    const id=Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id);
    if(!id)return null;
    const cur=window.__PM_INVOICE_ADD_STATE;
    if(cur?.id===id&&cur.row)return cur;
    const d=getDb();
    if(!d)return null;
    const r=await d.from('penawaran').select('*').eq('id',id).maybeSingle();
    if(r.error||!r.data)return null;
    window.__PM_INVOICE_ADD_STATE={id,row:r.data,baseTotal:Number(r.data.grand_total??r.data.total??0)};
    return window.__PM_INVOICE_ADD_STATE;
  }
  async function open(mode){
    try{
      const s=await ensureInvoiceState();
      if(!s)return window.msg?.('Invoice belum dipilih. Silakan buka Edit / Lihat invoice terlebih dahulu.');
      if(typeof window.invoiceAddItem!=='function')return window.msg?.('Fungsi Tambah Item belum siap.');
      window.invoiceAddItem();
      setTimeout(()=>{
        const el=document.getElementById('pmInvoiceAddDialog');
        if(!el)return;
        const source=el.querySelector('#pmxSource');
        if(source){
          source.value=mode==='overtime'?'overtime':'master';
          source.dispatchEvent(new Event('change',{bubbles:true}));
        }
        const title=el.querySelector('.pmx h3');
        if(title)title.textContent=mode==='overtime'?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice';
      },40);
    }catch(e){console.error('[PM] invoice action:',e);window.msg?.('Gagal membuka form: '+(e.message||e));}
  }
  function wire(){
    document.querySelectorAll('[data-pm-safe-add]').forEach(b=>{
      if(b.__pmFinal)return;b.__pmFinal=true;b.onclick=e=>{e.preventDefault();e.stopPropagation();open('master')};
    });
    document.querySelectorAll('[data-pm-safe-overtime]').forEach(b=>{
      if(b.__pmFinal)return;b.__pmFinal=true;b.onclick=e=>{e.preventDefault();e.stopPropagation();open('overtime')};
    });
  }
  new MutationObserver(wire).observe(document.body,{childList:true,subtree:true});
  wire();
  window.__PM_OPEN_INVOICE_ADDITIONAL=open;
})();
