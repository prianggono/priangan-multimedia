/* Priangan Multimedia — database view health check
 * Read-only diagnostics for application-facing Supabase views.
 * It is intentionally NOT executed during startup; run window.PM_CHECK_DB_VIEWS() manually when diagnosing.
 */
(function(){
  'use strict';
  const REQUIRED_VIEWS=['v_client_app','v_daftar_penawaran_app','v_dashboard_keuangan','v_item_master_picker','v_keuangan_app','v_master_harga_app','v_pembayaran_app','v_penawaran_app','v_penawaran_detail_app'];
  const S=v=>String(v??'').trim();
  function getDb(){
    try{if(typeof db!=='undefined'&&db)return db}catch(_){}
    const cfg=window.PRIANGAN_CONFIG||{};
    const url=S(cfg.SUPABASE_URL),key=S(cfg.SUPABASE_ANON_KEY);
    return url&&key&&window.supabase?.createClient?window.supabase.createClient(url,key):null;
  }
  async function checkViews(){
    const client=getDb();
    if(!client){window.PM_DB_VIEW_HEALTH={ok:false,checked:0,total:REQUIRED_VIEWS.length,error:'Supabase belum terhubung.'};return window.PM_DB_VIEW_HEALTH;}
    try{
      const results=await Promise.all(REQUIRED_VIEWS.map(async view=>{const result=await client.from(view).select('*',{count:'exact',head:true});return{view,ok:!result.error,error:result.error?.message||null};}));
      const failed=results.filter(r=>!r.ok);
      window.PM_DB_VIEW_HEALTH={ok:failed.length===0,checked:results.length-failed.length,total:results.length,failed:failed.map(r=>r.view),results,checked_at:new Date().toISOString()};
      console.info('[Priangan] DB view health:',window.PM_DB_VIEW_HEALTH);
    }catch(e){window.PM_DB_VIEW_HEALTH={ok:false,checked:0,total:REQUIRED_VIEWS.length,error:e?.message||String(e)};}
    return window.PM_DB_VIEW_HEALTH;
  }
  window.PM_CHECK_DB_VIEWS=checkViews;
})();
