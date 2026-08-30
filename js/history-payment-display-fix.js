/* Priangan Multimedia — show actual DP & paid amount in quotation history */
(function(){
  'use strict';
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  function DB(){return (typeof db!=='undefined'&&db)?db:null}
  async function patchPayments(){
    const d=DB(); if(!d)return;
    const trs=[...document.querySelectorAll('.pm-history-table tbody tr.pmQuoteDataRow')];
    if(!trs.length)return;
    const rows=[...document.querySelectorAll('.pm-history-table tbody tr.pmQuoteDataRow')];
    const actionRows=[...document.querySelectorAll('.pm-history-table tbody tr.pmActionDataRow')];
    // The action row follows each quotation row; its buttons carry the quotation id.
    const ids=rows.map(tr=>{
      const action=tr.nextElementSibling;
      const btn=action?.querySelector('button[onclick*="editQuotation"]');
      const m=btn?.getAttribute('onclick')?.match(/editQuotation\((\d+)\)/);
      return m?Number(m[1]):null;
    });
    const valid=ids.filter(Boolean); if(!valid.length)return;
    try{
      const r=await d.from('pembayaran_penawaran').select('penawaran_id,nominal,jenis').in('penawaran_id',valid);
      if(r.error)throw r.error;
      const sums={};
      (r.data||[]).forEach(p=>{
        const id=String(p.penawaran_id); if(!sums[id])sums[id]={dp:0,paid:0};
        const amount=N(p.nominal); sums[id].paid+=amount;
        if(String(p.jenis||'').toUpperCase()==='DP')sums[id].dp+=amount;
      });
      rows.forEach((tr,i)=>{
        const id=ids[i]; if(!id)return;
        const s=sums[String(id)]||{dp:0,paid:0};
        const dp=tr.querySelector('.pm-pay-dp'), paid=tr.querySelector('.pm-pay-paid');
        if(dp)dp.textContent=M(s.dp);
        if(paid)paid.textContent=M(s.paid);
      });
    }catch(e){console.warn('Gagal memuat DP history:',e)}
  }
  const original=window.renderHistory;
  if(typeof original==='function'){
    window.renderHistory=async function(){
      await original.apply(this,arguments);
      await patchPayments();
    };
  }
  // Handles the initial page render if history was already rendered before this file loaded.
  setTimeout(patchPayments,150);
})();
