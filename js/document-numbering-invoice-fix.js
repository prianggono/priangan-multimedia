/* Priangan Multimedia — invoice document number FINAL FIX v2
 * Invoice always follows its quotation number.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_DOCUMENT_NUMBER_FIX_V2)return;
  window.__PM_INVOICE_DOCUMENT_NUMBER_FIX_V2=true;
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return null};
  const slug=v=>S(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-').toLowerCase()||'event';
  function canonicalQuote(row){const no=S(row?.nomor_penawaran);if(/^PM-[^-]+-\d{4}-\d{6}(?:_\d+)?$/i.test(no))return no;return `PM-${slug(row?.nama_event||row?.event_name||row?.event||'event')}-${new Date().getFullYear()}-${String(row?.id||Date.now()).replace(/\D/g,'').slice(-6).padStart(6,'0')}`}
  async function getQuote(id){const d=DB();if(!d)return null;try{const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,event_name,event').eq('id',N(id)).maybeSingle();return r.error?null:r.data}catch(_){return null}}
  async function sync(id){const d=DB(),q=await getQuote(id);if(!d||!q)return '';const qNo=canonicalQuote(q),inv=`INV-${qNo}`;try{if(qNo!==S(q.nomor_penawaran)||inv!==S(q.nomor_invoice))await d.from('penawaran').update({nomor_penawaran:qNo,nomor_invoice:inv}).eq('id',q.id)}catch(e){console.warn('[PM] invoice number sync',e)}window.__PM_INVOICE_PRINT_NUMBER=inv;window.__PM_INVOICE_QUOTE_NUMBER=qNo;return inv}
  function wrapEdit(){if(typeof window.invoiceEdit!=='function'||window.invoiceEdit.__pmInvoiceNumberFixV2)return false;const original=window.invoiceEdit;const wrapped=async function(id){const result=await original.apply(this,arguments);const inv=await sync(id);const input=document.getElementById('invNo');if(input&&inv)input.value=inv;return result};wrapped.__pmInvoiceNumberFixV2=true;window.invoiceEdit=wrapped;return true}
  function wrapSave(){if(typeof window.saveInvoice!=='function'||window.saveInvoice.__pmInvoiceNumberFixV2)return false;const original=window.saveInvoice;const wrapped=async function(){const id=N(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.__PM_CURRENT_INVOICE_ID);if(id){const inv=await sync(id);const input=document.getElementById('invNo');if(input&&inv)input.value=inv}return original.apply(this,arguments)};wrapped.__pmInvoiceNumberFixV2=true;window.saveInvoice=wrapped;return true}
  function wrapPreview(){if(typeof window.previewInvoice!=='function'||window.previewInvoice.__pmInvoiceNumberFixV2)return false;const original=window.previewInvoice;const wrapped=async function(){const id=N(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.__PM_CURRENT_INVOICE_ID);if(id){const inv=await sync(id);const input=document.getElementById('invNo');if(input&&inv)input.value=inv}const no=S(document.getElementById('invNo')?.value);window.__PM_INVOICE_PRINT_NUMBER=no;return original.apply(this,arguments)};wrapped.__pmInvoiceNumberFixV2=true;window.previewInvoice=wrapped;return true}
  function boot(){wrapEdit();wrapSave();wrapPreview()}
  boot();[100,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
