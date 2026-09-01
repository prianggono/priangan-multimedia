/* Priangan Multimedia — final quotation reset guard */
(function(){
  'use strict';
  const originalGo = window.go;
  if (typeof originalGo !== 'function' || window.__PM_STABILITY_RESET_PATCHED) return;
  window.go = function(target){
    if (target !== 'quotation') return originalGo.apply(this, arguments);
    const edit = !!(window.__pmPendingEdit || window.__pmEditingQuotationId || window.__PM_EDIT_QUOTATION_ID);
    if (edit) return originalGo.apply(this, arguments);
    const result = originalGo.apply(this, arguments);
    window.items = [];
    window.__pmItems = [];
    if (typeof window.drawItems === 'function') window.drawItems();
    else if (typeof window.addItem === 'function') window.addItem();
    return result;
  };
  window.__PM_STABILITY_RESET_PATCHED = true;
})();
