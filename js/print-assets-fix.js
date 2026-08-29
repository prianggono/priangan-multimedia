/* Print asset repair - safe, one-shot bridge.
 * IMPORTANT: never observe every DOM mutation and never query template_surat
 * repeatedly. The canonical print-fix.js owns the template/TTD database read.
 */
(function () {
  'use strict';

  const S = (v) => String(v ?? '').trim();

  function getCachedTemplate() {
    let row = {};
    try {
      const backup = JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}');
      if (backup && typeof backup === 'object') row = { ...backup };
    } catch (_) {}

    if (typeof template !== 'undefined' && template) {
      row = { ...row, ...template };
    }
    return row;
  }

  function directStorageUrl(raw) {
    const value = S(raw);
    if (!value) return '';
    if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;

    const C = window.PRIANGAN_CONFIG || {};
    const base = S(localStorage.getItem('SUPABASE_URL') || C.SUPABASE_URL).replace(/\/$/, '');
    if (!base) return value;

    const parts = value.split('/').filter(Boolean);
    if (parts.length > 1) {
      const bucket = parts.shift();
      const path = parts.join('/').split('/').map(encodeURIComponent).join('/');
      return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
    }
    return value;
  }

  function ensureImage(container, selector, className, alt, src) {
    if (!container || !src) return null;
    let img = container.querySelector(selector);
    if (!img) {
      img = document.createElement('img');
      img.className = className;
      img.alt = alt;
      container.insertBefore(img, container.firstChild);
    }
    img.style.display = 'block';
    img.style.visibility = 'visible';
    img.style.opacity = '1';
    img.removeAttribute('onerror');
    if (img.src !== src) img.src = src;
    return img;
  }

  async function repairFromCache() {
    const preview = document.getElementById('pmPrintPreview');
    if (!preview) return false;

    const t = getCachedTemplate();

    const logoUrl = directStorageUrl(t.logo_url);
    const logoWrap = preview.querySelector('.pm-logo-wrap');
    if (logoWrap && logoUrl) {
      const logo = ensureImage(logoWrap, 'img.logo', 'logo', 'Logo Priangan Multimedia', logoUrl);
      if (logo) {
        logo.style.width = '104px';
        logo.style.height = '104px';
        logo.style.maxWidth = 'none';
        logo.style.maxHeight = 'none';
        logo.style.objectFit = 'contain';
        logo.style.background = 'transparent';
        logo.style.border = '0';
        logo.style.boxShadow = 'none';
      }
    }

    const signatureUrl = directStorageUrl(t.ttd_url);
    const signatureBox = preview.querySelector('.pm-signature-box');
    if (signatureBox && signatureUrl) {
      const signature = ensureImage(
        signatureBox,
        'img.signature',
        'signature',
        'Tanda tangan ' + S(t.nama_penandatangan),
        signatureUrl
      );
      if (signature) {
        signature.style.width = 'auto';
        signature.style.maxWidth = '150px';
        signature.style.height = '58px';
        signature.style.maxHeight = '58px';
        signature.style.objectFit = 'contain';
        signature.style.margin = '1px auto 0';
      }
    }

    const name = signatureBox?.querySelector('strong');
    const role = signatureBox?.querySelector('.pm-signature-role');
    if (name && t.nama_penandatangan) name.textContent = t.nama_penandatangan;
    if (role && t.jabatan_penandatangan) role.textContent = t.jabatan_penandatangan;
    return true;
  }

  let retryPromise = null;
  window.pmRepairPrintAssets = repairFromCache;

  // A manual retry may delegate to the canonical loader. It is guarded so
  // multiple callers cannot start overlapping template reads.
  window.pmRetryTTD = async function () {
    if (retryPromise) return retryPromise;
    retryPromise = (async () => {
      if (typeof window.pmApplyPrintFixes === 'function') {
        await window.pmApplyPrintFixes();
        return true;
      }
      return repairFromCache();
    })().finally(() => { retryPromise = null; });
    return retryPromise;
  };
})();
