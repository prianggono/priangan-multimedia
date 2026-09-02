/* Priangan Multimedia — quotation + invoice save schema bridge */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V2)return;
  window.__PM_QUOTATION_SAVE_BUTTON_FINAL_V2=true;
  function numeric(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  }
  function money(v){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(numeric(v));}
  function dbClients(){
    const out=[];
    try{if(typeof db!=='undefined'&&db)out.push(db)}catch(_){}
    try{if(window.db&&!out.includes(window.db))out.push(window.db)}catch(_){}
    try{if(window.__PM_STABLE_DB&&!out.includes(window.__PM_STABLE_DB))out.push(window.__PM_STABLE_DB)}catch(_){}
    return out;
  }
  function patchInvoiceDb(client){
    if(!client||client.__pmInvoiceSchemaBridgeV2||typeof client.from!=='function')return;
    const originalFrom=client.from.bind(client);
    client.from=function(table){
      const query=originalFrom(table);
      if(table!=='penawaran'||!query||typeof query.update!=='function')return query;
      if(query.__pmInvoiceUpdateBridgeV2)return query;
      const originalUpdate=query.update.bind(query);
      query.update=function(values,options){
        if(values&&typeof values==='object'&&!Array.isArray(values)&&Object.prototype.hasOwnProperty.call(values,'catatan_invoice')){
          const clean={...values};
          delete clean.catatan_invoice;
          return originalUpdate(clean,options);
        }
        return originalUpdate(values,options);
      };
      query.__pmInvoiceUpdateBridgeV2=true;
      return query;
    };
    client.__pmInvoiceSchemaBridgeV2=true;
  }
  function patchAll(){dbClients().forEach(patchInvoiceDb)}
  patchAll();[100,300,800,1500,2500].forEach(ms=>setTimeout(patchAll,ms));
  function isQuoteSaveButton(el){return !!el&&el.tagName==='BUTTON'&&/simpan\s+penawaran/i.test((el.textContent||'').trim());}
  document.addEventListener('click',async function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isQuoteSaveButton(btn))return;
    const fn=window.saveQuote;if(typeof fn!=='function')return;
    ev.preventDefault();ev.stopImmediatePropagation();
    const r=document.querySelector('#pmDisc'),oldValue=r?.value;
    if(r)r.value=String(numeric(r.value));
    try{btn.disabled=true;await fn()}
    catch(e){console.error('[PM] quotation save bridge',e);if(typeof window.msg==='function')window.msg('Gagal menyimpan: '+(e?.message||e))}
    finally{btn.disabled=false;if(r){const value=numeric(r.value||oldValue);r.value=money(value)}}
  },true);
  function isInvoiceSaveButton(el){return !!el&&el.tagName==='BUTTON'&&/simpan\s+invoice/i.test((el.textContent||'').trim());}
  function saveInvoiceNoteLocally(){
    try{
      const id=Number(window.__PM_INVOICE_ADD_ID||window.__PM_INVOICE_ADD_STATE?.id||window.__PM_CURRENT_INVOICE_ID||0);
      if(!id)return;
      const note=document.querySelector('#invNotes')?.value??'';
      const key='PM_INVOICE_FALLBACK',store=JSON.parse(localStorage.getItem(key)||'{}')||{};
      store[String(id)]={...(store[String(id)]||{}),catatan_invoice:String(note)};
      localStorage.setItem(key,JSON.stringify(store));
    }catch(e){console.warn('[PM] invoice note local save',e)}
  }
  document.addEventListener('click',function(ev){
    const btn=ev.target?.closest?.('button');
    if(!isInvoiceSaveButton(btn))return;
    saveInvoiceNoteLocally();patchAll();
  },true);
})();
