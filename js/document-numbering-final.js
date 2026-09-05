/* Priangan Multimedia — document numbering & PDF filename FINAL
 * Convention:
 *   Quotation: PM-[EVENT]-[YEAR]-[6 DIGITS]
 *   Revision:  PM-[EVENT]-[YEAR]-[6 DIGITS]_1, _2, ...
 *   Invoice:   INV-[QUOTATION NUMBER]
 * PDF print titles follow the same document number.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_FINAL)return;
  window.__PM_DOCUMENT_NUMBERING_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const dbx=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return null};
  const toast=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);

  function slug(v){return S(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-').toLowerCase()||'event'}
  function baseNumber(eventName,seed){const year=new Date().getFullYear();const digits=String(seed??Date.now()).replace(/\D/g,'').slice(-6).padStart(6,'0');return `PM-${slug(eventName)}-${year}-${digits}`}
  function splitRevision(no){const m=S(no).match(/^(.*?)(?:_(\d+))?$/);return{base:m?.[1]||S(no),rev:m?.[2]?Number(m[2]):0}}
  function nextRevision(no){const x=splitRevision(no);return `${x.base}_${x.rev+1}`}

  async function quoteById(id){const d=dbx();if(!d||!id)return null;try{const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,nama_client,perusahaan').eq('id',id).maybeSingle();return r.error?null:r.data}catch(_){return null}}

  async function normalizeSavedQuote(id,isEdit,oldRow,eventName){
    const d=dbx();if(!d)return null;
    const row=await quoteById(id);if(!row)return null;
    let number=S(row.nomor_penawaran);
    if(isEdit){const oldNo=S(oldRow?.nomor_penawaran);number=oldNo?nextRevision(oldNo):baseNumber(eventName||row.nama_event,id)}
    else if(!/^PM-/i.test(number)||/^PM-\d{6}$/i.test(number)){number=baseNumber(eventName||row.nama_event,id)}
    else{const p=number.split('-');if(p.length===2&&/^\d+$/.test(p[1]))number=baseNumber(eventName||row.nama_event,id)}
    if(number!==S(row.nomor_penawaran)){const u=await d.from('penawaran').update({nomor_penawaran:number}).eq('id',id);if(u.error)throw u.error}
    window.__PM_LAST_QUOTATION_NUMBER=number;window.__PM_LAST_QUOTATION_ID=id;return number
  }

  function installSave(){
    if(typeof window.saveQuote!=='function')return false;if(window.saveQuote.__pmDocumentNumbering)return true;
    const original=window.saveQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);let oldRow=null;if(editing)oldRow=await quoteById(editing);
      const eventName=S(document.querySelector('#qeve')?.value);const result=await original.apply(this,arguments);
      try{
        if(editing){const no=await normalizeSavedQuote(editing,true,oldRow,eventName);if(no)toast(`Penawaran ${no} berhasil diperbarui.`)}
        else{const d=dbx();if(d){const r=await d.from('penawaran').select('id,nomor_penawaran,nama_event,nama_client,perusahaan').order('id',{ascending:false}).limit(1).maybeSingle();if(!r.error&&r.data)await normalizeSavedQuote(r.data.id,false,null,eventName||r.data.nama_event)}}
      }catch(e){console.error('[PM] numbering save',e)}
      return result
    };
    wrapped.__pmDocumentNumbering=true;window.saveQuote=wrapped;return true
  }

  function installInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function')return false;if(window.invoiceEdit.__pmDocumentNumbering)return true;
    const original=window.invoiceEdit;
    const wrapped=async function(id){const result=await original.apply(this,arguments);try{const d=dbx();if(!d)return result;const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice').eq('id',Number(id)).maybeSingle();if(!r.error&&r.data&&r.data.nomor_penawaran){const input=document.getElementById('invNo');if(input&&!S(r.data.nomor_invoice))input.value=`INV-${S(r.data.nomor_penawaran)}`}}catch(e){console.warn('[PM] invoice numbering',e)}return result};
    wrapped.__pmDocumentNumbering=true;window.invoiceEdit=wrapped;return true
  }

  function installQuotationPrint(){
    if(typeof window.printQuote!=='function')return false;if(window.printQuote.__pmDocumentNumbering)return true;
    const original=window.printQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);let number=S(window.__PM_LAST_QUOTATION_NUMBER);
      if(editing){const row=await quoteById(editing);if(row?.nomor_penawaran)number=S(row.nomor_penawaran)}
      if(!number)number=baseNumber(document.querySelector('#qeve')?.value,Date.now());
      window.__PM_PRINT_DOCUMENT_NUMBER=number;const result=await original.apply(this,arguments);const root=document.getElementById('pmPrintPreview');
      if(root){const tag=root.querySelector('.pm-doc-tag strong');if(tag)tag.textContent=number;const span=root.querySelector('.pm-print-toolbar span');if(span)span.textContent=`A4 Portrait • ${number}`}
      return result
    };
    wrapped.__pmDocumentNumbering=true;window.printQuote=wrapped;return true
  }

  function installInvoicePreview(){
    if(typeof window.previewInvoice!=='function')return false;if(window.previewInvoice.__pmDocumentNumbering)return true;
    const original=window.previewInvoice;
    const wrapped=async function(){const no=S(document.getElementById('invNo')?.value);const result=await original.apply(this,arguments);const root=document.getElementById('pmInvoicePreview');if(root&&no){root.querySelectorAll('.pm-inv-number,.pm-doc-tag strong,[data-pm-invoice-number]').forEach(el=>el.textContent=no)}window.__PM_INVOICE_PRINT_NUMBER=no;return result};
    wrapped.__pmDocumentNumbering=true;window.previewInvoice=wrapped;return true
  }

  function installPrint(){
    if(typeof window.print!=='function')return false;if(window.print.__pmDocumentNumbering)return true;
    const original=window.print;
    const wrapped=function(){
      const invoice=S(window.__PM_INVOICE_PRINT_NUMBER),quote=S(window.__PM_PRINT_DOCUMENT_NUMBER);
      const no=invoice&&document.getElementById('pmInvoicePreview')?invoice:quote&&document.getElementById('pmPrintPreview')?quote:'';
      const oldTitle=document.title;if(no)document.title=`${invoice?'Invoice':'Penawaran'} - ${no}`;
      try{return original.apply(this,arguments)}finally{document.title=oldTitle}
    };
    wrapped.__pmDocumentNumbering=true;window.print=wrapped;return true
  }

  function boot(){installSave();installInvoiceEdit();installQuotationPrint();installInvoicePreview();installPrint()}
  boot();const mo=new MutationObserver(()=>boot());mo.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),10000)
})();
