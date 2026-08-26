/* Final quotation print fixes: larger transparent logo, combined contact, reliable Supabase TTD */
(function () {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clean = (value) => String(value ?? '').trim();

  function escHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function getLocalTemplateBackup() {
    try {
      const raw = localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP');
      return raw ? JSON.parse(raw) : {};
    } catch (_) { return {}; }
  }

  async function getLatestTemplate() {
    let latest = {};
    try {
      if (typeof db !== 'undefined' && db) {
        const result = await db.from('template_surat').select('*').order('id', { ascending: false }).limit(1);
        if (!result.error && result.data?.[0]) latest = result.data[0];
      }
    } catch (error) {
      console.warn('Template print refresh failed:', error);
    }

    const globalTemplate = (typeof template !== 'undefined' && template) ? template : {};
    const backup = getLocalTemplateBackup();
    return {
      ...backup,
      ...globalTemplate,
      ...latest,
      ttd_url: clean(latest.ttd_url) || clean(globalTemplate.ttd_url) || clean(backup.ttd_url),
      logo_url: clean(latest.logo_url) || clean(globalTemplate.logo_url) || clean(backup.logo_url),
      nama_penandatangan: clean(latest.nama_penandatangan) || clean(globalTemplate.nama_penandatangan) || clean(backup.nama_penandatangan),
      jabatan_penandatangan: clean(latest.jabatan_penandatangan) || clean(globalTemplate.jabatan_penandatangan) || clean(backup.jabatan_penandatangan)
    };
  }

  function storageCandidates(raw) {
    const value = clean(raw);
    if (!value) return [];
    const out = [];
    const parts = value.split('/').filter(Boolean);
    if (parts.length > 1) out.push([parts[0], parts.slice(1).join('/')]);

    const match = value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/i);
    if (match) out.push([decodeURIComponent(match[1]), decodeURIComponent(match[2])]);

    ['surat-assets', 'templates', 'assets'].forEach((bucket) => out.push([bucket, value]));
    return out.filter((pair, index, self) => index === self.findIndex((x) => x[0] === pair[0] && x[1] === pair[1]));
  }

  async function resolveStorageUrl(value) {
    const raw = clean(value);
    if (!raw) return '';
    if (/^(data:|blob:)/i.test(raw)) return raw;
    if (typeof db === 'undefined' || !db?.storage) return raw;

    for (const [bucket, path] of storageCandidates(raw)) {
      try {
        const signed = await db.storage.from(bucket).createSignedUrl(path, 3600);
        if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
      } catch (_) {}
      try {
        const pub = db.storage.from(bucket).getPublicUrl(path);
        if (pub?.data?.publicUrl) return pub.data.publicUrl;
      } catch (_) {}
    }

    // Keep complete URLs as the final fallback.
    return raw;
  }

  function buildContact(t) {
    const telp = clean(t.telepon);
    const wa = clean(t.whatsapp);
    if (telp && wa && telp === wa) return `Telp / WA ${telp}`;
    if (telp && wa) return `Telp ${telp} / WA ${wa}`;
    if (telp || wa) return `Telp / WA ${telp || wa}`;
    return '';
  }

  async function applyFixes() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return;

    const t = await getLatestTemplate();
    const logoUrl = await resolveStorageUrl(t.logo_url);
    const ttdUrl = await resolveStorageUrl(t.ttd_url);

    const brand = overlay.querySelector('.pm-brand');
    if (brand) {
      const name = clean(t.kop_text) || 'PRIANGAN MULTIMEDIA';
      const address = clean(t.alamat);
      const contact = buildContact(t);
      const email = clean(t.email);
      const website = clean(t.website);
      brand.innerHTML = `
        <div class="pm-brand-name">${escHtml(name)}</div>
        <div class="pm-brand-sub">SALES &amp; QUOTATION</div>
        ${address ? `<p class="pm-address">${escHtml(address)}</p>` : ''}
        ${contact || email ? `<p class="pm-contact">${escHtml(contact)}${contact && email ? '  •  ' : ''}${escHtml(email)}</p>` : ''}
        ${website ? `<p class="website">${escHtml(website)}</p>` : ''}`;
    }

    const logoWrap = overlay.querySelector('.pm-logo-wrap');
    if (logoWrap && logoUrl) {
      let img = logoWrap.querySelector('img.logo');
      if (!img) {
        logoWrap.innerHTML = '';
        img = document.createElement('img');
        img.className = 'logo';
        img.alt = 'Logo Priangan Multimedia';
        logoWrap.appendChild(img);
      }
      img.onerror = () => console.warn('Logo gagal dimuat:', img.src);
      img.src = logoUrl;
    }

    const sigBox = overlay.querySelector('.pm-signature-box');
    if (sigBox) {
      const line = sigBox.querySelector('.pm-signature-line');
      const nameEl = sigBox.querySelector('strong');
      const roleEl = sigBox.querySelector('.pm-signature-role');
      let img = sigBox.querySelector('img.signature');

      if (ttdUrl) {
        if (!img) {
          img = document.createElement('img');
          img.className = 'signature';
          img.alt = `Tanda tangan ${clean(t.nama_penandatangan)}`;
          sigBox.insertBefore(img, line || nameEl || null);
        }
        img.style.display = 'block';
        img.style.visibility = 'visible';
        img.style.opacity = '1';
        img.src = ttdUrl;
        img.onerror = () => console.warn('TTD gagal dimuat:', img.src);
      } else if (img) {
        img.remove();
      }

      if (nameEl) nameEl.textContent = clean(t.nama_penandatangan) || '____________________________';
      if (roleEl) roleEl.textContent = clean(t.jabatan_penandatangan);
    }

    const style = document.getElementById('pmPrintFixStyles') || document.createElement('style');
    style.id = 'pmPrintFixStyles';
    style.textContent = `
      #pmPrintPreview .pm-letterhead { min-height:118px !important; padding:10px 16px !important; gap:16px !important; }
      #pmPrintPreview .pm-logo-wrap { width:120px !important; height:108px !important; flex:0 0 120px !important; border-radius:0 !important; background:transparent !important; border:none !important; box-shadow:none !important; display:flex !important; align-items:center !important; justify-content:center !important; overflow:visible !important; }
      #pmPrintPreview .pm-letterhead .logo { width:112px !important; height:112px !important; max-width:none !important; max-height:none !important; object-fit:contain !important; transform:none !important; background:transparent !important; border:none !important; box-shadow:none !important; }
      #pmPrintPreview .pm-brand-name { font-size:18px !important; }
      #pmPrintPreview .pm-brand p { white-space:nowrap !important; }
      #pmPrintPreview .pm-contact { font-weight:700 !important; }
      #pmPrintPreview .pm-signature { width:220px !important; }
      #pmPrintPreview .pm-signature-box { min-height:125px !important; }
      #pmPrintPreview .pm-signature .signature { width:auto !important; max-width:190px !important; height:82px !important; max-height:82px !important; object-fit:contain !important; margin:0 auto 2px !important; display:block !important; }
      #pmPrintPreview .pm-signature-line { width:190px !important; margin:3px auto 4px !important; }
      @media print {
        #pmPrintPreview .pm-letterhead { min-height:118px !important; }
        #pmPrintPreview .pm-logo-wrap { width:120px !important; height:108px !important; background:transparent !important; border:none !important; overflow:visible !important; }
        #pmPrintPreview .pm-letterhead .logo { width:112px !important; height:112px !important; transform:none !important; background:transparent !important; border:none !important; }
      }
    `;
    if (!style.parentNode) document.head.appendChild(style);

    const images = Array.from(overlay.querySelectorAll('img'));
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => { img.removeEventListener('load', done); img.removeEventListener('error', done); resolve(); };
        img.addEventListener('load', done);
        img.addEventListener('error', done);
        setTimeout(done, 3000);
      });
    }));
    await sleep(50);
  }

  const originalPrintQuote = window.printQuote;
  if (typeof originalPrintQuote === 'function' && !window.__pmFinalPrintFixInstalled) {
    window.__pmFinalPrintFixInstalled = true;
    window.printQuote = async function () {
      await originalPrintQuote();
      await applyFixes();
    };
    window.pmApplyPrintFixes = applyFixes;
  }
})();
