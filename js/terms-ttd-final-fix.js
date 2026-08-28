/* Final TTD + Terms fix. Loads the saved signature reliably and renders terms as bullet points. */
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
    } catch (_) {}
    return { ...backup(), ...((typeof template !== 'undefined' && template) ? template : {}), ...row };
  }

  function candidates(raw) {
    const value = clean(raw);
    if (!value) return [];
    const out = [];
    const m = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?]+)\/(.+?)(?:\?.*)?$/i);
    if (m) out.push([decodeURIComponent(m[1]), decodeURIComponent(m[2])]);
    const p = value.split('/').filter(Boolean);
    if (p.length > 1 && !/^https?:$/i.test(p[0])) out.push([p[0], p.slice(1).join('/')]);
    ['surat-assets','templates','assets'].forEach(b => out.push([b, value]));
    return out.filter((x,i,a) => i === a.findIndex(y => y[0] === x[0] && y[1] === x[1]));
  }

  async function resolveImage(raw) {
    const value = clean(raw);
    if (!value) return '';
    if (/^(data:|blob:)/i.test(value)) return value;
    const client = (typeof db !== 'undefined' && db) ? db : null;
    if (client?.storage) {
      for (const [bucket, path] of candidates(value)) {
        try {
          const r = await client.storage.from(bucket).download(path);
          if (!r.error && r.data) return URL.createObjectURL(r.data);
        } catch (_) {}
        try {
          const r = await client.storage.from(bucket).createSignedUrl(path, 3600);
          if (!r.error && r.data?.signedUrl) return r.data.signedUrl;
        } catch (_) {}
        try {
          const r = client.storage.from(bucket).getPublicUrl(path);
          if (r?.data?.publicUrl) return r.data.publicUrl;
        } catch (_) {}
      }
    }
    return value;
  }

  function renderTerms(termsEl, text) {
    if (!termsEl) return;
    const raw = clean(text);
    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const items = lines.map(line => line.replace(/^[-•▪●]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
    if (!items.length) return;
    termsEl.innerHTML = `<ul class="pm-terms-list">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function installCss() {
    if (document.getElementById('pmFinalTtdTermsCss')) return;
    const s = document.createElement('style');
    s.id = 'pmFinalTtdTermsCss';
    s.textContent = `
      #pmPrintPreview .pm-terms-list { margin:0; padding:0 0 0 15px; list-style:disc; }
      #pmPrintPreview .pm-terms-list li { margin:0 0 2px 0; padding-left:2px; }
      #pmPrintPreview .pm-terms-list li:last-child { margin-bottom:0; }
      #pmPrintPreview .pm-signature-box img.signature.pm-final-ttd { display:block !important; visibility:visible !important; opacity:1 !important; width:auto !important; max-width:150px !important; height:58px !important; max-height:58px !important; object-fit:contain !important; margin:0 auto 3px !important; border:0 !important; background:transparent !important; }
      #pmPrintPreview .pm-signature-box .pm-ttd-missing { color:#64748b; font-size:7pt; margin-bottom:4px; }
      @media print { #pmPrintPreview .pm-signature-box img.signature.pm-final-ttd { display:block !important; visibility:visible !important; opacity:1 !important; } }
    `;
    document.head.appendChild(s);
  }

  async function apply() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return;
    installCss();
    const t = await latestTemplate();

    renderTerms(overlay.querySelector('.pm-terms-body'), t.ketentuan || 'DP harus 50%.\nPelunasan dilakukan setelah unit terpasang.');

    const box = overlay.querySelector('.pm-signature-box');
    if (!box) return;
    const line = box.querySelector('.pm-signature-line');
    let img = box.querySelector('img.signature');
    const url = await resolveImage(t.ttd_url);

    if (url) {
      if (!img) {
        img = document.createElement('img');
        img.className = 'signature pm-final-ttd';
        box.insertBefore(img, line || null);
      }
      img.className = 'signature pm-final-ttd';
      img.removeAttribute('onerror');
      img.onerror = function () { this.style.display='none'; };
      img.src = url;
    }

    const name = box.querySelector('strong');
    const role = box.querySelector('.pm-signature-role');
    if (name) name.textContent = clean(t.nama_penandatangan) || '____________________________';
    if (role) role.textContent = clean(t.jabatan_penandatangan);
  }

  window.pmApplyFinalTtdTerms = apply;
  const observer = new MutationObserver(() => {
    if (document.getElementById('pmPrintPreview')) setTimeout(apply, 100);
  });
  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(apply, 300);
})();
