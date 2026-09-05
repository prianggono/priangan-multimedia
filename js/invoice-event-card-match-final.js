/* Priangan Multimedia — Invoice event card matches quotation exactly */
(function(){
  'use strict';
  if (window.__PM_INVOICE_EVENT_CARD_MATCH_FINAL_V2) return;
  window.__PM_INVOICE_EVENT_CARD_MATCH_FINAL_V2 = true;

  const S = v => String(v ?? '').trim();
  const esc = v => S(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function apply(){
    const preview = document.getElementById('pmInvoicePreview');
    if (!preview) return;
    const boxes = preview.querySelectorAll('.pm-inv-info .pm-inv-box');
    if (boxes.length < 2) return;
    const box = boxes[1];
    if (box.dataset.pmEventMatched === '1') return;

    /* Original invoice DOM order is:
       0 label REFERENSI..., 1 quotation number, 2 EVENT NAME, 3 DATE RANGE.
       Read these BEFORE replacing the markup. */
    const children = Array.from(box.children);
    const eventName = S(children[2]?.textContent) || '-';
    const period = S(children[3]?.textContent) || '-';

    box.innerHTML = `
      <div class="pm-inv-label">EVENT / PROJECT</div>
      <div class="pm-inv-client">${esc(eventName)}</div>
      <div class="pm-inv-label pm-inv-period-label">PERIODE</div>
      <div class="pm-inv-period">${esc(period)}</div>`;
    box.dataset.pmEventMatched = '1';
    box.classList.add('pm-inv-event-match');
  }

  const observer = new MutationObserver(function(){
    if (document.getElementById('pmInvoicePreview')) requestAnimationFrame(apply);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.pmApplyInvoiceEventCardMatch = apply;
})();
