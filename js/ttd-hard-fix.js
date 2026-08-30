/* TTD hard fix: load the saved signature once, without querying template_surat repeatedly. */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  let active = null;

  function getTemplate() {
    let row = {};
    try {
      const backup = JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}');
      if (backup && typeof backup === 'object') row = { ...backup };
    } catch (_) {}
    if (typeof template !== 'undefined' && template) row = { ...row, ...template };
    return row;
  }

  function storageCandidates(raw) {
    const value = clean(raw);
    if (!value) return [];
    if (/^(data:|blob:|https?:\/\/)/i.test(value)) return [{ direct: value }];
    const out = [];
    const parts = value.split('/').filter(Boolean);
    if (parts.length > 1) out.push({ bucket: parts[0], path: parts.slice(1).join('/') });
    ['surat-assets', 'templates', 'assets'].forEach((bucket) => out.push({ bucket, path: value }));
    return out.filter((x, i, a) => i === a.findIndex((y) => x.direct === y.direct && x.bucket === y.bucket && x.path === y.path));
  }

  function publicUrl(bucket, path) {
    const C = window.PRIANGAN_CONFIG || {};
    const base = clean(localStorage.getItem('SUPABASE_URL') || C.SUPABASE_URL).replace(/\/$/, '');
    if (!base) return '';
    return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
  }

  function testImage(img, src, timeout = 3500) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        img.removeEventListener('load', onload);
        img.removeEventListener('error', onerror);
        clearTimeout(timer);
        resolve(ok);
      };
      const onload = () => finish(img.naturalWidth > 0);
      const onerror = () => finish(false);
      const timer = setTimeout(() => finish(img.naturalWidth > 0), timeout);
      img.addEventListener('load', onload, { once: true });
      img.addEventListener('error', onerror, { once: true });
      img.src = src;
    });
  }

  async function resolveAndLoad(img, raw) {
    const client = (typeof db !== 'undefined' && db?.storage) ? db : null;
    for (const c of storageCandidates(raw)) {
      if (c.direct) {
        if (await testImage(img, c.direct)) return true;
        continue;
      }

      if (client) {
        try {
          const downloaded = await client.storage.from(c.bucket).download(c.path);
          if (!downloaded.error && downloaded.data) {
            const objectUrl = URL.createObjectURL(downloaded.data);
            if (await testImage(img, objectUrl)) return true;
            URL.revokeObjectURL(objectUrl);
          }
        } catch (_) {}

        try {
          const signed = await client.storage.from(c.bucket).createSignedUrl(c.path, 3600);
          if (!signed.error && signed.data?.signedUrl && await testImage(img, signed.data.signedUrl)) return true;
        } catch (_) {}
      }

      const pub = publicUrl(c.bucket, c.path);
      if (pub && await testImage(img, pub)) return true;
    }
    return false;
  }

  async function apply() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return false;
    const box = overlay.querySelector('.pm-signature-box');
    if (!box) return false;

    const t = getTemplate();
    const raw = clean(t.ttd_url);
    const name = box.querySelector('strong');
    const role = box.querySelector('.pm-signature-role');
    if (name && clean(t.nama_penandatangan)) name.textContent = clean(t.nama_penandatangan);
    if (role && clean(t.jabatan_penandatangan)) role.textContent = clean(t.jabatan_penandatangan);
    if (!raw) return false;

    let img = box.querySelector('img.signature');
    if (!img) {
      img = document.createElement('img');
      img.className = 'signature';
      img.alt = `Tanda tangan ${clean(t.nama_penandatangan)}`;
      const line = box.querySelector('.pm-signature-line');
      box.insertBefore(img, line || box.firstChild);
    }

    img.removeAttribute('onerror');
    img.style.display = 'block';
    img.style.visibility = 'visible';
    img.style.opacity = '1';
    img.style.width = 'auto';
    img.style.maxWidth = '110px';
    img.style.height = '38px';
    img.style.maxHeight = '38px';
    img.style.objectFit = 'contain';
    img.style.margin = '0 auto 1px';
    img.style.border = '0';
    img.style.background = 'transparent';

    const ok = await resolveAndLoad(img, raw);
    img.dataset.pmTtdLoaded = ok ? '1' : '0';
    return ok;
  }

  async function run() {
    if (active) return active;
    active = apply().finally(() => { active = null; });
    return active;
  }

  window.pmHardFixTTD = run;

  let last = null;
  const observer = new MutationObserver(() => {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay || overlay === last) return;
    last = overlay;
    setTimeout(run, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
