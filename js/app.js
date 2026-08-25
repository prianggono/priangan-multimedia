// Variable Global untuk Menampung Data CSV Sementara
let parsedCSVData = [];

// Navigation Page Switcher
function switchMenu(pageName) {
  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => sec.style.display = 'none');
  
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) targetPage.style.display = 'block';

  if (pageName === 'master-harga') {
    loadMasterHarga();
  }
}

// Load Master Harga dari Supabase
async function loadMasterHarga() {
  try {
    const { data, error } = await supabaseClient
      .from('master_harga')
      .select('*')
      .order('kode', { ascending: true });

    if (error) throw error;

    const tbody = document.getElementById('tbody-master-harga');
    if (!tbody) return;

    tbody.innerHTML = '';
    data.forEach(item => {
      tbody.innerHTML += `
        <tr>
          <td><strong>${item.kode}</strong></td>
          <td>${item.item}</td>
          <td>${item.kategori || '-'}</td>
          <td>${item.satuan || '-'}</td>
          <td>Rp ${(item.harga_jual || 0).toLocaleString('id-ID')}</td>
          <td><span class="badge ${item.aktif === 'YA' ? 'badge-success' : 'badge-danger'}">${item.aktif}</span></td>
          <td>
            <button class="btn btn-sm" onclick="editHarga('${item.id}')">Edit</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading master harga:', err.message);
  }
}

// Modal Handlers Manual
function openModalTambahHarga() {
  document.getElementById('modal-harga').style.display = 'block';
}
function closeModalHarga() {
  document.getElementById('modal-harga').style.display = 'none';
}

// Modal Handlers Import CSV
function openModalImportCSV() {
  document.getElementById('modal-import-csv').style.display = 'block';
  document.getElementById('csv-file-input').value = '';
  document.getElementById('csv-preview-container').style.display = 'none';
  parsedCSVData = [];
}

function closeModalImportCSV() {
  document.getElementById('modal-import-csv').style.display = 'none';
  parsedCSVData = [];
}

// Reader & Parser CSV Manual
function handleCSVFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    parseAndPreviewCSV(text);
  };
  reader.readAsText(file);
}

function parseAndPreviewCSV(csvContent) {
  const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    alert('File CSV kosong atau tidak memiliki data!');
    return;
  }

  // Parse Header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['kode', 'item', 'kategori', 'satuan', 'harga_jual', 'aktif'];
  
  const isValidHeader = requiredHeaders.every(req => headers.includes(req));
  if (!isValidHeader) {
    alert(`Header CSV tidak valid! Format WAJIB: ${requiredHeaders.join(',')}`);
    return;
  }

  parsedCSVData = [];
  const tbody = document.getElementById('tbody-csv-preview');
  tbody.innerHTML = '';

  let validRowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length < 6) continue;

    const rowObj = {
      kode: cols[0],
      item: cols[1],
      kategori: cols[2],
      satuan: cols[3],
      harga_jual: parseFloat(cols[4]) || 0,
      aktif: cols[5].toUpperCase() === 'YA' ? 'YA' : 'TIDAK'
    };

    let isValidRow = rowObj.kode && rowObj.item;
    if (isValidRow) validRowCount++;

    parsedCSVData.push(rowObj);

    tbody.innerHTML += `
      <tr>
        <td>${rowObj.kode}</td>
        <td>${rowObj.item}</td>
        <td>${rowObj.kategori}</td>
        <td>${rowObj.satuan}</td>
        <td>Rp ${rowObj.harga_jual.toLocaleString('id-ID')}</td>
        <td>${rowObj.aktif}</td>
        <td><span class="badge ${isValidRow ? 'badge-success' : 'badge-danger'}">${isValidRow ? 'OK' : 'Invalid'}</span></td>
      </tr>
    `;
  }

  document.getElementById('csv-count').innerText = validRowCount;
  document.getElementById('csv-preview-container').style.display = 'block';
}

// Proses UPSERT Data ke Supabase Database
async function processImportCSV() {
  if (parsedCSVData.length === 0) {
    alert('Tidak ada data CSV valid yang bisa diimport!');
    return;
  }

  const btn = document.getElementById('btn-submit-import');
  btn.disabled = true;
  btn.innerText = 'Mengimport...';

  try {
    // UPSERT berdasarkan constraint/unique key 'kode'
    const { data, error } = await supabaseClient
      .from('master_harga')
      .upsert(parsedCSVData, { onConflict: 'kode' });

    if (error) throw error;

    alert(`Berhasil mengimport/memperbarui ${parsedCSVData.length} item Master Harga!`);
    closeModalImportCSV();
    loadMasterHarga();
  } catch (err) {
    alert('Gagal melakukan import data: ' + err.message);
    console.error('Import CSV error:', err);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Proses Import ke Supabase';
  }
}

// Document Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadMasterHarga();
});
