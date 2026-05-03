-- Criar bucket para fotos da equipe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('staff', 'staff', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket staff
CREATE POLICY "Fotos staff publicas" ON storage.objects FOR SELECT USING (bucket_id = 'staff');
CREATE POLICY "Admin pode subir fotos staff" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'staff');
CREATE POLICY "Admin pode apagar fotos staff" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'staff');
