/* Priangan Multimedia — quotation schema bridge FINAL
 * Live penawaran schema requires nama_event. Legacy save code may send
 * event_name and/or name_event. Translate both aliases to nama_event and
 * remove unsupported aliases before Supabase receives the write.
 * Read-only elsewhere; no schema/data migration.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_SCHEMA_BRIDGE_V2)return;
window.__PM_QUOTATION_SCHEMA_BRIDGE_V2=true;
function patch(client){
 if(!client||client.__pmQuotationSchemaBridgeV2)return;
 if(typeof client.from!=='function')return;
 const originalFrom=client.from.bind(client);
 client.from=function(table){
  const q=originalFrom(table);
  if(table!=='penawaran'||!q)return q;
  const normalize=row=>{
   if(!row||typeof row!=='object')return row;
   const out={...row};
   const canonical=out.nama_event!=null&&String(out.nama_event).trim()!==''
    ?out.nama_event
    :(out.event_name!=null&&String(out.event_name).trim()!==''?out.event_name:out.name_event);
   if(canonical!=null)out.nama_event=canonical;
   delete out.event_name;
   delete out.name_event;
   return out;
  };
  if(typeof q.insert==='function'&&!q.__pmInsertBridgeV2){
   const oi=q.insert.bind(q);
   q.insert=function(values,options){return oi(Array.isArray(values)?values.map(normalize):normalize(values),options)};
   q.__pmInsertBridgeV2=true;
  }
  if(typeof q.update==='function'&&!q.__pmUpdateBridgeV2){
   const ou=q.update.bind(q);
   q.update=function(values,options){return ou(normalize(values),options)};
   q.__pmUpdateBridgeV2=true;
  }
  return q;
 };
 client.__pmQuotationSchemaBridgeV2=true;
}
function boot(){
 try{if(typeof db!=='undefined'&&db)patch(db)}catch(_){}
 try{patch(window.db)}catch(_){}
 try{patch(window.__PM_STABLE_DB)}catch(_){}
 try{patch(window.__PRIANGAN_QUOTE_DB)}catch(_){}
}
boot();[0,50,150,400,800,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
