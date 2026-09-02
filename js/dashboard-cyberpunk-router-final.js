/* Priangan Multimedia — Dashboard Cyberpunk Router FINAL
 * Routing-only bridge. Does not modify data, database, or transaction functions.
 * Lets the existing app render first, then hands only the Dashboard view to the
 * already-loaded Cyberpunk reporting renderer. No polling and no repeated queries.
 */
(function(){
  'use strict';
  if(window.__PM_CY_ROUTER_FINAL)return;
  window.__PM_CY_ROUTER_FINAL=true;

  function isDashboard(){
    const active=document.querySelector('.nav.active[data-p="dashboard"]');
    return !!active;
  }

  function run(){
    if(!isDashboard())return;
    const fn=window.pmRenderDashboardCyber;
    if(typeof fn!=='function')return;
    try{ fn(); }catch(e){ console.error('[PM] Cyberpunk dashboard router',e); }
  }

  /* app.js handles navigation in a bubble listener. We wait one tick so its
     normal renderer finishes, then replace only the Dashboard presentation. */
  document.addEventListener('click',function(ev){
    const nav=ev.target?.closest?.('.nav[data-p="dashboard"]');
    if(!nav)return;
    setTimeout(run,0);
  },false);

  /* Initial boot: app.js performs async Supabase loading before its final
     render(). One delayed hand-off is enough; there is deliberately no loop. */
  window.addEventListener('load',function(){ setTimeout(run,1800); },{once:true});
  setTimeout(run,2500);
})();
