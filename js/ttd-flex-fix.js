/* TTD flex bridge - no DOM observer and no database polling. */
(function () {
  'use strict';

  let promise = null;

  window.pmForceTTD = async function () {
    if (promise) return promise;
    promise = (async () => {
      if (typeof window.pmApplyPrintFixes === 'function') {
        await window.pmApplyPrintFixes();
        return true;
      }
      if (typeof window.pmRepairPrintAssets === 'function') {
        return window.pmRepairPrintAssets();
      }
      return false;
    })().finally(() => { promise = null; });
    return promise;
  };
})();
