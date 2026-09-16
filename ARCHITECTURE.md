# Priangan Multimedia — Architecture & Maintenance Contract

Last audited: 2026-09-16

## 1. Source of truth

- **Production database:** Supabase project `iwpnectwkrchjirxakbt`.
- **Database change history:** `supabase_migrations/` in GitHub. Never edit old migrations; create a new migration for every schema/view/function/trigger change.
- **Current schema reference:** `supabase_schema.sql`. This is a readable production-schema contract, not a substitute for migration history.
- **Frontend entry point:** `index.html`.
- **Supabase client/bootstrap:** `js/config.js` + `js/app.js`.

## 2. Domain ownership

| Domain | Authoritative file | Responsibility |
|---|---|---|
| App shell/navigation | `js/app.js` | bootstrap, shared DB client, routing, global state |
| Master Harga | `js/master-cost-fix.js` | master item CRUD, sell price, cost, package contents |
| Quotation calculation/rendering | `js/quotation-runtime-canonical-v2.js` | quotation item state, calculation, picker, drawing, preview |
| Quotation UI extensions | `js/quotation-ui-canonical.js` | negotiated-price editor, LED set/level, item discount, UI enhancement |
| Quotation persistence | `js/quotation-save-final.js` | the only quotation save path |
| Quotation history | `js/history-actions-runtime-fix.js` | list, edit, publish, delete, payment actions |
| Package detail UI | `js/package-detail-ui.js` | display `master_harga.isi_paket` |
| Invoice | `js/invoice.js` | invoice behavior |
| Finance | `js/finance.js` | finance UI/reporting |
| Template/document | `js/customer-document-canonical.js`, `js/ttd-upload-fix.js` | document/template support |

## 3. Quotation pricing contract

1. Selecting an item from `master_harga` copies the current master selling price into the new quotation item.
2. Once the item exists in a quotation, `penawaran_items.harga` / `harga_jual` is the **negotiated quotation price**.
3. Editing `master_harga.harga_jual` must never update existing `penawaran_items`.
4. Reopening a quotation must hydrate `harga` from `penawaran_items`, never from `master_harga`.
5. The save controller writes the negotiated value from `window.items` to both `penawaran_items.harga` and `penawaran_items.harga_jual`.
6. `penawaran_items.harga_modal` is a historical cost snapshot. Finance views must use that snapshot, not the current master cost.
7. `master_harga` is a catalog/default-price source; it is not the historical source of truth for an already-saved quotation.

## 4. Bug-fix rule

Before creating any new JS file:

1. Identify the domain owner in this document.
2. Search for the existing controller/function that owns the behavior.
3. Fix the authoritative module instead of adding a wrapper/patch.
4. If ownership is duplicated, consolidate it first.
5. Add or update the corresponding migration when the database contract changes.
6. Verify the production database after every migration.

Do **not** create files named `*-fix.js`, `*-final.js`, `*-v2.js`, `*-patch.js`, or similar for an existing domain unless there is a documented architectural reason.

## 5. Database rules

- Do not manually alter production schema without a migration recorded in GitHub.
- Do not modify or delete historical migration files after they have been applied.
- Keep frontend field names compatible with the actual production columns until a deliberate migration removes a legacy field.
- Use the quotation snapshot fields for historical reporting.
- Foreign keys and triggers belong to the database contract, not frontend workarounds.

## 6. Current known legacy layering

The quotation module was previously stabilized through several files whose names contain `canonical`, `final`, `fix`, and `v2`. They are now treated as the current domain modules rather than as places to add another patch. The next refactor should consolidate their responsibilities into cleanly named domain files; until that refactor is performed, do not introduce another quotation patch layer.

## 7. Verification checklist for quotation bugs

Test these paths after any quotation change:

- New quotation uses current master selling price.
- Negotiated price can be changed and saved.
- Reopen quotation preserves negotiated price.
- Changing master selling price does not change existing quotations.
- LED calculation remains width × height × negotiated price × set × days.
- Level price is stored with the quotation item.
- Item discount and global discount remain separate.
- Quotation totals match the database after save.
- Historical margin remains based on the quotation's saved `harga_modal`.
