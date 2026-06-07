
-- codigos_seq: somente service_role escreve; autenticado lê
DROP POLICY IF EXISTS "codigos_seq auth" ON public.codigos_seq;
REVOKE INSERT, UPDATE, DELETE ON public.codigos_seq FROM authenticated;
CREATE POLICY "codigos_seq read" ON public.codigos_seq FOR SELECT TO authenticated USING (true);

-- Revoga execução pública das funções SECURITY DEFINER novas
REVOKE EXECUTE ON FUNCTION public.proximo_codigo(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.detectar_divergencia() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_codigo(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.detectar_divergencia() TO service_role;
