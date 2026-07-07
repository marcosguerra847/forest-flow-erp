
-- Adiciona campos de confirmação de entrega em cargas
ALTER TABLE public.cargas
  ADD COLUMN IF NOT EXISTS recebedor_nome text,
  ADD COLUMN IF NOT EXISTS entregue_em timestamptz;

-- Bucket qr-eventos: permitir upload anônimo apenas para o caminho reservado à confirmação de entrega
-- (evita expor upload amplo). Se já houver policies, esta é adicional.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='qr_eventos_public_insert_entrega'
  ) THEN
    CREATE POLICY "qr_eventos_public_insert_entrega"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'qr-eventos' AND (name LIKE 'entregas/%'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='qr_eventos_public_select'
  ) THEN
    CREATE POLICY "qr_eventos_public_select"
      ON storage.objects
      FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'qr-eventos');
  END IF;
END $$;
