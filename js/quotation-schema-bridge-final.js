/* Priangan Multimedia — quotation schema bridge
 * The live penawaran table uses nama_event. Keep legacy callers working by
 * translating event_name -> nama_event only for penawaran writes.
 * No schema/data migration; unrelated tables and reads are untouched.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_SCHEMA_BRIDGE_V1)return;
window.__PM_QUOTATION_SCHEMA_BRIDGE_V1=true;
function patch(client){
 if(!client||client.__pmQuotationSchemaBridge)return;
 if(typeof client.from!=='function')return;
 const originalFrom=client.from.bind(client);
 client.from=function(table){
  const q=originalFrom(table);
  if(table!=='penawaran'||!q)return q;
  if(typeof q.insert==='function'&&!q.__pmInsertBridge){
   const oi=q.insert.bind(q);
   q.insert=function(values,options){
    const fix=row=>{
     if(!row||typeof row!=='object')return row;
     const out={...row};
     if(out.nama_event==null&&out.event_name!=null)out.nama_event=out.event_name;
     delete out.event_name;
     return out;
    };
    return oi(Array.isArray(values)?values.map(fix):fix(values),options);
   };
   q.__pmInsertBridge=true;
  }
  if(typeof q.update==='function'&&!q.__pmUpdateBridge){
   const ou=q.update.bind(q);
   q.update=function(values){
    let out=values;
    if(values&&typeof values==='object'){
     out={...values};
     if(out.nama_event==null&&out.event_name!=null)out.nama_event=out.event_name;
     delete out.event_name;
    }
    return ou(out);
   };
   q.__pmUpdateBridge=true;
  }
  return q;
 };
 client.__pmQuotationSchemaBridge=true;
}
function boot(){
 try{if(typeof db!=='undefined'&&db)patch(db)}catch(_){}
 try{patch(window.db)}catch(_){}
 try{patch(window.__PM_STABLE_DB)}catch(_){}
 try{patch(window.__PRIANGAN_QUOTE_DB)}catch(_){}
}
boot();[50,150,400,800,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
