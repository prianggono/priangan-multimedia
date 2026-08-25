const C=window.PRIANGAN_CONFIG||{};let db=null,page='dashboard',masters=[],clients=[],template=null,items=[],csvPreviewData=[];
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])), money=x=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(x)||0);function msg(x){let t=$('#toast');if(!t)return alert(x);t.textContent=x;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}

async function init(){
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{page=b.dataset.p;render();$('.sidebar').classList.remove('open')});
  $('#menu').onclick=()=>$('.sidebar').classList.toggle('open');
  if(C.SUPABASE_ANON_KEY&&!C.SUPABASE_ANON_KEY.includes('PASTE_')){
    db=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);
    try{
      await load();
      $('#status').textContent='Supabase terhubung';
      $('#status').className='badge ok';
    }catch(e){
      console.error(e);
      msg(e.message);
    }
  }
  render();
}

async function load(){
  let [m,c,t]=await Promise.all([
    db.from('master_harga').select('*').order('id'),
    db.from('clients').select('*').order('id',{ascending:false}),
    db.from('template_surat').select('*').limit(1)
  ]);
  if(m.error)throw m.error;
  if(c.error)throw c.error;
  if(t.error)throw t.error;
  masters=m.data||[];
  clients=c.data||[];
  template=t.data?.[0]||null;
}

function render(){
  let names={dashboard:'Dashboard',master:'Master Harga',clients:'Client',quotation:'Buat Penawaran',history:'Riwayat Penawaran',template:'Template Surat',settings:'Pengaturan'};
  $('#title').textContent=names[page];
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.p===page));
  ({dashboard:dash,master,clientsPage,quotation,history,templatePage,settings}[page]||dash)();
}

function dash(){
  let a=masters.filter(x=>String(x.aktif??'YA').toUpperCase()==='YA').length;
  $('#content').innerHTML=`<div class=head><div><h1>Dashboard</h1><p>Sales & quotation Priangan Multimedia.</p></div><button class=btn onclick="go('quotation')">+ Buat Penawaran</button></div><div class="grid g4"><div class="card stat"><small>Master Harga Aktif</small><strong>${a}</strong></div><div class="card stat"><small>Client</small><strong>${clients.length}</strong></div><div class="card stat"><small>Template Surat</small><strong>${template?1:0}</strong></div><div class="card stat"><small>Database</small><strong style="font-size:20px">${db?'ONLINE':'SETUP'}</strong></div></div><div class=card style="margin-top:16px"><b>Alur</b><p style="color:var(--muted)">Master Harga → Client → Penawaran → Preview A4 → Cetak PDF.</p></div>`;
}

// ==================== MASTER HARGA ====================
function master(){
  $('#content').innerHTML=`
    <input type="file" id="csvInput" accept=".csv" style="display:none" onchange="handleCSVFile(event)">
    <div class=head>
      <div><h1>Master Harga</h1><p>Produk dan jasa.</p></div>
      <div class=actions>
        <button class="btn secondary" onclick="$('#csvInput').click()">Import CSV</button>
        <button class=btn onclick="masterForm()">+ Tambah Item</button>
      </div>
    </div>
    <div id=csvBox></div>
    <div class=card>
      <div class=scroll>
        <table class=table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Item</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th>Harga</th>
              <th>Aktif</th>
              <th style="text-align:center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${masters.map(x=>`
              <tr>
                <td>${esc(x.kode)}</td>
                <td>${esc(x.item)}</td>
                <td>${esc(x.kategori)}</td>
                <td>${esc(x.satuan)}</td>
                <td>${money(x.harga_jual)}</td>
                <td>${esc(x.aktif??'')}</td>
                <td style="text-align:center">
                  <button class="btn secondary sm" onclick="editMasterForm(${x.id})">Edit</button>
                </td>
              </tr>
            `).join('')||'<tr><td colspan=7 class=empty>Belum ada data.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

function masterForm(){ 
  $('#f')?.remove();
  $('#content').insertAdjacentHTML('afterbegin',`
    <div id=f class=card style="margin-bottom:16px">
      <b>Tambah Item Master</b>
      <div class="grid g2" style="margin-top:12px">
        <div class=field><label>Kode</label><input id=mk placeholder="Contoh: SND-PKT-01"></div>
        <div class=field><label>Item</label><input id=mi placeholder="Nama produk/jasa"></div>
        <div class=field><label>Kategori</label><input id=mc placeholder="Contoh: Sound System / Lighting / LED"></div>
        <div class=field><label>Satuan</label><input id=ms placeholder="Contoh: Paket / Unit / m²"></div>
        <div class=field><label>Harga Jual</label><input id=mh type=number></div>
        <div class=field><label>Aktif</label><select id=ma><option>YA</option><option>TIDAK</option></select></div>
      </div>
      <div class=actions style="margin-top:15px">
        <button class="btn secondary" onclick="$('#f').remove()">Batal</button>
        <button class=btn onclick="saveMaster()">Simpan Item</button>
      </div>
    </div>`);
}

function editMasterForm(id){
  let item = masters.find(x => x.id === id);
  if(!item) return msg('Item tidak ditemukan.');

  $('#f')?.remove();
  $('#content').insertAdjacentHTML('afterbegin',`
    <div id=f class=card style="margin-bottom:16px">
      <b>Edit Item Master</b>
      <div class="grid g2" style="margin-top:12px">
        <div class=field><label>Kode</label><input id=mk value="${esc(item.kode)}"></div>
        <div class=field><label>Item</label><input id=mi value="${esc(item.item)}"></div>
        <div class=field><label>Kategori</label><input id=mc value="${esc(item.kategori)}"></div>
        <div class=field><label>Satuan</label><input id=ms value="${esc(item.satuan)}"></div>
        <div class=field><label>Harga Jual</label><input id=mh type=number value="${item.harga_jual||0}"></div>
        <div class=field><label>Aktif</label><select id=ma><option ${item.aktif==='YA'?'selected':''}>YA</option><option ${item.aktif==='TIDAK'?'selected':''}>TIDAK</option></select></div>
      </div>
      <div class=actions style="margin-top:15px">
        <button class="btn secondary" onclick="$('#f').remove()">Batal</button>
        <button class="btn green" onclick="updateMaster(${item.id})">Simpan Perubahan</button>
      </div>
    </div>`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveMaster(){
  if(!db)return msg('Isi anon key Supabase dulu.');
  let payload = {
    kode: $('#mk').value,
    item: $('#mi').value,
    kategori: $('#mc').value,
    satuan: $('#ms').value,
    harga_jual: Number($('#mh').value)||0,
    aktif: $('#ma').value
  };
  let r=await db.from('master_harga').insert(payload);
  if(r.error)return msg(r.error.message);
  await load();
  render();
  msg('Master harga tersimpan');
}

async function updateMaster(id){
  if(!db) return msg('Isi anon key Supabase dulu.');
  let payload = {
    kode: $('#mk').value,
    item: $('#mi').value,
    kategori: $('#mc').value,
    satuan: $('#ms').value,
    harga_jual: Number($('#mh').value) || 0,
    aktif: $('#ma').value
  };
  let r = await db.from('master_harga').update(payload).eq('id', id);
  if(r.error) return msg(r.error.message);
  await load();
  render();
  msg('Master harga berhasil diupdate');
}

// ==================== CSV IMPORT ====================
function handleCSVFile(e){
  let file = e.target.files[0];
  if(!file) return;
  let reader = new FileReader();
  reader.onload = function(evt){ parseCSV(evt.target.result); };
  reader.readAsText(file);
  e.target.value = '';
}

function parseCSV(text){
  let lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
  if(lines.length < 2) return msg('File CSV kosong atau format salah.');
  
  let headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  let req = ['kode', 'item', 'kategori', 'satuan', 'harga_jual', 'aktif'];
  if(!req.every(r => headers.includes(r))) return msg('Header CSV WAJIB: kode,item,kategori,satuan,harga_jual,aktif');

  csvPreviewData = [];
  for(let i = 1; i < lines.length; i++){
    let cols = lines[i].split(',').map(c => c.trim());
    if(cols.length < 6) continue;
    csvPreviewData.push({
      kode: cols[0],
      item: cols[1],
      kategori: cols[2],
      satuan: cols[3],
      harga_jual: Number(cols[4]) || 0,
      aktif: cols[5].toUpperCase() === 'YA' ? 'YA' : 'TIDAK'
    });
  }

  if(!csvPreviewData.length) return msg('Tidak ada data valid di dalam CSV.');

  $('#csvBox').innerHTML = `
    <div id=fCSV class=card style="margin-bottom:16px">
      <b>Preview Import CSV (${csvPreviewData.length} item)</b>
      <p style="color:var(--muted);font-size:12px;margin:4px 0 12px 0">Data akan di-Insert / Update berdasarkan Kode Item.</p>
      <div class=scroll style="max-height:200px">
        <table class=table>
          <thead><tr><th>Kode</th><th>Item</th><th>Kategori</th><th>Satuan</th><th>Harga</th><th>Aktif</th></tr></thead>
          <tbody>${csvPreviewData.map(x=>`<tr><td>${esc(x.kode)}</td><td>${esc(x.item)}</td><td>${esc(x.kategori)}</td><td>${esc(x.satuan)}</td><td>${money(x.harga_jual)}</td><td>${esc(x.aktif)}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <div class=actions style="margin-top:12px">
        <button class="btn secondary" onclick="$('#fCSV').remove()">Batal</button>
        <button class="btn green" onclick="processImportCSV()">Proses Import ke Supabase</button>
      </div>
    </div>`;
}

async function processImportCSV(){
  if(!db) return msg('Isi anon key Supabase dulu.');
  if(!csvPreviewData.length) return msg('Data CSV kosong.');

  let { error } = await db.from('master_harga').upsert(csvPreviewData, { onConflict: 'kode' });
  if(error) return msg('Gagal Import: ' + error.message);

  await load();
  render();
  msg('Berhasil mengimport data Master Harga!');
}

// ==================== CLIENTS ====================
function clientsPage(){ 
  $('#content').innerHTML=`<div class=head><div><h1>Client</h1><p>Data perusahaan dan nomor WA untuk autofill.</p></div><button class=btn onclick="clientForm()">+ Tambah Client</button></div><div class=card><div class=scroll><table class=table><thead><tr><th>Nama</th><th>Perusahaan</th><th>Telepon</th><th>WA</th><th>Email</th></tr></thead><tbody>${clients.map(x=>`<tr><td>${esc(x.nama_client||x.nama)}</td><td>${esc(x.perusahaan)}</td><td>${esc(x.telepon)}</td><td>${esc(x.whatsapp)}</td><td>${esc(x.email)}</td></tr>`).join('')||'<tr><td colspan=5>Belum ada data.</td></tr>'}</tbody></table></div></div>`;
}

function clientForm(){ 
  $('#content').insertAdjacentHTML('afterbegin',`<div id=cf class=card style="margin-bottom:16px"><div class=grid g2><div class=field><label>Nama Client</label><input id=cn></div><div class=field><label>Perusahaan</label><input id=cp></div><div class=field><label>Telepon</label><input id=ct></div><div class=field><label>WhatsApp</label><input id=cw></div><div class=field><label>Email</label><input id=ce></div><div class=field><label>Alamat</label><input id=ca></div></div><div class=actions><button class="btn secondary" onclick="$('#cf').remove()">Batal</button><button class=btn onclick="saveClient()">Simpan</button></div></div>`);
}

async function saveClient(){
  if(!db)return msg('Isi anon key Supabase dulu.');
  let r=await db.from('clients').insert({nama_client:$('#cn').value,perusahaan:$('#cp').value,telepon:$('#ct').value,whatsapp:$('#cw').value,email:$('#ce').value,alamat:$('#ca').value});
  if(r.error)return msg(r.error.message);
  await load();
  render();
  msg('Client tersimpan');
}

// ==================== PENAWARAN (QUOTATION) ====================
function quotation(){ 
  $('#content').innerHTML=`<div class=head><div><h1>Buat Surat Penawaran</h1><p>Dimensi LED, Rigging dan Level otomatis.</p></div></div><div class=card><b>Informasi Umum</b><div class="grid g2" style="margin-top:15px"><div class=field><label>Client *</label><input id=qc list=cl placeholder="Nama Client"><datalist id=cl>${clients.map(c=>`<option value="${esc(c.nama_client||c.nama)}">`).join('')}</datalist></div><div class=field><label>Perusahaan *</label><input id=qp></div><div class=field><label>No. Telepon / WA</label><input id=qw></div><div class=field><label>Email</label><input id=qe></div><div class=field><label>Nama Event / Project *</label><input id=qeve></div><div class=field><label>Tanggal Mulai Event *</label><input id=qs type=date></div><div class=field><label>Tanggal Selesai Event *</label><input id=qe2 type=date></div></div></div><div style="margin-top:20px"><div id=items></div><div class="actions no-print"><button class=btn onclick="addItem()">+ TAMBAH ITEM</button></div></div><div class=card style="margin-top:16px"><div class=sum><span>Total</span><b id=total>Rp 0</b></div><div class="actions no-print" style="margin-top:15px"><button class="btn secondary" onclick="go('dashboard')">Batal</button><button class="btn green" onclick="saveQuote()">Simpan Penawaran</button><button class=btn onclick="printQuote()">Preview / Cetak A4</button></div></div>`;
  $('#qc').onchange=()=>{
    let c=clients.find(x=>String(x.nama_client||x.nama).toLowerCase()===$('#qc').value.toLowerCase());
    if(c){$('#qp').value=c.perusahaan||'';$('#qw').value=c.whatsapp||c.telepon||'';$('#qe').value=c.email||''}
  };
  if(!items.length)addItem();
  else drawItems();
}

function addItem(){
  items.push({id:Date.now()+Math.random(),kode:'',item:'',harga:0,tipe:'Jumlah (Qty)',qty:1,lebar:'',tinggi:'',panjang:'',mulai:'',selesai:''});
  drawItems();
}

function removeItem(id){
  items=items.filter(x=>x.id!==id);
  drawItems();
}

function pick(id,k){
  let x=items.find(a=>a.id===id),m=masters.find(a=>a.kode===k);
  if(!x)return;
  x.kode=k;
  if(m){
    x.item=m.item;
    x.harga=Number(m.harga_jual)||0;
    let s=String(m.satuan||'').toLowerCase();
    let cat=String(m.kategori||'').toLowerCase();
    if(s.includes('m²')||s.includes('m2')){
      x.tipe='Luas (Lebar × Tinggi)';
    }else if(cat.includes('sound')||cat.includes('lighting')||s.includes('paket')){
      x.tipe='Paket (Qty × Hari)';
    }else{
      x.tipe='Jumlah (Qty)';
    }
  }
  if(/level/i.test(x.item)){
    let led=items.find(a=>/led|videotron/i.test(a.item));
    if(led)x.lebar=led.lebar||'';
  }
  drawItems();
}

function upd(id,k,v){
  let x=items.find(a=>a.id===id);
  if(x){
    x[k]=v;
    if(/level/i.test(x.item)&&k==='tinggi'){
      let led=items.find(a=>/led|videotron/i.test(a.item));
      if(led)x.lebar=led.lebar||'';
    }
    drawItems();
  }
}

function dim(x){
  let s=x.item.toLowerCase(),t=x.tipe.toLowerCase();
  if(/rigging|rig/.test(s))return `<div class=dim><div class=field><label>Panjang Rigging (m)</label><input type=number step=.01 value="${x.panjang}" onchange="upd(${x.id},'panjang',this.value)"></div><div class=field><label>Tinggi Rigging (m)</label><input type=number step=.01 value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div></div>`;
  if(/level/.test(s)){
    let led=items.find(a=>/led|videotron/i.test(a.item));
    let w=led?led.lebar:x.lebar;
    return `<div class=dim><div class=field><label>Lebar Level (otomatis)</label><input value="${w||''} m" readonly></div><div class=field><label>Tinggi Level (m)</label><input type=number step=.01 value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div></div>`;
  }
  if(/led|videotron/.test(s)||t.includes('luas'))return `<div class=dim><div class=field><label>Lebar Videotron (m)</label><input type=number step=.01 value="${x.lebar}" onchange="upd(${x.id},'lebar',this.value)"></div><div class=field><label>Tinggi Videotron (m)</label><input type=number step=.01 value="${x.tinggi}" onchange="upd(${x.id},'tinggi',this.value)"></div></div>`;
  return `<div class=field><label>Jumlah Paket / Qty</label><input type=number min=1 value="${x.qty||1}" onchange="upd(${x.id},'qty',this.value)"></div>`;
}

function subtotal(x){
  let s=x.item.toLowerCase();
  if(/rigging/.test(s))return (+x.panjang||0)*(+x.tinggi||0)*(+x.harga||0);
  if(/level/.test(s))return (+x.lebar||0)*(+x.tinggi||0)*(+x.harga||0);
  if(/led|videotron/.test(s)||x.tipe.toLowerCase().includes('luas'))return (+x.lebar||0)*(+x.tinggi||0)*(+x.harga||0)*(+x.qty||1);
  return (+x.qty||1)*(+x.harga||0);
}

function drawItems(){
  let e=$('#items');
  if(!e)return;
  e.innerHTML=items.map((x,i)=>`<div class=item><div class=itemhead><span class=blue>ITEM #${i+1}</span><button class="btn red sm" onclick="removeItem(${x.id})">Hapus</button></div><div class=field><label>Produk / Jasa</label><select onchange="pick(${x.id},this.value)"><option value="">-- Pilih dari Master Harga --</option>${masters.filter(m=>String(m.aktif??'YA').toUpperCase()!=='TIDAK').map(m=>`<option value="${esc(m.kode)}" ${x.kode===m.kode?'selected':''}>[${esc(m.kode)}] ${esc(m.item)}</option>`).join('')}</select></div><div class="grid g2"><div class=field><label>Harga Jual</label><input value="${money(x.harga)}" readonly></div><div class=field><label>Tipe Perhitungan</label><input value="${esc(x.tipe)}" readonly></div></div>${dim(x)}<div class=sched><b>Jadwal Pemakaian</b><div class="grid g2" style="margin-top:12px"><div class=field><label>Tanggal Mulai</label><input type=date value="${x.mulai}" onchange="upd(${x.id},'mulai',this.value)"></div><div class=field><label>Tanggal Selesai</label><input type=date value="${x.selesai}" onchange="upd(${x.id},'selesai',this.value)"></div></div></div><div class=sum><span>Subtotal</span><b>${money(subtotal(x))}</b></div></div>`).join('');
  $('#total').textContent=money(items.reduce((a,x)=>a+subtotal(x),0));
}

async function saveQuote(){
  if(!db)return msg('Isi anon key Supabase dulu.');
  let h={nama_client:$('#qc').value,perusahaan:$('#qp').value,telepon:$('#qw').value,whatsapp:$('#qw').value,email:$('#qe').value,event_name:$('#qeve').value,tanggal_mulai:$('#qs').value||null,tanggal_selesai:$('#qe2').value||null,total:items.reduce((a,x)=>a+subtotal(x),0),status:'DRAFT'};
  let r=await db.from('penawaran').insert(h).select().single();
  if(r.error)return msg(r.error.message);
  for(let x of items){
    let z=await db.from('penawaran_items').insert({penawaran_id:r.data.id,kode:x.kode,item:x.item,harga_jual:x.harga,tipe_perhitungan:x.tipe,qty:+x.qty||1,lebar:+x.lebar||null,tinggi:+x.tinggi||null,panjang:+x.panjang||null,subtotal:subtotal(x)});
    if(z.error)return msg(z.error.message);
    if(x.mulai||x.selesai)await db.from('penawaran_jadwal').insert({penawaran_item_id:z.data?.[0]?.id,qty:+x.qty||1,tanggal_mulai:x.mulai||null,tanggal_selesai:x.selesai||null});
  }
  items=[];
  msg('Penawaran tersimpan');
  go('history');
}

// ==================== RIWAYAT PENAWARAN ====================
async function history(){
  let r=await db?.from('penawaran').select('*').order('id',{ascending:false});
  let rows=r?.data||[];
  $('#content').innerHTML=`<div class=head><div><h1>Riwayat Penawaran</h1><p>Data tersimpan di Supabase.</p></div><button class=btn onclick="go('quotation')">+ Buat Penawaran</button></div><div class=card><div class=scroll><table class=table><thead><tr><th>No</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.nomor_penawaran||'-')}</td><td>${esc(x.nama_client)}</td><td>${esc(x.perusahaan)}</td><td>${esc(x.event_name)}</td><td>${money(x.total)}</td><td>${esc(x.status)}</td></tr>`).join('')||'<tr><td colspan=6>Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
}

// ==================== TEMPLATE SURAT & SETTINGS ====================
function templatePage(){
  let t=template||{};
  $('#content').innerHTML=`<div class=head><div><h1>Template Surat</h1><p>Kop, ketentuan, logo dan tanda tangan.</p></div></div><div class="grid g2"><div class=card>${tf('Nama Template','tn',t.nama_template)}${tf('Logo URL','tl',t.logo_url)}${tf('Kop Text','tk',t.kop_text)}${tf('Alamat','ta',t.alamat)}${tf('Telepon','tt',t.telepon)}${tf('WhatsApp','tw',t.whatsapp)}${tf('Email','te',t.email)}${tf('Website','tweb',t.website)}${tf('Ketentuan','tket',t.ketentuan,true)}${tf('Nama Penandatangan','tp',t.nama_penandatangan)}${tf('Jabatan','tj',t.jabatan_penandatangan)}${tf('TTD URL','ttd',t.ttd_url)}<div class=actions><button class=btn onclick="saveTemplate()">Simpan Template</button></div></div><div class=preview><div class=kop>${t.logo_url?`<img src="${esc(t.logo_url)}">`:''}<h2>${esc(t.kop_text||'PRIANGAN MULTIMEDIA')}</h2><div>${esc(t.alamat||'')}</div><div>${esc(t.telepon||'')} | WA ${esc(t.whatsapp||'')}</div></div><h3 style="text-align:center">SURAT PENAWARAN HARGA</h3><p>Nomor: ____________________</p><p>Kepada Yth. __________________________</p><p>Dengan hormat, berikut kami sampaikan penawaran harga untuk kebutuhan event/project.</p><div style="font-size:10px"><b>Syarat & Ketentuan</b><br>${esc(t.ketentuan||'').replace(/\n/g,'<br>')}</div><div style="margin:40px 0 0 auto;width:220px;text-align:center">${t.ttd_url?`<img src="${esc(t.ttd_url)}" style="max-height:80px">`:''}<br><b>${esc(t.nama_penandatangan||'')}</b><br>${esc(t.jabatan_penandatangan||'')}</div></div></div>`;
}

function tf(l,id,v,area){
  return `<div class=field><label>${l}</label>${area?`<textarea id=${id}>${esc(v)}</textarea>`:`<input id=${id} value="${esc(v)}">`}</div>`;
}

async function saveTemplate(){
  if(!db)return msg('Isi anon key Supabase dulu.');
  let o={nama_template:$('#tn').value,logo_url:$('#tl').value,kop_text:$('#tk').value,alamat:$('#ta').value,telepon:$('#tt').value,whatsapp:$('#tw').value,email:$('#qe').value||$('#tw').value,website:$('#tweb').value,ketentuan:$('#tket').value,nama_penandatangan:$('#tp').value,jabatan_penandatangan:$('#tj').value,ttd_url:$('#ttd').value};
  let r=template?await db.from('template_surat').update(o).eq('id',template.id):await db.from('template_surat').insert(o);
  if(r.error)return msg(r.error.message);
  await load();
  msg('Template tersimpan');
  render();
}

function settings(){
  $('#content').innerHTML=`<div class=head><div><h1>Pengaturan</h1><p>Konfigurasi ada di <b>js/config.js</b>.</p></div></div><div class=card><b>Project URL</b><p>${esc(C.SUPABASE_URL||'')}</p><p style="color:var(--muted)">Isi anon/public key Supabase. Jangan pernah memakai service_role key di browser.</p></div>`;
}

function printQuote(){
  let t=template||{};
  let rows=items.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.item)}</td><td>${esc(x.lebar||'')} × ${esc(x.tinggi||'')}</td><td>${money(x.harga)}</td><td>${money(subtotal(x))}</td></tr>`).join('');
  let w=open('','_blank');
  w.document.write(`<html><head><title>Penawaran</title><style>body{margin:0;background:#ddd;font:12px Arial}.p{background:#fff;width:794px;min-height:1123px;margin:20px auto;padding:48px;box-sizing:border-box}.kop{border-bottom:3px solid #111;padding-bottom:12px}.kop img{max-width:230px;max-height:85px}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #999;padding:7px;font-size:11px}th{background:#eee}.sig{margin:40px 0 0 auto;width:220px;text-align:center}.sig img{max-height:80px;max-width:180px}@media print{body{background:#fff}.p{margin:0;box-shadow:none}}</style></head><body><div class=p><div class=kop>${t.logo_url?`<img src="${esc(t.logo_url)}">`:''}<h2>${esc(t.kop_text||'PRIANGAN MULTIMEDIA')}</h2><div>${esc(t.alamat||'')}</div><div>${esc(t.telepon||'')} | WA ${esc(t.whatsapp||'')}</div><div>${esc(t.email||'')}</div></div><h3 style="text-align:center">SURAT PENAWARAN HARGA</h3><p>Client: <b>${esc($('#qc')?.value)}</b><br>Perusahaan: ${esc($('#qp')?.value)}<br>Event: ${esc($('#qeve')?.value)}<br>Tanggal: ${esc($('#qs')?.value)} s/d ${esc($('#qe2')?.value)}</p><table><tr><th>No</th><th>Produk / Jasa</th><th>Dimensi</th><th>Harga</th><th>Subtotal</th></tr>${rows}</table><h3 style="text-align:right">TOTAL ${money(items.reduce((a,x)=>a+subtotal(x),0))}</h3><div style="font-size:10px"><b>Syarat & Ketentuan</b><br>${esc(t.ketentuan||'').replace(/\n/g,'<br>')}</div><div class=sig>${t.ttd_url?`<img src="${esc(t.ttd_url)}"><br>`:''}<b>${esc(t.nama_penandatangan||'')}</b><br>${esc(t.jabatan_penandatangan||'')}</div></div><script>onload=()=>print()<\/script></body></html>`);
  w.document.close();
}

function go(p){
  page=p;
  if(p==='quotation')items=[];
  render();
}

// Bind Global Window Functions
window.go=go;
window.masterForm=masterForm;
window.editMasterForm=editMasterForm;
window.saveMaster=saveMaster;
window.updateMaster=updateMaster;
window.clientForm=clientForm;
window.saveClient=saveClient;
window.addItem=addItem;
window.removeItem=removeItem;
window.pick=pick;
window.upd=upd;
window.saveQuote=saveQuote;
window.printQuote=printQuote;
window.saveTemplate=saveTemplate;
window.handleCSVFile=handleCSVFile;
window.processImportCSV=processImportCSV;

init();
