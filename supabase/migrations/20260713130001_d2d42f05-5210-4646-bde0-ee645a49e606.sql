
CREATE TABLE public.orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL,
  cliente_documento text,
  cliente_endereco text,
  cliente_telefone text,
  cliente_email text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_bruto numeric(14,2) NOT NULL DEFAULT 0,
  desconto numeric(14,2) NOT NULL DEFAULT 0,
  acrescimo numeric(14,2) NOT NULL DEFAULT 0,
  frete numeric(14,2) NOT NULL DEFAULT 0,
  total_liquido numeric(14,2) NOT NULL DEFAULT 0,
  forma_pagamento text,
  parcelas integer NOT NULL DEFAULT 1,
  valor_parcela numeric(14,2) NOT NULL DEFAULT 0,
  observacoes text,
  assinatura_cliente text,
  validade date,
  status text NOT NULL DEFAULT 'aberto',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamentos TO authenticated;
GRANT ALL ON public.orcamentos TO service_role;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read orcamentos" ON public.orcamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert orcamentos" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update orcamentos" ON public.orcamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete orcamentos" ON public.orcamentos FOR DELETE TO authenticated USING (true);
CREATE TRIGGER trg_orcamentos_upd BEFORE UPDATE ON public.orcamentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
