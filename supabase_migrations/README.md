# Supabase migration lineage

Audited: 2026-09-16 against production project `iwpnectwkrchjirxakbt`.

## Rule

Production migration history is immutable. New database changes must be added as a new migration in this directory and applied to Supabase through the migration workflow.

## Production versions verified

- 20260903042402 — cleanup_redundant_index_and_integrity
- 20260903042431 — remove_orphan_payments
- 20260903042500 — harden_public_database
- 20260903064251 — harden_event_trigger_and_fk_index
- 20260904092812 — create_vendors_table
- 20260904094352 — add_pengeluaran_keuangan
- 20260904164716 — add_invoice_fields_to_penawaran
- 20260905051854 — harden_invoice_extras_and_discount_integrity
- 20260905052059 — clean_duplicate_rls_and_harden_discount_trigger
- 20260905052138 — fix_discount_trigger_legacy_insert
- 20260914181301 — add_item_discount_fields
- 20260914185146 — fix_per_item_discount_calculation
- 20260915054310 — add_led_level_fields_to_quote_items
- 20260915055741 — add_led_level_fields_to_penawaran_items
- 20260916041847 — remove_verified_unused_indexes
- 20260916043437 — 20260916_preserve_quote_cost_snapshot

The repository contains older manually named migration files from August 2026. Several production migrations above were created/applied outside the current repository history and their original SQL text is not available through the production migration metadata alone. They are **not fabricated here**.

The current production contract is captured in `../supabase_schema.sql`, and the latest forward migration is committed here. If the repository is ever reconstructed from scratch, use the schema contract as the baseline and then apply only migrations created after this audit.
