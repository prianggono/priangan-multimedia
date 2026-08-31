/* Priangan Multimedia — Invoice preview wording + signature polish.
 * Scope: preview/print invoice only. Does not change quotation, invoice data, totals, or payment calculations.
 */
(function(){
  'use strict';

  function polish(){
    const root = document.getElementById('pmInvoicePreview');
    if(!root) return;

    // Business wording: invoice payment already received is treated as Downpayment.
    root.querySelectorAll('.pm-inv-payrow span').forEach(el => {
      if ((el.textContent || '').trim().toLowerCase() === 'sudah dibayar') {
        el.textContent = 'Downpayment';
      }
    });

    // Keep the signature block neat and aligned on the right side of the A4 page.
    let style = root.querySelector('#pm-invoice-polish-style');
    if(!style){
      style = document.createElement('style');
      style.id = 'pm-invoice-polish-style';
      style.textContent = `
        #pmInvoicePreview .pm-inv-sign{
          width:190px;
          margin:20px 0 0 auto;
          min-height:105px;
          text-align:center;
          font-size:9px;
        }
        #pmInvoicePreview .pm-inv-sign img{
          display:block;
          width:auto;
          max-width:105px;
          height:42px;
          object-fit:contain;
          margin:5px auto 1px;
        }
        #pmInvoicePreview .pm-inv-line{
          width:135px;
          border-top:1px solid #374151;
          margin:2px auto 4px;
        }
        @media print{
          #pmInvoicePreview .pm-inv-sign{
            width:190px;
            margin-top:20px;
          }
        }
      `;
      root.appendChild(style);
    }
  }

  const observer = new MutationObserver(polish);
  observer.observe(document.body, {childList:true, subtree:true});
  setTimeout(polish, 50);
  setTimeout(polish, 250);
  setTimeout(polish, 700);
})();
