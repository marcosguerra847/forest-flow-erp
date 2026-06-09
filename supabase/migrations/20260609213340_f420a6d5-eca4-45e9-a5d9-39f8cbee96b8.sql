
-- 1) Promote existing user to admin (one-time seed)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 2) (Re)create trigger for future signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Convert restrictive FKs to CASCADE so admin can delete records
ALTER TABLE public.ordens_colheita DROP CONSTRAINT ordens_colheita_talhao_id_fkey,
  ADD CONSTRAINT ordens_colheita_talhao_id_fkey FOREIGN KEY (talhao_id) REFERENCES public.talhoes(id) ON DELETE CASCADE;

ALTER TABLE public.cargas DROP CONSTRAINT cargas_ordem_colheita_id_fkey,
  ADD CONSTRAINT cargas_ordem_colheita_id_fkey FOREIGN KEY (ordem_colheita_id) REFERENCES public.ordens_colheita(id) ON DELETE CASCADE;

ALTER TABLE public.ordens_producao DROP CONSTRAINT ordens_producao_lote_patio_id_fkey,
  ADD CONSTRAINT ordens_producao_lote_patio_id_fkey FOREIGN KEY (lote_patio_id) REFERENCES public.lotes_patio(id) ON DELETE CASCADE;

ALTER TABLE public.produtos_acabados DROP CONSTRAINT produtos_acabados_ordem_producao_id_fkey,
  ADD CONSTRAINT produtos_acabados_ordem_producao_id_fkey FOREIGN KEY (ordem_producao_id) REFERENCES public.ordens_producao(id) ON DELETE CASCADE;

-- 4) Clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  documento text,
  telefone text,
  email text,
  endereco text,
  cidade text,
  uf text,
  limite_credito numeric NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes write" ON public.clientes FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER set_updated_at_clientes BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Pedidos
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descricao text,
  qtd_itens integer NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  pagamento text,
  data date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'aberto',
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos select" ON public.pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedidos write" ON public.pedidos FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE TRIGGER set_updated_at_pedidos BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
