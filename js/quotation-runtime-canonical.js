/* Priangan Multimedia — canonical quotation runtime
 * Single source of truth for quotation totals, discount, internal margin and A4 preview.
 * Loaded last. Replaces the older competing quotation UI/print/margin synchronizers.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_RUNTIME_CANONICAL_V1)return;
  window.__PM_QUOTATION_RUNTIME_CANONICAL_V1=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  function listItems(){try{if(Array.isArray(window.items))return window.items}catch(_){}return[]}
  function listMasters(){try{if(Array.isArray(window.masters))return window.masters}catch(_){}return[]}
  function days(a,b){if(!a||!b)return 1;const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);return d>=0?d+1:1}
  function masterFor(i){
    const all=listMasters(),id=i?.master_id??i?.masterId??i?.id_master??i?.master_harga_id;
    if(id!=null){const x=all.find(m=>String(m.id)===String(id));if(x)return x}
    const code=S(i?.kode);if(code){const x=all.find(m=>S(m.kode)===code);if(x)return x}
    const name=S(i?.item).toLowerCase();if(name){const x=all.find(m=>S(m.item).toLowerCase()===name);if(x)return x}
    return null;
  }
  function typeOf(i){
    const m=masterFor(i),sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');
    if(['unit','units','pcs','pc','buah','set'].includes(sat))return'qty';
    if(['m2','m²','meter2','meterpersegi','luas'].includes(sat))return'luas';
    const t=(S(i?.item)+' '+S(m?.kategori)+' '+S(i?.kode)).toLowerCase();
    if(/rigging|rig/.test(t))return'rigging';
    if(/level/.test(t))return'level';
    if(/led|videotron/.test(t))return'luas';
    return S(i?.tipe||i?.tipe_perhitungan)||'qty';
  }
  function subtotal(i){
    const p=N(i?.harga??i?.harga_jual),d=days(i?.mulai??i?.tanggal_mulai,i?.selesai??i?.tanggal_selesai),t=typeOf(i),q=Math.max(1,N(i?.qty??i?.jumlah)||1),w=N(i?.lebar),h=N(i?.tinggi),l=N(i?.panjang);
    if(t==='luas')return w*h*p*d;
    if(t==='rigging')return ((l*2)+(h*2))*p*d;
    if(t==='level'){
      const led=listItems().find(x=>x!==i&&/led|videotron/i.test(S(x?.item)+' '+S(x?.kode)));
      return (led?N(led.lebar):w)*p*d;
    }
    return q*p*d;
  }
  function baseTotal(){return listItems().filter(i=>i&&S(i.kode)&&S(i.item)).reduce((s,i)=>s+subtotal(i),0)}

  function discountState(base){
    const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
    let mode=window.__PM_DISC_MODE||'rp';
    let pct=N(window.__pmDiscountPct),rp=N(window.__pmDiscountValue);
    if(p&&document.activeElement===p)mode='pct';
    if(r&&document.activeElement===r)mode='rp';
    const pv=p?N(p.value):pct,rv=r?N(r.value):rp;
    if(mode==='pct'){
      pct=Math.max(0,Math.min(100,pv));
      rp=Math.round(base*pct/100);
    }else{
      rp=Math.max(0,Math.min(base,rv));
      pct=base?rp/base*100:0;
    }
    return {base,rp,pct,total:Math.max(0,base-rp)};
  }

  function ensureDiscountBox(){
    const total=document.querySelector('#total');if(!total)return null;
    const card=total.closest('.card');if(!card)return null;
    let box=document.querySelector('#pmDiscount');
    if(!box){
      const sum=total.closest('.sum');
      if(!sum)return null;
      box=document.createElement('div');
      box.id='pmDiscount';
      box.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
      box.innerHTML='<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="0"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="text" inputmode="numeric" autocomplete="off" placeholder="Rp0" value="Rp 0"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">Rp 0</b></div>';
      sum.parentElement.insertBefore(box,sum);
      box.querySelector('#pmDiscPct').addEventListener('input',()=>{window.__PM_DISC_MODE='pct';syncTotals()});
      box.querySelector('#pmDisc').addEventListener('focus',e=>{e.target.value=N(e.target.value)||''});
      box.querySelector('#pmDisc').addEventListener('input',()=>{window.__PM_DISC_MODE='rp';syncTotals()});
      box.querySelector('#pmDisc').addEventListener('blur',e=>{e.target.value=M(e.target.value);syncTotals()});
      box.querySelector('#pmDiscPct').addEventListener('blur',e=>{const n=N(e.target.value);e.target.value=Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));syncTotals()});
    }
    return box;
  }

  function syncTotals(){
    const base=baseTotal();
    if(!base){
      const t=document.querySelector('#total');if(t)t.textContent=M(0);
      return {base:0,rp:0,pct:0,total:0};
    }
    const box=ensureDiscountBox();
    const state=discountState(base);
    const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
    if(p&&document.activeElement!==p)p.value=state.rp?String(Number(state.pct.toFixed(2))):'0';
    if(r&&document.activeElement!==r)r.value=M(state.rp);
    const total=document.querySelector('#total'),grand=document.querySelector('#pmGrand');
    if(total)total.textContent=M(state.total);
    if(grand)grand.textContent=M(state.total);
    window.__pmDiscountBase=state.base;
    window.__pmDiscountValue=state.rp;
    window.__pmDiscountPct=state.pct;
    window.__pmNetTotal=state.total;
    return state;
  }

  function margin(){
    const total=document.querySelector('#total');if(!total)return;
    const host=total.closest('.card');if(!host)return;
    let box=document.querySelector('#pmInternalMargin');
    if(!box){box=document.createElement('section');box.id='pmInternalMargin';box.className='no-print pm-internal-margin';host.insertAdjacentElement('afterend',box)}
    const rows=listItems().filter(i=>i&&S(i.kode)&&S(i.item));
    if(!rows.length){box.innerHTML='<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge warn">DATA BELUM ADA</span></div><div class="pm-margin-state warn">Tambahkan item untuk menghitung margin.</div>';return}
    const mapped=rows.map(i=>({i,m:masterFor(i)}));
    mapped.forEach(x=>{if(x.m&&N(x.i.harga_modal)<=0)x.i.harga_modal=N(x.m.harga_modal);if(x.m&&x.m.id!=null&&!x.i.master_id)x.i.master_id=x.m.id});
    const missing=mapped.filter(x=>N(x.i.harga_modal)<=0&&N(x.m?.harga_modal)<=0);
    const cost=mapped.reduce((s,x)=>{const unit=N(x.i.harga_modal??x.m?.harga_modal),d=days(x.i.mulai,x.i.selesai),q=Math.max(1,N(x.i.qty)||1),w=N(x.i.lebar),h=N(x.i.tinggi),l=N(x.i.panjang),t=typeOf(x.i);if(t==='luas')return s+w*h*unit*d;if(t==='rigging')return s+((l*2)+(h*2))*unit*d;if(t==='level'){const led=rows.find(y=>y!==x.i&&/led|videotron/i.test(S(y.item)+' '+S(y.kode)));return s+(led?N(led.lebar):w)*unit*d}return s+q*unit*d},0);
    const revenue=N(window.__pmNetTotal)||N(total.textContent),profit=revenue-cost,marginPct=revenue>0?profit/revenue*100:0,ready=!missing.length,pass=ready&&marginPct>=20,tone=!ready?'warn':pass?'good':'bad';
    box.innerHTML='<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge '+tone+'">'+(ready?marginPct.toFixed(2)+'%':'DATA MODAL BELUM LENGKAP')+'</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>'+M(cost)+'</b></div><div><span>Laba Kotor</span><b>'+M(profit)+'</b></div><div><span>Margin</span><b class="'+tone+'">'+(ready?marginPct.toFixed(2)+'%':'—')+'</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state '+tone+'">'+(!ready?missing.map(x=>E(x.i.item||x.i.kode)).join(', ')+' belum memiliki harga modal di Master Harga.':pass?'✓ Margin memenuhi batas internal minimum 20%.':'⚠ Margin di bawah batas internal minimum 20%.')+'</div>';
  }

  async function getTemplate(){
    try{
      if(window.template&&typeof window.template==='object')return window.template;
      if(window.__PM_STABLE_DB)return (await window.__PM_STABLE_DB.from('template_surat').select('*').order('id',{ascending:false}).limit(1).maybeSingle()).data||{};
      if(typeof db!=='undefined'&&db)return (await db.from('template_surat').select('*').order('id',{ascending:false}).limit(1).maybeSingle()).data||{};
    }catch(_){}
    return {};
  }
  function dateID(v){if(!v)return'-';const d=new Date(S(v)+'T00:00:00');return Number.isNaN(d.getTime())?E(v):d.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}

  async function buildPreview(){
    if(document.getElementById('pmPrintPreview'))return;
    const rows=listItems().filter(i=>i&&S(i.kode)&&S(i.item));
    if(!rows.length){if(typeof window.msg==='function')window.msg('Pilih minimal 1 Produk / Jasa terlebih dahulu.');return}
    const client=S(document.querySelector('#qc')?.value),company=S(document.querySelector('#qp')?.value),eventName=S(document.querySelector('#qeve')?.value);
    if(!client||!company||!eventName){if(typeof window.msg==='function')window.msg('Isi Client, Perusahaan, dan Nama Event terlebih dahulu.');return}
    const totalState=syncTotals(),t=await getTemplate();
    const number=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER||window.__PM_LAST_QUOTATION_NUMBER)||('PM-'+new Date().getFullYear()+'-'+Date.now().toString().slice(-6));
    const list=rows.map((i,n)=>{let q=N(i.qty)||1;if(typeOf(i)==='luas')q=(N(i.lebar)+' × '+N(i.tinggi)+' m²');else if(typeOf(i)==='level'){const led=rows.find(x=>x!==i&&/led|videotron/i.test(S(x.item)+' '+S(x.kode)));q=(led?N(led.lebar):N(i.lebar))+' m';}else if(typeOf(i)==='rigging')q=N(i.panjang)+' × '+N(i.tinggi)+' m';return '<tr><td class="center">'+(n+1)+'</td><td><strong>'+E(i.item)+'</strong><div class="code">'+E(i.kode)+'</div></td><td class="center">'+E(q)+'</td><td class="center">'+E(i.mulai||i.selesai?(dateID(i.mulai)+' - '+dateID(i.selesai)):'-')+'</td><td class="right nowrap">'+M(i.harga)+'</td><td class="right nowrap">'+M(subtotal(i))+'</td></tr>'}).join('');
    const overlay=document.createElement('div');overlay.id='pmPrintPreview';
    overlay.innerHTML='<div class="pm-print-toolbar"><div><strong>Preview Surat Penawaran</strong><span>A4 Portrait • '+E(number)+'</span></div><div class="pm-print-actions"><button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button><button type="button" class="pm-print" onclick="executePrintPreview()">Cetak / Simpan PDF</button></div></div><div class="pm-print-scroll"><main class="pm-a4" id="pmPrintArea"><div class="pm-top-accent"></div><header class="pm-letterhead"><div class="pm-logo-wrap">'+(t.logo_url?'<img class="logo" src="'+E(t.logo_url)+'" alt="Logo" onerror="this.remove()">':'<div class="logo-fallback">PM</div>')+'</div><div class="pm-brand"><div class="pm-brand-name">'+E(t.kop_text||'PRIANGAN MULTIMEDIA')+'</div><div class="pm-brand-sub">SALES & QUOTATION</div>'+(t.alamat?'<p>'+E(t.alamat)+'</p>':'')+'<p>'+(t.telepon||t.whatsapp?E(t.telepon||t.whatsapp):'')+(t.email?' • '+E(t.email):'')+'</p></div><div class="pm-doc-tag"><span>QUOTATION</span><strong>'+E(number)+'</strong></div></header><div class="pm-title-row"><div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div><div class="pm-date-box"><span>TANGGAL</span><strong>'+dateID(new Date().toISOString().slice(0,10))+'</strong></div></div><section class="pm-info-card"><div class="pm-info-section"><div class="pm-section-label">DITUJUKAN KEPADA</div><div class="pm-client-name">'+E(client)+'</div><div>'+E(company)+'</div><div>'+E(S(document.querySelector('#qw')?.value))+'</div><div>'+E(S(document.querySelector('#qe')?.value))+'</div></div><div class="pm-info-section pm-event-section"><div class="pm-section-label">EVENT / PROJECT</div><div class="pm-event-name">'+E(eventName)+'</div><div class="pm-period-label">PERIODE</div><div>'+dateID(document.querySelector('#qs')?.value)+' — '+dateID(document.querySelector('#qe2')?.value)+'</div></div></section><p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga untuk kebutuhan event / project tersebut sebagai berikut:</p><table class="pm-items"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>'+list+(totalState.rp>0?'<tr class="pm-discount-row"><td colspan="5" class="right">DISKON ('+totalState.pct.toFixed(2)+'%)</td><td class="right">- '+M(totalState.rp)+'</td></tr>':'')+'<tr class="pm-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">'+M(totalState.total)+'</td></tr></tbody></table><section class="pm-terms"><div class="pm-section-heading"><span>01</span><strong>SYARAT & KETENTUAN</strong></div><div class="pm-terms-body">'+S(t.ketentuan||'Penawaran harga berlaku sesuai kesepakatan dan spesifikasi event.').replace(/\r?\n/g,'<br>')+'</div></section><section class="pm-signature"><div class="pm-signature-label">HORMAT KAMI,</div><div class="pm-signature-box">'+(t.ttd_url?'<img class="signature" src="'+E(t.ttd_url)+'" alt="TTD">':'')+'<div class="pm-signature-line"></div><strong>'+E(t.nama_penandatangan||'____________________________')+'</strong>'+(t.jabatan_penandatangan?'<div class="pm-signature-role">'+E(t.jabatan_penandatangan)+'</div>':'')+'</div></section><footer class="pm-footer"><div>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.</div><strong>'+E(t.kop_text||'PRIANGAN MULTIMEDIA')+'</strong></footer></main></div>';
    document.body.appendChild(overlay);document.body.classList.add('pm-preview-open');
    requestAnimationFrame(()=>{if(typeof window.pmRenderQuotationConsistency==='function')window.pmRenderQuotationConsistency()});
  }

  function closePreview(){document.getElementById('pmPrintPreview')?.remove();document.body.classList.remove('pm-preview-open')}
  async function executePreview(){const area=document.getElementById('pmPrintArea');if(!area){if(typeof window.msg==='function')window.msg('Area A4 tidak ditemukan.');return}const imgs=[...area.querySelectorAll('img')];await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(r=>{const done=()=>{img.removeEventListener('load',done);img.removeEventListener('error',done);r()};img.addEventListener('load',done);img.addEventListener('error',done);setTimeout(done,2500)})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.print()}

  window.printQuote=buildPreview;
  window.closePrintPreview=closePreview;
  window.executePrintPreview=executePreview;

  let timer=0;
  function refresh(){clearTimeout(timer);timer=setTimeout(()=>{if(document.querySelector('#items')){ensureDiscountBox();syncTotals();margin()}},40)}
  document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc'||e.target?.closest?.('#items'))refresh()},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))refresh()},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('#items'))refresh()},true);
  const mo=new MutationObserver(()=>refresh());mo.observe(document.documentElement,{childList:true,subtree:true});
  [0,150,400,800,1500,3000].forEach(ms=>setTimeout(refresh,ms));
})();