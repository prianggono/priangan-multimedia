/* Priangan Multimedia — prevent PostgREST single-row coercion failures
 * The quotation save/edit runtime historically used .single(). A response with
 * zero visible rows can throw PGRST116: "Cannot coerce the result to a single
 * JSON object". For penawaran, use maybeSingle() and keep all other queries intact.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_COERCE_FIX_V1)return;
  window.__PM_QUOTATION_SAVE_COERCE_FIX_V1=true;

  function patchBuilder(builder){
    if(!builder || builder.__pmCoercePatched)return builder;
    if(typeof builder.single==='function' && typeof builder.maybeSingle==='function'){
      const maybe=builder.maybeSingle.bind(builder);
      builder.single=function(){ return maybe(); };
      builder.__pmCoercePatched=true;
    }
    return builder;
  }

  function patchClient(client){
    if(!client || client.__pmQuotationCoercePatched || typeof client.from!=='function')return;
    const originalFrom=client.from.bind(client);
    client.from=function(table){
      const q=originalFrom(table);
      if(table!=='penawaran' || !q)return q;

      if(typeof q.insert==='function' && !q.__pmInsertCoercePatched){
        const originalInsert=q.insert.bind(q);
        q.insert=function(values,options){
          const builder=originalInsert(values,options);
          return patchBuilder(builder);
        };
        q.__pmInsertCoercePatched=true;
      }

      if(typeof q.select==='function' && !q.__pmSelectCoercePatched){
        const originalSelect=q.select.bind(q);
        q.select=function(){
          const builder=originalSelect.apply(this,arguments);
          return patchBuilder(builder);
        };
        q.__pmSelectCoercePatched=true;
      }

      return q;
    };
    client.__pmQuotationCoercePatched=true;
  }

  function boot(){
    try{if(typeof db!=='undefined'&&db)patchClient(db)}catch(_){}
    try{patchClient(window.db)}catch(_){}
    try{patchClient(window.__PM_STABLE_DB)}catch(_){}
    try{patchClient(window.__PRIANGAN_QUOTE_DB)}catch(_){}
  }

  boot();
  [50,150,300,700,1500,3000].forEach(ms=>setTimeout(boot,ms));
})();
