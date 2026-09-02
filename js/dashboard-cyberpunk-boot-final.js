/* Priangan Multimedia — Dashboard Cyberpunk boot bridge
 * Presentation-only. Does not touch Supabase data or transaction functions.
 * Re-applies the Cyberpunk dashboard after legacy async dashboard renderers finish.
 */
(function(){
  'use strict';
  function activeDashboard(){
    const b=document.querySelector('.nav.active[data-p="dashboard"]');
    return !!b;
  }
  function apply(){
    if(!activeDashboard()) return;
    if(typeof window.pmRenderDashboardCyber!=='function') return;
    const c=document.querySelector('#content');
    if(!c) return;
    if(c.querySelector('#pmCyDashboard')) return;
    try{ window.pmRenderDashboardCyber(); }catch(e){ console.error('[PM] cyber dashboard boot',e); }
  }
  function boot(){
    apply();
    setTimeout(apply,150);
    setTimeout(apply,500);
    setTimeout(apply,1000);
    setTimeout(apply,1800);
  }
  boot();
  const obs=new MutationObserver(function(){
    if(activeDashboard()){
      const c=document.querySelector('#content');
      if(c && !c.querySelector('#pmCyDashboard')) setTimeout(apply,30);
    }
  });
  const c=document.querySelector('#content');
  if(c) obs.observe(c,{childList:true,subtree:false});
  setInterval(function(){
    if(activeDashboard()){
      const x=document.querySelector('#content');
      if(x && !x.querySelector('#pmCyDashboard')) apply();
    }
  },1200);
})();
