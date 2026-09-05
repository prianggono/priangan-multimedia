/* Priangan Multimedia — Invoice event/reference card must match quotation */
(function(){
  'use strict';
  if (window.__PM_INVOICE_EVENT_CARD_MATCH_FINAL) return;
  window.__PM_INVOICE_EVENT_CARD_MATCH_FINAL = true;

  const S = v => String(v ?? '').trim();
  const esc = v => S(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const dateID = v => {
    if (!v) return '-';
    const d = new Date(S(v).slice(0,10) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
  };

  function apply(){
    const preview = document.getElementById('pmInvoicePreview');
    if (!preview) return;
    const boxes = preview.querySelectorAll('.pm-inv-info .pm-inv-box');
    if (boxes.length < 2) return;

    const box = boxes[1];
    const row = window.__pmCurrentInvoiceRow || window.currentInvoice?.row || null;
    const event = S(row?.event_name || row?.nama_event || row?.event || '');
    const start = row?.tanggal_mulai || '';
    const end = row?.tanggal_selesai || '';

    // The invoice preview already has the correct values in its DOM.
    // Preserve those values if the source row is not exposed globally.
    const current = Array.from(box.children);
    const eventText = event || S(current[2]?.textContent) || '-';
    const startText = start ? dateID(start) : S(current[3]?.textContent).split('—')[0]?.trim() || '-';
    const endText = end ? dateID(end) : S(current[3]?.textContent).split('—')[1]?.trim() || startText;

    box.innerHTML = `
      <div class="pm-inv-label">EVENT / PROJECT</div>
      <div class="pm-inv-client">${esc(eventText)}</div>
      <div class="pm-inv-label pm-inv-period-label">PERIODE</div>
      <div class="pm-inv-period">${startText} — ${endText}</div>`;

    box.classList.add('pm-inv-event-match');
  }

  const observer = new MutationObserver(() => {
    if (document.getElementById('pmInvoicePreview')) {
      requestAnimationFrame(apply);
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.pmApplyInvoiceEventCardMatch = apply;
})();
