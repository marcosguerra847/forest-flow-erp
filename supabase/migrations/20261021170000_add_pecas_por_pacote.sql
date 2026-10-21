
ALTER TABLE public.pacotes_expedicao
ADD COLUMN IF NOT EXISTS pecas_por_pacote INTEGER;

NOTIFY pgrst, 'reload schema';
