
-- ============ ENUM de papéis ============
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'campo', 'patio', 'serraria', 'comercial');

CREATE TYPE public.talhao_status AS ENUM ('em_crescimento', 'pronto_corte', 'em_corte', 'cortado', 'finalizado');
CREATE TYPE public.fazenda_status AS ENUM ('ativa', 'inativa', 'manejo');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles select all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE POLICY "user_roles select own or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGER: novo usuário cria profile + papel inicial ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FAZENDAS ============
CREATE TABLE public.fazendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  proprietario TEXT,
  local TEXT,
  area_ha NUMERIC(12,2) NOT NULL DEFAULT 0,
  car TEXT,
  status public.fazenda_status NOT NULL DEFAULT 'ativa',
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fazendas TO authenticated;
GRANT ALL ON public.fazendas TO service_role;
ALTER TABLE public.fazendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fazendas select" ON public.fazendas FOR SELECT TO authenticated USING (true);
CREATE POLICY "fazendas write" ON public.fazendas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::public.app_role[]));

-- ============ TALHÕES ============
CREATE TABLE public.talhoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id UUID NOT NULL REFERENCES public.fazendas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  especie TEXT NOT NULL,
  area_ha NUMERIC(10,2) NOT NULL DEFAULT 0,
  ano_plantio INT,
  espacamento TEXT,
  volume_estimado_m3 NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.talhao_status NOT NULL DEFAULT 'em_crescimento',
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fazenda_id, codigo)
);
CREATE INDEX talhoes_fazenda_idx ON public.talhoes(fazenda_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talhoes TO authenticated;
GRANT ALL ON public.talhoes TO service_role;
ALTER TABLE public.talhoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "talhoes select" ON public.talhoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "talhoes write" ON public.talhoes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::public.app_role[]));

-- ============ INVENTÁRIO (PARCELAS) ============
CREATE TABLE public.inventario_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talhao_id UUID NOT NULL REFERENCES public.talhoes(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  area_m2 NUMERIC(10,2) NOT NULL,
  qtd_arvores INT NOT NULL,
  dap_medio_cm NUMERIC(6,2),
  altura_media_m NUMERIC(6,2),
  arvores_por_ha NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN area_m2 > 0 THEN (qtd_arvores::NUMERIC / area_m2) * 10000 ELSE 0 END
  ) STORED,
  volume_arvore_m3 NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN dap_medio_cm IS NOT NULL AND altura_media_m IS NOT NULL
      THEN (3.14159 * (dap_medio_cm/200.0) * (dap_medio_cm/200.0)) * altura_media_m * 0.45
      ELSE 0 END
  ) STORED,
  observacoes TEXT,
  fotos TEXT[] DEFAULT ARRAY[]::TEXT[],
  responsavel_id UUID REFERENCES auth.users(id),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parcelas_talhao_idx ON public.inventario_parcelas(talhao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventario_parcelas TO authenticated;
GRANT ALL ON public.inventario_parcelas TO service_role;
ALTER TABLE public.inventario_parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcelas select" ON public.inventario_parcelas FOR SELECT TO authenticated USING (true);
CREATE POLICY "parcelas write" ON public.inventario_parcelas FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','campo']::public.app_role[]));

-- ============ AUDIT LOG ============
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  acao TEXT NOT NULL,
  usuario_id UUID,
  payload JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_tabela_reg_idx ON public.audit_log(tabela, registro_id);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_log_id_seq TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit select admin gestor" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor']::public.app_role[]));

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (tabela, registro_id, acao, usuario_id, payload)
  VALUES (TG_TABLE_NAME, COALESCE((NEW).id::text, (OLD).id::text), TG_OP, auth.uid(),
    CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER aud_fazendas AFTER INSERT OR UPDATE OR DELETE ON public.fazendas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_talhoes AFTER INSERT OR UPDATE OR DELETE ON public.talhoes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_parcelas AFTER INSERT OR UPDATE OR DELETE ON public.inventario_parcelas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END;
$$;
CREATE TRIGGER upd_fazendas BEFORE UPDATE ON public.fazendas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER upd_talhoes BEFORE UPDATE ON public.talhoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER upd_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
