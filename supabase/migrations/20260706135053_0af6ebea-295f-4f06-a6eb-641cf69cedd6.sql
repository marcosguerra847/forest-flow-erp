
CREATE POLICY "qr_eventos_read_all" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'qr-eventos');

CREATE POLICY "qr_eventos_upload_auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'qr-eventos');

CREATE POLICY "qr_eventos_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'qr-eventos' AND public.has_role(auth.uid(), 'admin'));
