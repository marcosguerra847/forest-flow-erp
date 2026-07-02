
-- Centros de custo
CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('colheita','transporte','serraria','administrativo','comercial')),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.centros_custo TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY cc_read ON public.centros_custo FOR SELECT TO authenticated USING (true);
CREATE POLICY cc_write ON public.centros_custo FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::app_role[]));

INSERT INTO public.centros_custo (nome, tipo) VALUES
  ('Colheita','colheita'),
  ('Transporte','transporte'),
  ('Serraria','serraria'),
  ('Administrativo','administrativo'),
  ('Comercial','comercial')
ON CONFLICT (nome) DO NOTHING;

-- Contas bancárias
CREATE TABLE public.contas_bancarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco text NOT NULL,
  agencia text,
  conta text,
  tipo text NOT NULL DEFAULT 'corrente' CHECK (tipo IN ('corrente','poupanca','caixa','outro')),
  saldo_inicial numeric(14,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_bancarias TO authenticated;
GRANT ALL ON public.contas_bancarias TO service_role;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY cb_read ON public.contas_bancarias FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY cb_write ON public.contas_bancarias FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER trg_cb_updated BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ampliar notas_fiscais
ALTER TABLE public.notas_fiscais
  ADD COLUMN IF NOT EXISTS cfop text,
  ADD COLUMN IF NOT EXISTS natureza_operacao text,
  ADD COLUMN IF NOT EXISTS base_icms numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_icms numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ipi numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xml_url text,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL;

-- Ampliar contas_financeiras
ALTER TABLE public.contas_financeiras
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

-- Ampliar movimentacoes_caixa
ALTER TABLE public.movimentacoes_caixa
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conta_bancaria_id uuid REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conciliado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_mc_conciliado ON public.movimentacoes_caixa (conciliado_em);
CREATE INDEX IF NOT EXISTS idx_mc_cb ON public.movimentacoes_caixa (conta_bancaria_id);
CREATE INDEX IF NOT EXISTS idx_cf_cc ON public.contas_financeiras (centro_custo_id);
