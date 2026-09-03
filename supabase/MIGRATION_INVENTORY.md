# Supabase migration inventory

This repository is the source of truth for schema changes from 2026-09-03 onward.

## Applied in Supabase

| Version | Name | Repository status |
| --- | --- | --- |
| 20260903042402 | cleanup_redundant_index_and_integrity | Applied before repository migration tracking; SQL must be exported from the original source before replaying elsewhere. |
| 20260903042431 | remove_orphan_payments | Applied before repository migration tracking; SQL must be exported from the original source before replaying elsewhere. |
| 20260903042500 | harden_public_database | Applied before repository migration tracking; SQL must be exported from the original source before replaying elsewhere. |
| 20260903064251 | harden_event_trigger_and_fk_index | Stored at `migrations/20260903064251_harden_event_trigger_and_fk_index.sql`. |

Do not fabricate historical migration SQL. Add every future database change as a reviewed file in `supabase/migrations/` before applying it.
