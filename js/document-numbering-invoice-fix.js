/* Priangan Multimedia — invoice document number FINAL FIX
 * Forces invoice number to follow the quotation number:
 * INV-PM-[EVENT]-[YEAR]-[6 DIGITS][_revision]
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_DOCUMENT_NUMBER_FIX)return;
  window.__PM_INVOICE_DOCUMENT_NUMBER_FIX=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return null};
  const slug=v=>S(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-').toLowerCase()||'event';
  const canonicalQuote=(row)=>{
    const no=S(row?.nomor_penawaran);
    if(/^PM-[^-]+-\d{4}-\d{6}(?:_\d+)?$/i.test(no))return no;
    return `PM-${slug(row?.nama_event||row?.event_name||row?.event||'event')}-${new Date().getFullYear()}-${String(row?.id||Date.now()).replace(/\D/g,'').slice(-6).padStart(6,'0')}`;
  };
  const desiredInvoice=q=>`INV-${canonicalQuote(q)}`;

  async function getQuote(id){const d=DB();if(!d)return null;try{const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,event_name,event').eq('id',N(id)).maybeSingle();return r.error?null:r.data}catch(_){return null}}

  async function sync(id, persist=true){
    const d=DB();const q=await getQuote(id);if(!q)return '';
    const qNo=canonicalQuote(q);
    if(qNo!==S(q.nomor_penawaran)&&persist){try{await d.from('penawaran').update({nomor_penawaran:qNo}).eq('id',q.id)}catch(_) {}}
    const inv=desiredInvoice({...q,nomor_penawaran:qNo});
    if(persist&&S(q.nomor_invoice)!==inv){try{await d.from('penawaran').update({nomor_penawaran:qNo,nomor_invoice:inv}).eq('id',q.id)}catch(_) {}}
    window.__PM_INVOICE_PRINT_NUMBER=inv;
    window.__PM_INVOICE_QUOTE_NUMBER=qNo;
    return inv;
  }

  function wrapInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function'||window.invoiceEdit.__pmInvoiceNumberFix)return false;
    if(window.invoiceEdit.__pmInvoiceNumberFix2)return true;
    const original=window.invoiceEdit;
    const wrapped=async function(id){
      const result=await original.apply(this,arguments);
      const inv=await sync(id,true);
      const input=document.getElementById('invNo');
      if(input&&inv)input.value=inv;
      const ref=[...document.querySelectorAll('input')].find(x=>x.value===window.__PM_INVOICE_QUOTE_NUMBER);
      if(ref)ref.value=window.__PM_INVOICE_QUOTE_NUMBER;
      return result;
    };
    wrapped.__pmInvoiceNumberFix2=true;
    window.invoiceEdit=wrapped;
    return true;
  }

  function wrapSaveInvoice(){
    if(typeof window.saveInvoice!=='function'||window.saveInvoice.__pmInvoiceNumberFix)return false;
    const original=window.saveInvoice;
    const wrapped=async function(){
      const id=N(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.__PM_CURRENT_INVOICE_ID||window.currentInvoice?.row?.id);
      const rowId=id||N(window.__PM_INVOICE_ID);
      if(rowId){const inv=await sync(rowId,true);const input=document.getElementById('invNo');if(input&&inv)input.value=inv}
      return original.apply(this,arguments);
    };
    wrapped.__pmInvoiceNumberFix=true;
    window.saveInvoice=wrapped;
    return true;
  }

  function wrapPreview(){
    if(typeof window.previewInvoice!=='function'||window.previewInvoice.__pmInvoiceNumberFix)return false;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const id=N(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.__PM_CURRENT_INVOICE_ID);
      if(id){const inv=await sync(id,true);const input=document.getElementById('invNo');if(input&&inv)input.value=inv}
      const no=S(document.getElementById('invNo')?.value);window.__PM_INVOICE_PRINT_NUMBER=no;
      return original.apply(this,arguments);
    };
    wrapped.__pmInvoiceNumberFix=true;window.previewInvoice=wrapped;return true;
  }

  function boot(){wrapInvoiceEdit();wrapSaveInvoice();wrapPreview()}
  boot();[100,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
