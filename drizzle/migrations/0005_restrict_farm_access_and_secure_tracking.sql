CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.profiles(id,nome,email) VALUES(NEW.id,COALESCE(NEW.raw_user_meta_data->>'nome',split_part(NEW.email,'@',1)),NEW.email);
 RETURN NEW;
END; $$;
CREATE TABLE public.qr_acessos(codigo text PRIMARY KEY,token uuid NOT NULL DEFAULT gen_random_uuid(),criado_em timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.qr_acessos TO service_role;
REVOKE ALL ON public.qr_acessos FROM anon,authenticated;
ALTER TABLE public.qr_acessos ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.emitir_acesso_qr(_codigo text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE segredo uuid;
BEGIN
 IF NOT public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]) THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 IF NOT(EXISTS(SELECT 1 FROM public.cargas WHERE codigo=_codigo) OR EXISTS(SELECT 1 FROM public.lotes_patio WHERE codigo=_codigo) OR EXISTS(SELECT 1 FROM public.produtos_acabados WHERE codigo=_codigo) OR EXISTS(SELECT 1 FROM public.ordens_colheita WHERE codigo=_codigo) OR EXISTS(SELECT 1 FROM public.ordens_producao WHERE codigo=_codigo)) THEN RAISE EXCEPTION 'Código não encontrado'; END IF;
 INSERT INTO public.qr_acessos(codigo) VALUES(_codigo) ON CONFLICT(codigo) DO NOTHING;
 SELECT token INTO segredo FROM public.qr_acessos WHERE codigo=_codigo;
 RETURN segredo;
END; $$;
REVOKE ALL ON FUNCTION public.emitir_acesso_qr(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.emitir_acesso_qr(text) TO authenticated,service_role;
DO $policies$
DECLARE t text; p record; allowed text; write_rule text;
BEGIN
 FOREACH t IN ARRAY ARRAY['cargas','divergencias','fazendas','inventario_parcelas','lotes_patio','movimentacoes','ordens_colheita','ordens_producao','produtos_acabados','recebimentos_patio','talhoes','toras','clientes','pedidos','orcamentos','contas_bancarias','contas_financeiras','movimentacoes_caixa','notas_fiscais','centros_custo','pacotes_expedicao','itens_romaneio'] LOOP
  allowed:=CASE WHEN t=ANY(ARRAY['clientes','pedidos','orcamentos','contas_bancarias','contas_financeiras','movimentacoes_caixa','notas_fiscais','centros_custo']) THEN 'public.has_any_role(auth.uid(),ARRAY[''admin'',''gestor'',''comercial'']::public.app_role[])' WHEN t=ANY(ARRAY['pacotes_expedicao','itens_romaneio']) THEN 'public.has_any_role(auth.uid(),ARRAY[''admin'',''gestor'',''patio'',''serraria'',''comercial'']::public.app_role[])' ELSE 'public.has_any_role(auth.uid(),ARRAY[''admin'',''gestor'',''campo'',''patio'',''serraria'',''comercial'']::public.app_role[])' END;
  write_rule:=NULL;
  FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   IF p.cmd='ALL' AND p.qual IS NOT NULL AND p.qual<>'true' THEN write_rule:=p.qual; END IF;
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  IF write_rule IS NULL THEN write_rule:=CASE WHEN t='toras' THEN 'public.has_any_role(auth.uid(),ARRAY[''admin'',''gestor'',''patio'',''serraria'']::public.app_role[])' ELSE allowed END; END IF;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',t);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY approved_read ON public.%I FOR SELECT TO authenticated USING (%s)',t,allowed);
  EXECUTE format('CREATE POLICY approved_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',t,write_rule);
  EXECUTE format('CREATE POLICY approved_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',t,write_rule,write_rule);
  EXECUTE format('CREATE POLICY admin_delete ON public.%I FOR DELETE TO authenticated USING(public.has_role(auth.uid(),''admin''::public.app_role))',t);
 END LOOP;
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN('profiles','eventos_qr','codigos_seq') LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename); END LOOP;
END; $policies$;
REVOKE ALL ON public.profiles,public.user_roles,public.eventos_qr,public.codigos_seq,public.audit_log FROM anon;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
CREATE POLICY events_read ON public.eventos_qr FOR SELECT TO authenticated USING(public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]));
CREATE POLICY events_insert ON public.eventos_qr FOR INSERT TO authenticated WITH CHECK(usuario_id=auth.uid() AND public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]));
CREATE POLICY events_delete ON public.eventos_qr FOR DELETE TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE POLICY codes_read ON public.codigos_seq FOR SELECT TO authenticated USING(public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]));
CREATE OR REPLACE FUNCTION public.proximo_codigo(_prefixo text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ano integer:=EXTRACT(YEAR FROM now())::int; _next integer;
BEGIN
 IF NOT public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]) THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 IF _prefixo NOT IN('OC','CG','LP','OP','PA','DV','ORC','TR','PX') THEN RAISE EXCEPTION 'Prefixo inválido'; END IF;
 INSERT INTO public.codigos_seq(prefixo,ano,ultimo) VALUES(_prefixo,_ano,1) ON CONFLICT(prefixo) DO UPDATE SET ultimo=CASE WHEN public.codigos_seq.ano=_ano THEN public.codigos_seq.ultimo+1 ELSE 1 END,ano=_ano RETURNING ultimo INTO _next;
 RETURN _prefixo||'-'||_ano::text||'-'||lpad(_next::text,4,'0');
END; $$;
REVOKE ALL ON FUNCTION public.proximo_codigo(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.proximo_codigo(text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role),public.has_any_role(uuid,public.app_role[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role),public.has_any_role(uuid,public.app_role[]) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.handle_new_user(),public.audit_trigger(),public.detectar_divergencia(),public.set_updated_at() FROM PUBLIC,anon,authenticated;
DROP POLICY IF EXISTS qr_eventos_read_all ON storage.objects;
DROP POLICY IF EXISTS qr_eventos_public_select ON storage.objects;
DROP POLICY IF EXISTS qr_eventos_upload_auth ON storage.objects;
DROP POLICY IF EXISTS qr_eventos_public_insert_entrega ON storage.objects;
CREATE POLICY qr_staff_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='qr-eventos' AND public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]));
CREATE POLICY qr_staff_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='qr-eventos' AND owner_id=auth.uid()::text AND public.has_any_role(auth.uid(),ARRAY['admin','gestor','campo','patio','serraria','comercial']::public.app_role[]));