
-- Notas Fiscais
CREATE TABLE public.notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  serie TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  fornecedor TEXT,
  carga_id UUID REFERENCES public.cargas(id) ON DELETE SET NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  chave_acesso TEXT,
  status TEXT NOT NULL DEFAULT 'emitida',
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notas_fiscais TO authenticated;
GRANT ALL ON public.notas_fiscais TO service_role;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_nf_read" ON public.notas_fiscais FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY "fin_nf_write" ON public.notas_fiscais FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER trg_nf_updated BEFORE UPDATE ON public.notas_fiscais FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contas a pagar/receber
CREATE TABLE public.contas_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('pagar','receber')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','vencido','cancelado')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  fornecedor TEXT,
  nf_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_financeiras TO authenticated;
GRANT ALL ON public.contas_financeiras TO service_role;
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_cf_read" ON public.contas_financeiras FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY "fin_cf_write" ON public.contas_financeiras FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER trg_cf_updated BEFORE UPDATE ON public.contas_financeiras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fluxo de caixa
CREATE TABLE public.movimentacoes_caixa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  conta_id UUID REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_caixa TO authenticated;
GRANT ALL ON public.movimentacoes_caixa TO service_role;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_mc_read" ON public.movimentacoes_caixa FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY "fin_mc_write" ON public.movimentacoes_caixa FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER trg_mc_updated BEFORE UPDATE ON public.movimentacoes_caixa FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
