const C = window.PRIANGAN_CONFIG || {};

let db = null;
let page = 'dashboard';
let masters = [];
let clients = [];
let template = null;
let items = [];

const $ = (selector) => document.querySelector(selector);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

function money(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function isActive(value) {
  if (value === true || value === 1) return true;
  const s = String(value ?? '').trim().toUpperCase();
  return !['FALSE', '0', 'NO', 'TIDAK', 'NONAKTIF', 'INACTIVE', 'OFF'].includes(s);
}

function activeLabel(value) {
  return isActive(value) ? 'YA' : 'TIDAK';
}

function msg(text) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(window.__pmToastTimer);
  window.__pmToastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function getConfig() {
  const url = localStorage.getItem('SUPABASE_URL') || C.SUPABASE_URL || '';
  const key = localStorage.getItem('SUPABASE_ANON_KEY') || C.SUPABASE_ANON_KEY || '';
  return { url: url.trim(), key: key.trim() };
}

async function init() {
  document.querySelectorAll('.nav').forEach((button) => {
    button.addEventListener('click', () => {
      page = button.dataset.p || 'dashboard';
      render();
      $('.sidebar')?.classList.remove('open');
    });
  });

  $('#menu')?.addEventListener('click', () => $('.sidebar')?.classList.toggle('open'));

  const cfg = getConfig();
  if (cfg.url && cfg.key && window.supabase?.createClient) {
    db = window.supabase.createClient(cfg.url, cfg.key);
    try {
      await load();
      setStatus('Supabase terhubung', 'ok');
    } catch (error) {
      console.error('Supabase load error:', error);
      setStatus('Supabase gagal', 'bad');
      msg('Gagal membaca database: ' + (error.message || error));
    }
  } else {
    setStatus('Belum terhubung', 'warn');
  }

  render();
}

function setStatus(text, type) {
  const status = $('#status');
  if (!status) return;
  status.textContent = text;
  status.className = 'badge ' + type;
}

async function load() {
  if (!db) throw new Error('Supabase belum terhubung.');

  const [masterResult, clientResult, templateResult] = await Promise.all([
    db.from('master_harga').select('*').order('id'),
    db.from('clients').select('*').order('id', { ascending: false }),
    db.from('template_surat').select('*').order('id', { ascending: false }).limit(1)
  ]);

  if (masterResult.error) throw masterResult.error;
  if (clientResult.error) throw clientResult.error;
  if (templateResult.error) throw templateResult.error;

  masters = masterResult.data || [];
  clients = clientResult.data || [];
  template = templateResult.data?.[0] || null;
}

function render() {
  document.querySelectorAll('.nav').forEach((button) => {
    button.classList.toggle('active', button.dataset.p === page);
  });

  const titles = {
    dashboard: 'Dashboard',
    master: 'Master Harga',
    clients: 'Data Client',
    quotation: 'Buat Penawaran',
    history: 'Riwayat Penawaran',
    template: 'Template Surat',
    settings: 'Pengaturan'
  };

  if ($('#title')) $('#title').textContent = titles[page] || 'Priangan Multimedia';

  if (page === 'dashboard') dashboardPage();
  else if (page === 'master') masterPage();
  else if (page === 'clients') clientsPage();
  else if (page === 'quotation') quotationPage();
  else if (page === 'history') historyPage();
  else if (page === 'template') templatePage();
  else if (page === 'settings') settingsPage();
}

function dashboardPage() {
  const activeCount = masters.filter((row) => isActive(row.aktif)).length;

  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Dashboard</h1>
        <p>Sales & quotation Priangan Multimedia.</p>
      </div>
      <button class="btn" onclick="go('quotation')">+ Buat Penawaran</button>
    </div>

    <div class="grid g4">
      <div class="card stat"><small>Master Harga Aktif</small><strong>${activeCount}</strong></div>
      <div class="card stat"><small>Client</small><strong>${clients.length}</strong></div>
      <div class="card stat"><small>Template Surat</small><strong>${template ? 1 : 0}</strong></div>
      <div class="card stat"><small>Database</small><strong style="font-size:20px">${db ? 'ONLINE' : 'OFFLINE'}</strong></div>
    </div>

    <div class="card" style="margin-top:16px">
      <b>Alur</b>
      <p style="color:var(--muted)">Master Harga → Client → Penawaran → Preview A4 → Cetak PDF.</p>
    </div>`;
}

function masterPage() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Master Harga</h1>
        <p>Produk dan jasa.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <input type="file" id="csvInput" accept=".csv,text/csv" style="display:none">
        <button class="btn secondary" type="button" onclick="document.getElementById('csvInput').click()">Import CSV</button>
        <button class="btn" type="button" onclick="masterForm()">+ Tambah Item</button>
      </div>
    </div>

    <div class="card">
      <div class="scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Item</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Aktif</th>
            </tr>
          </thead>
          <tbody>
            ${masters.map((row) => `
              <tr>
                <td>${esc(row.kode)}</td>
                <td>${esc(row.item)}</td>
                <td>${esc(row.kategori)}</td>
                <td>${esc(row.satuan)}</td>
                <td>${money(row.harga_jual)}</td>
                <td>${activeLabel(row.aktif)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty">Belum ada data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function masterForm() {
  $('#content').insertAdjacentHTML('afterbegin', `
    <div id="masterForm" class="card" style="margin-bottom:16px">
      <div class="grid g2">
        <div class="field"><label>Kode</label><input id="mk" autocomplete="off"></div>
        <div class="field"><label>Item</label><input id="mi" autocomplete="off"></div>
        <div class="field"><label>Kategori</label><input id="mc" autocomplete="off"></div>
        <div class="field"><label>Satuan</label><input id="ms" autocomplete="off"></div>
        <div class="field"><label>Harga Jual</label><input id="mh" type="number" min="0" step="1"></div>
        <div class="field"><label>Aktif</label>
          <select id="ma">
            <option value="true">YA</option>
            <option value="false">TIDAK</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn secondary" type="button" onclick="document.getElementById('masterForm')?.remove()">Batal</button>
        <button class="btn" type="button" onclick="saveMaster()">Simpan</button>
      </div>
    </div>`);
}

async function saveMaster() {
  if (!db) return msg('Supabase belum terhubung.');

  const kode = $('#mk')?.value.trim();
  const item = $('#mi')?.value.trim();
  if (!kode || !item) return msg('Kode dan Item wajib diisi.');

  const payload = {
    kode,
    item,
    kategori: $('#mc')?.value.trim() || '',
    satuan: $('#ms')?.value.trim() || '',
    harga_jual: Number($('#mh')?.value) || 0,
    aktif: $('#ma')?.value === 'true'
  };

  const result = await db.from('master_harga').insert([payload]);
  if (result.error) {
    console.error('Save master error:', result.error);
    return msg('Gagal menyimpan: ' + result.error.message);
  }

  await load();
  render();
  msg('Master harga disimpan.');
}

function clientsPage() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Client</h1>
        <p>Data perusahaan dan nomor WhatsApp untuk autofill.</p>
      </div>
      <button class="btn" onclick="clientForm()">+ Tambah Client</button>
    </div>

    <div class="card">
      <div class="scroll">
        <table class="table">
          <thead>
            <tr><th>Nama</th><th>Perusahaan</th><th>Telepon</th><th>WA</th><th>Email</th></tr>
          </thead>
          <tbody>
            ${clients.map((row) => `
              <tr>
                <td>${esc(row.nama_client)}</td>
                <td>${esc(row.perusahaan)}</td>
                <td>${esc(row.telepon)}</td>
                <td>${esc(row.whatsapp)}</td>
                <td>${esc(row.email)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5">Belum ada data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function clientForm() {
  $('#content').insertAdjacentHTML('afterbegin', `
    <div id="clientForm" class="card" style="margin-bottom:16px">
      <div class="grid g2">
        <div class="field"><label>Nama Client</label><input id="cn"></div>
        <div class="field"><label>Perusahaan</label><input id="cp"></div>
        <div class="field"><label>Telepon</label><input id="ct"></div>
        <div class="field"><label>WhatsApp</label><input id="cw"></div>
        <div class="field"><label>Email</label><input id="ce" type="email"></div>
        <div class="field"><label>Alamat</label><input id="ca"></div>
      </div>
      <div class="actions">
        <button class="btn secondary" type="button" onclick="document.getElementById('clientForm')?.remove()">Batal</button>
        <button class="btn" type="button" onclick="saveClient()">Simpan</button>
      </div>
    </div>`);
}

async function saveClient() {
  if (!db) return msg('Supabase belum terhubung.');
  const nama = $('#cn')?.value.trim();
  if (!nama) return msg('Nama Client wajib diisi.');

  const payload = {
    nama_client: nama,
    perusahaan: $('#cp')?.value.trim() || '',
    telepon: $('#ct')?.value.trim() || '',
    whatsapp: $('#cw')?.value.trim() || '',
    email: $('#ce')?.value.trim() || '',
    alamat: $('#ca')?.value.trim() || ''
  };

  const result = await db.from('clients').insert([payload]);
  if (result.error) {
    console.error('Save client error:', result.error);
    return msg('Gagal menyimpan client: ' + result.error.message);
  }

  await load();
  render();
  msg('Client disimpan.');
}

function quotationPage() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Buat Surat Penawaran</h1>
        <p>Dimensi LED, Rigging, Level dan Qty dihitung otomatis.</p>
      </div>
    </div>

    <div class="card">
      <b>Informasi Umum</b>
      <div class="grid g2" style="margin-top:15px">
        <div class="field">
          <label>Client *</label>
          <input id="qc" list="clientList" placeholder="Pilih / ketik nama client">
          <datalist id="clientList">
            ${clients.map((c) => `<option value="${esc(c.nama_client)}"></option>`).join('')}
          </datalist>
        </div>
        <div class="field"><label>Perusahaan *</label><input id="qp"></div>
        <div class="field"><label>No. Telepon / WA</label><input id="qw"></div>
        <div class="field"><label>Email</label><input id="qe"></div>
        <div class="field"><label>Nama Event / Project *</label><input id="qeve"></div>
        <div class="field"><label>Tanggal Mulai Event *</label><input id="qs" type="date"></div>
        <div class="field"><label>Tanggal Selesai Event *</label><input id="qe2" type="date"></div>
      </div>
    </div>

    <div style="margin-top:20px">
      <div id="items"></div>
      <div class="actions no-print">
        <button class="btn" type="button" onclick="addItem()">+ TAMBAH ITEM</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="sum"><span>Total</span><b id="total">Rp 0</b></div>
      <div class="actions no-print" style="margin-top:15px">
        <button class="btn secondary" type="button" onclick="go('dashboard')">Batal</button>
        <button class="btn green" type="button" onclick="saveQuote()">Simpan Penawaran</button>
        <button class="btn" type="button" onclick="printQuote()">Preview / Cetak A4</button>
      </div>
    </div>`;

  $('#qc')?.addEventListener('change', fillClient);
  $('#qc')?.addEventListener('input', fillClient);

  if (!items.length) addItem();
  else drawItems();
}

function fillClient() {
  const value = $('#qc')?.value.trim().toLowerCase();
  const client = clients.find((row) => String(row.nama_client || '').toLowerCase() === value);
  if (!client) return;
  $('#qp').value = client.perusahaan || '';
  $('#qw').value = client.whatsapp || client.telepon || '';
  $('#qe').value = client.email || '';
}

function addItem() {
  items.push({
    id: Date.now() + Math.random(),
    kode: '',
    item: '',
    harga: 0,
    qty: 1,
    lebar: 0,
    tinggi: 0,
    panjang: 0,
    mulai: '',
    selesai: '',
    tipe: 'qty'
  });
  drawItems();
}

function removeItem(id) {
  items = items.filter((row) => row.id !== id);
  drawItems();
}

function pick(id, kode) {
  const master = masters.find((row) => String(row.kode) === String(kode));
  const item = items.find((row) => row.id === id);
  if (!master || !item) return;

  item.kode = master.kode;
  item.item = master.item;
  item.harga = Number(master.harga_jual) || 0;

  const text = `${master.item || ''} ${master.kategori || ''}`.toLowerCase();
  if (/led|videotron/.test(text)) item.tipe = 'luas';
  else if (/rigging|rig/.test(text)) item.tipe = 'rigging';
  else if (/level/.test(text)) item.tipe = 'level';
  else item.tipe = 'qty';

  drawItems();
}

function upd(id, key, value) {
  const item = items.find((row) => row.id === id);
  if (!item) return;
  if (key === 'mulai' || key === 'selesai') item[key] = value;
  else item[key] = Number(value) || 0;
  drawItems();
}

function days(start, end) {
  if (!start || !end) return 1;
  const diff = (new Date(end) - new Date(start)) / 86400000;
  return diff >= 0 ? diff + 1 : 1;
}

function subtotal(item) {
  const duration = days(item.mulai, item.selesai);
  const price = Number(item.harga) || 0;

  if (item.tipe === 'luas') {
    return (Number(item.lebar) || 0) * (Number(item.tinggi) || 0) * price * duration;
  }

  if (item.tipe === 'rigging') {
    const perimeter = ((Number(item.panjang) || 0) * 2) + ((Number(item.tinggi) || 0) * 2);
    return perimeter * price * duration;
  }

  if (item.tipe === 'level') {
    const led = items.find((row) => /led|videotron/i.test(row.item || ''));
    const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;
    return width * (Number(item.tinggi) || 0) * price * duration;
  }

  return (Number(item.qty) || 1) * price * duration;
}

function dimFields(item) {
  const text = String(item.item || '').toLowerCase();
  const type = String(item.tipe || '').toLowerCase();

  if (/rigging|rig/.test(text)) {
    return `
      <div class="dim">
        <div class="field"><label>Panjang Rigging (m)</label><input type="number" min="0" step="0.01" value="${item.panjang || 0}" onchange="upd(${item.id},'panjang',this.value)"></div>
        <div class="field"><label>Tinggi Rigging (m)</label><input type="number" min="0" step="0.01" value="${item.tinggi || 0}" onchange="upd(${item.id},'tinggi',this.value)"></div>
      </div>`;
  }

  if (/level/.test(text)) {
    const led = items.find((row) => /led|videotron/i.test(row.item || ''));
    const width = led ? Number(led.lebar) || 0 : Number(item.lebar) || 0;
    return `
      <div class="dim">
        <div class="field"><label>Lebar Level (otomatis)</label><input value="${width ? width + ' m' : '-'}" readonly></div>
        <div class="field"><label>Tinggi Level (m)</label><input type="number" min="0" step="0.01" value="${item.tinggi || 0}" onchange="upd(${item.id},'tinggi',this.value)"></div>
      </div>`;
  }

  if (/led|videotron/.test(text) || type === 'luas') {
    return `
      <div class="dim">
        <div class="field"><label>Lebar Videotron (m)</label><input type="number" min="0" step="0.01" value="${item.lebar || 0}" onchange="upd(${item.id},'lebar',this.value)"></div>
        <div class="field"><label>Tinggi Videotron (m)</label><input type="number" min="0" step="0.01" value="${item.tinggi || 0}" onchange="upd(${item.id},'tinggi',this.value)"></div>
      </div>`;
  }

  return `<div class="field"><label>Jumlah (Qty)</label><input type="number" min="1" step="1" value="${item.qty || 1}" onchange="upd(${item.id},'qty',this.value)"></div>`;
}

function drawItems() {
  const container = $('#items');
  if (!container) return;

  const activeMasters = masters.filter((row) => isActive(row.aktif));

  container.innerHTML = items.map((item, index) => `
    <div class="item">
      <div class="itemhead">
        <span class="blue">ITEM #${index + 1}</span>
        <button class="btn red sm" type="button" onclick="removeItem(${item.id})">Hapus</button>
      </div>

      <div class="field">
        <label>Produk / Jasa</label>
        <select onchange="pick(${item.id},this.value)">
          <option value="">-- Pilih dari Master Harga --</option>
          ${activeMasters.map((master) => `
            <option value="${esc(master.kode)}" ${item.kode === master.kode ? 'selected' : ''}>[${esc(master.kode)}] ${esc(master.item)}</option>
          `).join('')}
        </select>
      </div>

      <div class="grid g2">
        <div class="field"><label>Harga Jual</label><input value="${money(item.harga)}" readonly></div>
        <div class="field"><label>Tipe Perhitungan</label><input value="${esc(item.tipe)}" readonly></div>
      </div>

      ${dimFields(item)}

      <div class="sched">
        <b>Jadwal Pemakaian</b>
        <div class="grid g2" style="margin-top:12px">
          <div class="field"><label>Tanggal Mulai</label><input type="date" value="${item.mulai}" onchange="upd(${item.id},'mulai',this.value)"></div>
          <div class="field"><label>Tanggal Selesai</label><input type="date" value="${item.selesai}" onchange="upd(${item.id},'selesai',this.value)"></div>
        </div>
      </div>

      <div class="sum"><span>Subtotal</span><b>${money(subtotal(item))}</b></div>
    </div>
  `).join('');

  const total = items.reduce((sum, item) => sum + subtotal(item), 0);
  if ($('#total')) $('#total').textContent = money(total);
}

async function saveQuote() {
  if (!db) return msg('Supabase belum terhubung.');

  const client = $('#qc')?.value.trim();
  const perusahaan = $('#qp')?.value.trim();
  const eventName = $('#qeve')?.value.trim();
  const startDate = $('#qs')?.value || null;
  const endDate = $('#qe2')?.value || null;

  if (!client || !perusahaan || !eventName) {
    return msg('Client, Perusahaan, dan Nama Event wajib diisi.');
  }
  if (!items.length) return msg('Tambahkan minimal 1 item.');

  const total = items.reduce((sum, item) => sum + subtotal(item), 0);
  const nomor = 'PM-' + Date.now().toString().slice(-6);

  const quotePayload = {
    nomor_penawaran: nomor,
    nama_client: client,
    perusahaan,
    telepon: $('#qw')?.value.trim() || '',
    whatsapp: $('#qw')?.value.trim() || '',
    email: $('#qe')?.value.trim() || '',
    event_name: eventName,
    tanggal_mulai: startDate,
    tanggal_selesai: endDate,
    total,
    status: 'DRAFT'
  };

  const quoteResult = await db.from('penawaran').insert([quotePayload]).select('id').single();
  if (quoteResult.error) {
    console.error('Save quotation error:', quoteResult.error);
    return msg('Gagal menyimpan penawaran: ' + quoteResult.error.message);
  }

  const quoteId = quoteResult.data?.id;
  if (quoteId) {
    const itemPayload = items.map((item) => ({
      penawaran_id: quoteId,
      kode: item.kode,
      item: item.item,
      harga_jual: Number(item.harga) || 0,
      tipe_perhitungan: item.tipe,
      qty: Number(item.qty) || 1,
      lebar: Number(item.lebar) || null,
      tinggi: Number(item.tinggi) || null,
      panjang: Number(item.panjang) || null,
      subtotal: subtotal(item)
    }));

    const itemResult = await db.from('penawaran_items').insert(itemPayload).select('id');
    if (itemResult.error) {
      console.error('Save quotation items error:', itemResult.error);
      return msg('Penawaran tersimpan, tetapi item gagal disimpan: ' + itemResult.error.message);
    }

    const itemRows = itemResult.data || [];
    const schedulePayload = [];
    items.forEach((item, index) => {
      const itemId = itemRows[index]?.id;
      if (!itemId) return;
      schedulePayload.push({
        penawaran_item_id: itemId,
        qty: Number(item.qty) || 1,
        tanggal_mulai: item.mulai || null,
        tanggal_selesai: item.selesai || null,
        durasi: days(item.mulai, item.selesai),
        subtotal: subtotal(item)
      });
    });

    if (schedulePayload.length) {
      const scheduleResult = await db.from('penawaran_jadwal').insert(schedulePayload);
      if (scheduleResult.error) {
        console.error('Save schedule error:', scheduleResult.error);
        return msg('Penawaran dan item tersimpan, tetapi jadwal gagal disimpan: ' + scheduleResult.error.message);
      }
    }
  }

  msg('Penawaran berhasil disimpan: ' + nomor);
  page = 'history';
  items = [];
  await load();
  render();
}

async function historyPage() {
  let rows = [];

  if (db) {
    const result = await db.from('penawaran').select('*').order('id', { ascending: false });
    if (result.error) {
      console.error('History error:', result.error);
      msg('Gagal membaca riwayat: ' + result.error.message);
    } else {
      rows = result.data || [];
    }
  }

  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Riwayat Penawaran</h1>
        <p>Data tersimpan di Supabase.</p>
      </div>
      <button class="btn" onclick="go('quotation')">+ Buat Penawaran</button>
    </div>

    <div class="card">
      <div class="scroll">
        <table class="table">
          <thead>
            <tr><th>No</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td>${esc(row.nomor_penawaran || '-')}</td>
                <td>${esc(row.nama_client)}</td>
                <td>${esc(row.perusahaan)}</td>
                <td>${esc(row.event_name)}</td>
                <td>${money(row.total)}</td>
                <td>${esc(row.status || 'DRAFT')}</td>
              </tr>
            `).join('') || '<tr><td colspan="6">Belum ada penawaran.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function templatePage() {
  const t = template || {};
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Template Surat</h1>
        <p>Kop, ketentuan, logo dan tanda tangan.</p>
      </div>
    </div>

    <div class="grid g2">
      <div class="card">
        ${tf('Nama Template', 'tn', t.nama_template)}
        ${tf('Logo URL', 'tl', t.logo_url)}
        ${tf('Kop Text', 'tk', t.kop_text)}
        ${tf('Alamat', 'ta', t.alamat)}
        ${tf('Telepon', 'tt', t.telepon)}
        ${tf('WhatsApp', 'tw', t.whatsapp)}
        ${tf('Email', 'te', t.email)}
        ${tf('Website', 'tweb', t.website)}
        ${tf('Ketentuan', 'tket', t.ketentuan, true)}
        ${tf('Nama Penandatangan', 'tp', t.nama_penandatangan)}
        ${tf('Jabatan', 'tj', t.jabatan_penandatangan)}
        ${tf('TTD URL', 'ttd', t.ttd_url)}
        <div class="actions"><button class="btn" onclick="saveTemplate()">Simpan Template</button></div>
      </div>

      <div class="preview">
        <div class="kop">
          ${t.logo_url ? `<img src="${esc(t.logo_url)}" alt="Logo">` : ''}
          <h2>${esc(t.kop_text || 'PRIANGAN MULTIMEDIA')}</h2>
          <div>${esc(t.alamat || '')}</div>
          <div>${esc(t.telepon || '')}${t.whatsapp ? ` | WA ${esc(t.whatsapp)}` : ''}</div>
        </div>
        <h3 style="text-align:center">SURAT PENAWARAN HARGA</h3>
        <p>Nomor: ____________________</p>
        <p>Kepada Yth. __________________________</p>
        <p>Dengan hormat, berikut kami sampaikan penawaran harga untuk kebutuhan event/project.</p>
        <div style="font-size:10px">
          <b>Syarat & Ketentuan</b><br>
          ${formatMultiline(t.ketentuan || '')}
        </div>
        <div style="margin:40px 0 0 auto;width:220px;text-align:center">
          ${t.ttd_url ? `<img src="${esc(t.ttd_url)}" alt="TTD" style="max-height:80px;max-width:180px">` : ''}<br>
          <b>${esc(t.nama_penandatangan || '')}</b><br>
          ${esc(t.jabatan_penandatangan || '')}
        </div>
      </div>
    </div>`;
}

function formatMultiline(text) {
  return esc(text).replace(/\r?\n/g, '<br>');
}

function tf(label, id, value, textarea = false) {
  return `<div class="field">
    <label>${esc(label)}</label>
    ${textarea ? `<textarea id="${id}" rows="8">${esc(value || '')}</textarea>` : `<input id="${id}" value="${esc(value || '')}">`}
  </div>`;
}

async function saveTemplate() {
  if (!db) return msg('Supabase belum terhubung.');

  const payload = {
    nama_template: $('#tn')?.value.trim() || '',
    logo_url: $('#tl')?.value.trim() || '',
    kop_text: $('#tk')?.value.trim() || '',
    alamat: $('#ta')?.value.trim() || '',
    telepon: $('#tt')?.value.trim() || '',
    whatsapp: $('#tw')?.value.trim() || '',
    email: $('#te')?.value.trim() || '',
    website: $('#tweb')?.value.trim() || '',
    ketentuan: $('#tket')?.value.trim() || '',
    nama_penandatangan: $('#tp')?.value.trim() || '',
    jabatan_penandatangan: $('#tj')?.value.trim() || '',
    ttd_url: $('#ttd')?.value.trim() || ''
  };

  let result;
  if (template?.id) {
    result = await db.from('template_surat').update(payload).eq('id', template.id);
  } else {
    result = await db.from('template_surat').insert([payload]);
  }

  if (result.error) {
    console.error('Save template error:', result.error);
    return msg('Gagal menyimpan template: ' + result.error.message);
  }

  await load();
  render();
  msg('Template surat disimpan.');
}

function settingsPage() {
  const cfg = getConfig();
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Pengaturan Database</h1>
        <p>Koneksi Supabase.</p>
      </div>
    </div>

    <div class="card">
      <div class="field"><label>URL Supabase</label><input id="su" value="${esc(cfg.url)}"></div>
      <div class="field"><label>Publishable / Anon Key</label><input id="sk" value="${esc(cfg.key)}" autocomplete="off"></div>
      <div class="actions"><button class="btn" onclick="saveSettings()">Simpan Konfigurasi</button></div>
    </div>`;
}

function saveSettings() {
  const url = $('#su')?.value.trim() || '';
  const key = $('#sk')?.value.trim() || '';
  localStorage.setItem('SUPABASE_URL', url);
  localStorage.setItem('SUPABASE_ANON_KEY', key);
  msg('Konfigurasi tersimpan. Muat ulang halaman untuk menerapkan.');
}

function go(nextPage) {
  page = nextPage || 'dashboard';
  if (page === 'quotation') items = [];
  render();
}

window.go = go;
window.masterForm = masterForm;
window.saveMaster = saveMaster;
window.clientForm = clientForm;
window.saveClient = saveClient;
window.addItem = addItem;
window.removeItem = removeItem;
window.pick = pick;
window.upd = upd;
window.saveQuote = saveQuote;
window.printQuote = printQuote;
window.saveTemplate = saveTemplate;
window.saveSettings = saveSettings;

init();
