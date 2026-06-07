
-- ============ ENUMS ============
CREATE TYPE public.oc_status AS ENUM ('aberta','em_execucao','concluida','cancelada');
CREATE TYPE public.carga_status AS ENUM ('em_transito','recebida','divergente','cancelada');
CREATE TYPE public.op_status AS ENUM ('aberta','em_execucao','concluida','cancelada');
CREATE TYPE public.divergencia_status AS ENUM ('aberta','justificada','resolvida');
CREATE TYPE public.lote_status AS ENUM ('disponivel','em_producao','consumido');

-- ============ SEQUÊNCIA DE CÓDIGOS ============
CREATE TABLE public.codigos_seq (
  prefixo text PRIMARY KEY,
  ano integer NOT NULL,
  ultimo integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.codigos_seq TO service_role;
GRANT SELECT, UPDATE, INSERT ON public.codigos_seq TO authenticated;
ALTER TABLE public.codigos_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codigos_seq auth" ON public.codigos_seq FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.proximo_codigo(_prefixo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ano integer := EXTRACT(YEAR FROM now())::int;
  _next integer;
BEGIN
  INSERT INTO public.codigos_seq(prefixo, ano, ultimo) VALUES (_prefixo, _ano, 1)
    ON CONFLICT (prefixo) DO UPDATE
      SET ultimo = CASE WHEN public.codigos_seq.ano = _ano THEN public.codigos_seq.ultimo + 1 ELSE 1 END,
          ano = _ano
    RETURNING ultimo INTO _next;
  RETURN _prefixo || '-' || _ano::text || '-' || lpad(_next::text, 4, '0');
END;
$$;

-- ============ ORDENS DE COLHEITA ============
CREATE TABLE public.ordens_colheita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  talhao_id uuid NOT NULL REFERENCES public.talhoes(id) ON DELETE RESTRICT,
  volume_previsto_m3 numeric NOT NULL DEFAULT 0,
  volume_colhido_m3 numeric NOT NULL DEFAULT 0,
  data_abertura date NOT NULL DEFAULT CURRENT_DATE,
  data_conclusao date,
  responsavel_id uuid,
  status public.oc_status NOT NULL DEFAULT 'aberta',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_colheita TO authenticated;
GRANT ALL ON public.ordens_colheita TO service_role;
ALTER TABLE public.ordens_colheita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oc select" ON public.ordens_colheita FOR SELECT TO authenticated USING (true);
CREATE POLICY "oc write" ON public.ordens_colheita FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo']::app_role[]));
CREATE TRIGGER set_oc_upd BEFORE UPDATE ON public.ordens_colheita FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_oc AFTER INSERT OR UPDATE OR DELETE ON public.ordens_colheita FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============ CARGAS ============
CREATE TABLE public.cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  ordem_colheita_id uuid NOT NULL REFERENCES public.ordens_colheita(id) ON DELETE RESTRICT,
  placa_veiculo text,
  motorista text,
  volume_carregado_m3 numeric NOT NULL DEFAULT 0,
  qtd_toras integer NOT NULL DEFAULT 0,
  gps_origem text,
  data_saida timestamptz NOT NULL DEFAULT now(),
  data_recebimento timestamptz,
  status public.carga_status NOT NULL DEFAULT 'em_transito',
  observacoes text,
  fotos text[] NOT NULL DEFAULT ARRAY[]::text[],
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargas TO authenticated;
GRANT ALL ON public.cargas TO service_role;
ALTER TABLE public.cargas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargas select" ON public.cargas FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargas write" ON public.cargas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo','patio']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo','patio']::app_role[]));
CREATE TRIGGER set_cargas_upd BEFORE UPDATE ON public.cargas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_cargas AFTER INSERT OR UPDATE OR DELETE ON public.cargas FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE INDEX idx_cargas_status ON public.cargas(status);
CREATE INDEX idx_cargas_oc ON public.cargas(ordem_colheita_id);

-- ============ LOTES DO PÁTIO ============
CREATE TABLE public.lotes_patio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  carga_id uuid REFERENCES public.cargas(id) ON DELETE SET NULL,
  talhao_id uuid REFERENCES public.talhoes(id) ON DELETE SET NULL,
  volume_m3 numeric NOT NULL DEFAULT 0,
  qtd_toras integer NOT NULL DEFAULT 0,
  especie text,
  localizacao text,
  status public.lote_status NOT NULL DEFAULT 'disponivel',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes_patio TO authenticated;
GRANT ALL ON public.lotes_patio TO service_role;
ALTER TABLE public.lotes_patio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lotes select" ON public.lotes_patio FOR SELECT TO authenticated USING (true);
CREATE POLICY "lotes write" ON public.lotes_patio FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::app_role[]));
CREATE TRIGGER set_lotes_upd BEFORE UPDATE ON public.lotes_patio FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_lotes AFTER INSERT OR UPDATE OR DELETE ON public.lotes_patio FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============ RECEBIMENTOS NO PÁTIO ============
CREATE TABLE public.recebimentos_patio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id uuid NOT NULL UNIQUE REFERENCES public.cargas(id) ON DELETE CASCADE,
  volume_recebido_m3 numeric NOT NULL DEFAULT 0,
  qtd_toras_recebida integer NOT NULL DEFAULT 0,
  divergencia_volume_m3 numeric NOT NULL DEFAULT 0,
  divergencia_toras integer NOT NULL DEFAULT 0,
  conferente_id uuid,
  data timestamptz NOT NULL DEFAULT now(),
  observacoes text,
  fotos text[] NOT NULL DEFAULT ARRAY[]::text[],
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimentos_patio TO authenticated;
GRANT ALL ON public.recebimentos_patio TO service_role;
ALTER TABLE public.recebimentos_patio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec select" ON public.recebimentos_patio FOR SELECT TO authenticated USING (true);
CREATE POLICY "rec write" ON public.recebimentos_patio FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio']::app_role[]));
CREATE TRIGGER audit_rec AFTER INSERT OR UPDATE OR DELETE ON public.recebimentos_patio FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============ DIVERGÊNCIAS ============
CREATE TABLE public.divergencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  carga_id uuid REFERENCES public.cargas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  diferenca numeric,
  justificativa text,
  status public.divergencia_status NOT NULL DEFAULT 'aberta',
  resolvido_por uuid,
  resolvido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.divergencias TO authenticated;
GRANT ALL ON public.divergencias TO service_role;
ALTER TABLE public.divergencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "div select" ON public.divergencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "div write" ON public.divergencias FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio']::app_role[]));

-- Trigger: detecta divergência automaticamente ao inserir/atualizar recebimento
CREATE OR REPLACE FUNCTION public.detectar_divergencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _carga RECORD;
  _div_vol numeric;
  _div_toras integer;
BEGIN
  SELECT * INTO _carga FROM public.cargas WHERE id = NEW.carga_id;
  _div_vol := COALESCE(NEW.volume_recebido_m3,0) - COALESCE(_carga.volume_carregado_m3,0);
  _div_toras := COALESCE(NEW.qtd_toras_recebida,0) - COALESCE(_carga.qtd_toras,0);
  NEW.divergencia_volume_m3 := _div_vol;
  NEW.divergencia_toras := _div_toras;

  IF abs(_div_vol) > 0.05 OR _div_toras <> 0 THEN
    UPDATE public.cargas SET status = 'divergente', data_recebimento = NEW.data WHERE id = NEW.carga_id;
    INSERT INTO public.divergencias(codigo, carga_id, tipo, descricao, diferenca)
    VALUES (public.proximo_codigo('DV'), NEW.carga_id,
            CASE WHEN abs(_div_vol) > 0.05 THEN 'volume' ELSE 'toras' END,
            'Divergência detectada no recebimento da carga ' || _carga.codigo ||
              ' — volume: ' || _div_vol || ' m³, toras: ' || _div_toras,
            _div_vol);
  ELSE
    UPDATE public.cargas SET status = 'recebida', data_recebimento = NEW.data WHERE id = NEW.carga_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detectar_divergencia
  BEFORE INSERT OR UPDATE ON public.recebimentos_patio
  FOR EACH ROW EXECUTE FUNCTION public.detectar_divergencia();

-- ============ ORDENS DE PRODUÇÃO ============
CREATE TABLE public.ordens_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  lote_patio_id uuid NOT NULL REFERENCES public.lotes_patio(id) ON DELETE RESTRICT,
  volume_entrada_m3 numeric NOT NULL DEFAULT 0,
  volume_produzido_m3 numeric NOT NULL DEFAULT 0,
  volume_perda_m3 numeric NOT NULL DEFAULT 0,
  rendimento_pct numeric GENERATED ALWAYS AS (
    CASE WHEN volume_entrada_m3 > 0 THEN (volume_produzido_m3 / volume_entrada_m3) * 100 ELSE 0 END
  ) STORED,
  responsavel_id uuid,
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  status public.op_status NOT NULL DEFAULT 'aberta',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_producao TO authenticated;
GRANT ALL ON public.ordens_producao TO service_role;
ALTER TABLE public.ordens_producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "op select" ON public.ordens_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "op write" ON public.ordens_producao FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','serraria']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','serraria']::app_role[]));
CREATE TRIGGER set_op_upd BEFORE UPDATE ON public.ordens_producao FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER audit_op AFTER INSERT OR UPDATE OR DELETE ON public.ordens_producao FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============ PRODUTOS ACABADOS ============
CREATE TABLE public.produtos_acabados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  ordem_producao_id uuid NOT NULL REFERENCES public.ordens_producao(id) ON DELETE RESTRICT,
  descricao text NOT NULL,
  dimensoes text,
  qtd_pecas integer NOT NULL DEFAULT 0,
  volume_m3 numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'em_estoque',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos_acabados TO authenticated;
GRANT ALL ON public.produtos_acabados TO service_role;
ALTER TABLE public.produtos_acabados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa select" ON public.produtos_acabados FOR SELECT TO authenticated USING (true);
CREATE POLICY "pa write" ON public.produtos_acabados FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','serraria']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','serraria']::app_role[]));
CREATE TRIGGER audit_pa AFTER INSERT OR UPDATE OR DELETE ON public.produtos_acabados FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============ MOVIMENTAÇÕES ============
CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_patio_id uuid REFERENCES public.lotes_patio(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  volume_m3 numeric NOT NULL DEFAULT 0,
  origem text,
  destino text,
  responsavel_id uuid,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes TO authenticated;
GRANT ALL ON public.movimentacoes TO service_role;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov select" ON public.movimentacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "mov write" ON public.movimentacoes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','patio','serraria']::app_role[]));
