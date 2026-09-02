/* Priangan Multimedia — quotation save schema bridge
 * Fixes the live DB schema where penawaran_jadwal.item_id is NOT NULL.
 * The existing save engine uses penawaran_item_id; keep both references populated.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_SCHEMA_FIX_V1)return;
  window.__PM_QUOTATION_SAVE_SCHEMA_FIX_V1=true;

  function patchClient(client){
    if(!client || client.__pmScheduleSchemaPatched)return;
    if(typeof client.from!=='function')return;
    const originalFrom=client.from.bind(client);
    client.from=function(table){
      const query=originalFrom(table);
      if(table!=='penawaran_jadwal' || !query || typeof query.insert!=='function')return query;
      if(query.__pmScheduleInsertPatched)return query;
      const originalInsert=query.insert.bind(query);
      query.insert=function(values,options){
        const normalize=row=>{
          if(!row || typeof row!=='object')return row;
          const out={...row};
          if(out.item_id==null && out.penawaran_item_id!=null)out.item_id=out.penawaran_item_id;
          return out;
        };
        const fixed=Array.isArray(values)?values.map(normalize):normalize(values);
        return originalInsert(fixed,options);
      };
      query.__pmScheduleInsertPatched=true;
      return query;
    };
    client.__pmScheduleSchemaPatched=true;
  }

  function boot(){
    try{if(typeof db!=='undefined'&&db)patchClient(db)}catch(_){}
    try{if(window.db)patchClient(window.db)}catch(_){}
    try{if(window.__PRIANGAN_QUOTE_DB)patchClient(window.__PRIANGAN_QUOTE_DB)}catch(_){}
    try{if(window.__PM_STABLE_DB)patchClient(window.__PM_STABLE_DB)}catch(_){}
  }

  boot();
  [100,300,800,1500,2500].forEach(ms=>setTimeout(boot,ms));
})();
