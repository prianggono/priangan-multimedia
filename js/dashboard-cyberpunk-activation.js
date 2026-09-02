/* Priangan Multimedia — Dashboard Cyberpunk activation bridge FINAL
 * Presentation/routing only. Does not write to Supabase and does not modify
 * Penawaran, Invoice, Payment, Master Harga, or database structure.
 * The core app keeps its original lexical dashboardPage(); this bridge waits
 * until the core render has completed, then hands ONLY Dashboard to the
 * existing Cyberpunk READ-ONLY renderer.
 */
(function(){
  'use strict';
  if(window.__PM_DASH_CY_ACTIVATION_V2)return;
  window.__PM_DASH_CY_ACTIVATION_V2=true;

  function isDashboard(){
    return !!document.querySelector('.nav.active[data-p="dashboard"]');
  }

  function renderCyber(){
    if(!isDashboard())return;
    const fn=window.pmRenderDashboardCyber;
    if(typeof fn!=='function'){
      console.warn('[PM] Cyberpunk dashboard renderer belum tersedia');
      return;
    }
    try{ fn(); }
    catch(e){ console.error('[PM] dashboard cyberpunk activation',e); }
  }

  function schedule(delay){
    window.clearTimeout(window.__pmDashCyberTimer);
    window.__pmDashCyberTimer=window.setTimeout(renderCyber,delay);
  }

  // app.js runs its final render after its async initial database load.
  // One delayed hand-off avoids racing the core app and avoids request loops.
  schedule(2200);

  // app.js handles navigation in the bubble phase. Repaint after it finishes.
  document.addEventListener('click',function(ev){
    if(ev.target?.closest?.('.nav[data-p="dashboard"]'))schedule(0);
  },false);
})();
