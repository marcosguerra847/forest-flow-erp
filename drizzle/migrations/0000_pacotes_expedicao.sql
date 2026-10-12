CREATE TABLE public.pacotes_expedicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  token text NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  descricao text NOT NULL,
  produto_acabado_id uuid REFERENCES public.produtos_acabados(id) ON DELETE SET NULL,
  cliente_nome text,
  qtd_blocos integer NOT NULL DEFAULT 0,
  qtd_pecas integer NOT NULL DEFAULT 0,
  volume_m3 numeric NOT NULL DEFAULT 0,
  qtd_blocos_expedida integer,
  qtd_pecas_expedida integer,
  volume_expedido_m3 numeric,
  status text NOT NULL DEFAULT 'pronto',
  operador_nome text,
  expedido_em timestamptz,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacotes_expedicao TO authenticated;
GRANT ALL ON public.pacotes_expedicao TO service_role;
ALTER TABLE public.pacotes_expedicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON public.pacotes_expedicao FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write" ON public.pacotes_expedicao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_px_upd BEFORE UPDATE ON public.pacotes_expedicao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();