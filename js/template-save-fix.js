/* Template save fix: robust Supabase write + clear error handling. */
(function () {
  const TOAST_ID = 'toast';

  function toast(message, ok) {
    const el = document.getElementById(TOAST_ID);
    if (!el) return window.alert(message);
    el.textContent = message;
    el.classList.add('show');
    el.style.background = ok ? '#0f766e' : '#991b1b';
    clearTimeout(window.__pmTemplateToast);
    window.__pmTemplateToast = setTimeout(() => {
      el.classList.remove('show');
      el.style.background = '';
    }, 4500);
  }

  function cfg() {
    const C = window.PRIANGAN_CONFIG || {};
    return {
      url: (localStorage.getItem('SUPABASE_URL') || C.SUPABASE_URL || '').trim(),
      key: (localStorage.getItem('SUPABASE_ANON_KEY') || C.SUPABASE_ANON_KEY || '').trim()
    };
  }

  function val(id) {
    return document.getElementById(id)?.value?.trim() || '';
  }

  async function saveTemplateFixed() {
    const button = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent.trim() === 'Simpan Template'
    );
    if (button?.dataset.saving === '1') return;

    const { url, key } = cfg();
    if (!url || !key || !window.supabase?.createClient) {
      toast('Supabase belum terhubung. Cek Pengaturan Database.', false);
      return;
    }

    const payload = {
      nama_template: val('tn'),
      logo_url: val('tl'),
      kop_text: val('tk'),
      alamat: val('ta'),
      telepon: val('tt'),
      whatsapp: val('tw'),
      email: val('te'),
      website: val('tweb'),
      ketentuan: val('tket'),
      nama_penandatangan: val('tp'),
      jabatan_penandatangan: val('tj'),
      ttd_url: val('ttd')
    };

    if (button) {
      button.dataset.saving = '1';
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Menyimpan...';
    }

    try {
      const client = window.supabase.createClient(url, key);

      const latest = await client
        .from('template_surat')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest.error) throw latest.error;

      let result;
      if (latest.data?.id) {
        result = await client
          .from('template_surat')
          .update(payload)
          .eq('id', latest.data.id)
          .select('id')
          .single();
      } else {
        result = await client
          .from('template_surat')
          .insert([payload])
          .select('id')
          .single();
      }

      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error('Database tidak mengembalikan ID template.');

      localStorage.setItem('PRIANGAN_TEMPLATE_BACKUP', JSON.stringify(payload));

      toast('Template berhasil disimpan ke Supabase.', true);
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error('Template save error:', error);
      const message = error?.message || String(error);
      const detail = /row-level security|permission denied|42501/i.test(message)
        ? ' RLS Supabase memblokir penulisan. Buat policy INSERT/UPDATE untuk template_surat.'
        : '';
      toast('Gagal menyimpan template: ' + message + detail, false);
    } finally {
      if (button) {
        button.disabled = false;
        button.dataset.saving = '0';
        button.textContent = button.dataset.originalText || 'Simpan Template';
      }
    }
  }

  window.saveTemplate = saveTemplateFixed;
})();
