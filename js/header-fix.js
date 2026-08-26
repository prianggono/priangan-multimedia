/* A4 letterhead spacing fix: keep quotation number compact and separated from address. */
(function () {
  const style = document.createElement('style');
  style.id = 'pmHeaderFix';
  style.textContent = `
    .pm-letterhead .pm-brand {
      padding-right: 10px !important;
    }
    .pm-letterhead .pm-brand p {
      white-space: normal !important;
      line-height: 1.25 !important;
      overflow-wrap: anywhere !important;
    }
    .pm-letterhead .pm-doc-tag {
      min-width: 86px !important;
      width: 86px !important;
      flex: 0 0 86px !important;
      padding-left: 8px !important;
    }
    .pm-letterhead .pm-doc-tag span {
      font-size: 6.4pt !important;
      letter-spacing: 1px !important;
    }
    .pm-letterhead .pm-doc-tag strong {
      margin-top: 3px !important;
      font-size: 6.9pt !important;
      line-height: 1.15 !important;
      letter-spacing: .2px !important;
      white-space: nowrap !important;
    }
  `;
  document.head.appendChild(style);
})();
