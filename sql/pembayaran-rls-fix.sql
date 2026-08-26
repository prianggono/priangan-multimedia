-- PRIANGAN MULTIMEDIA
-- Fix RLS for pembayaran_penawaran used by the web app with Supabase anon key.
-- Run this once in Supabase SQL Editor.

ALTER TABLE public.pembayaran_penawaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pm pembayaran select" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran insert" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran update" ON public.pembayaran_penawaran;
DROP POLICY IF EXISTS "pm pembayaran delete" ON public.pembayaran_penawaran;

CREATE POLICY "pm pembayaran select"
ON public.pembayaran_penawaran
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "pm pembayaran insert"
ON public.pembayaran_penawaran
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "pm pembayaran update"
ON public.pembayaran_penawaran
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "pm pembayaran delete"
ON public.pembayaran_penawaran
FOR DELETE
TO anon, authenticated
USING (true);

-- Reload PostgREST schema cache so the web app immediately sees the table/policies.
NOTIFY pgrst, 'reload schema';
