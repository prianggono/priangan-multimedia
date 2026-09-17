/* Document Numbering
 * Database owns quotation number and revision.
 * Invoice filename/title is owned by invoice.js.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_CLEAN__) return;
  window.__PM_DOCUMENT_NUMBERING_CLEAN__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const DB=()=>window.db||window.__PM_STABLE_DB||null;
  async function quotationRow(id){
    const db=DB(); if(!db||!id) return null;
    try{
      const r=await db.from('penawaran').select('id,nomor_penawaran,revisi_penawaran').eq('id',Number(id)).maybeSingle();
      return r.error?null:r.data;
    }catch(_){return null;}
  }
  async function setQuotationFilename(id){
    const row=await quotationRow(id); if(!row) return;
    const no=S(row.nomor_penawaran); if(!no) return;
    const rev=N(row.revisi_penawaran);
    window.__PM_QUOTATION_REVISION=rev;
    window.__PM_PRINT_FILENAME=`${no}${rev>0?` V${rev}`:''}.pdf`;
  }
  function install(){
    if(typeof window.saveQuote==='function'&&!window.saveQuote.__pmDocumentNumbering){
      const original=window.saveQuote;
      const wrapped=async function(){
        const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
        const result=await original.apply(this,arguments);
        await setQuotationFilename(editing||N(window.__PM_LAST_QUOTATION_ID));
        return result;
      };
      wrapped.__pmDocumentNumbering=true;
      window.saveQuote=wrapped;
    }
    if(typeof window.printQuote==='function'&&!window.printQuote.__pmDocumentNumbering){
      const original=window.printQuote;
      const wrapped=async function(){
        await setQuotationFilename(N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID||window.__PM_LAST_QUOTATION_ID));
        return original.apply(this,arguments);
      };
      wrapped.__pmDocumentNumbering=true;
      window.printQuote=wrapped;
    }
  }
  install();
  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),15000);
  window.addEventListener('beforeprint',()=>{
    const filename=S(window.__PM_PRINT_FILENAME);
    if(filename) document.title=filename.replace(/\.pdf$/i,'');
  },true);
})();