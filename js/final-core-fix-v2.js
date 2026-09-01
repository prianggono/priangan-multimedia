/* Priangan Multimedia — stable quotation core
 * Calculation source of truth for the quotation form.
 * Master Harga satuan is authoritative: unit/pcs/buah/set => qty.
 * No global MutationObserver.
 */
(function(){
  'use strict';

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const r=S(v).replace(/[^0-9,.-]/g,'');
    if(!r) return 0;
    const n=Number(r.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const units=new Set(['unit','units','pcs','pc','buah','set']);

  function masterList(){try{return Array.isArray(window.masters)?window.masters:(typeof masters!=='undefined'&&Array.isArray(masters)?masters:[])}catch(_){return[]}}
  function itemList(){try{return Array.isArray(window.items)?window.items:(typeof items!=='undefined'&&Array.isArray(items)?items:[])}catch(_){return[]}}
  function setList(a){try{items=a}catch(_){} window.items=a;}

  /* Master Harga.satuan is authoritative. Never infer luas merely because
     the item name/category contains LED or Videotron. */
  function typeOf(m){
    const sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');
    if(units.has(sat)) return 'qty';
    if(['m2','m²','meter2','meterpersegi','luas'].includes(sat)) return 'luas';
    const t=(S(m?.item)+' '+S(m?.kategori)+' '+S(m?.kode)).toLowerCase();
    if(/rigging|rig/.test(t)) return 'rigging';
    if(/level/.test(t)) return 'level';
    if(/led|videotron/.test(t)) return 'luas';
    return 'qty';
  }

  function days(a,b){
    if(!a||!b) return 1;
    const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);
    return d>=0?d+1:1;
  }

  function subtotal(i){
    const t=S(i.tipe).toLowerCase(), p=N(i.harga), d=days(i.mulai,i.selesai);
    if(t==='luas') return N(i.lebar)*N(i.tinggi)*p*d;
    if(t==='rigging') return ((N(i.panjang)*2)+(N(i.tinggi)*2))*p*d;
    if(t==='level'){
      const led=itemList().find(x=>x.id!==i.id&&/led|videotron/i.test(S(x.item)));
      return (led?N(led.lebar):N(i.lebar))*N(i.tinggi)*p*d;
    }
    return (N(i.qty)||1)*p*d;
  }

  function pick(id,kode){
    const m=masterList().find(x=>S(x.kode)===S(kode));
    const a=itemList(), i=a.find(x=>x.id===id);
    if(!m||!i) return;
    i.kode=m.kode; i.item=m.item; i.harga=N(m.harga_jual); i.tipe=typeOf(m);
    if(i.tipe==='qty'){
      i.lebar=0; i.tinggi=0; i.panjang=0; i.qty=N(i.qty)||1;
    }
    setList(a); draw();
  }

  function upd(id,k,v){
    const a=itemList(),i=a.find(x=>x.id===id); if(!i)return;
    i[k]=(k==='mulai'||k==='selesai')?S(v):N(v);
    setList(a); draw();
  }

  function removeItem(id){setList(itemList().filter(x=>x.id!==id));draw();}
  function addItem(){
    const a=itemList();
    a.push({id:Date.now()+Math.random(),kode:'',item:'',harga:0,qty:1,lebar:0,tinggi:0,panjang:0,mulai:'',selesai:'',tipe:'qty'});
    setList(a); draw();
  }

  function dims(i){
    const t=S(i.tipe).toLowerCase();
    if(t==='rigging') return `<div class="dim"><div class="field"><label>Panjang Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(i.panjang)}" onchange="upd(${i.id},'panjang',this.value)"></div><div class="field"><label>Tinggi Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;
    if(t==='level'){
      const led=itemList().find(x=>x.id!==i.id&&/led|videotron/i.test(S(x.item))),w=led?N(led.lebar):N(i.lebar);
      return `<div class="dim"><div class="field"><label>Lebar Level (otomatis)</label><input value="${w?w+' m':'-'}" readonly></div><div class="field"><label>Tinggi Level (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;
    }
    if(t==='luas') return `<div class="dim"><div class="field"><label>Lebar Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(i.lebar)}" onchange="upd(${i.id},'lebar',this.value)"></div><div class="field"><label>Tinggi Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;
    return `<div class="field"><label>Jumlah (Qty)</label><input type="number" min="1" step="1" value="${N(i.qty)||1}" onchange="upd(${i.id},'qty',this.value)"></div>`;
  }

  function base(){return itemList().reduce((s,i)=>s+subtotal(i),0)}

  function ensureDiscount(){
    const total=document.querySelector('#total'); if(!total)return;
    const card=total.closest('.card'); if(!card)return;
    let box=document.querySelector('#pmDiscount');
    if(!box){
      box=document.createElement('div'); box.id='pmDiscount';
      box.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
      box.innerHTML=`<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="number" min="0" max="100" step="0.01" value="0"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="number" min="0" step="1" value="0"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">Rp 0</b></div>`;
      card.insertBefore(box,total.closest('.sum'));
      const p=box.querySelector('#pmDiscPct'),r=box.querySelector('#pmDisc');
      p.addEventListener('input',()=>applyDiscount('pct'));
      r.addEventListener('input',()=>applyDiscount('rp'));
    }
    applyDiscount();
  }

  function applyDiscount(mode){
    const box=document.querySelector('#pmDiscount'); if(!box)return;
    const p=box.querySelector('#pmDiscPct'),r=box.querySelector('#pmDisc'),b=base();
    let pct=N(p.value),rp=N(r.value);
    if(mode==='pct'){
      pct=Math.max(0,Math.min(100,pct)); rp=Math.round(b*pct/100); r.value=rp;
    }else if(mode==='rp'){
      rp=Math.max(0,Math.min(b,rp)); pct=b?rp/b*100:0; p.value=pct.toFixed(2);
    }else{
      pct=Math.max(0,Math.min(100,pct)); rp=Math.max(0,Math.min(b,rp));
      if(rp>0 && pct===0) pct=b?rp/b*100:0;
    }
    const net=Math.max(0,b-rp);
    box.querySelector('#pmGrand').textContent=M(net);
    const total=document.querySelector('#total'); if(total)total.textContent=M(net);
    window.__pmDiscountValue=rp; window.__pmDiscountPct=pct; window.__pmDiscountBase=b; window.__pmNetTotal=net;
  }

  function draw(){
    const c=document.querySelector('#items'); if(!c)return;
    const a=itemList(),ms=masterList().filter(x=>x.aktif!==false&&String(x.aktif).toUpperCase()!=='FALSE');
    c.innerHTML=a.map((i,n)=>`<div class="item" data-pm-saved-item-id="${E(i.__savedItemId??'')}"><div class="itemhead"><span class="blue">ITEM #${n+1}</span><button class="btn red sm" type="button" onclick="removeItem(${i.id})">Hapus</button></div><div class="field"><label>Produk / Jasa</label><select onchange="pick(${i.id},this.value)"><option value="">-- Pilih dari Master Harga --</option>${ms.map(m=>`<option value="${E(m.kode)}" ${S(i.kode)===S(m.kode)?'selected':''}>[${E(m.kode)}] ${E(m.item)}</option>`).join('')}</select></div><div class="grid g2"><div class="field"><label>Harga Jual</label><input value="${M(i.harga)}" readonly></div><div class="field"><label>Tipe Perhitungan</label><input value="${E(i.tipe==='qty'?'Qty':i.tipe)}" readonly></div></div>${dims(i)}<div class="sched"><b>Jadwal Pemakaian</b><div class="grid g2" style="margin-top:12px"><div class="field"><label>Tanggal Mulai</label><input type="date" value="${E(i.mulai)}" onchange="upd(${i.id},'mulai',this.value)"></div><div class="field"><label>Tanggal Selesai</label><input type="date" value="${E(i.selesai)}" onchange="upd(${i.id},'selesai',this.value)"></div></div></div><div class="sum"><span>Subtotal</span><b>${M(subtotal(i))}</b></div></div>`).join('');
    ensureDiscount();
  }

  window.pick=pick; window.upd=upd; window.removeItem=removeItem; window.addItem=addItem; window.drawItems=draw;
  window.__PM_STABLE_QUOTATION_CORE=true;
})();
