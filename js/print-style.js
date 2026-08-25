/* Professional A4 quotation preview + print styles */
(function () {
  if (document.getElementById('pmPrintStyles')) return;

  const style = document.createElement('style');
  style.id = 'pmPrintStyles';
  style.textContent = `
    input[type="date"]::-webkit-calendar-picker-indicator {
      opacity: 1;
      filter: invert(1) brightness(1.7);
      cursor: pointer;
    }
    input[type="date"] { color-scheme: dark; }

    #pmPrintPreview {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(2, 6, 23, .96);
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
      background: #0b1220;
      border-bottom: 1px solid #26334d;
      color: #fff;
      font-family: Arial, Helvetica, sans-serif;
    }
    .pm-print-toolbar strong { display:block; font-size:15px; }
    .pm-print-toolbar span { display:block; color:#94a3b8; font-size:12px; margin-top:3px; }
    .pm-print-actions { display:flex; gap:8px; }
    .pm-print-actions button { border:0; border-radius:8px; padding:10px 16px; font-weight:700; cursor:pointer; }
    .pm-close { background:#1e293b; color:#fff; }
    .pm-print { background:#10b981; color:#fff; }
    .pm-print-scroll { flex:1 1 auto; overflow:auto; padding:32px; }

    .pm-a4 {
      width:210mm;
      min-height:297mm;
      margin:0 auto;
      padding:13mm 14mm 11mm;
      box-sizing:border-box;
      background:#fff;
      color:#172033;
      font-family:Arial, Helvetica, sans-serif;
      font-size:9.4pt;
      line-height:1.38;
      box-shadow:0 16px 55px rgba(0,0,0,.48);
      position:relative;
      overflow:hidden;
    }
    .pm-top-accent {
      height:4px;
      margin:-13mm -14mm 10mm;
      background:linear-gradient(90deg,#2563eb 0%,#4f46e5 55%,#06b6d4 100%);
    }

    /* Premium letterhead: larger logo + stronger visual hierarchy */
    .pm-letterhead {
      position:relative;
      display:flex;
      align-items:center;
      gap:18px;
      min-height:100px;
      padding:12px 18px;
      border:1px solid #163d76;
      border-radius:10px;
      overflow:hidden;
      background:
        radial-gradient(circle at 82% 12%, rgba(59,130,246,.46) 0, rgba(59,130,246,0) 30%),
        radial-gradient(circle at 100% 100%, rgba(6,182,212,.28) 0, rgba(6,182,212,0) 36%),
        linear-gradient(120deg,#020817 0%,#071a38 48%,#0b2a4a 100%);
      box-shadow:0 7px 22px rgba(15,23,42,.22);
    }
    .pm-letterhead::before {
      content:"";
      position:absolute;
      inset:0;
      pointer-events:none;
      opacity:.24;
      background-image:
        linear-gradient(135deg, transparent 0 47%, rgba(255,255,255,.16) 48%, transparent 50%),
        linear-gradient(45deg, transparent 0 47%, rgba(34,211,238,.18) 48%, transparent 50%);
      background-size:36px 36px, 48px 48px;
    }
    .pm-letterhead::after {
      content:"";
      position:absolute;
      left:0;
      right:0;
      bottom:0;
      height:4px;
      background:linear-gradient(90deg,#2563eb,#06b6d4,#60a5fa);
    }

    .pm-logo-wrap {
      width:92px;
      height:92px;
      flex:0 0 92px;
      display:flex;
      align-items:center;
      justify-content:center;
      position:relative;
      z-index:2;
      background:rgba(255,255,255,.98);
      border:1px solid rgba(255,255,255,.95);
      border-radius:16px;
      box-shadow:0 6px 18px rgba(0,0,0,.34);
      overflow:hidden;
    }
    .pm-letterhead .logo {
      width:82px;
      height:82px;
      max-width:82px;
      max-height:82px;
      object-fit:contain;
      display:block;
      filter:none;
    }
    .logo-fallback {
      width:70px;
      height:70px;
      border-radius:14px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:linear-gradient(135deg,#2563eb,#06b6d4);
      color:#fff;
      font-size:20px;
      font-weight:800;
    }

    .pm-brand {
      flex:1;
      min-width:0;
      position:relative;
      z-index:2;
    }
    .pm-brand-name {
      margin:0;
      font-size:18px;
      line-height:1.08;
      font-weight:900;
      color:#ffffff !important;
      letter-spacing:.8px;
      text-transform:uppercase;
      text-shadow:0 2px 4px rgba(0,0,0,.65);
    }
    .pm-brand-sub {
      margin-top:4px;
      font-size:8pt;
      font-weight:900;
      letter-spacing:1.8px;
      color:#67e8f9 !important;
      text-shadow:0 1px 3px rgba(0,0,0,.55);
    }
    .pm-brand p {
      margin:3px 0 0;
      color:#f1f5f9 !important;
      font-size:7.1pt;
      font-weight:600;
      text-shadow:0 1px 3px rgba(0,0,0,.55);
    }
    .pm-brand .website { color:#a5f3fc !important; }
    .pm-doc-tag {
      min-width:110px;
      text-align:right;
      position:relative;
      z-index:2;
      padding-left:10px;
    }
    .pm-doc-tag span {
      display:block;
      color:#bae6fd !important;
      font-size:7pt;
      font-weight:900;
      letter-spacing:1.4px;
      text-shadow:0 1px 3px rgba(0,0,0,.55);
    }
    .pm-doc-tag strong {
      display:block;
      margin-top:5px;
      color:#ffffff !important;
      font-size:8.6pt;
      font-weight:900;
      text-shadow:0 1px 3px rgba(0,0,0,.55);
    }

    .pm-title-row { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:15px 0 12px; }
    .pm-eyebrow { color:#2563eb; font-size:6.8pt; font-weight:800; letter-spacing:1.4px; }
    .pm-title-row h1 { margin:3px 0 0; font-size:17px; color:#111827; letter-spacing:.2px; }
    .pm-date-box { text-align:right; }
    .pm-date-box span { display:block; color:#64748b; font-size:6.5pt; font-weight:800; letter-spacing:1px; }
    .pm-date-box strong { display:block; margin-top:2px; font-size:8pt; color:#1e293b; }

    .pm-info-card {
      display:grid;
      grid-template-columns:1.25fr 1fr;
      border:1px solid #dbe3ef;
      border-radius:8px;
      overflow:hidden;
      background:#f8fafc;
    }
    .pm-info-section { padding:9px 11px; }
    .pm-event-section { border-left:1px solid #dbe3ef; background:#f1f5f9; }
    .pm-section-label { margin-bottom:4px; color:#64748b; font-size:6.6pt; font-weight:800; letter-spacing:1px; }
    .pm-client-name,.pm-event-name { color:#111827; font-weight:800; font-size:9.3pt; }
    .pm-info-section > div:not(.pm-section-label):not(.pm-client-name):not(.pm-event-name) { color:#475569; font-size:7.8pt; }
    .pm-period-label { margin-top:7px; color:#64748b; font-size:6.3pt !important; font-weight:800; letter-spacing:.8px; }

    .pm-opening { margin:12px 0 10px; color:#334155; font-size:8.5pt; }

    .pm-items { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #cbd5e1; border-radius:7px; overflow:hidden; }
    .pm-items th,.pm-items td { border-right:1px solid #d7dee9; border-bottom:1px solid #d7dee9; padding:6px 5px; vertical-align:middle; }
    .pm-items th:last-child,.pm-items td:last-child { border-right:0; }
    .pm-items tbody tr:last-child td { border-bottom:0; }
    .pm-items th { background:#172554; color:#fff; text-align:center; font-size:7.2pt; font-weight:800; letter-spacing:.1px; }
    .pm-items td { font-size:7.8pt; }
    .pm-items tbody tr:nth-child(even):not(.pm-total) td { background:#f8fafc; }
    .pm-items .row-no { font-weight:700; color:#64748b; }
    .pm-items .code { color:#64748b; font-size:6.7pt; margin-top:2px; }
    .pm-items .schedule { font-size:7pt; color:#475569; }
    .pm-items .nowrap { white-space:nowrap; }
    .pm-items .strong-price { font-weight:800; color:#111827; }
    .pm-items .col-no { width:28px; }
    .center { text-align:center !important; }
    .right { text-align:right !important; }
    .pm-total td { background:#eff6ff !important; color:#172554; font-weight:800; padding-top:8px; padding-bottom:8px; }

    .pm-terms { margin-top:12px; border:1px solid #dbe3ef; border-radius:7px; overflow:hidden; }
    .pm-section-heading { display:flex; align-items:center; gap:7px; padding:7px 9px; background:#f8fafc; border-bottom:1px solid #dbe3ef; }
    .pm-section-heading span { display:inline-flex; width:20px; height:20px; align-items:center; justify-content:center; border-radius:5px; background:#2563eb; color:#fff; font-size:6.5pt; font-weight:800; }
    .pm-section-heading strong { font-size:7.5pt; letter-spacing:.5px; }
    .pm-terms-body { padding:8px 10px; color:#475569; font-size:7.4pt; line-height:1.45; }

    /* Signature is loaded from template_surat.ttd_url and given enough space to render. */
    .pm-signature { width:205px; margin:16px 0 0 auto; text-align:center; }
    .pm-signature-label { color:#475569; font-size:7.5pt; font-weight:700; }
    .pm-signature-box {
      min-height:105px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:flex-end;
    }
    .pm-signature .signature {
      display:block;
      width:auto;
      max-width:175px;
      height:72px;
      max-height:72px;
      object-fit:contain;
      margin:1px auto 0;
    }
    .pm-signature-line { width:175px; border-bottom:1px solid #334155; margin:4px auto 4px; }
    .pm-signature-box strong { display:block; font-size:8.2pt; color:#111827; }
    .pm-signature-role { margin-top:1px; color:#64748b; font-size:7.2pt; }

    .pm-footer { margin-top:9px; padding-top:7px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; gap:15px; color:#94a3b8; font-size:6.6pt; }
    .pm-footer strong { color:#64748b; white-space:nowrap; }

    @page { size:A4 portrait; margin:0; }

    @media print {
      html,body { background:#fff !important; }
      body * { visibility:hidden !important; }
      #pmPrintPreview,#pmPrintPreview * { visibility:visible !important; }
      #pmPrintPreview { position:absolute !important; inset:0 !important; display:block !important; background:#fff !important; }
      .pm-print-toolbar { display:none !important; }
      .pm-print-scroll { overflow:visible !important; padding:0 !important; }
      .pm-a4 { width:210mm !important; min-height:297mm !important; margin:0 !important; padding:13mm 14mm 11mm !important; box-shadow:none !important; }
      .pm-items th { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .pm-top-accent,.pm-total td,.pm-info-card,.pm-event-section,.pm-section-heading,.pm-section-heading span,.pm-letterhead,.pm-logo-wrap { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    }
  `;

  document.head.appendChild(style);
})();
