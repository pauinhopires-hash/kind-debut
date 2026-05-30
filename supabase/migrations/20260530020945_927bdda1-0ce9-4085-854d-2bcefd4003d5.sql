ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS grupo text,
  ADD COLUMN IF NOT EXISTS subgrupo text,
  ADD COLUMN IF NOT EXISTS local text,
  ADD COLUMN IF NOT EXISTS setor text,
  ADD COLUMN IF NOT EXISTS valor_unitario numeric;