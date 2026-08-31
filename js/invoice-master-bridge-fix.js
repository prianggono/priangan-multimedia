/* Priangan Multimedia — Invoice master bridge + reliable Add button */
(function(){
  'use strict';
  const KEY='PM_INVOICE_EXTRA_ITEMS';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const r=S(v).replace(/[^0-9,.-]/g,'');if(!r)return 0;const n=Number(r.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  function sync(){try{if(typeof masters!=='undefined'&&Array.isArray(masters))window.masters=masters;}catch(_){} }
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}}
  function write(x){localStorage.setItem(KEY,JSON.stringify(x));}
  function toast(t){if(typeof window.msg==='function')window.msg(t);else alert(t);}
  function days(a,b){if(!a||!b)return 1;const x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;}
  function save(){
    const s=window.__PM_INVOICE_ADD_STATE;
    if(!s?.id) return toast('Invoice belum dipilih.');
    const source=S(document.getElementById('pmxSource')?.value||'manual');
    const select=document.getElementById('pmxMaster');
    const o=select?.selectedOptions?.[0];
    const master=o?.value?{id:o.dataset.id||null,kode:o.value,item:o.dataset.item||'',price:N(o.dataset.price),type:S(o.dataset.type||'qty').toLowerCase()}:null;
    if(source==='master'&&!master)return toast('Pilih item dari Master Harga terlebih dahulu.');
    const name=S(document.getElementById('pmxName')?.value)||(source==='overtime'?'Overtime':'Item Tambahan');
    const type=source==='overtime'?'overtime':S(document.getElementById('pmxType')?.value||'qty');
    const price=Math.max(0,N(document.getElementById('pmxPrice')?.value));
    const qty=Math.max(0,N(document.getElementById('pmxQty')?.value));
    const width=Math.max(0,N(document.getElementById('pmxWidth')?.value));
    const height=Math.max(0,N(document.getElementById('pmxHeight')?.value));
    const length=Math.max(0,N(document.getElementById('pmxLength')?.value));
    const start=S(document.getElementById('pmxStart')?.value)||null;
    const end=S(document.getElementById('pmxEnd')?.value)||null;
    if(source==='overtime'&&qty<=0)return toast('Kelebihan jam harus lebih dari 0.');
    if(type==='qty'&&qty<=0)return toast('Jumlah Qty harus lebih dari 0.');
    let basis=(qty||1);
    if(type==='luas')basis=width*height;
    else if(type==='level')basis=width;
    else if(type==='rigging')basis=(length*2)+(height*2);
    if(['luas','level','rigging'].includes(type)&&basis<=0)return toast('Lengkapi dimensi sesuai tipe perhitungan.');
    const dur=type==='overtime'?1:days(start,end);
    const item={id:'INVADD-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),invoice_item:true,source,master_harga_id:master?.id||null,tipe:type,item:name,kode:source==='overtime'?'OVERTIME':(master?.kode||'ADD-INV'),qty:qty||1,satuan:source==='overtime'?'jam':type==='luas'?'m²':type==='level'?'m':type==='rigging'?'m':'unit',harga:price,harga_jual:price,lebar:width||null,tinggi:height||null,panjang:length||null,tanggal_mulai:start,tanggal_selesai:end,durasi:dur,basis,subtotal:basis*price*dur};
    const data=read(),k=String(s.id);data[k]=[...(data[k]||[]),item];write(data);
    document.getElementById('pmInvoiceAddDialog')?.remove();
    toast('Item berhasil ditambahkan ke invoice.');
    if(typeof window.invoiceEdit==='function')setTimeout(()=>window.invoiceEdit(Number(s.id)),80);
  }
  function close(){document.getElementById('pmInvoiceAddDialog')?.remove();}
  window.invoiceSaveAddItem=save;
  window.invoiceCloseAddItem=close;
  sync();
  setInterval(sync,250);
})();
