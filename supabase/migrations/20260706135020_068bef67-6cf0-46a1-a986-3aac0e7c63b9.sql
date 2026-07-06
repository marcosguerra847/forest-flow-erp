
-- Tabela unificada de eventos do QR Code (timeline de rastreabilidade)
CREATE TABLE IF NOT EXISTS public.eventos_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  tipo TEXT NOT NULL, -- OC, CG, LP, OP, PA, DV, BV
  etapa TEXT NOT NULL, -- colhido, carregado, em_transporte, recebido, conferido, armazenado, em_producao, serrado, disponivel, reservado, vendido, em_entrega, entregue, outro
  descricao TEXT,
  observacao TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nome TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  foto_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eventos_qr_codigo ON public.eventos_qr(codigo);
CREATE INDEX IF NOT EXISTS idx_eventos_qr_criado_em ON public.eventos_qr(criado_em DESC);

GRANT SELECT ON public.eventos_qr TO anon;
GRANT SELECT, INSERT ON public.eventos_qr TO authenticated;
GRANT ALL ON public.eventos_qr TO service_role;

ALTER TABLE public.eventos_qr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_qr_public_select"
  ON public.eventos_qr FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "eventos_qr_auth_insert"
  ON public.eventos_qr FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "eventos_qr_admin_delete"
  ON public.eventos_qr FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Permitir leitura pública das tabelas necessárias para a página /r/{codigo}
-- (apenas SELECT, sem expor dados sensíveis)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cargas' AND policyname='cargas_public_read_by_codigo') THEN
    CREATE POLICY "cargas_public_read_by_codigo" ON public.cargas FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ordens_colheita' AND policyname='oc_public_read') THEN
    CREATE POLICY "oc_public_read" ON public.ordens_colheita FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='lotes_patio' AND policyname='lp_public_read') THEN
    CREATE POLICY "lp_public_read" ON public.lotes_patio FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ordens_producao' AND policyname='op_public_read') THEN
    CREATE POLICY "op_public_read" ON public.ordens_producao FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='produtos_acabados' AND policyname='pa_public_read') THEN
    CREATE POLICY "pa_public_read" ON public.produtos_acabados FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fazendas' AND policyname='fazendas_public_read') THEN
    CREATE POLICY "fazendas_public_read" ON public.fazendas FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='talhoes' AND policyname='talhoes_public_read') THEN
    CREATE POLICY "talhoes_public_read" ON public.talhoes FOR SELECT TO anon USING (true);
  END IF;
END $$;

GRANT SELECT ON public.cargas, public.ordens_colheita, public.lotes_patio,
                 public.ordens_producao, public.produtos_acabados,
                 public.fazendas, public.talhoes TO anon;
