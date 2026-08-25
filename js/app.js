const C = window.PRIANGAN_CONFIG || {};
let db = null, page = 'dashboard', masters = [], clients = [], template = null, items = [];

const $ = s => document.querySelector(s);
const esc = x => String(x ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const money = x => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(x) || 0);

function msg(x) {
  let t = $('#toast');
  if (!t) return;
  t.textContent = x;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

async function init() {
  document.querySelectorAll('.nav').forEach(b => b.onclick = () => {
    page = b.dataset.p;
    render();
    $('.sidebar').classList.remove('open');
  });

  if ($('#menu')) $('#menu').onclick = () => $('.sidebar').classList.toggle('open');

  if (C.SUPABASE_ANON_KEY && !C.SUPABASE_ANON_KEY.includes('PASTE_')) {
    db = supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    try {
      await load();
      if ($('#status')) {
        $('#status').textContent = 'Supabase terhubung';
        $('#status').className = 'badge ok';
      }
    } catch (e) {
      console.error(e);
      msg(e.message);
    }
  }
  render();
}

async function load() {
  let [m, c, t] = await Promise.all([
    db.from('master_harga').select('*').order('id'),
    db.from('clients').select('*').order('id', { ascending: false }),
    db.from('template_surat').select('*').limit(1)
  ]);
  if (m.error) throw m.error;
  if (c.error) throw c.error;
  if (t.error) throw t.error;
  masters = m.data || [];
  clients = c.data || [];
  template = t.data?.[0] || null;
}

function render() {
  document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.p === page));
  let titles = {
    dashboard: 'Dashboard',
    master: 'Master Harga',
    clients: 'Data Client',
    quotation: 'Buat Penawaran',
    history: 'Riwayat Penawaran',
    template: 'Template Surat',
    settings: 'Pengaturan'
  };
  if ($('#title')) $('#title').textContent = titles[page] || 'Priangan Multimedia';

  if (page === 'dashboard') dash();
  else if (page === 'master') master();
  else if (page === 'clients') clientsPage();
  else if (page === 'quotation') quotation();
  else if (page === 'history') history();
  else if (page === 'template') templatePage();
  else if (page === 'settings') settings();
}

function dash() {
  let a = masters.filter(x => String(x.aktif ?? 'YA').toUpperCase() === 'YA').length;
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Dashboard</h1>
        <p>Sales & quotation Priangan Multimedia.</p>
      </div>
      <button class="btn" onclick="go('quotation')">+ Buat Penawaran</button>
    </div>
    <div class="grid g4">
      <div class="card stat"><small>Master Harga Aktif</small><strong>${a}</strong></div>
      <div class="card stat"><small>Client</small><strong>${clients.length}</strong></div>
      <div class="card stat"><small>Template Surat</small><strong>${template ? 1 : 0}</strong></div>
      <div class="card stat"><small>Database</small><strong style="font-size:20px">${db ? 'ONLINE' : 'SETUP'}</strong></div>
    </div>
    <div class="card" style="margin-top:16px">
      <b>Alur</b>
      <p style="color:var(--muted)">Master Harga → Client → Penawaran → Preview A4 → Cetak PDF.</p>
    </div>`;
}

function master() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Master Harga</h1>
        <p>Produk dan jasa.</p>
      </div>
      <div style="display:flex;gap:8px;">
        <input type="file" id="csvInput" accept=".csv" style="display:none" onchange="handleCSVImport(event)">
        <button class="btn secondary" onclick="document.getElementById('csvInput').click()">Import CSV</button>
        <button class="btn" onclick="masterForm()">+ Tambah Item</button>
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
            ${masters.map(x => `
              <tr>
                <td>${esc(x.kode)}</td>
                <td>${esc(x.item)}</td>
                <td>${esc(x.kategori)}</td>
                <td>${esc(x.satuan)}</td>
                <td>${money(x.harga_jual)}</td>
                <td>${esc(x.aktif ?? '')}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" class="empty">Belum ada data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

async function handleCSVImport(e) {
  let file = e.target.files[0];
  if (!file) return;
  if (!db) return msg('Isi anon key Supabase dulu.');

  let text = await file.text();
  let lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return msg('File CSV kosong atau format salah.');

  let headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  let payload = [];

  for (let i = 1; i < lines.length; i++) {
    let row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
    if (row.length < headers.length) continue;

    let obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx] ? row[idx].replace(/^"|"$/g, '').replace(/""/g, '"').trim() : '';
      obj[h] = val;
    });

    payload.push({
      kode: obj.kode || '',
      item: obj.item || '',
      kategori: obj.kategori || '',
      satuan: obj.satuan || '',
      harga_jual: Number(obj.harga_jual) || 0,
      aktif: (obj.aktif || 'YA').toUpperCase()
    });
  }

  if (!payload.length) return msg('Tidak ada data valid untuk di-import.');

  msg('Mengunggah data...');
  let r = await db.from('master_harga').insert(payload);
  if (r.error) {
    console.error(r.error);
    return msg('Gagal import: ' + r.error.message);
  }

  await load();
  render();
  msg(`Berhasil meng-import ${payload.length} item!`);
}

function masterForm() {
  $('#content').insertAdjacentHTML('afterbegin', `
    <div id="f" class="card" style="margin-bottom:16px">
      <div class="grid g2">
        <div class="field"><label>Kode</label><input id="mk"></div>
        <div class="field"><label>Item</label><input id="mi"></div>
        <div class="field"><label>Kategori</label><input id="mc"></div>
        <div class="field"><label>Satuan</label><input id="ms"></div>
        <div class="field"><label>Harga Jual</label><input id="mh" type="number"></div>
        <div class="field"><label>Aktif</label>
          <select id="ma">
            <option>YA</option>
            <option>TIDAK</option>
          </select>
        </div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="$('#f').remove()">Batal</button>
        <button class="btn" onclick="saveMaster()">Simpan</button>
      </div>
    </div>`);
}

async function saveMaster() {
  let k = $('#mk').value.trim(), i = $('#mi').value.trim();
  if (!k || !i) return msg('Kode & Item wajib.');
  let payload = {
    kode: k,
    item: i,
    kategori: $('#mc').value.trim(),
    satuan: $('#ms').value.trim(),
    harga_jual: Number($('#mh').value) || 0,
    aktif: $('#ma').value
  };
  let r = await db.from('master_harga').insert([payload]);
  if (r.error) return msg(r.error.message);
  await load();
  render();
  msg('Master disimpan.');
}

function clientsPage() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Client</h1>
        <p>Data perusahaan dan nomor WA untuk autofill.</p>
      </div>
      <button class="btn" onclick="clientForm()">+ Tambah Client</button>
    </div>
    <div class="card">
      <div class="scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Perusahaan</th>
              <th>Telepon</th>
              <th>WA</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(x => `
              <tr>
                <td>${esc(x.nama_client || x.nama)}</td>
                <td>${esc(x.perusahaan)}</td>
                <td>${esc(x.telepon)}</td>
                <td>${esc(x.whatsapp)}</td>
                <td>${esc(x.email)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5">Belum ada data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function clientForm() {
  $('#content').insertAdjacentHTML('afterbegin', `
    <div id="cf" class="card" style="margin-bottom:16px">
      <div class="grid g2">
        <div class="field"><label>Nama Client</label><input id="cn"></div>
        <div class="field"><label>Perusahaan</label><input id="cp"></div>
        <div class="field"><label>Telepon</label><input id="ct"></div>
        <div class="field"><label>WhatsApp</label><input id="cw"></div>
        <div class="field"><label>Email</label><input id="ce"></div>
        <div class="field"><label>Alamat</label><input id="ca"></div>
      </div>
      <div class="actions">
        <button class="btn secondary" onclick="$('#cf').remove()">Batal</button>
        <button class="btn" onclick="saveClient()">Simpan</button>
      </div>
    </div>`);
}

async function saveClient() {
  let n = $('#cn').value.trim();
  if (!n) return msg('Nama wajib.');
  let payload = {
    nama_client: n,
    perusahaan: $('#cp').value.trim(),
    telepon: $('#ct').value.trim(),
    whatsapp: $('#cw').value.trim(),
    email: $('#ce').value.trim(),
    alamat: $('#ca').value.trim()
  };
  let r = await db.from('clients').insert([payload]);
  if (r.error) return msg(r.error.message);
  await load();
  render();
  msg('Client disimpan.');
}

function quotation() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Buat Surat Penawaran</h1>
        <p>Dimensi LED, Rigging dan Level otomatis.</p>
      </div>
    </div>
    <div class="card">
      <b>Informasi Umum</b>
      <div class="grid g2" style="margin-top:15px">
        <div class="field">
          <label>Client *</label>
          <input id="qc" list="cl" placeholder="Nama Client">
          <datalist id="cl">
            ${clients.map(c => `<option value="${esc(c.nama_client || c.nama)}">`).join('')}
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
        <button class="btn" onclick="addItem()">+ TAMBAH ITEM</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="sum">
        <span>Total</span>
        <b id="total">Rp 0</b>
      </div>
      <div class="actions no-print" style="margin-top:15px">
        <button class="btn secondary" onclick="go('dashboard')">Batal</button>
        <button class="btn green" onclick="saveQuote()">Simpan Penawaran</button>
        <button class="btn" onclick="printQuote()">Preview / Cetak A4</button>
      </div>
    </div>`;

  $('#qc').onchange = () => {
    let c = clients.find(x => String(x.nama_client || x.nama).toLowerCase() === $('#qc').value.toLowerCase());
    if (c) {
      $('#qp').value = c.perusahaan || '';
      $('#qw').value = c.whatsapp || c.telepon || '';
      $('#qe').value = c.email || '';
    }
  };

  if (!items.length) addItem();
  else drawItems();
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
  items = items.filter(x => x.id !== id);
  drawItems();
}

function pick(id, kode) {
  let m = masters.find(x => x.kode === kode);
  let it = items.find(x => x.id === id);
  if (!m || !it) return;

  it.kode = m.kode;
  it.item = m.item;
  it.harga = m.harga_jual;

  let s = (m.item + ' ' + m.kategori).toLowerCase();
  if (/led|videotron/.test(s)) it.tipe = 'luas';
  else if (/rigging|rig/.test(s)) it.tipe = 'rigging';
  else if (/level/.test(s)) it.tipe = 'level';
  else it.tipe = 'qty';

  drawItems();
}

function upd(id, k, v) {
  let it = items.find(x => x.id === id);
  if (it) {
    it[k] = k === 'mulai' || k === 'selesai' ? v : Number(v) || 0;
    drawItems();
  }
}

function days(m, s) {
  if (!m || !s) return 1;
  let d = (new Date(s) - new Date(m)) / 86400000 + 1;
  return d > 0 ? d : 1;
}

function subtotal(x) {
  let d = days(x.mulai, x.selesai);
  if (x.tipe === 'luas') return (x.lebar || 0) * (x.tinggi || 0) * x.harga * d;
  if (x.tipe === 'rigging') return ((x.panjang || 0) * 2 + (x.tinggi || 0) * 2) * x.harga * d;
  if (x.tipe === 'level') {
    let led = items.find(a => /led|videotron/i.test(a.item));
    let w = led ? led.lebar : x.lebar;
    return (w || 0) * (x.tinggi || 0) * x.harga * d;
  }
  return (x.qty || 1) * x.harga * d;
}

function dim(x) {
  let s = x.item.toLowerCase(), t = x.tipe.toLowerCase();
  if (/rigging|rig/.test(s)) return `
    <div class="dim">
      <div class="field"><label>Panjang Rigging (m)</label><input type="number" step=".01" value="${x.panjang}" onchange="upd(${x.id},'panjang',this.value)"></div>
      <div class="field"><label>Tinggi Rigging (m)</label><input type="number" step=".01" value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div>
    </div>`;
  if (/level/.test(s)) {
    let led = items.find(a => /led|videotron/i.test(a.item));
    let w = led ? led.lebar : x.lebar;
    return `
      <div class="dim">
        <div class="field"><label>Lebar Level (otomatis)</label><input value="${w || ''} m" readonly></div>
        <div class="field"><label>Tinggi Level (m)</label><input type="number" step=".01" value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div>
      </div>`;
  }
  if (/led|videotron/.test(s) || t.includes('luas')) return `
    <div class="dim">
      <div class="field"><label>Lebar Videotron (m)</label><input type="number" step=".01" value="${x.lebar}" onchange="upd(${x.id},'lebar',this.value)"></div>
      <div class="field"><label>Tinggi Videotron (m)</label><input type="number" step=".01" value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div>
    </div>`;
  return `<div class="field"><label>Jumlah (Qty)</label><input type="number" value="${x.qty}" onchange="upd(${x.id},'qty',this.value)"></div>`;
}

function drawItems() {
  let e = $('#items');
  if (!e) return;
  e.innerHTML = items.map((x, i) => `
    <div class="item">
      <div class="itemhead">
        <span class="blue">ITEM #${i + 1}</span>
        <button class="btn red sm" onclick="removeItem(${x.id})">Hapus</button>
      </div>
      <div class="field">
        <label>Produk / Jasa</label>
        <select onchange="pick(${x.id},this.value)">
          <option value="">-- Pilih dari Master Harga --</option>
          ${masters.filter(m => String(m.aktif ?? 'YA').toUpperCase() !== 'TIDAK').map(m => `
            <option value="${esc(m.kode)}" ${x.kode === m.kode ? 'selected' : ''}>[${esc(m.kode)}] ${esc(m.item)}</option>
          `).join('')}
        </select>
      </div>
      <div class="grid g2">
        <div class="field"><label>Harga Jual</label><input value="${money(x.harga)}" readonly></div>
        <div class="field"><label>Tipe Perhitungan</label><input value="${esc(x.tipe)}" readonly></div>
      </div>
      ${dim(x)}
      <div class="sched">
        <b>Jadwal Pemakaian</b>
        <div class="grid g2" style="margin-top:12px">
          <div class="field"><label>Tanggal Mulai</label><input type="date" value="${x.mulai}" onchange="upd(${x.id},'mulai',this.value)"></div>
          <div class="field"><label>Tanggal Selesai</label><input type="date" value="${x.selesai}" onchange="upd(${x.id},'selesai',this.value)"></div>
        </div>
      </div>
      <div class="sum">
        <span>Subtotal</span>
        <b>${money(subtotal(x))}</b>
      </div>
    </div>
  `).join('');

  $('#total').textContent = money(items.reduce((a, x) => a + subtotal(x), 0));
}

async function saveQuote() {
  let client = $('#qc').value.trim(), perusahaan = $('#qp').value.trim(), event_name = $('#qeve').value.trim();
  if (!client || !perusahaan || !event_name) return msg('Client, Perusahaan, dan Nama Event wajib.');

  let total = items.reduce((a, x) => a + subtotal(x), 0);
  let payload = {
    nomor_penawaran: 'PM-' + Date.now().toString().slice(-6),
    nama_client: client,
    perusahaan: perusahaan,
    event_name: event_name,
    total: total,
    status: 'DRAFT'
  };

  if (db) {
    let r = await db.from('penawaran').insert([payload]);
    if (r.error) return msg(r.error.message);
  }
  msg('Penawaran berhasil disimpan!');
}

function printQuote() {
  window.print();
}

async function history() {
  let r = await db?.from('penawaran').select('*').order('id', { ascending: false });
  let rows = r?.data || [];
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
            <tr>
              <th>No</th>
              <th>Client</th>
              <th>Perusahaan</th>
              <th>Event</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(x => `
              <tr>
                <td>${esc(x.nomor_penawaran || '-')}</td>
                <td>${esc(x.nama_client)}</td>
                <td>${esc(x.perusahaan)}</td>
                <td>${esc(x.event_name)}</td>
                <td>${money(x.total)}</td>
                <td>${esc(x.status)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6">Belum ada penawaran.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function templatePage() {
  let t = template || {};
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
        <div class="actions">
          <button class="btn" onclick="saveTemplate()">Simpan Template</button>
        </div>
      </div>
      <div class="preview">
        <div class="kop">
          ${t.logo_url ? `<img src="${esc(t.logo_url)}">` : ''}
          <h2>${esc(t.kop_text || 'PRIANGAN MULTIMEDIA')}</h2>
          <div>${esc(t.alamat || '')}</div>
          <div>${esc(t.telepon || '')} | WA ${esc(t.whatsapp || '')}</div>
        </div>
        <h3 style="text-align:center">SURAT PENAWARAN HARGA</h3>
        <p>Nomor: ____________________</p>
        <p>Kepada Yth. __________________________</p>
        <p>Dengan hormat, berikut kami sampaikan penawaran harga untuk kebutuhan event/project.</p>
        <div style="font-size:10px">
          <b>Syarat & Ketentuan</b><br>
          ${esc(t.ketentuan || '').replace(/\n/g, '<br>')}
        </div>
        <div style="margin:40px 0 0 auto;width:220px;text-align:center">
          ${t.ttd_url ? `<img src="${esc(t.ttd_url)}" style="max-height:80px">` : ''}<br>
          <b>${esc(t.nama_penandatangan || '')}</b><br>
          ${esc(t.jabatan_penandatangan || '')}
        </div>
      </div>
    </div>`;
}

function tf(l, id, v, area) {
  return `
    <div class="field">
      <label>${l}</label>
      ${area ? `<textarea id="${id}">${esc(v)}</textarea>` : `<input id="${id}" value="${esc(v)}">`}
    </div>`;
}

async function saveTemplate() {
  let payload = {
    nama_template: $('#tn').value.trim(),
    logo_url: $('#tl').value.trim(),
    kop_text: $('#tk').value.trim(),
    alamat: $('#ta').value.trim(),
    telepon: $('#tt').value.trim(),
    whatsapp: $('#tw').value.trim(),
    email: $('#te').value.trim(),
    website: $('#tweb').value.trim(),
    ketentuan: $('#tket').value.trim(),
    nama_penandatangan: $('#tp').value.trim(),
    jabatan_penandatangan: $('#tj').value.trim(),
    ttd_url: $('#ttd').value.trim()
  };

  if (template?.id) {
    await db.from('template_surat').update(payload).eq('id', template.id);
  } else {
    await db.from('template_surat').insert([payload]);
  }
  await load();
  render();
  msg('Template disimpan.');
}

function settings() {
  $('#content').innerHTML = `
    <div class="head">
      <div>
        <h1>Pengaturan Database</h1>
        <p>Koneksi Supabase.</p>
      </div>
    </div>
    <div class="card">
      <div class="field"><label>URL Supabase</label><input id="su" value="${esc(C.SUPABASE_URL || '')}"></div>
      <div class="field"><label>Anon Key Supabase</label><input id="sk" value="${esc(C.SUPABASE_ANON_KEY || '')}"></div>
      <div class="actions">
        <button class="btn" onclick="saveSettings()">Simpan Konfigurasi</button>
      </div>
    </div>`;
}

function saveSettings() {
  let url = $('#su').value.trim();
  let key = $('#sk').value.trim();
  localStorage.setItem('SUPABASE_URL', url);
  localStorage.setItem('SUPABASE_ANON_KEY', key);
  msg('Konfigurasi tersimpan. Silakan muat ulang halaman.');
}

function go(p) {
  page = p;
  if (p === 'quotation') items = [];
  render();
}

// Global Exports
window.go = go;
window.masterForm = masterForm;
window.saveMaster = saveMaster;
window.handleCSVImport = handleCSVImport;
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
