/* A4 preview UI + print styles */
(function () {
  if (document.getElementById('pmPrintStyles')) return;

  const style = document.createElement('style');
  style.id = 'pmPrintStyles';
  style.textContent = `
    /* Make native date picker icon visible on the dark UI */
    input[type="date"]::-webkit-calendar-picker-indicator {
      opacity: 1;
      filter: invert(1) brightness(1.5);
      cursor: pointer;
    }

    input[type="date"] {
      color-scheme: dark;
    }

    /* A4 preview */
    #pmPrintPreview {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(2, 6, 23, .94);
      display: flex;
      flex-direction: column;
    }

    .pm-print-toolbar {
      flex: 0 0 auto;
      min-height: 64px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #0f172a;
      border-bottom: 1px solid #334155;
      color: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }

    .pm-print-toolbar strong {
      display: block;
      font-size: 15px;
    }

    .pm-print-toolbar span {
      display: block;
      color: #94a3b8;
      font-size: 12px;
      margin-top: 3px;
    }

    .pm-print-actions {
      display: flex;
      gap: 8px;
    }

    .pm-print-actions button {
      border: 0;
      border-radius: 7px;
      padding: 10px 15px;
      font-weight: 700;
      cursor: pointer;
    }

    .pm-close {
      background: #1e293b;
      color: #fff;
    }

    .pm-print {
      background: #10b981;
      color: #fff;
    }

    .pm-print-scroll {
      flex: 1 1 auto;
      overflow: auto;
      padding: 30px;
    }

    .pm-a4 {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm 15mm 14mm;
      box-sizing: border-box;
      background: #fff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      box-shadow: 0 12px 45px rgba(0, 0, 0, .45);
    }

    .pm-letterhead {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-bottom: 9px;
      border-bottom: 2px solid #111827;
    }

    .pm-letterhead .logo {
      width: 68px;
      height: 68px;
      object-fit: contain;
      flex: 0 0 auto;
    }

    .pm-brand {
      flex: 1;
    }

    .pm-brand h1 {
      margin: 0 0 4px;
      font-size: 19px;
      text-transform: uppercase;
    }

    .pm-brand p {
      margin: 2px 0;
      color: #374151;
      font-size: 9pt;
    }

    .pm-title {
      margin: 18px 0 15px;
      text-align: center;
      font-size: 16px;
      letter-spacing: .3px;
      text-decoration: underline;
    }

    .pm-meta,
    .pm-items {
      width: 100%;
      border-collapse: collapse;
    }

    .pm-meta {
      margin-bottom: 15px;
    }

    .pm-meta td {
      padding: 3px 5px;
      vertical-align: top;
    }

    .pm-meta td:first-child {
      width: 105px;
      font-weight: 700;
    }

    .pm-opening {
      margin: 12px 0;
    }

    .pm-items th,
    .pm-items td {
      border: 1px solid #9ca3af;
      padding: 6px 5px;
      vertical-align: top;
    }

    .pm-items th {
      background: #f3f4f6;
      text-align: center;
      font-size: 8.5pt;
    }

    .pm-items td {
      font-size: 8.5pt;
    }

    .pm-items .code {
      color: #6b7280;
      font-size: 7.5pt;
      margin-top: 2px;
    }

    .center { text-align: center !important; }
    .right { text-align: right !important; }

    .pm-total td {
      font-weight: 800;
      background: #f8fafc;
    }

    .pm-terms {
      margin-top: 17px;
      font-size: 8.5pt;
    }

    .pm-terms strong {
      display: block;
      margin-bottom: 5px;
    }

    .pm-signature {
      width: 220px;
      margin: 28px 0 0 auto;
      text-align: center;
      font-size: 9pt;
    }

    .pm-signature p {
      margin: 0 0 5px;
    }

    .pm-signature .signature {
      display: block;
      max-width: 170px;
      max-height: 72px;
      margin: 0 auto 4px;
      object-fit: contain;
    }

    .pm-signature .signature-space {
      height: 72px;
    }

    .pm-a4 footer {
      margin-top: 22px;
      padding-top: 6px;
      border-top: 1px solid #d1d5db;
      color: #6b7280;
      font-size: 8pt;
      text-align: center;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    @media print {
      body * {
        visibility: hidden !important;
      }

      #pmPrintPreview,
      #pmPrintPreview * {
        visibility: visible !important;
      }

      #pmPrintPreview {
        position: absolute !important;
        inset: 0 !important;
        display: block !important;
        background: #fff !important;
      }

      .pm-print-toolbar {
        display: none !important;
      }

      .pm-print-scroll {
        overflow: visible !important;
        padding: 0 !important;
      }

      .pm-a4 {
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 15mm 15mm 14mm !important;
        box-shadow: none !important;
      }
    }
  `;

  document.head.appendChild(style);
})();
