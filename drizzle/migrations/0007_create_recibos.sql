CREATE TABLE public.recibos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 numero text NOT NULL,
 cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
 cliente_nome text NOT NULL,
 cliente_documento text,
 cliente_endereco text,
 valor numeric NOT NULL DEFAULT 0,
 data_pagamento date NOT NULL,
 referencia text NOT NULL DEFAULT '',
 forma_pagamento text NOT NULL DEFAULT '',
 documento_fiscal text,
 observacoes text,
 criado_por uuid DEFAULT auth.uid(),
 criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibos TO authenticated;
GRANT ALL ON public.recibos TO service_role;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
CREATE POLICY recibos_read ON public.recibos FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(),ARRAY['admin','gestor','comercial']::public.app_role[]));
CREATE POLICY recibos_insert ON public.recibos FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid(),ARRAY['admin','gestor','comercial']::public.app_role[]));
CREATE POLICY recibos_update ON public.recibos FOR UPDATE TO authenticated USING (public.has_any_role(auth.uid(),ARRAY['admin','gestor','comercial']::public.app_role[]));
CREATE POLICY recibos_delete ON public.recibos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));