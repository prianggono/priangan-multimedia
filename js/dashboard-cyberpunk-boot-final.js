/* Priangan Multimedia — Cyberpunk Dashboard SAFE BOOT v3
 * Presentation-only. Never writes Supabase and never changes transaction logic.
 * IMPORTANT: call the Cyberpunk renderer at most once per dashboard activation.
 * The previous observer/interval repeatedly invoked the renderer while its async
 * Supabase queries were pending, causing ERR_INSUFFICIENT_RESOURCES.
 */
(function(){
  'use strict';
  if(window.__PM_DASH_CYBER_BOOT_V3)return;
  window.__PM_DASH_CYBER_BOOT_V3=true;

  let running=false;
  let activated=false;

  function isDashboard(){
    const b=document.querySelector('.nav.active[data-p="dashboard"]');
    return !!b;
  }

  function apply(){
    if(!isDashboard()){
      activated=false;
      running=false;
      return;
    }
    if(activated || running)return;
    if(typeof window.pmRenderDashboardCyber!=='function')return;
    const c=document.querySelector('#content');
    if(!c)return;

    activated=true;
    running=true;
    try{
      const r=window.pmRenderDashboardCyber();
      if(r && typeof r.then==='function'){
        r.catch(e=>console.error('[PM] cyber dashboard render',e))
         .finally(()=>{running=false;});
      }else{
        running=false;
      }
    }catch(e){
      running=false;
      console.error('[PM] cyber dashboard boot',e);
    }
  }

  function boot(){
    /* One initial attempt only. No polling and no MutationObserver loop. */
    apply();
    setTimeout(apply,500);
  }

  /* Navigation can replace #content; detect only dashboard button clicks. */
  document.addEventListener('click',function(ev){
    const b=ev.target?.closest?.('.nav[data-p="dashboard"]');
    if(!b)return;
    activated=false;
    running=false;
    setTimeout(apply,80);
  },true);

  /* If the application changes active page without a click, a single delayed
     check is enough; never continuously poll Supabase. */
  setTimeout(boot,0);
})();
