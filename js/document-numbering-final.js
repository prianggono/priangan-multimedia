/* Priangan Multimedia — document numbering & PDF filename
 * Quotation number stays stable during normal edits.
 * PDF filename:
 *   Penawaran - [EVENT] - [QUOTATION NUMBER].pdf
 *   Penawaran - [EVENT] - [QUOTATION NUMBER] V1.pdf
 *   Penawaran - [EVENT] - [QUOTATION NUMBER] V2.pdf
 *
 * A revision suffix is added ONLY when quotation business data actually changes.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_FINAL)return;
  window.__PM_DOCUMENT_NUMBERING_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const dbx=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PM_STABLE_DB||window.db||null};
  const toast=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);

  function slug(v){
    return S(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-+/g,'-')
      .toLowerCase()||'event';
  }

  function digitsFromNumber(no,seed){
    const raw=S(no).replace(/\s+V\d+$/i,'').match(/(\d{6})$/);
    if(raw)return raw[1];
    const s=String(seed??Date.now()).replace(/\D/g,'');
    return s.slice(-6).padStart(6,'0');
  }

  function baseNumber(eventName,seed,sourceNo){
    const year=new Date().getFullYear();
    return `PM-${slug(eventName)}-${year}-${digitsFromNumber(sourceNo,seed)}`;
  }

  function splitRevision(no){
    const m=S(no).match(/^(.*?)(?:\s+V(\d+))?$/i);
    return {base:m?.[1]||S(no),rev:m?.[2]?Number(m[2]):0};
  }

  function nextRevision(no){
    const x=splitRevision(no);
    return `${x.base} V${x.rev+1}`;
  }

  async function quoteById(id){
    const d=dbx();if(!d||!id)return null;
    try{
      const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,nama_client,perusahaan,telepon_wa,telepon,whatsapp,email,tanggal_mulai,tanggal_selesai,subtotal,diskon,diskon_persen,diskon_nominal,total,grand_total').eq('id',id).maybeSingle();
      return r.error?null:r.data;
    }catch(_){return null}
  }

  async function quoteItems(id){
    const d=dbx();if(!d||!id)return [];
    try{
      const r=await d.from('penawaran_items').select('kode,item,nama_item,harga_jual,harga,harga_modal,tipe_perhitungan,tipe,qty,jumlah,lebar,tinggi,panjang,tanggal_mulai,tanggal_selesai,durasi,subtotal').eq('penawaran_id',id).order('id');
      return r.error?[]:(r.data||[]);
    }catch(_){return []}
  }

  function norm(v){
    if(v==null)return '';
    if(typeof v==='number')return Number.isFinite(v)?Math.round(v*100)/100:0;
    return S(v);
  }

  function businessSignature(row,items){
    const q=row||{};
    const header={
      nama_event:norm(q.nama_event), nama_client:norm(q.nama_client), perusahaan:norm(q.perusahaan),
      telepon_wa:norm(q.telepon_wa||q.telepon||q.whatsapp), email:norm(q.email),
      tanggal_mulai:norm(q.tanggal_mulai), tanggal_selesai:norm(q.tanggal_selesai),
      subtotal:norm(q.subtotal), diskon:norm(q.diskon), diskon_persen:norm(q.diskon_persen),
      diskon_nominal:norm(q.diskon_nominal), total:norm(q.total), grand_total:norm(q.grand_total)
    };
    const detail=(items||[]).map(x=>({
      kode:norm(x.kode), item:norm(x.item||x.nama_item), harga_jual:norm(x.harga_jual||x.harga),
      harga_modal:norm(x.harga_modal), tipe_perhitungan:norm(x.tipe_perhitungan||x.tipe),
      qty:norm(x.qty||x.jumlah), lebar:norm(x.lebar), tinggi:norm(x.tinggi), panjang:norm(x.panjang),
      tanggal_mulai:norm(x.tanggal_mulai), tanggal_selesai:norm(x.tanggal_selesai),
      durasi:norm(x.durasi), subtotal:norm(x.subtotal)
    }));
    return JSON.stringify({header,detail});
  }

  function filename(eventName,number,revision){
    const ev=slug(eventName||'event').replace(/-/g,'_');
    const rev=revision>0?` V${revision}`:'';
    return `Penawaran - ${ev} - ${number}${rev}.pdf`;
  }

  async function normalizeSavedQuote(id,isEdit,oldRow,eventName,changed){
    const d=dbx();if(!d)return null;
    const row=await quoteById(id);if(!row)return null;
    let number=S(row.nomor_penawaran);
    if(isEdit){
      // Keep the existing quotation number. Revision is tracked in the PDF filename,
      // not by changing the business document number.
      number=S(oldRow?.nomor_penawaran)||number||baseNumber(eventName||row.nama_event,id);
      if(number!==S(row.nomor_penawaran)){
        const u=await d.from('penawaran').update({nomor_penawaran:number}).eq('id',id);
        if(u.error)throw u.error;
      }
    }else if(!/^PM-/i.test(number)||/^PM-\d{6}$/i.test(number)){
      number=baseNumber(eventName||row.nama_event,id,number);
    }else{
      const p=number.split('-');
      if(p.length===2&&/^\d+$/.test(p[1]))number=baseNumber(eventName||row.nama_event,id,number);
    }
    if(number!==S(row.nomor_penawaran)){
      const u=await d.from('penawaran').update({nomor_penawaran:number}).eq('id',id);
      if(u.error)throw u.error;
    }
    const revision=isEdit&&changed?((splitRevision(S(oldRow?.nomor_penawaran||row.nomor_penawaran)).rev)+1):(splitRevision(number).rev);
    const event=S(eventName||row.nama_event||'event');
    window.__PM_LAST_QUOTATION_NUMBER=number;
    window.__PM_LAST_QUOTATION_ID=id;
    window.__PM_QUOTATION_REVISION=revision;
    window.__PM_PRINT_FILENAME=filename(event,number,revision);
    return number;
  }

  function installSave(){
    if(typeof window.saveQuote!=='function')return false;
    if(window.saveQuote.__pmDocumentNumbering)return true;
    const original=window.saveQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
      let oldRow=null,oldItems=[];
      if(editing){
        oldRow=await quoteById(editing);
        oldItems=await quoteItems(editing);
      }
      const eventName=S(document.querySelector('#qeve')?.value);
      const oldSignature=editing?businessSignature(oldRow,oldItems):'';
      const result=await original.apply(this,arguments);
      try{
        if(editing){
          const fresh=await quoteById(editing);
          const freshItems=await quoteItems(editing);
          const changed=oldSignature!==businessSignature(fresh,freshItems);
          await normalizeSavedQuote(editing,true,oldRow,eventName||fresh?.nama_event,changed);
        }else{
          const d=dbx();
          if(d){
            const r=await d.from('penawaran').select('id,nomor_penawaran,nama_event,nama_client,perusahaan').order('id',{ascending:false}).limit(1).maybeSingle();
            if(!r.error&&r.data)await normalizeSavedQuote(r.data.id,false,null,eventName||r.data.nama_event,false);
          }
        }
      }catch(e){console.error('[PM] numbering save',e)}
      return result;
    };
    wrapped.__pmDocumentNumbering=true;
    window.saveQuote=wrapped;
    return true;
  }

  function installInvoiceEdit(){
    if(typeof window.invoiceEdit!=='function')return false;
    if(window.invoiceEdit.__pmDocumentNumbering)return true;
    const original=window.invoiceEdit;
    const wrapped=async function(id){
      const result=await original.apply(this,arguments);
      try{
        const d=dbx();if(!d)return result;
        const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice').eq('id',Number(id)).maybeSingle();
        if(!r.error&&r.data&&r.data.nomor_penawaran){
          const input=document.getElementById('invNo');
          if(input&&!S(r.data.nomor_invoice))input.value=`INV-${S(r.data.nomor_penawaran)}`;
        }
      }catch(e){console.warn('[PM] invoice numbering',e)}
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.invoiceEdit=wrapped;return true;
  }

  function installQuotationPrint(){
    if(typeof window.printQuote!=='function')return false;
    if(window.printQuote.__pmDocumentNumbering)return true;
    const original=window.printQuote;
    const wrapped=async function(){
      const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
      let number=S(window.__PM_LAST_QUOTATION_NUMBER),eventName=S(document.querySelector('#qeve')?.value);
      if(editing){const row=await quoteById(editing);if(row?.nomor_penawaran)number=S(row.nomor_penawaran);if(!eventName)eventName=S(row.nama_event)}
      if(!number)number=baseNumber(eventName,Date.now());
      const revision=Math.max(0,N(window.__PM_QUOTATION_REVISION));
      window.__PM_PRINT_DOCUMENT_NUMBER=number;
      window.__PM_PRINT_FILENAME=filename(eventName,number,revision);
      const result=await original.apply(this,arguments);
      const root=document.getElementById('pmPrintPreview');
      if(root){
        const tag=root.querySelector('.pm-doc-tag strong');if(tag)tag.textContent=number;
        const span=root.querySelector('.pm-print-toolbar span');if(span)span.textContent=`A4 Portrait • ${number}`;
      }
      document.title=filename(eventName,number,revision).replace(/\.pdf$/i,'');
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.printQuote=wrapped;return true;
  }

  function installInvoicePreview(){
    if(typeof window.previewInvoice!=='function')return false;
    if(window.previewInvoice.__pmDocumentNumbering)return true;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const no=S(document.getElementById('invNo')?.value);const result=await original.apply(this,arguments);
      const root=document.getElementById('pmInvoicePreview');
      if(root&&no)root.querySelectorAll('.pm-inv-number,.pm-doc-tag strong,[data-pm-invoice-number]').forEach(el=>el.textContent=no);
      window.__PM_INVOICE_PRINT_NUMBER=no;
      window.__PM_PRINT_FILENAME=`Invoice - ${slug(currentInvoiceEvent()).replace(/-/g,'_')} - ${no}.pdf`;
      document.title=window.__PM_PRINT_FILENAME.replace(/\.pdf$/i,'');
      return result;
    };
    wrapped.__pmDocumentNumbering=true;window.previewInvoice=wrapped;return true;
  }

  function currentInvoiceEvent(){
    try{const p=document.querySelector('#content .head p');return S(p?.textContent).split('•').slice(1).join('•').trim()||'invoice'}catch(_){return'invoice'}
  }

  function installPrint(){
    if(typeof window.print!=='function')return false;
    if(window.print.__pmDocumentNumbering)return true;
    const original=window.print;
    const wrapped=function(){
      const invoice=S(window.__PM_INVOICE_PRINT_NUMBER),quote=S(window.__PM_PRINT_DOCUMENT_NUMBER),filenameNow=S(window.__PM_PRINT_FILENAME);
      const no=invoice&&document.getElementById('pmInvoicePreview')?invoice:quote&&document.getElementById('pmPrintPreview')?quote:'';
      const oldTitle=document.title;
      if(filenameNow)document.title=filenameNow.replace(/\.pdf$/i,'');
      else if(no)document.title=`${invoice?'Invoice':'Penawaran'} - ${no}`;
      try{return original.apply(this,arguments)}finally{document.title=oldTitle;}
    };
    wrapped.__pmDocumentNumbering=true;window.print=wrapped;return true;
  }

  function boot(){installSave();installInvoiceEdit();installQuotationPrint();installInvoicePreview();installPrint()}
  boot();
  const mo=new MutationObserver(()=>boot());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>mo.disconnect(),10000);
})();
