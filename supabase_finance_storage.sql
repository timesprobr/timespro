-- Criar bucket para comprovantes e NFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('finance', 'finance', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket finance
CREATE POLICY "Documentos financeiros publicos" ON storage.objects FOR SELECT USING (bucket_id = 'finance');
CREATE POLICY "Admin pode subir documentos financeiros" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finance');
CREATE POLICY "Admin pode apagar documentos financeiros" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'finance');
