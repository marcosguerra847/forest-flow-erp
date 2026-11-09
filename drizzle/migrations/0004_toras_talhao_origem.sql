ALTER TABLE public.toras ADD COLUMN talhao_id uuid REFERENCES public.talhoes(id) ON DELETE SET NULL;
CREATE INDEX toras_talhao_id_idx ON public.toras(talhao_id);
COMMENT ON COLUMN public.toras.talhao_id IS 'Talhão de origem da entrada de toras; opcional para entradas sem origem informada.';