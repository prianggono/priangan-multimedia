/* TTD upload bridge.
 * The Template page previously exposed only a URL field. When that field is empty,
 * the preview has no image source at all. This adds a real file picker and stores the
 * selected signature in the existing ttd_url field. It prefers Supabase Storage and
 * falls back to a data URL so the signature still works even when Storage INSERT RLS
 * is not enabled.
 */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  let wired = false;

  function getBackup() {
    try { return JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP') || '{}') || {}; }
    catch (_) { return {}; }
  }

  function setBackup(patch) {
    try {
      const current = getBackup();
      localStorage.setItem('PRIANGAN_TEMPLATE_BACKUP', JSON.stringify({ ...current, ...patch }));
    } catch (_) {}
  }

  function toast(text, ok) {
    if (typeof msg === 'function') {
      msg(text);
      return;
    }
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    el.style.background = ok ? '#0f766e' : '#991b1b';
    setTimeout(() => el.classList.remove('show'), 4000);
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('File TTD tidak dapat dibaca.'));
      reader.readAsDataURL(file);
    });
  }

  async function uploadStorage(file) {
    const client = (typeof db !== 'undefined' && db?.storage) ? db : null;
    if (!client) return '';

    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `ttd/penandatangan-${Date.now()}.${ext}`;

    try {
      const result = await client.storage.from('surat-assets').upload(path, file, {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type || 'image/png'
      });
      if (result.error) return '';
      const pub = client.storage.from('surat-assets').getPublicUrl(path);
      return clean(pub?.data?.publicUrl);
    } catch (_) {
      return '';
    }
  }

  function renderPreview(value) {
    const wrap = document.getElementById('pmTtdUploadPreview');
    const img = document.getElementById('pmTtdUploadPreviewImg');
    if (!wrap || !img) return;
    if (!value) {
      wrap.hidden = true;
      img.removeAttribute('src');
      return;
    }
    img.src = value;
    wrap.hidden = false;
  }

  function ensureUi() {
    const field = document.getElementById('ttd');
    if (!field || wired) return;
    wired = true;

    field.placeholder = 'URL TTD atau otomatis dari file';
    field.autocomplete = 'off';

    const holder = document.createElement('div');
    holder.id = 'pmTtdUploader';
    holder.style.marginTop = '8px';
    holder.innerHTML = `
      <input id="pmTtdFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" style="display:none">
      <button type="button" id="pmTtdChoose" class="btn secondary" style="width:100%">Pilih File TTD</button>
      <div id="pmTtdUploadStatus" style="font-size:12px;color:var(--muted,#94a3b8);margin-top:6px"></div>
      <div id="pmTtdUploadPreview" hidden style="margin-top:8px;padding:8px;border:1px solid rgba(148,163,184,.25);border-radius:8px;background:#fff;text-align:center">
        <img id="pmTtdUploadPreviewImg" alt="Preview TTD" style="max-width:180px;height:65px;object-fit:contain;background:transparent">
      </div>`;
    field.parentElement?.appendChild(holder);

    const choose = document.getElementById('pmTtdChoose');
    const fileInput = document.getElementById('pmTtdFile');
    const status = document.getElementById('pmTtdUploadStatus');

    choose?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast('File TTD harus berupa gambar.', false);
        fileInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast('Ukuran file TTD maksimal 2 MB.', false);
        fileInput.value = '';
        return;
      }

      choose.disabled = true;
      status.textContent = 'Mengunggah TTD...';
      try {
        const dataUrl = await readDataUrl(file);
        renderPreview(dataUrl);

        const publicUrl = await uploadStorage(file);
        const finalUrl = publicUrl || dataUrl;
        field.value = finalUrl;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        setBackup({ ttd_url: finalUrl });

        status.textContent = publicUrl
          ? 'TTD berhasil di-upload ke surat-assets. Klik Simpan Template.'
          : 'TTD siap disimpan sebagai data gambar. Klik Simpan Template.';
        toast('TTD siap disimpan.', true);
      } catch (error) {
        console.error('TTD upload error:', error);
        status.textContent = 'Gagal memproses file TTD.';
        toast('Gagal memproses TTD: ' + (error.message || error), false);
      } finally {
        choose.disabled = false;
        fileInput.value = '';
      }
    });

    const existing = clean(field.value) || clean(getBackup().ttd_url) || clean((typeof template !== 'undefined' && template)?.ttd_url);
    if (!field.value && existing) field.value = existing;
    renderPreview(field.value || existing);
  }

  function watch() {
    if (document.getElementById('ttd')) ensureUi();
    else wired = false;
  }

  new MutationObserver(() => requestAnimationFrame(watch)).observe(document.body, { childList: true, subtree: true });
  requestAnimationFrame(watch);
})();
