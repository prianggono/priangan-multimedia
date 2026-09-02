/* Priangan Multimedia — Dashboard Cyberpunk activation bridge
 * UI/routing only. Does not write to Supabase and does not modify transaction logic.
 * The core app keeps its original dashboardPage() lexical function, so this bridge
 * re-applies the Cyberpunk READ-ONLY renderer after the core renderer finishes.
 */
(function(){
  'use strict';
  if(window.__PM_DASH_CY_ACTIVATION_V1)return;
  window.__PM_DASH_CY_ACTIVATION_V1=true;

  function renderCyber(){
    try{
      if(typeof window.pmRenderDashboardReport==='function'){
        window.pmRenderDashboardReport();
      }
    }catch(e){console.error('[PM] dashboard cyberpunk activation',e)}
  }

  function schedule(){
    window.clearTimeout(window.__pmDashCyberTimer);
    window.__pmDashCyberTimer=window.setTimeout(renderCyber,180);
  }

  // Initial app render happens after app.js initialization.
  window.setTimeout(renderCyber,900);
  window.setTimeout(renderCyber,1800);

  // The core router uses a lexical render() function, so intercept only the
  // Dashboard navigation click and repaint after the core renderer completes.
  document.addEventListener('click',function(ev){
    const nav=ev.target?.closest?.('.nav[data-p="dashboard"]');
    if(nav)schedule();
  },true);
})();
