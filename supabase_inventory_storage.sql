-- Criar bucket para fotos do almoxarifado
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inventory', 'inventory', true) 
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket inventory
CREATE POLICY "Fotos estoque publicas" ON storage.objects FOR SELECT USING (bucket_id = 'inventory');
CREATE POLICY "Admin pode subir fotos estoque" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inventory');
CREATE POLICY "Admin pode apagar fotos estoque" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'inventory');
