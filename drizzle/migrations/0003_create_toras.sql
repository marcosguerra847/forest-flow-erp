CREATE TABLE public.toras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  especie text NOT NULL DEFAULT 'Eucalipto',
  diametro_cm numeric NOT NULL,
  comprimento_m numeric NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  volume_m3 numeric NOT NULL DEFAULT 0,
  valor numeric,
  patio text,
  entrada_em date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'em_patio',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.toras TO authenticated;
GRANT ALL ON public.toras TO service_role;
ALTER TABLE public.toras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "toras_select" ON public.toras FOR SELECT TO authenticated USING (true);
CREATE POLICY "toras_insert" ON public.toras FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::public.app_role[]));
CREATE POLICY "toras_update" ON public.toras FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::public.app_role[])) WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::public.app_role[]));
CREATE POLICY "toras_delete" ON public.toras FOR DELETE TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::public.app_role[]));