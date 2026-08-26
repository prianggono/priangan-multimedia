-- Priangan Multimedia: normalize penawaran_jadwal to the live item_id contract.
-- Safe to run repeatedly.

alter table public.penawaran_jadwal
  add column if not exists item_id bigint;

-- Preserve existing schedule relationships when the older column exists.
update public.penawaran_jadwal
set item_id = coalesce(item_id, penawaran_item_id)
where item_id is null;

-- Keep the legacy column for compatibility with older rows/builds,
-- but the application now writes item_id as the canonical FK.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'penawaran_jadwal'
      AND column_name = 'penawaran_item_id'
  ) THEN
    ALTER TABLE public.penawaran_jadwal
      ALTER COLUMN penawaran_item_id DROP NOT NULL;
  END IF;
END $$;

-- Add the canonical FK only when it does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'penawaran_jadwal'
      AND c.conname = 'penawaran_jadwal_item_id_fkey'
  ) THEN
    ALTER TABLE public.penawaran_jadwal
      ADD CONSTRAINT penawaran_jadwal_item_id_fkey
      FOREIGN KEY (item_id)
      REFERENCES public.penawaran_items(id)
      ON DELETE CASCADE;
  END IF;
END $$;

create index if not exists idx_penawaran_jadwal_item_id
  on public.penawaran_jadwal(item_id);

notify pgrst, 'reload schema';
