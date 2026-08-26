/*
 * Print asset repair
 * - Keeps Level 120–200 calculation untouched.
 * - Repairs logo + signature URLs coming from Supabase Storage.
 * - Supports full Supabase storage URLs, bucket/path values, public URLs and expired signed URLs.
 * - Re-injects the image if the original print renderer removed it after an error.
 */
(function () {
  'use strict';

  const S = (v) => String(v ?? '').trim();

  function getDB() {
    if (typeof db !== 'undefined' && db) return db;
    const C = window.PRIANGAN_CONFIG || {};
    const url = S(localStorage.getItem('SUPABASE_URL') || C.SUPABASE_URL);
    const key = S(localStorage.getItem('SUPABASE_ANON_KEY') || C.SUPABASE_ANON_KEY);
    return url && key && window.supabase?.createClient
      ? window.supabase.createClient(url, key)
      : null;
  }

  async function getTemplate() {
    const d = getDB();
    let row = {};

    if (d) {
      try {
        const r = await d
          .from('template_surat')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!r.error && r.data) row = r.data;
      } catch (e) {
        console.warn('Print asset template read failed:', e);
      }
    }

    try {
      const backup = JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}');
      if (backup && typeof backup === 'object') {
        row = { ...backup, ...row };
        if (!row.logo_url && backup.logo_url) row.logo_url = backup.logo_url;
        if (!row.ttd_url && backup.ttd_url) row.ttd_url = backup.ttd_url;
      }
    } catch (_) {}

    if (typeof template !== 'undefined' && template) {
      row = { ...template, ...row };
    }

    return row;
  }

  function candidates(raw) {
    const value = S(raw);
    if (!value) return [];
    if (/^(data:|blob:)/i.test(value)) return [['__direct__', value]];

    const out = [];

    // Full Supabase Storage URL:
    // /storage/v1/object/public/<bucket>/<path>
    // /storage/v1/object/sign/<bucket>/<path>?token=...
    const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/i);
    if (match) {
      try {
        out.push([decodeURIComponent(match[1]), decodeURIComponent(match[2])]);
      } catch (_) {
        out.push([match[1], match[2]]);
      }
    }

    // bucket/path format.
    const parts = value.split('/').filter(Boolean);
    if (parts.length > 1 && !/^https?:$/i.test(parts[0])) {
      out.push([parts[0], parts.slice(1).join('/')]);
    }

    // Common buckets used by this project.
    ['surat-assets', 'templates', 'assets'].forEach((bucket) => {
      out.push([bucket, value]);
    });

    return out.filter((pair, i, arr) =>
      arr.findIndex((x) => x[0] === pair[0] && x[1] === pair[1]) === i
    );
  }

  async function resolve(raw) {
    const value = S(raw);
    if (!value) return '';
    if (/^(data:|blob:)/i.test(value)) return value;

    const d = getDB();
    if (!d) return value;

    for (const [bucket, path] of candidates(value)) {
      if (bucket === '__direct__') return path;

      // Prefer a fresh signed URL. This also fixes old/expired signed URLs.
      try {
        const signed = await d.storage.from(bucket).createSignedUrl(path, 3600);
        if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
      } catch (_) {}

      try {
        const pub = d.storage.from(bucket).getPublicUrl(path);
        if (pub?.data?.publicUrl) return pub.data.publicUrl;
      } catch (_) {}
    }

    // Last fallback: original value.
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

  async function repair() {
    const preview = document.getElementById('pmPrintPreview');
    if (!preview) return;

    const t = await getTemplate();

    // LOGO
    const logoUrl = await resolve(t.logo_url);
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

    // SIGNATURE
    const signatureUrl = await resolve(t.ttd_url);
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
        signature.style.maxWidth = '190px';
        signature.style.height = '82px';
        signature.style.maxHeight = '82px';
        signature.style.objectFit = 'contain';
        signature.style.margin = '1px auto 0';
      }
    }

    // Always restore the signer text from the current template.
    const name = signatureBox?.querySelector('strong');
    const role = signatureBox?.querySelector('.pm-signature-role');
    if (name && t.nama_penandatangan) name.textContent = t.nama_penandatangan;
    if (role && t.jabatan_penandatangan) role.textContent = t.jabatan_penandatangan;
  }

  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => repair().catch((e) => console.warn('Print asset repair:', e)), 180);
  };

  const observer = new MutationObserver(() => {
    if (document.getElementById('pmPrintPreview')) schedule();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.pmRepairPrintAssets = repair;

  // Also expose a manual retry for the existing TTD repair script.
  window.pmRetryTTD = async function () {
    await repair();
    return true;
  };
})();
