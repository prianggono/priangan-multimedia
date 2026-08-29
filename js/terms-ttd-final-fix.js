/* Final quotation footer fix: compact terms + TTD without request loops. */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

  function backup() {
    try { return JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}') || {}; }
    catch (_) { return {}; }
  }

  function currentTemplate() {
    const local = backup();
    const globalTemplate = (typeof template !== 'undefined' && template) ? template : {};
    return { ...local, ...globalTemplate };
  }

  function renderTerms(el, value) {
    if (!el) return;
    const raw = clean(value);
    if (!raw) return;
    const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const items = lines.map((line) => line.replace(/^[-•▪●]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
    if (!items.length) return;
    el.innerHTML = `<ul class="pm-final-terms-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function ensureBottomGrid(overlay) {
    const a4 = overlay.querySelector('.pm-a4');
    const terms = overlay.querySelector('.pm-terms');
    const signature = overlay.querySelector('.pm-signature');
    if (!a4 || !terms || !signature) return null;

    let grid = a4.querySelector('.pm-bottom-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'pm-bottom-grid pm-final-bottom-grid';
      terms.parentNode.insertBefore(grid, terms);
      grid.appendChild(terms);
      grid.appendChild(signature);
    } else {
      if (terms.parentElement !== grid) grid.appendChild(terms);
      if (signature.parentElement !== grid) grid.appendChild(signature);
    }
    return { terms, signature };
  }

  function installCss() {
    if (document.getElementById('pmFinalTtdTermsCssV3')) return;
    const s = document.createElement('style');
    s.id = 'pmFinalTtdTermsCssV3';
    s.textContent = `
      #pmPrintPreview .pm-a4 { display:flex !important; flex-direction:column !important; }
      #pmPrintPreview .pm-final-bottom-grid,
      #pmPrintPreview .pm-bottom-grid {
        width:100% !important; margin-top:auto !important; padding-top:7px !important;
        display:grid !important; grid-template-columns:minmax(0,1.75fr) minmax(155px,.7fr) !important;
        gap:10px !important; align-items:end !important; page-break-inside:avoid !important; break-inside:avoid !important;
      }
      #pmPrintPreview .pm-final-bottom-grid .pm-terms,
      #pmPrintPreview .pm-bottom-grid .pm-terms { margin:0 !important; min-width:0 !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading { padding:4px 6px !important; min-height:0 !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading span,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading span { width:16px !important; height:16px !important; font-size:5.5pt !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading strong,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading strong { font-size:6.5pt !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-terms-body,
      #pmPrintPreview .pm-bottom-grid .pm-terms-body { padding:5px 7px !important; font-size:6.3pt !important; line-height:1.28 !important; }
      #pmPrintPreview .pm-final-terms-list { margin:0 !important; padding:0 0 0 13px !important; list-style:disc !important; }
      #pmPrintPreview .pm-final-terms-list li { margin:0 0 1px !important; padding-left:1px !important; }
      #pmPrintPreview .pm-final-terms-list li:last-child { margin-bottom:0 !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature,
      #pmPrintPreview .pm-bottom-grid .pm-signature {
        width:100% !important; margin:0 !important; display:flex !important; flex-direction:column !important;
        align-items:center !important; justify-content:flex-end !important; page-break-inside:avoid !important; break-inside:avoid !important;
      }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-label,
      #pmPrintPreview .pm-bottom-grid .pm-signature-label { width:100% !important; margin:0 0 1px !important; text-align:center !important; font-size:6.5pt !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box {
        width:100% !important; min-height:67px !important; height:auto !important; margin:0 !important;
        display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:flex-end !important;
      }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box img.signature,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box img.signature {
        display:block !important; visibility:visible !important; opacity:1 !important; width:auto !important;
        max-width:105px !important; height:40px !important; max-height:40px !important; object-fit:contain !important;
        margin:0 auto 1px !important; border:0 !important; background:transparent !important;
      }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-line,
      #pmPrintPreview .pm-bottom-grid .pm-signature-line { width:120px !important; margin:1px auto 2px !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box strong,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box strong { font-size:6.8pt !important; line-height:1.1 !important; }
      #pmPrintPreview .pm-final-bottom-grid .pm-signature-role,
      #pmPrintPreview .pm-bottom-grid .pm-signature-role { font-size:6.2pt !important; line-height:1.1 !important; margin-top:1px !important; }
      @media print {
        #pmPrintPreview .pm-final-bottom-grid,#pmPrintPreview .pm-bottom-grid { padding-top:5px !important; grid-template-columns:minmax(0,1.75fr) minmax(150px,.7fr) !important; }
        #pmPrintPreview .pm-final-bottom-grid .pm-terms-body,#pmPrintPreview .pm-bottom-grid .pm-terms-body { font-size:6.2pt !important; }
        #pmPrintPreview .pm-final-bottom-grid .pm-signature-box,#pmPrintPreview .pm-bottom-grid .pm-signature-box { min-height:63px !important; }
        #pmPrintPreview .pm-final-bottom-grid .pm-signature-box img.signature,#pmPrintPreview .pm-bottom-grid .pm-signature-box img.signature { max-width:100px !important; height:38px !important; max-height:38px !important; }
      }
    `;
    document.head.appendChild(s);
  }

  function apply() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay || overlay.dataset.pmTermsTtdApplied === '1') return;
    const layout = ensureBottomGrid(overlay);
    if (!layout) return;
    installCss();

    const t = currentTemplate();
    renderTerms(layout.terms.querySelector('.pm-terms-body'), t.ketentuan);

    const box = layout.signature.querySelector('.pm-signature-box');
    if (box) {
      const name = box.querySelector('strong');
      const role = box.querySelector('.pm-signature-role');
      if (name) name.textContent = clean(t.nama_penandatangan) || name.textContent || '____________________________';
      if (role) role.textContent = clean(t.jabatan_penandatangan) || role.textContent || '';

      // Do not resolve storage here. print.js / print-fix owns TTD loading.
      // This avoids duplicate storage requests and lets the canonical loader finish.
      const img = box.querySelector('img.signature');
      if (img) {
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
      }
    }

    overlay.dataset.pmTermsTtdApplied = '1';
  }

  window.pmApplyFinalTtdTerms = apply;

  let lastOverlay = null;
  let timer = null;
  function schedule() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay || overlay === lastOverlay) return;
    lastOverlay = overlay;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { apply(); } catch (e) { console.warn('Final TTD/terms fix:', e); }
    }, 80);
  }

  // Watch only for a NEW preview overlay. The previous implementation watched
  // every DOM mutation and re-queried template_surat on every mutation, causing
  // hundreds of identical Supabase requests and ERR_INSUFFICIENT_RESOURCES.
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList:true, subtree:true });
  schedule();
})();
