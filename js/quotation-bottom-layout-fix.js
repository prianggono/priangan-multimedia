/* Compact A4 bottom layout: Syarat & Ketentuan + TTD side-by-side at the bottom. */
(function () {
  'use strict';

  function install() {
    const overlay = document.getElementById('pmPrintPreview');
    if (!overlay) return;

    const a4 = overlay.querySelector('.pm-a4');
    const terms = overlay.querySelector('.pm-terms');
    const signature = overlay.querySelector('.pm-signature');
    if (!a4 || !terms || !signature) return;

    // Wrap the two existing sections once, without changing their content.
    let bottom = a4.querySelector('.pm-bottom-grid');
    if (!bottom) {
      bottom = document.createElement('div');
      bottom.className = 'pm-bottom-grid';

      const first = terms;
      first.parentNode.insertBefore(bottom, first);
      bottom.appendChild(terms);
      bottom.appendChild(signature);
    } else {
      if (terms.parentElement !== bottom) bottom.appendChild(terms);
      if (signature.parentElement !== bottom) bottom.appendChild(signature);
    }

    if (!document.getElementById('pmBottomLayoutStyles')) {
      const style = document.createElement('style');
      style.id = 'pmBottomLayoutStyles';
      style.textContent = `
        /* Keep the bottom block compact and side-by-side. */
        #pmPrintPreview .pm-a4 {
          display:flex !important;
          flex-direction:column !important;
        }

        #pmPrintPreview .pm-bottom-grid {
          width:100% !important;
          margin-top:auto !important;
          padding-top:8px !important;
          display:grid !important;
          grid-template-columns:minmax(0, 1.7fr) minmax(175px, .65fr) !important;
          gap:10px !important;
          align-items:end !important;
          page-break-inside:avoid !important;
          break-inside:avoid !important;
        }

        #pmPrintPreview .pm-bottom-grid .pm-terms {
          margin:0 !important;
          min-width:0 !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-section-heading {
          padding:5px 7px !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-section-heading span {
          width:17px !important;
          height:17px !important;
          font-size:5.8pt !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-section-heading strong {
          font-size:6.8pt !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-terms-body {
          padding:6px 8px !important;
          font-size:6.6pt !important;
          line-height:1.32 !important;
        }

        #pmPrintPreview .pm-bottom-grid .pm-signature {
          width:100% !important;
          margin:0 !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:center !important;
          justify-content:flex-end !important;
          page-break-inside:avoid !important;
          break-inside:avoid !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature-label {
          width:100% !important;
          margin:0 0 2px !important;
          text-align:center !important;
          font-size:6.8pt !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature-box {
          width:100% !important;
          min-height:72px !important;
          height:auto !important;
          display:flex !important;
          flex-direction:column !important;
          align-items:center !important;
          justify-content:flex-end !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature .signature {
          width:auto !important;
          max-width:105px !important;
          height:42px !important;
          max-height:42px !important;
          object-fit:contain !important;
          margin:0 auto 1px !important;
          display:block !important;
          visibility:visible !important;
          opacity:1 !important;
          background:transparent !important;
          border:0 !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature-line {
          width:125px !important;
          margin:1px auto 2px !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature-box strong {
          font-size:7pt !important;
          line-height:1.15 !important;
        }
        #pmPrintPreview .pm-bottom-grid .pm-signature-role {
          font-size:6.4pt !important;
          line-height:1.15 !important;
          margin-top:1px !important;
        }

        @media print {
          #pmPrintPreview .pm-bottom-grid {
            padding-top:6px !important;
            grid-template-columns:minmax(0, 1.7fr) minmax(165px, .65fr) !important;
          }
          #pmPrintPreview .pm-bottom-grid .pm-terms-body {
            font-size:6.5pt !important;
          }
          #pmPrintPreview .pm-bottom-grid .pm-signature-box {
            min-height:68px !important;
          }
          #pmPrintPreview .pm-bottom-grid .pm-signature .signature {
            max-width:100px !important;
            height:40px !important;
            max-height:40px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  let timer = null;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(install, 80);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
})();
