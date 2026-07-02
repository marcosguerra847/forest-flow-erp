
CREATE POLICY nfa_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nf-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY nfa_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nf-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY nfa_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'nf-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
CREATE POLICY nfa_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nf-anexos' AND public.has_any_role(auth.uid(), ARRAY['admin','gestor','comercial']::app_role[]));
