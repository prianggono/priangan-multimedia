/* Priangan Multimedia — Invoice bottom section
 * Put Syarat & Ketentuan + signature in one bottom row, matching quotation layout.
 * Does not change invoice data or calculations.
 */
(function(){
  'use strict';
  const apply = () => {
    const area = document.getElementById('pmInvoiceArea');
    if (!area || area.querySelector('.pm-inv-bottom-row')) return;
    const terms = area.querySelector('.pm-inv-terms');
    const sign = area.querySelector('.pm-inv-sign');
    const footer = area.querySelector('.pm-inv-footer');
    if (!terms || !sign) return;

    const row = document.createElement('div');
    row.className = 'pm-inv-bottom-row';
    terms.parentNode.insertBefore(row, terms);
    row.appendChild(terms);
    row.appendChild(sign);
    if (footer) row.parentNode.appendChild(footer);
  };

  const observer = new MutationObserver(() => apply());
  observer.observe(document.body, {childList:true, subtree:true});
  apply();
})();
