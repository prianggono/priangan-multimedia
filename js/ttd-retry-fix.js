/* TTD retry bridge: reuse the canonical print-fix loader instead of creating a second URL resolver. */
(function () {
  'use strict';

  let timer = null;
  let lastOverlay = null;

  async function retry() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return;
    if (typeof window.pmApplyPrintFixes === 'function') {
      try {
        await window.pmApplyPrintFixes();
      } catch (error) {
        console.warn('TTD retry gagal:', error);
      }
    }
  }

  function schedule() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay || overlay === lastOverlay) return;
    lastOverlay = overlay;
    clearTimeout(timer);
    timer = setTimeout(retry, 150);
  }

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });

  window.pmRetryTTD = retry;
})();
