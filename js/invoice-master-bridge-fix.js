/* Priangan Multimedia — expose app master data to invoice modules */
(function(){
  'use strict';
  function sync(){
    try {
      if (typeof masters !== 'undefined' && Array.isArray(masters)) {
        window.masters = masters;
      }
    } catch (_) {}
  }
  sync();
  setInterval(sync, 250);
})();
