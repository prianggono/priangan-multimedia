# Priangan Multimedia — Architecture & Maintenance Contract

Last audited: 2026-09-16

## 1. Source of truth

- **Production database:** Supabase project `iwpnectwkrchjirxakbt`.
- **Database change history:** `supabase_migrations/` in GitHub. Never edit old migrations; create a new migration for every schema/view/function/trigger change.
- **Current schema reference:** `supabase_schema.sql`. This is a readable production-schema contract, not a substitute for migration history.
- **Frontend entry point:** `index.html`.
- **Supabase client/bootstrap:** `js/config.js` + `js/app.js`.
- **Business data must not depend on browser localStorage.** localStorage may be used only for non-business UI preferences/cache, never for invoice metadata, invoice items, payment state, quotation state, client state, or financial totals.

## 2. Domain ownership

| Domain | Authoritative file | Responsibility |
|---|---|---|
| App shell/navigation | `js/app.js` | bootstrap, shared DB client, routing, global state |
| Master Harga | `js/master-cost-fix.js` | master item CRUD, sell price, cost, package contents |
| Quotation calculation/rendering | `js/quotation-runtime-canonical-v2.js` | quotation item state, calculation, picker, drawing, preview |
| Quotation UI extensions | `js/quotation-ui-canonical.js` | negotiated-price editor, LED set/level, item discount, UI enhancement |
| Quotation persistence | `js/quotation-save-final.js` | client-side serialization + call to transactional DB save API |
| Quotation history | `js/history-actions-runtime-fix.js` | list, edit, publish, delete, payment actions |
| Package detail UI | `js/package-detail-ui.js` | display `master_harga.isi_paket` |
| Invoice | `js/invoice.js` | invoice list/editor, invoice extras, payment entry, preview |
| Finance | `js/finance.js` | financial reconciliation + operating expenses |
| Customer document | `js/customer-document-canonical.js` | customer-facing quotation/invoice document rendering |
| Document numbering | `js/document-numbering-final.js` | document filenames and quotation revision sourced from DB |
| Template/TTD | `js/ttd-upload-fix.js` + `js/app.js` | template assets and signature support |

## 3. End-to-end data contracts

### Quotation

1. Selecting an item from `master_harga` copies current master defaults into a **new** quotation item.
2. Once saved, `penawaran_items.harga` / `harga_jual` is the negotiated quotation price.
3. `penawaran_items.harga_modal` is the historical cost snapshot.
4. `penawaran.client_id` must point to the matching client row when a client is saved through the quotation flow.
5. Header, client linkage, item rows and schedule rows are saved through `save_penawaran_atomic(...)` so the operation commits or rolls back as one transaction.
6. Database function `hitung_penawaran(...)` is the final calculation authority for header totals and payment balance.
7. LED = width × height × negotiated price × set × days.
8. Optional Level = LED width × saved level price × set; Level is not multiplied by days.
9. Item discount is stored on the quotation item; global discount is stored on the quotation header.
10. Editing `master_harga` never updates a saved quotation item.

### Invoice

1. Invoice metadata lives in `penawaran.nomor_invoice`, `tanggal_invoice`, `jatuh_tempo`, `status_invoice`, and `catatan_invoice`.
2. Invoice additions live in `penawaran_invoice_items`.
3. Browser localStorage is **not** an invoice fallback or source of truth.
4. Invoice metadata and additions are saved through `save_invoice_atomic(...)`.
5. Invoice numbering is generated/guarded in the database; `nomor_invoice` has a unique partial index.
6. Payment records live only in `pembayaran_penawaran`.
7. When an invoice exists, payment balance includes invoice additions as part of the payable base.

### Finance

1. Realized sales come from saved quotation/invoice/payment state in Supabase.
2. Historical gross margin uses `penawaran_items.harga_modal`, not current master cost.
3. Operating expenses come from `pengeluaran_keuangan`.
4. Net operating profit = realized gross profit − operating expenses.
5. Net cash = recorded payments − operating expenses.
6. Draft invoices are not automatically treated as realized sales.

## 4. Bug-fix rule — stop regression loops

Before changing code:

1. Identify the domain owner in this document.
2. Identify the authoritative database contract involved.
3. Fix the owner, not a wrapper/patch.
4. Do not duplicate the same calculation or state in another module.
5. Run the domain verification checklist.
6. Run the end-to-end regression checklist before moving to the next domain.
7. Only then change the next domain.

**Never** create another `*-fix.js`, `*-final.js`, `*-v2.js`, or `*-patch.js` to work around a bug in an existing domain.

## 5. Database rules

- Applied migrations are immutable history.
- Every production DDL/function/trigger/view change is recorded as a new migration.
- Foreign keys, check constraints, uniqueness and calculation triggers belong to the database contract.
- Frontend code must not maintain a competing financial state in localStorage.
- Public/anonymous CRUD policies must not be relaxed to solve an application error.

## 6. Legacy cleanup status

Unused quotation-only patch files have been removed after confirming they were not loaded by `index.html`. Active domain files with legacy names remain only where they still own runtime responsibilities; no additional patch layer is allowed.

## 7. Mandatory regression gates

### Gate A — Quotation

- New quotation reads current Master Harga defaults.
- Per-item negotiated price can be changed.
- Save/reopen preserves negotiated price.
- Master price changes do not mutate existing quotations.
- LED, Level, Rigging and Qty calculations match the DB.
- Item and global discounts remain distinct.
- `client_id` is populated.
- Header total equals item subtotals after DB calculation.
- Historical modal uses saved `harga_modal`.

### Gate B — Customer document

- Surat Penawaran reads the saved quotation values.
- Client/event/date/price values match the saved quotation.
- Package contents come from `master_harga.isi_paket`.
- Level display matches the saved level price/height.
- Print/PDF filename uses the DB quotation number and DB revision.

### Gate C — Invoice

- Creating invoice reads the saved quotation from Supabase.
- Invoice number is generated once and remains stable.
- Invoice additions survive refresh and a different browser/device.
- Editing invoice does not change quotation items.
- Invoice total = quotation total + invoice additions.
- Payment entry changes the recorded balance through Supabase.
- Preview reads DB data, not localStorage.

### Gate D — Finance

- Sales, cost, gross profit and margin reconcile to Supabase.
- Payments reconcile to `pembayaran_penawaran`.
- Invoice receivable includes invoice additions.
- Operating expenses reconcile to `pengeluaran_keuangan`.
- Net operating profit and net cash reconcile mathematically.
- Draft invoices do not become realized sales.

### Gate E — Structural safety

- All JS files pass `node --check`.
- Every JS file referenced by `index.html` exists.
- No removed legacy file is referenced by `index.html`.
- No domain introduces a competing source of truth.
- RLS/auth changes are tested separately from business-logic changes.

## 8. Authentication / RLS rollout

The database currently has zero Supabase Auth users. RLS is intentionally treated as a separate controlled rollout because enabling authenticated-only policies before an administrator account exists would lock the application out.

The target model is: authenticated user → explicit application access → table/view policies. Do not solve this by reopening public CRUD policies. The authentication rollout must be completed and verified as its own migration/change set before production access control is declared green.
