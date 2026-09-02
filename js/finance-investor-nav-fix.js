/* Priangan Multimedia — Investor Finance navigation bridge */
(function(){
'use strict';
if(window.__PM_FINANCE_INVESTOR_NAV_FIX)return;
window.__PM_FINANCE_INVESTOR_NAV_FIX=true;
function bind(){
  if(typeof window.financeInvestorPage!=='function')return;
  window.financePageStable=function(from='',to=''){return window.financeInvestorPage(from,to)};
  window.financePage=function(from='',to=''){return window.financeInvestorPage(from,to)};
}
bind();
setTimeout(bind,0);setTimeout(bind,100);setTimeout(bind,500);setTimeout(bind,1000);
})();
