-- ============================================================
-- PRIANGAN MULTIMEDIA — INVOICE MODULE
-- One invoice belongs to one quotation (penawaran).
-- ============================================================
BEGIN;

ALTER TABLE public.penawaran
  ADD COLUMN IF NOT EXISTS nomor_invoice text,
  ADD COLUMN IF NOT EXISTS tanggal_invoice date,
  ADD COLUMN IF NOT EXISTS jatuh_tempo date,
  ADD COLUMN IF NOT EXISTS status_invoice text NOT NULL DEFAULT 'BELUM DIBUAT',
  ADD COLUMN IF NOT EXISTS catatan_invoice text;

-- Prevent duplicate invoice numbers while allowing quotations
-- that do not have an invoice yet.
CREATE UNIQUE INDEX IF NOT EXISTS uq_penawaran_nomor_invoice
  ON public.penawaran(nomor_invoice)
  WHERE nomor_invoice IS NOT NULL AND btrim(nomor_invoice) <> '';

CREATE INDEX IF NOT EXISTS idx_penawaran_status_invoice
  ON public.penawaran(status_invoice);

CREATE INDEX IF NOT EXISTS idx_penawaran_tanggal_invoice
  ON public.penawaran(tanggal_invoice);

NOTIFY pgrst, 'reload schema';
COMMIT;

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='penawaran'
  AND column_name IN ('nomor_invoice','tanggal_invoice','jatuh_tempo','status_invoice','catatan_invoice')
ORDER BY ordinal_position;
