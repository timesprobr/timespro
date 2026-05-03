-- Tabela de Pastas de Documentos
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Documentos Gerenciais
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  file_type TEXT,
  file_size TEXT,
  category TEXT DEFAULT 'general', -- 'general', 'nf', 'contract', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Users can manage their organization's folders"
ON document_folders FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their organization's documents"
ON documents FOR ALL
USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
