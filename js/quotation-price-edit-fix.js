/* Priangan Multimedia — Per-quotation price editor
 * Master Harga = default price only.
 * penawaran item `harga` / `harga_jual` = negotiated quotation price.
 * This editor never updates master_harga.
 * Base price is kept separately so per-item discount can be applied without
 * letting the discount layer overwrite a newly edited price.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_PRICE_EDITOR_CORE__) return;
  window.__PM_QUOTATION_PRICE_EDITOR_CORE__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function getItems(){return Array.isArray(window.items)?window.items:[];}
  function getItemFromCard(card){
    if(!card)return null;
    const raw=card.getAttribute('data-item-id');
    if(raw==null)return null;
    return getItems().find(x=>String(x.id)===String(raw))||null;
  }
  function calcDays(item){
    if(!item?.mulai||!item?.selesai)return 1;
    const a=new Date(S(item.mulai)+'T00:00:00'),b=new Date(S(item.selesai)+'T00:00:00');
    const d=Math.round((b-a)/86400000);
    return d>=0?d+1:1;
  }
  function calcSubtotal(item,price){
    const a=getItems(),value=N(price),days=calcDays(item),qty=Math.max(1,N(item.qty)||1),type=S(item.tipe||item.tipe_perhitungan).toLowerCase();
    if(type==='luas')return N(item.lebar)*N(item.tinggi)*value*days;
    if(type==='rigging')return ((N(item.panjang)*2)+(N(item.tinggi)*2))*value*days;
    if(type==='level'){
      const led=a.find(x=>x!==item&&/led|videotron/i.test(S(x.item)));
      return (led?N(led.lebar):N(item.lebar))*value*days;
    }
    return qty*value*days;
  }
  function syncTotals(){
    const a=getItems();
    const base=a.filter(x=>S(x.kode)&&S(x.item)).reduce((sum,x)=>sum+calcSubtotal(x,N(x.harga)),0);
    const discount=N(document.querySelector('#pmDisc')?.value);
    const net=Math.max(0,base-discount);
    const total=document.querySelector('#total'),grand=document.querySelector('#pmGrand');
    if(total)total.textContent=money(net);if(grand)grand.textContent=money(net);
    window.__pmDiscountBase=base;window.__pmNetTotal=net;
  }
  function findPriceInput(card){
    for(const f of card.querySelectorAll('.field')){
      const label=S(f.querySelector('label')?.textContent).toLowerCase();
      if(label.includes('harga jual')||label.includes('harga penawaran'))return f.querySelector('input');
    }
    return null;
  }
  function commitPrice(input){
    const card=input?.closest?.('#items > .item'),item=getItemFromCard(card);if(!item)return;
    const value=Math.max(0,N(input.value));
    item.__pmBaseHarga=value;
    item.harga=value;
    item.harga_jual=value;
    item.__harga_diedit=true;
    input.dataset.quotePrice=String(value);
    syncTotals();
  }
  function enhance(){
    document.querySelectorAll('#items > .item').forEach(card=>{
      const input=findPriceInput(card);if(!input||input.dataset.pmPriceEditor==='1')return;
      input.dataset.pmPriceEditor='1';input.dataset.quotePrice=String(N(input.value));input.readOnly=true;input.classList.add('pm-quote-price-readonly');
      const wrap=input.parentElement;if(!wrap)return;wrap.style.position='relative';
      const button=document.createElement('button');button.type='button';button.className='btn secondary pm-edit-price';button.textContent='Edit Harga';button.style.marginTop='6px';button.style.fontSize='12px';button.style.padding='5px 10px';
      button.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        if(input.readOnly){input.readOnly=false;button.textContent='Simpan Harga';button.classList.add('pm-price-editing');input.focus();input.select();return;}
        commitPrice(input);input.readOnly=true;button.textContent='Edit Harga';button.classList.remove('pm-price-editing');
        input.dispatchEvent(new Event('change',{bubbles:true}));
        if(typeof window.drawItems==='function')window.drawItems();
      });
      input.addEventListener('input',()=>commitPrice(input));
      input.addEventListener('change',()=>commitPrice(input));
      wrap.appendChild(button);
    });
  }
  const style=document.createElement('style');style.id='pmQuotationPriceEditorStyles';style.textContent=`.pm-quote-price-readonly{background:rgba(255,255,255,.035)!important;cursor:default}.pm-edit-price{display:inline-flex!important;align-items:center;gap:5px}.pm-edit-price.pm-price-editing{border-color:rgba(77,141,255,.65)!important}`;document.head.appendChild(style);
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  requestAnimationFrame(enhance);window.addEventListener('load',enhance);
})();
