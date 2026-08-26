/* Client master + quotation contact persistence.
 * Every quotation contact is stored immediately when a quotation is saved,
 * including DRAFT. The same company may have multiple contacts.
 */
(function () {
  'use strict';

  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  function getDb() {
    if (typeof db !== 'undefined' && db) return db;
    if (window.__PRIANGAN_QUOTE_DB) return window.__PRIANGAN_QUOTE_DB;
    const cfg = window.PRIANGAN_CONFIG || {};
    const url = clean(localStorage.getItem('SUPABASE_URL') || cfg.SUPABASE_URL);
    const key = clean(localStorage.getItem('SUPABASE_ANON_KEY') || cfg.SUPABASE_ANON_KEY);
    if (!url || !key || !window.supabase?.createClient) return null;
    window.__PRIANGAN_QUOTE_DB = window.supabase.createClient(url, key);
    return window.__PRIANGAN_QUOTE_DB;
  }

  const show = (text) => {
    if (typeof window.msg === 'function') window.msg(text);
    else alert(text);
  };

  async function saveOrUpdateClient(data, id = null) {
    const database = getDb();
    if (!database) throw new Error('Supabase belum terhubung.');

    const nama = clean(data.nama_client);
    if (!nama) throw new Error('Nama Client wajib diisi.');

    const payload = {
      nama_client: nama,
      perusahaan: clean(data.perusahaan),
      telepon: clean(data.telepon),
      whatsapp: clean(data.whatsapp),
      email: clean(data.email),
      alamat: clean(data.alamat)
    };

    let result;
    if (id) {
      result = await database.from('clients').update(payload).eq('id', id).select('*').single();
    } else {
      // Intentionally INSERT every quotation contact. Do not deduplicate.
      result = await database.from('clients').insert([payload]).select('*').single();
    }

    if (result.error) throw result.error;
    return result.data;
  }

  window.pmSaveClientFromQuotation = async function () {
    const data = {
      nama_client: clean(document.querySelector('#qc')?.value),
      perusahaan: clean(document.querySelector('#qp')?.value),
      telepon: clean(document.querySelector('#qw')?.value),
      whatsapp: clean(document.querySelector('#qw')?.value),
      email: clean(document.querySelector('#qe')?.value),
      alamat: clean(document.querySelector('#qalamat')?.value)
    };

    if (!data.nama_client) throw new Error('Nama Client wajib diisi sebelum menyimpan penawaran.');
    if (!data.perusahaan) throw new Error('Perusahaan wajib diisi sebelum menyimpan penawaran.');

    const created = await saveOrUpdateClient(data);
    if (!created?.id) throw new Error('Client tersimpan tanpa ID.');
    return created;
  };

  // Client page: edit/delete are kept available and each contact is independent.
  window.clientsPage = function () {
    const list = Array.isArray(window.clients)
      ? window.clients
      : (typeof clients !== 'undefined' ? clients : []);

    document.querySelector('#content').innerHTML = `
      <div class="head">
        <div>
          <h1>Client</h1>
          <p>Setiap contact disimpan sebagai data client tersendiri untuk kebutuhan follow-up.</p>
        </div>
        <button class="btn" type="button" onclick="clientForm()">+ Tambah Client</button>
      </div>
      <div class="card">
        <div class="scroll">
          <table class="table">
            <thead><tr>
              <th>Nama</th><th>Perusahaan</th><th>Telepon / WA</th><th>Email</th><th>Aksi</th>
            </tr></thead>
            <tbody>
              ${list.map(c => `
                <tr>
                  <td>${esc(c.nama_client)}</td>
                  <td>${esc(c.perusahaan)}</td>
                  <td>${esc(c.whatsapp || c.telepon)}</td>
                  <td>${esc(c.email)}</td>
                  <td>
                    <div class="actions">
                      <button class="btn secondary" type="button" onclick="clientEdit(${Number(c.id)})">Edit</button>
                      <button class="btn danger" type="button" onclick="clientDelete(${Number(c.id)})">Hapus</button>
                    </div>
                  </td>
                </tr>`).join('') ||
                '<tr><td colspan="5" class="empty">Belum ada data client.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  };

  window.clientForm = function (id = null) {
    const list = Array.isArray(window.clients)
      ? window.clients
      : (typeof clients !== 'undefined' ? clients : []);
    const c = id ? list.find(x => Number(x.id) === Number(id)) : null;

    document.querySelector('#content').insertAdjacentHTML('afterbegin', `
      <div id="clientForm" class="card" style="margin-bottom:16px">
        <b>${c ? 'Edit Client' : 'Tambah Client'}</b>
        <div class="grid g2" style="margin-top:15px">
          <div class="field"><label>Nama Client *</label><input id="cn" value="${esc(c?.nama_client)}"></div>
          <div class="field"><label>Perusahaan</label><input id="cp" value="${esc(c?.perusahaan)}"></div>
          <div class="field"><label>Telepon</label><input id="ct" value="${esc(c?.telepon)}"></div>
          <div class="field"><label>WhatsApp</label><input id="cw" value="${esc(c?.whatsapp)}"></div>
          <div class="field"><label>Email</label><input id="ce" type="email" value="${esc(c?.email)}"></div>
          <div class="field"><label>Alamat</label><input id="ca" value="${esc(c?.alamat)}"></div>
        </div>
        <div class="actions">
          <button class="btn secondary" type="button" onclick="document.getElementById('clientForm')?.remove()">Batal</button>
          <button class="btn" type="button" onclick="saveClient(${c ? Number(c.id) : 'null'})">Simpan</button>
        </div>
      </div>`);
  };

  window.clientEdit = (id) => window.clientForm(id);

  window.saveClient = async function (id = null) {
    try {
      const data = {
        nama_client: document.querySelector('#cn')?.value,
        perusahaan: document.querySelector('#cp')?.value,
        telepon: document.querySelector('#ct')?.value,
        whatsapp: document.querySelector('#cw')?.value,
        email: document.querySelector('#ce')?.value,
        alamat: document.querySelector('#ca')?.value
      };

      await saveOrUpdateClient(data, id);
      if (typeof load === 'function') await load();
      if (typeof render === 'function') render();
      show(id ? 'Client berhasil diperbarui.' : 'Client berhasil disimpan dan siap untuk follow-up.');
    } catch (e) {
      console.error('Client save error:', e);
      show('Gagal menyimpan client: ' + (e.message || e));
    }
  };

  window.clientDelete = async function (id) {
    if (!confirm('Hapus contact ini dari Master Client? Data penawaran yang sudah ada tidak ikut dihapus.')) return;
    const database = getDb();
    if (!database) return show('Supabase belum terhubung.');

    const result = await database.from('clients').delete().eq('id', id);
    if (result.error) {
      console.error('Client delete error:', result.error);
      return show('Client tidak dapat dihapus: ' + result.error.message);
    }

    if (typeof load === 'function') await load();
    if (typeof render === 'function') render();
    show('Contact dihapus dari Master Client.');
  };

  // Wrap the already-exported saveQuote immediately. The old timer-based hook
  // could miss the initialization window and silently skip client persistence.
  if (typeof window.saveQuote === 'function' && !window.__pmClientSaveHook) {
    const originalSaveQuote = window.saveQuote;
    window.saveQuote = async function () {
      try {
        const client = await window.pmSaveClientFromQuotation();
        window.__pmLastSavedClientId = client?.id || null;
      } catch (error) {
        console.error('Client auto-save failed:', error);
        show('Penawaran belum disimpan. Data client gagal disimpan: ' + (error.message || error));
        return;
      }
      return originalSaveQuote.apply(this, arguments);
    };
    window.__pmClientSaveHook = true;
  }
})();
