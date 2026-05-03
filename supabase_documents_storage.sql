-- Criar bucket para Documentos e Notas Fiscais
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket documents
CREATE POLICY "Documentos publicos" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Usuarios autenticados podem subir documentos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Usuarios autenticados podem apagar documentos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents');
