/* PRIANGAN MULTIMEDIA — Dashboard spacing/layout fix
 * Keeps dashboard statistic label, value and description separated on mobile/desktop.
 */
(function(){
  'use strict';
  function inject(){
    if(document.getElementById('pm-dashboard-spacing-fix')) return;
    const s=document.createElement('style');
    s.id='pm-dashboard-spacing-fix';
    s.textContent=`
      #content .pm-dash-stat.pm-stat-spacing{
        display:grid !important;
        grid-template-columns:minmax(0,1fr) !important;
        grid-template-rows:auto auto auto !important;
        align-content:start !important;
        justify-items:start !important;
        gap:8px !important;
        width:100% !important;
        min-width:0 !important;
      }
      #content .pm-dash-stat.pm-stat-spacing > small,
      #content .pm-dash-stat.pm-stat-spacing > strong,
      #content .pm-dash-stat.pm-stat-spacing > span{
        display:block !important;
        position:relative !important;
        margin:0 !important;
        width:100% !important;
        min-width:0 !important;
        line-height:1.25 !important;
      }
      #content .pm-dash-stat.pm-stat-spacing > small{line-height:1.35 !important;}
      #content .pm-dash-stat.pm-stat-spacing > strong{line-height:1.15 !important;}
      #content .pm-dash-stat.pm-stat-spacing > span{line-height:1.35 !important;}
      @media(max-width:620px){
        #content .pm-dash-stat.pm-stat-spacing{gap:7px !important;padding:18px !important;}
        #content .pm-dash-stat.pm-stat-spacing > strong{font-size:21px !important;}
      }
    `;
    document.head.appendChild(s);
  }
  function apply(){
    inject();
    document.querySelectorAll('#content .pm-dash-stat').forEach(el=>el.classList.add('pm-stat-spacing'));
  }
  function start(){
    apply();
    const c=document.getElementById('content');
    if(c){
      new MutationObserver(apply).observe(c,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.pmDashboardSpacingFix=apply;
})();
