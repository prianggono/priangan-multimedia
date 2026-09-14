/* Priangan Multimedia — document numbering & PDF filename
 * One cross-cutting numbering service for stable quotation numbers,
 * quotation revisions and invoice filenames.
 * It does not replace the domain print engines.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_FINAL)return;
  window.__PM_DOCUMENT_NUMBERING_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const dbx=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PM_STABLE_DB||window.db||null};

  function slug(v){
    return S(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-')
      .toLowerCase()||'event';
  }
  function cleanEvent(v){return slug(v).replace(/-/g,'_')||'event'}
  function digitsFromNumber(no,seed){
    const raw=S(no).replace(/\s+V\d+$/i,'').match(/(\d{6})$/);
    if(raw)return raw[1];
    const s=String(seed??Date.now()).replace(/\D/g,'');
    return s.slice(-6).padStart(6,'0');
  }
  function baseNumber(eventName,seed,sourceNo){return `PM-${slug(eventName)}-${new Date().getFullYear()}-${digitsFromNumber(sourceNo,seed)}`}
  function quoteFilename(eventName,number,revision){const r=Math.max(0,N(revision));return `Penawaran - ${cleanEvent(eventName)} - ${S(number)}${r?` V${r}`:''}.pdf`}
  function invoiceFilename(eventName,number){return `Invoice - ${cleanEvent(eventName)} - ${S(number||'Invoice')}.pdf`}

  async function quoteById(id){
    const d=dbx();if(!d||!id)return null;
    try{const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,nama_client,perusahaan,telepon_wa,telepon,whatsapp,email,tanggal_mulai,tanggal_selesai,subtotal,diskon,diskon_persen,diskon_nominal,total,grand_total').eq('id',id).maybeSingle();return r.error?null:r.data}catch(_){return null}
  }
  async function quoteItems(id){
    const d=dbx();if(!d||!id)return [];
    try{const r=await d.from('penawaran_items').select('kode,item,nama_item,harga_jual,harga,harga_modal,tipe_perhitungan,tipe,qty,jumlah,lebar,tinggi,panjang,tanggal_mulai,tanggal_selesai,durasi,subtotal').eq('penawaran_id',id).order('id');return r.error?[]:(r.data||[])}catch(_){return []}
  }
  function norm(v){if(v==null)return '';if(typeof v==='number')return Number.isFinite(v)?Math.round(v*100)/100:0;return S(v)}
  function businessSignature(row,items){
    const q=row||{};
    const header={nama_event:norm(q.nama_event),nama_client:norm(q.nama_client),perusahaan:norm(q.perusahaan),telepon_wa:norm(q.telepon_wa||q.telepon||q.whatsapp),email:norm(q.email),tanggal_mulai:norm(q.tanggal_mulai),tanggal_selesai:norm(q.tanggal_selesai),subtotal:norm(q.subtotal),diskon:norm(q.diskon),diskon_persen:norm(q.diskon_persen),diskon_nominal:norm(q.diskon_nominal),total:norm(q.total),grand_total:norm(q.grand_total)};
    const detail=(items||[]).map(x=>({kode:norm(x.kode),item:norm(x.item||x.nama_item),harga_jual:norm(x.harga_jual||x.harga),harga_modal:norm(x.harga_modal),tipe_perhitungan:norm(x.tipe_perhitungan||x.tipe),qty:norm(x.qty||x.jumlah),lebar:norm(x.lebar),tinggi:norm(x.tinggi),panjang:norm(x.panjang),tanggal_mulai:norm(x.tanggal_mulai),tanggal_selesai:norm(x.tanggal_selesai),durasi:norm(x.durasi),subtotal:norm(x.subtotal)}));
    return JSON.stringify({header,detail});
  }
  function revisionKey(id){return `PM_QUOTATION_REVISION_${Number(id)||0}`}
  function getRevision(id){try{return Math.max(0,N(localStorage.getItem(revisionKey(id))||0))}catch(_){return 0}}
  function setRevision(id,value){try{return Math.max(0,N(localStorage.setItem(revisionKey(id),String(Math.max(0,N(value))))||value))}catch(_){return Math.max(0,N(value))}}

  async function normalizeSavedQuote(id,isEdit,oldRow,eventName,changed){
    const d=dbx();if(!d)return null;
    const row=await quoteById(id);if(!row)return null;
    let number=S(row.nomor_penawaran);
    if(isEdit){
      number=S(oldRow?.nomor_penawaran)||number||baseNumber(eventName||row.nama_event,id);
      if(number!==S(row.nomor_penawaran)){const u=await d.from('penawaran').update({nomor_penawaran:number}).eq('id',id);if(u.error)throw u.error;}
    }else if(!/^PM-/i.test(number)||/^PM-\d{6}$/i.test(number)){number=baseNumber(eventName||row.nama_event,id,number)}
    const revision=isEdit?(changed?setRevision(id,getRevision(id)+1):getRevision(id)):0;
    const event=S(eventName||row.nama_event||'event');
    window.__PM_LAST_QUOTATION_NUMBER=number;
    window.__PM_LAST_QUOTATION_ID=id;
    window.__PM_QUOTATION_REVISION=revision;
    window.__PM_PRINT_FILENAME=quoteFilename(event,number,revision);
    return number;
  }

  function installSave(){
    if(typeof window.saveQuote!=='function'||window.saveQuote.__pmDocumentNumbering)return false;
    const original=window.saveQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);let oldRow=null,oldItems=[];
      if(editing){oldRow=await quoteById(editing);oldItems=await quoteItems(editing)}
      const eventName=S(document.querySelector('#qeve')?.value);const oldSignature=editing?businessSignature(oldRow,oldItems):'';
      const result=await original.apply(this,arguments);
      try{
        if(editing){const fresh=await quoteById(editing);const freshItems=await quoteItems(editing);const changed=oldSignature!==businessSignature(fresh,freshItems);await normalizeSavedQuote(editing,true,oldRow,eventName||fresh?.nama_event,changed)}
        else{const d=dbx();if(d){const r=await d.from('penawaran').select('id,nomor_penawaran,nama_event,nama_client,perusahaan').order('id',{ascending:false}).limit(1).maybeSingle();if(!r.error&&r.data)await normalizeSavedQuote(r.data.id,false,null,eventName||r.data.nama_event,false)}}
      }catch(e){console.error('[PM] numbering save',e)}
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.saveQuote=wrapped;return true;
  }

  function installInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function'||window.invoiceEdit.__pmDocumentNumbering)return false;
    const original=window.invoiceEdit;
    const wrapped=async function(id){const result=await original.apply(this,arguments);try{const d=dbx();if(!d)return result;const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event').eq('id',Number(id)).maybeSingle();if(!r.error&&r.data&&r.data.nomor_penawaran){const input=document.getElementById('invNo');if(input&&!S(r.data.nomor_invoice))input.value=`INV-${S(r.data.nomor_penawaran)}`}}catch(e){console.warn('[PM] invoice numbering',e)}return result};
    wrapped.__pmDocumentNumbering=true;window.invoiceEdit=wrapped;return true;
  }

  function installQuotationPrint(){
    if(typeof window.printQuote!=='function'||window.printQuote.__pmDocumentNumbering)return false;
    const original=window.printQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);let number=S(window.__PM_LAST_QUOTATION_NUMBER),eventName=S(document.querySelector('#qeve')?.value),row=null;
      if(editing){row=await quoteById(editing);if(row?.nomor_penawaran)number=S(row.nomor_penawaran);if(!eventName)eventName=S(row.nama_event)}
      if(!number)number=baseNumber(eventName,Date.now());
      const revision=Math.max(0,N(window.__PM_QUOTATION_REVISION||(editing?getRevision(editing):0)));
      window.__PM_PRINT_DOCUMENT_NUMBER=number;
      window.__PM_PRINT_FILENAME=quoteFilename(eventName,number,revision);
      const result=await original.apply(this,arguments);
      const root=document.getElementById('pmPrintPreview');
      if(root){const tag=root.querySelector('.pm-doc-tag strong');if(tag)tag.textContent=number;const span=root.querySelector('.pm-print-toolbar span');if(span)span.textContent=`A4 Portrait • ${number}`}
      document.title=window.__PM_PRINT_FILENAME.replace(/\.pdf$/i,'');
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.printQuote=wrapped;return true;
  }

  function installInvoicePreview(){
    if(typeof window.previewInvoice!=='function'||window.previewInvoice.__pmDocumentNumbering)return false;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const no=S(document.getElementById('invNo')?.value);const result=await original.apply(this,arguments);const root=document.getElementById('pmInvoicePreview');
      const eventName=currentInvoiceEvent();
      window.__PM_INVOICE_PRINT_NUMBER=no;window.__PM_PRINT_FILENAME=invoiceFilename(eventName,no);
      if(root&&no)root.querySelectorAll('.pm-inv-number,.pm-doc-tag strong,[data-pm-invoice-number]').forEach(el=>el.textContent=no);
      document.title=window.__PM_PRINT_FILENAME.replace(/\.pdf$/i,'');
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.previewInvoice=wrapped;return true;
  }

  function currentInvoiceEvent(){
    try{
      const p=document.querySelector('#content .head p');
      const fromHeader=S(p?.textContent).split('•').slice(1).join('•').trim();
      if(fromHeader)return fromHeader;
      const h=document.querySelector('#content .pm-inv-box .pm-inv-client')?.closest?.('.pm-inv-box');
      return S(h?.textContent).replace(/REFERENSI PENAWARAN\s*\/\s*EVENT/i,'').replace(/\s+/g,' ').trim()||'event';
    }catch(_){return'event'}
  }

  function boot(){installSave();installInvoiceEdit();installQuotationPrint();installInvoicePreview()}
  boot();
  const mo=new MutationObserver(()=>boot());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>mo.disconnect(),10000);

  window.addEventListener('beforeprint',function(){
    const filename=S(window.__PM_PRINT_FILENAME);
    if(filename)document.title=filename.replace(/\.pdf$/i,'');
  },true);
})();