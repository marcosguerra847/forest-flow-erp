ALTER TABLE public.pacotes_expedicao
  ADD COLUMN IF NOT EXISTS espessura_cm numeric,
  ADD COLUMN IF NOT EXISTS largura_cm numeric,
  ADD COLUMN IF NOT EXISTS comprimento_m numeric;