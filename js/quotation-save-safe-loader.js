/* Immediate activation for the safe quotation save handler. */
(function(){
  'use strict';
  function activate(){
    const api=window.__PM_QUOTATION_SAFE_SAVE_API;
    if(!api?.saveSafe)return false;
    if(window.saveQuote===api.saveSafe)return true;
    api.saveSafe.__pmSafeSave=true;
    window.saveQuote=api.saveSafe;
    return true;
  }
  activate();
  [0,100,300,700,1200].forEach(ms=>setTimeout(activate,ms));
  window.addEventListener('load',activate);
})();
