/* Final quotation footer fix: compact terms + reliable TTD from template_surat. */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m]));

  function backup() {
    try { return JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}') || {}; }
    catch (_) { return {}; }
  }

  async function latestTemplate() {
    let row = {};
    try {
      if (typeof db !== 'undefined' && db) {
        const r = await db.from('template_surat').select('*').order('id', { ascending:false }).limit(1).maybeSingle();
        if (!r.error && r.data) row = r.data;
      }
    } catch (e) {
      console.warn('TTD template refresh failed:', e);
    }
    return { ...backup(), ...((typeof template !== 'undefined' && template) ? template : {}), ...row };
  }

  function storageCandidates(raw) {
    const value = clean(raw);
    if (!value) return [];
    const out = [];

    // Supabase full URL: /storage/v1/object/public|sign/<bucket>/<path>
    const m = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?.*)?$/i);
    if (m) out.push([decodeURIComponent(m[1]), decodeURIComponent(m[2])]);

    // bucket/path shorthand
    const parts = value.split('/').filter(Boolean);
    if (parts.length > 1 && !/^https?:$/i.test(parts[0])) {
      out.push([parts[0], parts.slice(1).join('/')]);
    }

    ['surat-assets', 'templates', 'assets'].forEach((bucket) => out.push([bucket, value]));
    return out.filter((x, i, a) => i === a.findIndex((y) => y[0] === x[0] && y[1] === x[1]));
  }

  async function resolveTTD(raw) {
    const value = clean(raw);
    if (!value) return '';
    if (/^(data:|blob:)/i.test(value)) return value;

    const client = (typeof db !== 'undefined' && db) ? db : null;

    // Try authenticated Supabase storage first. This also works for private buckets.
    if (client?.storage) {
      for (const [bucket, path] of storageCandidates(value)) {
        try {
          const downloaded = await client.storage.from(bucket).download(path);
          if (!downloaded.error && downloaded.data) return URL.createObjectURL(downloaded.data);
        } catch (_) {}

        try {
          const signed = await client.storage.from(bucket).createSignedUrl(path, 3600);
          if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
        } catch (_) {}

        try {
          const pub = client.storage.from(bucket).getPublicUrl(path);
          if (pub?.data?.publicUrl) return pub.data.publicUrl;
        } catch (_) {}
      }
    }

    // If the saved value is already a normal URL, use it as final fallback.
    if (/^https?:\/\//i.test(value)) return value;
    return '';
  }

  function renderTerms(el, text) {
    if (!el) return;
    const raw = clean(text);
    const lines = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (!lines.length) return;

    const items = lines
      .map((line) => line.replace(/^[-•▪●]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
      .filter(Boolean);

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
    return { a4, grid, terms, signature };
  }

  function installCss() {
    if (document.getElementById('pmFinalTtdTermsCssV2')) return;
    const s = document.createElement('style');
    s.id = 'pmFinalTtdTermsCssV2';
    s.textContent = `
      #pmPrintPreview .pm-a4 {
        display:flex !important;
        flex-direction:column !important;
      }

      #pmPrintPreview .pm-final-bottom-grid,
      #pmPrintPreview .pm-bottom-grid {
        width:100% !important;
        margin-top:auto !important;
        padding-top:7px !important;
        display:grid !important;
        grid-template-columns:minmax(0, 1.75fr) minmax(155px, .7fr) !important;
        gap:10px !important;
        align-items:end !important;
        page-break-inside:avoid !important;
        break-inside:avoid !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-terms,
      #pmPrintPreview .pm-bottom-grid .pm-terms {
        margin:0 !important;
        min-width:0 !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading {
        padding:4px 6px !important;
        min-height:0 !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading span,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading span {
        width:16px !important;
        height:16px !important;
        font-size:5.5pt !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-section-heading strong,
      #pmPrintPreview .pm-bottom-grid .pm-section-heading strong {
        font-size:6.5pt !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-terms-body,
      #pmPrintPreview .pm-bottom-grid .pm-terms-body {
        padding:5px 7px !important;
        font-size:6.3pt !important;
        line-height:1.28 !important;
      }

      #pmPrintPreview .pm-final-terms-list {
        margin:0 !important;
        padding:0 0 0 13px !important;
        list-style:disc !important;
      }
      #pmPrintPreview .pm-final-terms-list li {
        margin:0 0 1px !important;
        padding-left:1px !important;
      }
      #pmPrintPreview .pm-final-terms-list li:last-child { margin-bottom:0 !important; }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature,
      #pmPrintPreview .pm-bottom-grid .pm-signature {
        width:100% !important;
        margin:0 !important;
        display:flex !important;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:flex-end !important;
        page-break-inside:avoid !important;
        break-inside:avoid !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-label,
      #pmPrintPreview .pm-bottom-grid .pm-signature-label {
        width:100% !important;
        margin:0 0 1px !important;
        text-align:center !important;
        font-size:6.5pt !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box {
        width:100% !important;
        min-height:67px !important;
        height:auto !important;
        margin:0 !important;
        display:flex !important;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:flex-end !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box img.signature,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box img.signature {
        display:block !important;
        visibility:visible !important;
        opacity:1 !important;
        width:auto !important;
        max-width:105px !important;
        height:40px !important;
        max-height:40px !important;
        object-fit:contain !important;
        margin:0 auto 1px !important;
        border:0 !important;
        background:transparent !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-line,
      #pmPrintPreview .pm-bottom-grid .pm-signature-line {
        width:120px !important;
        margin:1px auto 2px !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-box strong,
      #pmPrintPreview .pm-bottom-grid .pm-signature-box strong {
        font-size:6.8pt !important;
        line-height:1.1 !important;
      }

      #pmPrintPreview .pm-final-bottom-grid .pm-signature-role,
      #pmPrintPreview .pm-bottom-grid .pm-signature-role {
        font-size:6.2pt !important;
        line-height:1.1 !important;
        margin-top:1px !important;
      }

      @media print {
        #pmPrintPreview .pm-final-bottom-grid,
        #pmPrintPreview .pm-bottom-grid {
          padding-top:5px !important;
          grid-template-columns:minmax(0, 1.75fr) minmax(150px, .7fr) !important;
        }
        #pmPrintPreview .pm-final-bottom-grid .pm-terms-body,
        #pmPrintPreview .pm-bottom-grid .pm-terms-body { font-size:6.2pt !important; }
        #pmPrintPreview .pm-final-bottom-grid .pm-signature-box,
        #pmPrintPreview .pm-bottom-grid .pm-signature-box { min-height:63px !important; }
        #pmPrintPreview .pm-final-bottom-grid .pm-signature-box img.signature,
        #pmPrintPreview .pm-bottom-grid .pm-signature-box img.signature {
          max-width:100px !important;
          height:38px !important;
          max-height:38px !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  async function apply() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return;

    installCss();
    const layout = ensureBottomGrid(overlay);
    if (!layout) return;

    const t = await latestTemplate();
    renderTerms(layout.terms.querySelector('.pm-terms-body'), t.ketentuan);

    const box = layout.signature.querySelector('.pm-signature-box');
    if (!box) return;

    const line = box.querySelector('.pm-signature-line');
    let img = box.querySelector('img.signature');
    const url = await resolveTTD(t.ttd_url);

    if (url) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'signature pm-final-ttd';
        img.alt = `Tanda tangan ${clean(t.nama_penandatangan)}`;
        if (line) box.insertBefore(img, line);
        else box.prepend(img);
      }
      img.className = 'signature pm-final-ttd';
      img.removeAttribute('onerror');
      img.onerror = () => {
        img.style.display = 'none';
        img.dataset.failed = '1';
      };
      img.style.display = 'block';
      img.style.visibility = 'visible';
      img.style.opacity = '1';
      if (img.src !== url) img.src = url;
    } else if (img) {
      img.remove();
    }

    const name = box.querySelector('strong');
    const role = box.querySelector('.pm-signature-role');
    if (name) name.textContent = clean(t.nama_penandatangan) || '____________________________';
    if (role) role.textContent = clean(t.jabatan_penandatangan);

    // Expose a promise for the print button so PDF is never started before TTD resolves.
    const images = Array.from(overlay.querySelectorAll('img.signature'));
    await Promise.all(images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          image.removeEventListener('load', finish);
          image.removeEventListener('error', finish);
          resolve();
        };
        image.addEventListener('load', finish);
        image.addEventListener('error', finish);
        setTimeout(finish, 4000);
      });
    }));
  }

  window.pmApplyFinalTtdTerms = apply;

  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { apply().catch((e) => console.warn('Final TTD/terms fix:', e)); }, 120);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList:true, subtree:true });
  schedule();
})();
