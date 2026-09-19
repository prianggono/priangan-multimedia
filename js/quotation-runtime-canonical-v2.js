/* Priangan Multimedia — Quotation Domain Core
 * Single authority for quotation item editing, calculation, discount, save,
 * internal margin, preview and A4 print.
 * Keep quotation behavior here. Do not add quotation fix/final/v2 patch files.
 */
(function () {
  'use strict';
  if (window.__PM_QUOTATION_DOMAIN_CORE__) return;
  window.__PM_QUOTATION_DOMAIN_CORE__ = true;

  const S = (v) => String(v ?? '').trim();
  const N = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = S(v).replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    s = s.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = (v) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.max(0, Math.round(N(v))));
  const E = (v) => S(v).replace(/[&<>\"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const items = () => Array.isArray(window.items) ? window.items : [];
  const masters = () => Array.isArray(window.masters) ? window.masters : [];
  const msg = (text) => typeof window.msg === 'function' ? window.msg(text) : console.warn('[PM]', text);

  function days(a,b){
    if(!a || !b) return 1;
    const x = new Date(S(a)+'T00:00:00'), y = new Date(S(b)+'T00:00:00');
    const d = Math.round((y-x)/86400000);
    return d >= 0 ? d+1 : 1;
  }

  function masterFor(item){
    const id = item?.master_id ?? item?.masterId ?? item?.id_master ?? item?.master_harga_id;
    if(id != null){
      const byId = masters().find(m => String(m.id)===String(id));
      if(byId) return byId;
    }
    return masters().find(m => S(m.kode)===S(item?.kode)) ||
      masters().find(m => S(m.item).toLowerCase()===S(item?.item).toLowerCase()) || null;
  }

  function itemMode(master){
    const text = `${S(master?.item)} ${S(master?.kategori)}`.toLowerCase();
    const sat = S(master?.satuan).toLowerCase().replace(/²/g,'2');
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(text)) return 'qty';
    if(/unit|units|pcs|pc|buah|set|hari|trip|orang|lot/.test(sat)) return 'qty';
    if(/level/.test(text)) return 'level';
    if(/rigging|rig/.test(text)) return 'rigging';
    if(/videotron|led\s*(indoor|outdoor)|led\s*p\.?\d/.test(text)) return 'luas';
    if(/m2|meter2|luas/.test(sat)) return 'luas';
    return 'qty';
  }

  function typeOf(item){ return itemMode(masterFor(item)) || S(item?.tipe_perhitungan || item?.tipe) || 'qty'; }

  function isLED(item){
    const master=masterFor(item), text=`${S(master?.item)} ${S(master?.kategori)} ${S(master?.kode)} ${S(item?.item)} ${S(item?.kode)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(text))return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(text);
  }
  function levelSubtotal(item){return item?.level_enabled?N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty??item.jumlah)||1):0;}
  function ledBaseSubtotal(item){if(!isLED(item))return 0;const price=N(item?.harga ?? item?.harga_jual),duration=days(item?.mulai??item?.tanggal_mulai,item?.selesai??item?.tanggal_selesai),qty=Math.max(1,N(item?.qty??item?.jumlah)||1);return N(item?.lebar)*N(item?.tinggi)*price*qty*duration;}
  function itemSubtotal(item){
    const price=N(item?.harga??item?.harga_jual),duration=days(item?.mulai??item?.tanggal_mulai,item?.selesai??item?.tanggal_selesai),type=typeOf(item),qty=Math.max(1,N(item?.qty??item?.jumlah)||1),width=N(item?.lebar),height=N(item?.tinggi),length=N(item?.panjang);
    let base=type==='luas'?width*height*price*qty*duration:type==='rigging'?((length*2)+(height*2))*price*duration:type==='level'?0:qty*price*duration;
    if(isLED(item))base=width*height*price*qty*duration+levelSubtotal(item);
    return Math.max(0,base);
  }
  function baseTotal(){ return Math.round(items().filter(x=>x&&S(x.kode)&&S(x.item)).reduce((a,x)=>a+itemSubtotal(x),0)); }

  function itemDiscountState(item){
    const base=Math.max(0,N(itemSubtotal(item)));
    const pct=Math.max(0,Math.min(100,N(item?.diskon_persen)));
    const explicit=Math.max(0,N(item?.diskon_nominal));
    const nominal=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.round(explicit));
    return {base,rp:nominal,net:Math.max(0,base-nominal)};
  }
  function discountState(){
    const base=Math.max(0,items().filter(x=>x&&S(x.kode)&&S(x.item)).reduce((sum,item)=>sum+itemDiscountState(item).net,0));
    const p=document.querySelector('#pmDiscPct'), r=document.querySelector('#pmDisc');
    let mode=window.__PM_DISC_MODE||'rp';
    if(p && document.activeElement===p) mode='pct';
    if(r && document.activeElement===r) mode='rp';
    const pct=Math.max(0,Math.min(100,N(p?.value ?? window.__pmDiscountPct)));
    const rp=Math.max(0,N(r?.value ?? window.__pmDiscountValue));
    const nominal=mode==='pct'?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.round(rp));
    return {base,rp:nominal,pct:base?nominal/base*100:0,total:Math.max(0,base-nominal)};
  }

  function ensureDiscountUI(){
    const totalEl=document.querySelector('#total');
    if(!totalEl || document.querySelector('#pmDiscount')) return;
    const sum=totalEl.closest('.sum');
    if(!sum?.parentElement) return;
    const editId=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    const pendingRp=Math.max(0,N(window.__pmDiscountValue));
    const pendingPct=Math.max(0,Math.min(100,N(window.__pmDiscountPct)));
    const isEdit=editId>0 && (pendingRp>0 || pendingPct>0);
    const pctValue=isEdit?pendingPct:0;
    const rpValue=isEdit?pendingRp:0;
    const box=document.createElement('div');
    box.id='pmDiscount'; box.className='pm-quotation-discount';
    box.innerHTML=`<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="text" inputmode="decimal" autocomplete="off" value="${pctValue}"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="text" inputmode="numeric" autocomplete="off" value="${rpValue?M(rpValue):'Rp 0'}"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">Rp 0</b></div>`;
    sum.parentElement.insertBefore(box,sum.nextSibling);
    const p=box.querySelector('#pmDiscPct'),r=box.querySelector('#pmDisc');
    p.addEventListener('input',()=>{window.__PM_DISC_MODE='pct';sync();});
    p.addEventListener('change',()=>{window.__PM_DISC_MODE='pct';sync();});
    p.addEventListener('blur',()=>{p.value=String(Math.max(0,Math.min(100,N(p.value))));sync();});
    r.addEventListener('focus',()=>{r.value=String(N(r.value)||'');});
    r.addEventListener('input',()=>{window.__PM_DISC_MODE='rp';sync();});
    r.addEventListener('change',()=>{window.__PM_DISC_MODE='rp';sync();});
    r.addEventListener('blur',()=>{r.value=M(r.value);sync();});
  }

  function sync(){
    ensureDiscountUI();
    const d=discountState();
    const total=document.querySelector('#total'),grand=document.querySelector('#pmGrand'),p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
    if(total) total.textContent=M(d.total);
    if(grand) grand.textContent=M(d.total);
    if(p && document.activeElement!==p) p.value=d.rp?String(Number(d.pct.toFixed(2))):'0';
    if(r && document.activeElement!==r) r.value=M(d.rp);
    window.__pmDiscountBase=d.base;window.__pmDiscountValue=d.rp;window.__pmDiscountPct=d.pct;window.__pmNetTotal=d.total;
    renderMargin();
    return d;
  }

  function requiredComplete(item){
    const t=typeOf(item);
    if(!S(item.kode)||!S(item.item)||!item.mulai||!item.selesai) return false;
    if(t==='luas') return N(item.lebar)>0 && N(item.tinggi)>0;
    if(t==='rigging') return N(item.panjang)>0 && N(item.tinggi)>0;
    return true;
  }

  function installQuotationStyles(){
    if(document.getElementById('pmQuotationCompactStyles')) return;
    const st=document.createElement('style');
    st.id='pmQuotationCompactStyles';
    st.textContent=`
      #content .pm-item-card{transition:all .18s ease}
      #content .pm-item-card.is-collapsed .pm-item-body{display:none}
      #content .pm-item-card.is-collapsed{padding:12px 16px}
      #content .pm-item-summary{display:none;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}
      #content .pm-item-card.is-collapsed .pm-item-summary{display:flex}
      #content .pm-item-summary .pm-summary-main{min-width:0;display:flex;flex-direction:column;gap:3px}
      #content .pm-item-summary strong{color:#f4f7ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #content .pm-item-summary span{font-size:12px;color:var(--muted,#9aa7bd)}
      #content .pm-item-head-actions{display:flex;align-items:center;gap:8px}
      #content .pm-collapse-btn{min-width:90px}
      #content .pm-save-bar{position:sticky;bottom:12px;z-index:20;box-shadow:0 10px 30px rgba(0,0,0,.3);backdrop-filter:blur(10px)}
      #content .pm-save-bar .actions{margin-top:0!important}
      @media(max-width:700px){
        #content .pm-item-summary{align-items:flex-start}
        #content .pm-save-bar .actions{flex-direction:column}
        #content .pm-save-bar .actions .btn{width:100%}
      }
    `;
    document.head.appendChild(st);
  }

  function addItem(){
    const item={id:Date.now()+Math.random(),kode:'',item:'',harga:0,harga_modal:0,qty:1,lebar:0,tinggi:0,panjang:0,mulai:'',selesai:'',tipe:'qty'};
    window.items=[...items(),item];
    window.__PM_QUOTATION_OPEN_ITEM_ID=item.id;
    drawItems();
    setTimeout(()=>document.querySelector(`#items > .item[data-item-id="${item.id}"] select`)?.focus(),0);
  }

  function removeItem(id){ window.items=items().filter(x=>String(x.id)!==String(id)); if(String(window.__PM_QUOTATION_OPEN_ITEM_ID)===String(id)) window.__PM_QUOTATION_OPEN_ITEM_ID=null; drawItems(); }

  function toggleItem(id,force){
    const card=document.querySelector(`#items > .item[data-item-id="${id}"]`);if(!card)return;
    const collapse=typeof force==='boolean'?force:!card.classList.contains('is-collapsed');
    card.classList.toggle('is-collapsed',collapse);
    const btn=card.querySelector('.pm-collapse-btn');if(btn)btn.textContent=collapse?'Buka':'Ringkas';
    if(!collapse) window.__PM_QUOTATION_OPEN_ITEM_ID=id;
  }

  function pick(id,kode){
    const item=items().find(x=>String(x.id)===String(id)), master=masters().find(x=>S(x.kode)===S(kode));
    if(!item||!master)return;
    item.master_id=master.id;item.kode=master.kode;item.item=master.item;item.harga=N(master.harga_jual);item.harga_jual=N(master.harga_jual);item.harga_modal=N(master.harga_modal);item.tipe=itemMode(master);item.qty=Math.max(1,N(item.qty)||1);
    if(item.tipe==='qty'){item.lebar=0;item.tinggi=0;item.panjang=0;}
    if(item.tipe==='level'){
      const led=items().find(x=>x!==item&&/led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`)&&N(x.lebar)>0);
      if(led)item.lebar=N(led.lebar);
    }
    window.__PM_QUOTATION_OPEN_ITEM_ID=id;
    drawItems();
  }

  function upd(id,key,value){
    const item=items().find(x=>String(x.id)===String(id));if(!item)return;
    item[key]=(key==='mulai'||key==='selesai')?S(value):N(value);
    if(requiredComplete(item)) window.__PM_QUOTATION_AUTO_COLLAPSE=true;
    window.__PM_QUOTATION_OPEN_ITEM_ID=id;
    drawItems();
  }

  function dims(item){
    const t=typeOf(item);
    if(t==='rigging')return `<div class="dim"><div class="field"><label>Panjang Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(item.panjang)}" onchange="upd(${item.id},'panjang',this.value)"></div><div class="field"><label>Tinggi Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(item.tinggi)}" onchange="upd(${item.id},'tinggi',this.value)"></div></div>`;
    if(t==='level'){
      const led=items().find(x=>x!==item&&/led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`)&&N(x.lebar)>0),w=led?N(led.lebar):N(item.lebar);
      return `<div class="dim"><div class="field"><label>Lebar Level (meter lari)</label><input value="${w?w+' m':'-'}" readonly></div><div class="field"><label>Tinggi Level (informasi, m)</label><input type="number" min="0" step="0.01" value="${N(item.tinggi)}" onchange="upd(${item.id},'tinggi',this.value)"></div></div>`;
    }
    if(t==='luas')return `<div class="dim"><div class="field"><label>Lebar Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(item.lebar)}" onchange="upd(${item.id},'lebar',this.value)"></div><div class="field"><label>Tinggi Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(item.tinggi)}" onchange="upd(${item.id},'tinggi',this.value)"></div></div>`;
    return `<div class="field"><label>Jumlah (Qty)</label><input type="number" min="1" step="1" value="${Math.max(1,N(item.qty)||1)}" onchange="upd(${item.id},'qty',this.value)"></div>`;
  }

  function itemSummary(item){
    const t=typeOf(item),label=S(item.item)||'Item belum dipilih',api=window.__PM_QUOTATION_UI_API,st=api?.state?api.state(item):null,sub=st?st.net:itemSubtotal(item),schedule=item.mulai&&item.selesai?`${item.mulai} → ${item.selesai}`:'Jadwal belum lengkap';
    let metric='';
    if(t==='luas')metric=`${N(item.lebar)} × ${N(item.tinggi)} m`;
    else if(t==='rigging')metric=`Rigging ${N(item.panjang)} × ${N(item.tinggi)} m`;
    else if(t==='level')metric=`Level ${N(item.lebar)||'-'} m`;
    else metric=`Qty ${Math.max(1,N(item.qty)||1)}`;
    return `<div class="pm-item-summary"><div class="pm-summary-main"><strong>${E(label)}</strong><span>${E(metric)} • ${E(schedule)}</span></div><b>${M(sub)}</b></div>`;
  }

  function drawItems(){
    installQuotationStyles();
    const container=document.querySelector('#items');if(!container)return;
    const list=items();
    const activeMasters=masters().filter(m=>m.aktif!==false&&String(m.aktif).toUpperCase()!=='FALSE');
    const openId=window.__PM_QUOTATION_OPEN_ITEM_ID;
    container.innerHTML=list.map((item,index)=>{
      const complete=requiredComplete(item);
      let collapsed=complete && String(openId)!==String(item.id);
      if(window.__PM_QUOTATION_AUTO_COLLAPSE && String(openId)===String(item.id) && complete){collapsed=true;window.__PM_QUOTATION_AUTO_COLLAPSE=false;}
      if(!complete) collapsed=false;
      if(collapsed===false && complete && String(openId)!==String(item.id) && index<list.length-1) collapsed=true;
      return `<div class="item pm-item-card ${collapsed?'is-collapsed':''}" data-item-id="${item.id}"><div class="itemhead"><span class="blue">ITEM #${index+1}</span><div class="pm-item-head-actions"><button class="btn secondary sm pm-collapse-btn" type="button" onclick="toggleItem(${item.id})">${collapsed?'Buka':'Ringkas'}</button><button class="btn red sm" type="button" onclick="removeItem(${item.id})">Hapus</button></div></div>${itemSummary(item)}<div class="pm-item-body"><div class="field"><label>Produk / Jasa</label><select onchange="pick(${item.id},this.value)"><option value="">-- Pilih dari Master Harga --</option>${activeMasters.map(m=>`<option value="${E(m.kode)}" ${S(item.kode)===S(m.kode)?'selected':''}>[${E(m.kode)}] ${E(m.item)}</option>`).join('')}</select></div><div class="grid g2"><div class="field"><label>Harga Jual</label><input value="${M(item.harga)}" readonly></div><div class="field"><label>Tipe Perhitungan</label><input value="${E(typeOf(item))}" readonly></div></div>${dims(item)}<div class="sched"><b>Jadwal Pemakaian</b><div class="grid g2" style="margin-top:12px"><div class="field"><label>Tanggal Mulai</label><input type="date" value="${E(item.mulai)}" onchange="upd(${item.id},'mulai',this.value)"></div><div class="field"><label>Tanggal Selesai</label><input type="date" value="${E(item.selesai)}" onchange="upd(${item.id},'selesai',this.value)"></div></div></div><div class="sum"><span>Subtotal</span><b>${M(itemSubtotal(item))}</b></div></div></div>`;
    }).join('');
    sync();
  }

  function renderMargin(){
    const totalEl=document.querySelector('#total');if(!totalEl)return;
    const host=totalEl.closest('.card');if(!host)return;
    let box=document.querySelector('#pmInternalMargin');
    if(!box){box=document.createElement('section');box.id='pmInternalMargin';box.className='no-print pm-internal-margin';host.insertAdjacentElement('afterend',box);}
    const rows=items().filter(x=>x&&S(x.kode)&&S(x.item));
    if(!rows.length){box.innerHTML='<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge warn">DATA BELUM ADA</span></div>';return;}
    const missing=rows.filter(x=>N(x.harga_modal)<=0&&N(masterFor(x)?.harga_modal)<=0);
    const cost=rows.reduce((sum,x)=>{const unit=N(x.harga_modal)||N(masterFor(x)?.harga_modal),d=days(x.mulai,x.selesai),q=Math.max(1,N(x.qty)||1),w=N(x.lebar),h=N(x.tinggi),l=N(x.panjang),t=typeOf(x);if(t==='luas')return sum+w*h*unit*d;if(t==='rigging')return sum+((l*2)+(h*2))*unit*d;if(t==='level'){const led=rows.find(y=>y!==x&&/led|videotron/i.test(`${S(y.item)} ${S(y.kode)}`));return sum+(led?N(led.lebar):w)*unit*d;}return sum+q*unit*d;},0);
    const revenue=N(window.__pmNetTotal),profit=revenue-cost,margin=revenue?profit/revenue*100:0,ready=!missing.length,pass=ready&&margin>=20,tone=!ready?'warn':pass?'good':'bad';
    box.innerHTML=`<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge ${tone}">${ready?margin.toFixed(2)+'%':'DATA MODAL BELUM LENGKAP'}</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>${M(cost)}</b></div><div><span>Laba Kotor</span><b>${M(profit)}</b></div><div><span>Margin</span><b class="${tone}">${ready?margin.toFixed(2)+'%':'—'}</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state ${tone}">${!ready?missing.map(x=>E(x.item||x.kode)).join(', ')+' belum memiliki harga modal di Master Harga.':pass?'✓ Margin memenuhi batas internal minimum 20%.':'⚠ Margin di bawah batas internal minimum 20%.'}</div>`;
  }

  function parsePackageRows(raw){
    return S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(x=>S(x)).filter(Boolean).map(line=>{
      let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);
      if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);
      return m?{komponen:S(m[1]),qty:S(m[2])||'-'}:{komponen:line,qty:'-'};
    });
  }

  function dateParts(v){
    if(!v)return null;
    const d=new Date(S(v).slice(0,10)+'T00:00:00');
    if(Number.isNaN(d.getTime()))return null;
    return {date:d,day:d.getDate(),month:d.toLocaleDateString('id-ID',{month:'long'}),shortMonth:d.toLocaleDateString('id-ID',{month:'short'}),year:d.getFullYear()};
  }

  function periodFull(start,end){
    const a=dateParts(start),b=dateParts(end);
    if(!a&&!b)return '-';
    if(!a)return `${b.day} ${b.month} ${b.year}`;
    if(!b)return `${a.day} ${a.month} ${a.year}`;
    if(a.day===b.day&&a.month===b.month&&a.year===b.year)return `${a.day} ${a.month} ${a.year}`;
    if(a.year===b.year&&a.month===b.month)return `${a.day}-${b.day} ${a.month} ${a.year}`;
    if(a.year===b.year)return `${a.day} ${a.month}-${b.day} ${b.month} ${a.year}`;
    return `${a.day} ${a.month} ${a.year}-${b.day} ${b.month} ${b.year}`;
  }

  function periodShort(start,end){
    const a=dateParts(start),b=dateParts(end);
    if(!a&&!b)return '-';
    if(!a)return `${b.day} ${b.shortMonth} ${b.year}`;
    if(!b)return `${a.day} ${a.shortMonth} ${a.year}`;
    if(a.day===b.day&&a.month===b.month&&a.year===b.year)return `${a.day} ${a.shortMonth} ${a.year}`;
    if(a.year===b.year&&a.month===b.month)return `${a.day}-${b.day} ${a.shortMonth} ${a.year}`;
    if(a.year===b.year)return `${a.day} ${a.shortMonth}-${b.day} ${b.shortMonth} ${a.year}`;
    return `${a.day} ${a.shortMonth} ${a.year}-${b.day} ${b.shortMonth} ${b.year}`;
  }

  function levelCm(v){
    const n=N(v);
    return n>0&&n<10?Math.round(n*100):Math.round(n);
  }

  function displayItemName(item){
    const base=S(item?.item)||'Item belum dipilih';
    if(!item?.level_enabled) return base;
    const cm=levelCm(item.level_tinggi);
    return cm>0 ? `${base} + Level ${cm} cm` : `${base} + Level`;
  }

  function levelPrintMarkup(item){
    if(!item?.level_enabled||N(item.level_harga)<=0)return '';
    const cm=levelCm(item.level_tinggi);
    return `<div class="pm-print-level">Level ${cm>0?cm+' cm':'-'} • ${M(levelSubtotal(item))}</div>`;
  }

  function levelSubtotal(item){
    if(!item?.level_enabled)return 0;
    return N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1);
  }

  function quotePackageMarkup(item){
    const master=masterFor(item),rows=parsePackageRows(master?.isi_paket);
    if(!master||!rows.length)return '';
    return `<div class="pm-package-print"><div class="pm-package-print-title">ISI PAKET</div><div class="pm-package-print-list">${rows.map(r=>`<span><b>${E(r.komponen)}</b><em>${E(r.qty)}</em></span>`).join('')}</div></div>`;
  }

  function mobileA4Scale(){
    return window.matchMedia && window.matchMedia('(max-width:700px)').matches;
  }
  function applyMobileA4Zoom(scale,fit=false){
    const scroll=document.querySelector('#pmPrintPreview .pm-print-scroll');
    const stage=document.querySelector('#pmPrintPreview .pm-a4-stage');
    const area=document.querySelector('#pmPrintPreview .pm-a4');
    if(!scroll||!stage||!area)return;
    const naturalW=area.offsetWidth||794;
    const naturalH=area.offsetHeight||1123;
    // "Fit" means fit the whole A4 page inside the document viewport,
    // preserving the 210:297 proportion. It must not stretch the A4 to mobile width.
    const viewport=scroll.getBoundingClientRect();
    const viewportW=Math.max(1,viewport.width||scroll.clientWidth||794);
    const viewportH=Math.max(1,viewport.height||scroll.clientHeight||1123);
    const fitByWidth=(viewportW-2)/naturalW;
    const fitByHeight=(viewportH-2)/naturalH;
    const maxFit=Math.max(.25,Math.min(1,fitByWidth,fitByHeight));
    let z=fit?maxFit:Math.max(maxFit,Math.min(1.8,Number(scale)||maxFit));
    if(!Number.isFinite(z))z=maxFit;
    window.__PM_QUOTATION_ZOOM=z;
    area.style.transform=`scale(${z})`;
    area.style.transformOrigin='top left';
    stage.style.width=`${Math.round(naturalW*z)}px`;
    stage.style.height=`${Math.max(1,Math.round(area.offsetHeight*z))}px`;
    stage.style.margin='0 auto';
    const label=document.querySelector('#pmPrintPreview .pm-zoom-value');
    if(label)label.textContent=`${Math.round(z*100)}%`;
  }
  function fitMobileA4(){applyMobileA4Zoom(0,true);}
  function zoomMobileA4(delta){
    const current=Number(window.__PM_QUOTATION_ZOOM)||0.5;
    applyMobileA4Zoom(current+delta,false);
  }
  window.pmQuotationZoom=zoomMobileA4;
  window.pmQuotationFit=fitMobileA4;
  function bindMobileA4Gestures(){
    const scroll=document.querySelector('#pmPrintPreview .pm-print-scroll');
    if(!scroll||scroll.__pmA4GestureBound)return;
    scroll.__pmA4GestureBound=true;
    let startDistance=0,startZoom=0;
    const distance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    scroll.addEventListener('touchstart',e=>{
      if(e.touches.length===2){startDistance=distance(e.touches[0],e.touches[1]);startZoom=Number(window.__PM_QUOTATION_ZOOM)||.5;}
    },{passive:true});
    scroll.addEventListener('touchmove',e=>{
      if(e.touches.length===2&&startDistance>0){
        const next=startZoom*(distance(e.touches[0],e.touches[1])/startDistance);
        applyMobileA4Zoom(next,false);
      }
    },{passive:true});
    scroll.addEventListener('touchend',e=>{if(e.touches.length<2)startDistance=0;},{passive:true});
  }
  function preview(){
    if(window.__PM_QUOTATION_PREVIEW_BUILDING)return;
    const stale=document.getElementById('pmPrintPreview'); if(stale) stale.remove(); document.body.classList.remove('pm-preview-open');
    const rows=items().filter(x=>x&&S(x.kode)&&S(x.item)),client=S(document.querySelector('#qc')?.value),company=S(document.querySelector('#qp')?.value),eventName=S(document.querySelector('#qeve')?.value);
    if(!rows.length)return msg('Pilih minimal 1 Produk / Jasa terlebih dahulu.');
    if(!client||!company||!eventName)return msg('Isi Client, Perusahaan, dan Nama Event terlebih dahulu.');
    const number=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER||window.__PM_LAST_QUOTATION_NUMBER)||`PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const overlay=document.createElement('div');overlay.id='pmPrintPreview';
    overlay.innerHTML=`<div class="pm-print-toolbar"><div><strong>Preview Surat Penawaran</strong><span>A4 Portrait • ${E(number)}</span></div><div class="pm-print-actions"><button type="button" class="pm-zoom-btn" onclick="pmQuotationZoom(-.1)" aria-label="Zoom out">−</button><span class="pm-zoom-value">Fit</span><button type="button" class="pm-zoom-btn" onclick="pmQuotationZoom(.1)" aria-label="Zoom in">+</button><button type="button" class="pm-zoom-fit" onclick="pmQuotationFit()">Fit</button><button type="button" class="pm-share" onclick="shareQuotationWhatsApp()">Kirim PDF</button><button type="button" class="pm-close" onclick="closePrintPreview()">Tutup</button><button type="button" class="pm-print" onclick="executePrintPreview()" disabled>Menyiapkan...</button></div></div><div class="pm-print-scroll"><div class="pm-a4-stage"><main class="pm-a4" id="pmPrintArea"><div style="padding:30px;text-align:center;color:#64748b;font-family:Arial,sans-serif">Menyiapkan preview A4...</div></main></div></div>`;
    document.body.appendChild(overlay);document.body.classList.add('pm-preview-open');
    window.__PM_QUOTATION_PREVIEW_BUILDING=true;
    let resolveReady;
    window.__PM_QUOTATION_PREVIEW_READY=new Promise(resolve=>{resolveReady=resolve;});
    setTimeout(()=>{
      try{
        const rawDiscount=discountState(),itemNet=rows.reduce((sum,item)=>sum+(window.__PM_QUOTATION_UI_API?.state?N(window.__PM_QUOTATION_UI_API.state(item).net):N(itemSubtotal(item))),0),globalDiscount=Math.min(itemNet,Math.max(0,N(window.__pmDiscountValue))),d={...rawDiscount,base:itemNet,rp:globalDiscount,total:Math.max(0,itemNet-globalDiscount)},t=window.template&&typeof window.template==='object'?window.template:{};
        const eventStart=S(document.querySelector('#qs')?.value),eventEnd=S(document.querySelector('#qe2')?.value);
        const packageCount=rows.reduce((sum,item)=>sum+parsePackageRows(masterFor(item)?.isi_paket).length,0);
        const densityScore=rows.length+Math.ceil(packageCount/2);
        const density=densityScore<=6?'normal':densityScore<=10?'compact-1':densityScore<=15?'compact-2':densityScore<=21?'compact-3':densityScore<=28?'compact-4':'compact-5';
        const htmlRows=rows.map((item,index)=>{
          const type=typeOf(item);let q=N(item.qty)||1;
          if(type==='luas')q=`${N(item.lebar)} × ${N(item.tinggi)} m²`;
          else if(type==='level'){const led=rows.find(x=>x!==item&&/led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`));q=`${led?N(led.lebar):N(item.lebar)} m`;}
          else if(type==='rigging')q=`${N(item.panjang)} × ${N(item.tinggi)} m`;
          const itemState=window.__PM_QUOTATION_UI_API?.state?window.__PM_QUOTATION_UI_API.state(item):{base:itemSubtotal(item),rp:0,pct:0,net:itemSubtotal(item)};
          const net=N(itemState.net),itemDisc=N(itemState.rp),itemPct=N(itemState.pct);
          const ledBase=ledBaseSubtotal(item),level=levelSubtotal(item);
          const grossMarkup=isLED(item)&&level>0
            ? `<div class="pm-subtotal-line"><span>LED</span><strong>${M(ledBase)}</strong></div><div class="pm-subtotal-line pm-level-subtotal"><span>Level ${levelCm(item.level_tinggi)>0?levelCm(item.level_tinggi)+' cm':''}</span><strong>${M(level)}</strong></div>`
            : `<strong>${M(N(itemState.base))}</strong>`;
          const discountMarkup=itemDisc>0
            ? `<div class="pm-subtotal-line pm-item-discount-line"><span>Diskon (${Number(itemPct.toFixed(2))}%)</span><strong>- ${M(itemDisc)}</strong></div><div class="pm-subtotal-line pm-item-net-line"><span>Net</span><strong>${M(net)}</strong></div>`
            : '';
          const subtotalMarkup=grossMarkup+discountMarkup;
          return `<tr><td class="center">${index+1}</td><td><strong>${E(displayItemName(item))}</strong><div class="code">${E(item.kode)}</div>${quotePackageMarkup(item)}</td><td class="center">${E(q)}</td><td class="center">${E(periodShort(item.mulai,item.selesai))}</td><td class="right nowrap">${M(item.harga)}${item?.level_enabled&&N(item.level_harga)>0?`<div class="pm-quote-level-price">Level: ${M(item.level_harga)}/m</div>`:""}</td><td class="right pm-subtotal-cell">${subtotalMarkup}</td></tr>`;
        }).join('');
        const area=overlay.querySelector('#pmPrintArea');
        if(!area)throw new Error('Area A4 tidak ditemukan.');
        area.className=`pm-a4 pm-order-density-${density}`;
        area.innerHTML=`<div class="pm-top-accent"></div><header class="pm-letterhead"><div class="pm-logo-wrap">${t.logo_url?`<img class="logo" src="${E(t.logo_url)}" alt="Logo">`:'<div class="logo-fallback">PM</div>'}</div><div class="pm-brand"><div class="pm-brand-name">${E(t.kop_text||'PRIANGAN MULTIMEDIA')}</div><div class="pm-brand-sub">SALES & QUOTATION</div>${t.alamat?`<p>${E(t.alamat)}</p>`:''}<p>${E(t.telepon||t.whatsapp||'')}${t.email?' • '+E(t.email):''}</p></div><div class="pm-doc-tag"><span>QUOTATION</span><strong>${E(number)}</strong></div></header><div class="pm-title-row"><div><div class="pm-eyebrow">OFFICIAL BUSINESS PROPOSAL</div><h1>SURAT PENAWARAN HARGA</h1></div><div class="pm-date-box"><span>TANGGAL</span><strong>${periodFull(new Date().toISOString().slice(0,10),new Date().toISOString().slice(0,10))}</strong></div></div><section class="pm-info-card"><div class="pm-info-section"><div class="pm-section-label">DITUJUKAN KEPADA</div><div class="pm-client-name">${E(client)}</div><div>${E(company)}</div><div>${E(S(document.querySelector('#qw')?.value))}</div><div>${E(S(document.querySelector('#qe')?.value))}</div></div><div class="pm-info-section pm-event-section"><div class="pm-section-label">EVENT / PROJECT</div><div class="pm-event-name">${E(eventName)}</div><div class="pm-period-label">PERIODE</div><div>${E(periodFull(eventStart,eventEnd))}</div></div></section><p class="pm-opening">Dengan hormat,<br>Bersama ini kami sampaikan penawaran harga untuk kebutuhan event / project tersebut sebagai berikut:</p><table class="pm-items"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${htmlRows}${d.rp>0?`<tr class="pm-discount-row"><td colspan="5" class="right">DISKON (${Math.round(d.pct)}%)</td><td class="right">- ${M(d.rp)}</td></tr>`:''}<tr class="pm-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">${M(d.total)}</td></tr></tbody></table><div class="pm-terms-signature-row"><section class="pm-terms"><div class="pm-section-heading"><span>01</span><strong>SYARAT &amp; KETENTUAN</strong></div><div class="pm-terms-body">${E(t.ketentuan||'Penawaran harga berlaku sesuai kesepakatan dan spesifikasi event.').replace(/\r?\n/g,'<br>')}</div></section><section class="pm-signature"><div class="pm-signature-label">HORMAT KAMI,</div><div class="pm-signature-box">${t.ttd_url?`<img class="signature" src="${E(t.ttd_url)}" alt="TTD">`:''}<div class="pm-signature-line"></div><strong>${E(t.nama_penandatangan||'____________________________')}</strong>${t.jabatan_penandatangan?`<div class="pm-signature-role">${E(t.jabatan_penandatangan)}</div>`:''}</div></section></div><footer class="pm-footer"><div>Terima kasih atas kepercayaan dan kesempatan yang diberikan kepada Priangan Multimedia.</div><strong>${E(t.kop_text||'PRIANGAN MULTIMEDIA')}</strong></footer>`;
        forceA4Layout();
        bindMobileA4Gestures();
        if(mobileA4Scale()){
          requestAnimationFrame(()=>fitMobileA4());
          window.addEventListener('resize',fitMobileA4,{passive:true});
        }
        const printButton=overlay.querySelector('.pm-print');
        if(printButton){printButton.disabled=false;printButton.textContent='Cetak / Simpan PDF';}
        window.__PM_QUOTATION_PREVIEW_BUILDING=false;
      }catch(e){
        window.__PM_QUOTATION_PREVIEW_BUILDING=false;
        console.error('[PM] quotation preview build',e);
        const area=overlay.querySelector('#pmPrintArea');
        if(area)area.innerHTML='<div style="padding:24px;font-family:Arial,sans-serif;color:#b91c1c">Preview gagal dibuat. Silakan tutup dan coba lagi.</div>';
        msg('Gagal membuka preview: '+(e.message||e));
      }finally{resolveReady();}
    },0);
  }
  async function shareQuotationWhatsApp(){
    const number=S(document.querySelector('#qw')?.value);
    const client=S(document.querySelector('#qc')?.value);
    const company=S(document.querySelector('#qp')?.value);
    const eventName=S(document.querySelector('#qeve')?.value);
    const no=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER||window.__PM_LAST_QUOTATION_NUMBER)||'Penawaran';
    const total=N(window.__pmNetTotal);
    const caption=[
      'Halo Bapak/Ibu '+(client||''),
      '',
      'Berikut kami kirimkan Surat Penawaran Harga dari Priangan Multimedia.',
      'No. Penawaran: '+no,
      company?'Perusahaan: '+company:'',
      eventName?'Event / Project: '+eventName:'',
      total?'Grand Total: '+M(total):'',
      '',
      'Terima kasih.'
    ].filter(Boolean).join('\n');

    const digits=number.replace(/\D/g,'');
    let wa=digits;
    if(wa.startsWith('0'))wa='62'+wa.slice(1);
    else if(wa.startsWith('8'))wa='62'+wa;

    if(typeof html2pdf==='undefined'){
      msg('Pembuat PDF belum siap. Tunggu sebentar lalu coba lagi.');
      return;
    }

    const source=document.querySelector('#pmPrintArea');
    if(!source){
      msg('Preview A4 belum siap.');
      return;
    }

    const shareButton=document.querySelector('#pmPrintPreview .pm-share');
    if(shareButton){
      shareButton.disabled=true;
      shareButton.textContent='Membuat PDF...';
    }

    try{
      await window.__PM_QUOTATION_PREVIEW_READY;
      const clone=source.cloneNode(true);
      clone.id='pmPdfExportArea';
      clone.style.cssText='position:absolute;left:-100000px;top:0;width:210mm;min-width:210mm;max-width:none;min-height:297mm;height:auto;margin:0;background:#fff;color:#111;transform:none!important;overflow:visible!important;box-sizing:border-box;';
      clone.querySelectorAll('*').forEach(el=>{
        el.style.maxWidth=el.style.maxWidth==='none'?'none':el.style.maxWidth;
        el.style.transform='none';
      });
      document.body.appendChild(clone);

      const safeNo=no.replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'Penawaran';
      const filename=safeNo+'.pdf';
      const opt={
        margin:0,
        filename,
        image:{type:'jpeg',quality:.98},
        html2canvas:{scale:2,useCORS:true,backgroundColor:'#fff',logging:false},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
        pagebreak:{mode:['css','legacy']}
      };

      const blob=await html2pdf().set(opt).from(clone).outputPdf('blob');
      clone.remove();

      const file=new File([blob],filename,{type:'application/pdf'});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({title:'Surat Penawaran '+no,text:caption,files:[file]});
        msg('PDF siap dibagikan.');
        return;
      }

      const downloadUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=downloadUrl;
      a.download=filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(downloadUrl),30000);

      const waUrl='https://wa.me/'+(wa||'')+'?text='+encodeURIComponent(caption);
      window.open(waUrl,'_blank','noopener,noreferrer');
      msg('PDF sudah diunduh. Lampirkan file PDF tersebut di WhatsApp.');
    }catch(e){
      const leftover=document.getElementById('pmPdfExportArea');
      if(leftover)leftover.remove();
      console.error('[PM] PDF share',e);
      if(e?.name==='AbortError') return;
      msg('Gagal membuat PDF: '+(e.message||e));
    }finally{
      if(shareButton){
        shareButton.disabled=false;
        shareButton.textContent='Kirim PDF';
      }
    }
  }
  window.addItem=addItem;window.removeItem=removeItem;window.toggleQuotationItem=toggleItem;window.pick=pick;window.upd=upd;window.drawItems=drawItems;window.printQuote=preview;window.closePrintPreview=closePreview;window.executePrintPreview=executePreview;window.shareQuotationWhatsApp=shareQuotationWhatsApp;
  window.__PM_QUOTATION_CORE={N,M,S,E,days,masterFor,itemMode,typeOf,itemSubtotal,baseTotal,itemDiscountState,discountState,sync,renderMargin,addItem,removeItem,pick,upd,drawItems,toggleItem,periodFull,periodShort,quotePackageMarkup,displayItemName,levelSubtotal,isLED};

  function boot(){installQuotationStyles();ensureDiscountUI();if(document.querySelector('#items'))drawItems();else sync();forceA4Layout();}
  [0,150,350,700,1200].forEach(ms=>setTimeout(boot,ms));
  document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc'){clearTimeout(window.__pmQuotationSyncTimer);window.__pmQuotationSyncTimer=setTimeout(sync,40);}},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items')){clearTimeout(window.__pmQuotationItemsTimer);window.__pmQuotationItemsTimer=setTimeout(sync,40);}},true);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-p="quotation"]')){window.__PM_DISC_MODE='rp';window.__pmDiscountBase=0;window.__pmDiscountValue=0;window.__pmDiscountPct=0;window.__pmNetTotal=0;window.__PM_QUOTATION_OPEN_ITEM_ID=null;window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null;setTimeout(()=>{ensureDiscountUI();if(document.querySelector('#items'))drawItems();else sync();},80);}},true);
  window.addEventListener('beforeprint',()=>{forceA4Layout();},true);
})();
