/* PRI_ERP — Project / Event module
 * Owns project/event CRUD and project ↔ quotation linking.
 * Does not modify quotation, invoice, finance, or client logic.
 */
(function(){
  'use strict';
  if(window.__PM_PROJECT_EVENT_MODULE)return;
  window.__PM_PROJECT_EVENT_MODULE=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const dbx=()=>{try{return typeof db!=='undefined'?db:null}catch(_){return null}};
  const msg=t=>typeof window.msg==='function'?window.msg(t):alert(t);
  const money=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  const fmtDate=v=>{if(!v)return '-';const d=new Date(String(v)+'T00:00:00');return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})};
  const statusLabel=s=>String(s||'DRAFT').replace('PREPARATION','PERSIAPAN').replace('ON SITE','DI LOKASI').replace('CONFIRMED','TERKONFIRMASI').replace('COMPLETED','SELESAI').replace('CANCELLED','DIBATALKAN');
  const statusClass=s=>String(s||'DRAFT').toLowerCase().replace(/\s+/g,'-');

  let projects=[];
  let selectedProjectId=null;

  async function loadData(){
    const d=dbx(); if(!d)throw Error('Supabase belum terhubung.');
    const pr=await d.from('project_events').select('*,clients(nama_client,perusahaan)').order('id',{ascending:false});
    if(pr.error)throw pr.error;
    projects=pr.data||[];
    window.pmProjects=projects;
    return {projects};
  }

  function nav(){
    const b=document.querySelector('.sidebar .nav[data-p="projects"]');
    if(!b)return;
    document.querySelectorAll('.sidebar .nav[data-p]').forEach(x=>x.classList.toggle('active',x===b));
    document.querySelector('#title')?.replaceChildren(document.createTextNode('Project / Event'));
  }

  function formValues(){
    const v=id=>document.getElementById(id)?.value?.trim()||'';
    return {
      client_id:v('peClient')?Number(v('peClient')):null,
      kode_project:v('peCode'),
      nama_project:v('peName'),
      nama_event:v('peEvent'),
      venue:v('peVenue'),
      kota_venue:v('peCity'),
      alamat_venue:v('peAddress'),
      google_maps_url:v('peMaps'),
      pic_internal:v('pePicInternal'),
      pic_internal_phone:v('pePicInternalPhone'),
      pic_client:v('pePicClient'),
      pic_client_phone:v('pePicClientPhone'),
      tanggal_mulai:v('peStart')||null,
      tanggal_selesai:v('peEnd')||null,
      tanggal_load_in:v('peLoadInDate')||null,
      jam_load_in:v('peLoadIn')||null,
      jam_setup:v('peSetup')||null,
      jam_event:v('peEventTime')||null,
      jam_teardown:v('peTeardown')||null,
      jam_load_out:v('peLoadOut')||null,
      status:v('peStatus')||'DRAFT',
      catatan:v('peNotes'),
      dokumen:v('peDocs').split('\n').map(x=>x.trim()).filter(Boolean)
    };
  }

  function renderForm(project){
    const p=project||{};
    const clients=Array.isArray(window.clients)?window.clients:[];
    return `
      <div class="card pm-project-form" id="pmProjectForm">
        <div class="pm-project-form-head"><div><b>${p.id?'Edit Project':'Project / Event Baru'}</b><p class="pm-muted">Data operasional dasar. Belum menyentuh quotation, invoice, atau finance.</p></div></div>
        <input type="hidden" id="peId" value="${esc(p.id||'')}">
        <div class="grid g2">
          <div class="field"><label>Client *</label><select id="peClient"><option value="">Pilih Client</option>${clients.map(c=>`<option value="${c.id}" ${String(c.id)===String(p.client_id)?'selected':''}>${esc(c.nama_client||c.nama||c.perusahaan||'Client')}</option>`).join('')}</select></div>
          <div class="field"><label>Kode Project</label><input id="peCode" value="${esc(p.kode_project||'')}" placeholder="Otomatis saat disimpan" readonly></div>
          <div class="field"><label>Nama Project *</label><input id="peName" value="${esc(p.nama_project||'')}" placeholder="Contoh: Event ABC 2026"></div>
          <div class="field"><label>Nama Event</label><input id="peEvent" value="${esc(p.nama_event||'')}" placeholder="Nama acara"></div>
          <div class="field"><label>Venue</label><input id="peVenue" value="${esc(p.venue||'')}" placeholder="Nama venue"></div>
          <div class="field"><label>Kota</label><input id="peCity" value="${esc(p.kota_venue||'')}" placeholder="Contoh: Bandung"></div>
          <div class="field"><label>Alamat Venue</label><input id="peAddress" value="${esc(p.alamat_venue||'')}" placeholder="Alamat lokasi"></div>
          <div class="field"><label>Google Maps</label><input id="peMaps" value="${esc(p.google_maps_url||'')}" placeholder="Tempel link Google Maps"></div>
          <div class="pm-project-pic-block">
            <div class="pm-project-pic-title">PIC INTERNAL</div>
            <div class="pm-project-pic-row">
              <div class="field"><label>Nama PIC</label><input id="pePicInternal" value="${esc(p.pic_internal||'')}" placeholder="Nama PIC internal"></div>
              <div class="field"><label>No. Telepon</label><input id="pePicInternalPhone" value="${esc(p.pic_internal_phone||'')}" inputmode="tel" placeholder="085xxxxxxxxxx"></div>
            </div>
            <div class="pm-project-pic-title">PIC CLIENT</div>
            <div class="pm-project-pic-row">
              <div class="field"><label>Nama PIC</label><input id="pePicClient" value="${esc(p.pic_client||'')}" placeholder="Nama PIC client"></div>
              <div class="field"><label>No. Telepon</label><input id="pePicClientPhone" value="${esc(p.pic_client_phone||'')}" inputmode="tel" placeholder="085xxxxxxxxxx"></div>
            </div>
          </div>
          <div class="field"><label>Tanggal Mulai</label><input id="peStart" type="date" value="${esc(p.tanggal_mulai||'')}"></div>
          <div class="field"><label>Tanggal Selesai</label><input id="peEnd" type="date" value="${esc(p.tanggal_selesai||'')}"></div>
          <div class="field"><label>Load In — Tanggal</label><input id="peLoadInDate" type="date" value="${esc(p.tanggal_load_in||'')}"></div>
          <div class="field"><label>Load In — Jam</label><input id="peLoadIn" type="time" value="${esc(p.jam_load_in||'')}"></div>
          <div class="field"><label>Setup</label><input id="peSetup" type="time" value="${esc(p.jam_setup||'')}"></div>
          <div class="field"><label>Jam Event</label><input id="peEventTime" type="time" value="${esc(p.jam_event||'')}"></div>
          <div class="field"><label>Teardown</label><input id="peTeardown" type="time" value="${esc(p.jam_teardown||'')}"></div>
          <div class="field"><label>Load Out</label><input id="peLoadOut" type="time" value="${esc(p.jam_load_out||'')}"></div>
          <div class="field"><label>Status</label><select id="peStatus">${['DRAFT','CONFIRMED','PREPARATION','ON SITE','COMPLETED','CANCELLED'].map(s=>`<option value="${s}" ${String(p.status||'DRAFT')===s?'selected':''}>${statusLabel(s)}</option>`).join('')}</select></div>
        </div>
        <div class="field"><label>Catatan</label><textarea id="peNotes" rows="4" placeholder="Catatan operasional project">${esc(p.catatan||'')}</textarea></div>
        <div class="field"><label>Dokumen / Link</label><textarea id="peDocs" rows="3" placeholder="Satu URL per baris">${esc(Array.isArray(p.dokumen)?p.dokumen.join('\n'):'')}</textarea></div>
        <div class="actions"><button class="btn secondary" type="button" id="pmProjectCancel">Batal</button><button class="btn green" type="button" id="pmProjectSave">Simpan Project</button></div>
      </div>`;
  }

  async function saveProject(){
    const d=dbx();if(!d)return msg('Supabase belum terhubung.');
    const id=String(document.getElementById('peId')?.value||'').trim();
    const p=formValues();
    if(!p.client_id)return msg('Client wajib dipilih.');
    if(!p.nama_project)return msg('Nama Project wajib diisi.');
    if(p.tanggal_mulai&&p.tanggal_selesai&&p.tanggal_selesai<p.tanggal_mulai)return msg('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    const payload={...p};
    if(!id)delete payload.kode_project;
    try{
      let r=id?await d.from('project_events').update(payload).eq('id',id).select('id').single():await d.from('project_events').insert([payload]).select('id,kode_project').single();
      if(r.error)throw r.error;
      if(!r.data?.id)throw Error('Database tidak mengembalikan ID project.');
      if(!id&&!r.data.kode_project){
        const code='PRJ-'+new Date().toISOString().slice(0,7).replace('-','')+'-'+String(r.data.id).padStart(4,'0');
        const z=await d.from('project_events').update({kode_project:code}).eq('id',r.data.id);
        if(z.error)throw z.error;
      }
      msg(id?'Project diperbarui.':'Project dibuat.');
      selectedProjectId=Number(r.data.id);
      await render();
    }catch(e){console.error('[PRI_ERP] project save',e);msg('Gagal menyimpan project: '+(e.message||e))}
  }

  async function renderDetail(id){
    const d=dbx();if(!d)return;
    const p=projects.find(x=>Number(x.id)===Number(id));
    if(!p)return render();
    const links=await d.from('project_penawaran').select('penawaran_id,penawaran:penawaran_id(id,nomor_penawaran,nama_client,nama_event,status,grand_total)').eq('project_id',id).order('created_at');
    if(links.error)return msg('Gagal membaca relasi penawaran: '+links.error.message);
    const linked=(links.data||[]).map(x=>x.penawaran).filter(Boolean);
    const content=document.getElementById('content');if(!content)return;
    content.innerHTML=`
      <div class="head"><div><button class="btn secondary sm" type="button" id="pmProjectBack">← Kembali</button><h1 style="margin-top:12px">${esc(p.nama_project)}</h1><p>${esc(p.kode_project||'')} · ${esc(p.venue||'-')}</p></div><div class="pm-project-actions"><button class="btn secondary" type="button" id="pmProjectEdit">Edit Project</button></div></div>
      <div class="grid g4 pm-project-stats">
        <div class="card stat"><small>Status</small><strong class="pm-status ${statusClass(p.status)}">${esc(statusLabel(p.status))}</strong></div>
        <div class="card stat"><small>Client</small><strong style="font-size:18px">${esc(p.clients?.nama_client||'-')}</strong></div>
        <div class="card stat"><small>Periode</small><strong style="font-size:18px">${esc(fmtDate(p.tanggal_mulai))} → ${esc(fmtDate(p.tanggal_selesai))}</strong></div>
        <div class="card stat"><small>PIC Internal</small><strong style="font-size:18px">${esc(p.pic_internal||'-')}</strong></div>
      </div>
      <div class="grid g2 pm-project-detail-grid" style="margin-top:16px">
        <div class="card"><h3>Timeline Event</h3><div class="pm-timeline-grid">
          <div><span>Load In</span><b>${esc(p.tanggal_load_in?fmtDate(p.tanggal_load_in)+' · ':'')}${esc(p.jam_load_in||'-')}</b></div><div><span>Setup</span><b>${esc(p.jam_setup||'-')}</b></div><div><span>Event</span><b>${esc(p.jam_event||'-')}</b></div><div><span>Teardown</span><b>${esc(p.jam_teardown||'-')}</b></div><div><span>Load Out</span><b>${esc(p.jam_load_out||'-')}</b></div>
        </div><hr><p><b>Venue:</b> ${esc([p.venue,p.kota_venue].filter(Boolean).join(', ')||'-')}</p><p><b>Alamat:</b> ${esc(p.alamat_venue||'-')}</p><p><b>Google Maps:</b> ${p.google_maps_url?`<a href='${esc(p.google_maps_url)}' target='_blank' rel='noopener noreferrer'>Buka Maps</a>`:'-'}</p><p><b>PIC Internal:</b> ${esc(p.pic_internal||'-')} · ${esc(p.pic_internal_phone||'-')}</p><p><b>PIC Client:</b> ${esc(p.pic_client||'-')} · ${esc(p.pic_client_phone||'-')}</p><p><b>Catatan:</b><br>${esc(p.catatan||'-').replace(/\n/g,'<br>')}</p><p><b>Dokumen:</b><br>${Array.isArray(p.dokumen)&&p.dokumen.length?p.dokumen.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Dokumen ${i+1}</a>`).join('<br>'):'-'}</p></div>
        <div class="card"><div class="pm-card-head"><h3>Penawaran</h3></div>
          ${linked.length?linked.map(q=>`<div class="pm-quote-row"><div><b>${esc(q.nomor_penawaran||'-')}</b><span>${esc(q.nama_event||q.nama_client||'-')}</span></div><div><strong>${money(q.grand_total)}</strong></div></div>`).join(''):'<p class="pm-muted">Penawaran akan terhubung otomatis saat dibuat.</p>'}
        </div>
      </div>`;
    document.getElementById('pmProjectBack').onclick=()=>{selectedProjectId=null;render();};
    document.getElementById('pmProjectEdit').onclick=()=>render(projects.find(x=>Number(x.id)===Number(id)));
  }

  async function render(projectToEdit=null){
    const content=document.getElementById('content');if(!content)return;
    nav();
    try{await loadData()}catch(e){console.error('[PRI_ERP] projects load',e);content.innerHTML='<div class="card"><b>Project / Event</b><p>Gagal membaca data project: '+esc(e.message||e)+'</p></div>';return}
    if(projectToEdit){
      content.innerHTML='<div class="head"><div><h1>Project / Event</h1><p>Kelola project operasional.</p></div></div>'+renderForm(projectToEdit);
      document.getElementById('pmProjectCancel').onclick=()=>render();
      document.getElementById('pmProjectSave').onclick=saveProject;

      return;
    }
    if(selectedProjectId){const p=projects.find(x=>Number(x.id)===Number(selectedProjectId));if(p)return renderDetail(selectedProjectId);selectedProjectId=null}
    content.innerHTML=`
      <div class="head"><div><h1>Project / Event</h1><p>Pusat data operasional untuk event yang sudah / sedang diproses.</p></div></div>
      <div class="card pm-project-list"><div class="scroll"><table class="table"><thead><tr><th>Project</th><th>Client</th><th>Venue</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
      ${projects.length?projects.map(p=>`<tr><td><b>${esc(p.kode_project||'-')}</b><br><span class="pm-muted">${esc(p.nama_project)}</span></td><td>${esc(p.clients?.nama_client||p.clients?.perusahaan||'-')}</td><td>${esc(p.venue||'-')}</td><td>${esc(fmtDate(p.tanggal_mulai))}<br>→ ${esc(fmtDate(p.tanggal_selesai))}</td><td><span class="pm-status ${statusClass(p.status)}">${esc(statusLabel(p.status))}</span></td><td><button class="btn secondary sm" data-open="${p.id}" type="button">Buka</button> <button class="btn secondary sm" data-edit="${p.id}" type="button">Edit</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty">Belum ada Project / Event.</td></tr>'}
      </tbody></table></div></div>`;
    content.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{selectedProjectId=Number(b.dataset.open);renderDetail(selectedProjectId)});
    content.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>render(projects.find(x=>Number(x.id)===Number(b.dataset.edit))));
  }

  window.projectPage=render;
  window.projectsPage=render;
  window.pmProjectPage=render;
})();