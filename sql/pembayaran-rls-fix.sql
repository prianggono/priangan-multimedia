-- PRIANGAN MULTIMEDIA
-- FIX TOTAL akses pembayaran_penawaran untuk web app (anon + authenticated)
-- Jalankan SELURUH script ini sekali di Supabase SQL Editor.

BEGIN;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pembayaran_penawaran TO anon, authenticated;

DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('public.pembayaran_penawaran', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO anon, authenticated', seq_name);
  END IF;
END $$;

ALTER TABLE public.pembayaran_penawaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm pembayaran select" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran insert" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran update" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran delete" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pembayaran_select" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pembayaran_insert" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pembayaran_update" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pembayaran_delete" ON public.pembayaran_penawaran;

CREATE POLICY "pm pembayaran select"
ON public.pembayaran_penawaran FOR SELECT
TO anon, authenticated USING (true);

CREATE POLICY "pm pembayaran insert"
ON public.pembayaran_penawaran FOR INSERT
TO anon, authenticated WITH CHECK (true);

CREATE POLICY "pm pembayaran update"
ON public.pembayaran_penawaran FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "pm pembayaran delete"
ON public.pembayaran_penawaran FOR DELETE
TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';
COMMIT;
