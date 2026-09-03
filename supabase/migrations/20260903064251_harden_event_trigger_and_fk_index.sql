-- Safe hardening: event triggers are invoked by PostgreSQL, not the browser.
-- Do not expose the SECURITY DEFINER event-trigger function as a REST RPC.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

-- Covers the foreign key used when a master-price item is joined or deleted.
create index if not exists idx_penawaran_items_master_harga_id
  on public.penawaran_items (master_harga_id);
