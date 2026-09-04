/* Priangan Multimedia — invoice payment preview FINAL
 * Preview must use live invoice total (including invoice-only items) and
 * live payments from pembayaran_penawaran. Does not modify quotation data.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_PAYMENT_PREVIEW_FINAL)return;
  window.__PM_INVOICE_PAYMENT_PREVIEW_FINAL=true;

  const N=v=>{let s=String(v??'').replace(/[^0-9,.-]/g,'');s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PRIANGAN_QUOTE_DB||window.db||null};

  async function livePayment(id){
    const d=DB(); if(!d||!id)return 0;
    try{
      const r=await d.from('pembayaran_penawaran').select('nominal').eq('penawaran_id',Number(id));
      if(r.error)return 0;
      return (r.data||[]).reduce((s,x)=>s+N(x.nominal),0);
    }catch(_){return 0}
  }

  function invoiceTotal(){
    const el=document.getElementById('invTotal');
    const n=N(el?.textContent);
    if(n>0)return n;
    const gt=document.querySelector('#invoiceItems tbody tr:last-child td:last-child');
    return N(gt?.textContent);
  }

  function patchPopup(win,total,paid){
    try{
      const doc=win?.document;if(!doc)return;
      const balance=Math.max(0,total-paid);
      const all=[...doc.querySelectorAll('body *')];
      const findLabel=(label)=>all.find(el=>el.children.length===0&&String(el.textContent||'').trim().toLowerCase()===label.toLowerCase());
      const setNext=(label,value)=>{
        const el=findLabel(label);if(!el)return false;
        let p=el.parentElement;
        if(!p)return false;
        const nodes=[...p.querySelectorAll('*')].filter(x=>x!==el&&x.children.length===0);
        if(nodes.length){nodes[nodes.length-1].textContent=value;return true}
        return false;
      };
      // Payment summary labels used by the invoice print template.
      setNext('Total',M(total));
      setNext('Downpayment',M(paid));
      setNext('Down Payment',M(paid));
      setNext('Sisa tagihan',M(balance));
      setNext('Sisa Tagihan',M(balance));
      setNext('Total Invoice',M(total));
      // Correct the table total row by finding the GRAND/TOTAL invoice label.
      for(const el of all){
        const txt=String(el.textContent||'').trim().toUpperCase();
        if(el.children.length===0 && (txt==='TOTAL INVOICE'||txt==='GRAND TOTAL')){
          const row=el.closest('tr');
          if(row){const cells=row.querySelectorAll('td');if(cells.length)cells[cells.length-1].textContent=M(total);}
        }
      }
      // Ensure preview is marked as the final synchronized state.
      doc.documentElement.setAttribute('data-pm-payment-preview','synced');
    }catch(e){console.warn('[PM] invoice payment preview patch',e)}
  }

  const wrap=()=>{
    if(typeof window.previewInvoice!=='function'||window.previewInvoice.__pmPaymentFinal)return false;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const id=Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.currentInvoice?.row?.id||0);
      const total=invoiceTotal();
      const paid=await livePayment(id);
      let popup=null;
      const oldOpen=window.open;
      window.open=function(){popup=oldOpen.apply(this,arguments);return popup};
      try{await original.apply(this,arguments)}finally{window.open=oldOpen}
      if(popup){
        const apply=()=>patchPopup(popup,total,paid);
        [0,50,150,400,800].forEach(ms=>setTimeout(apply,ms));
      }
    };
    wrapped.__pmPaymentFinal=true;
    window.previewInvoice=wrapped;
    return true;
  };
  [0,100,400,1000,2000].forEach(ms=>setTimeout(wrap,ms));
})();
