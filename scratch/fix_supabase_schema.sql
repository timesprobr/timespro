-- 1. Adiciona as colunas faltantes na tabela organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cnpj TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#84cc16',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Garante que a tabela profiles tenha as colunas necessárias
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'staff',
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Habilitar RLS nas tabelas (caso não estejam)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para ORGANIZATIONS
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON organizations;
CREATE POLICY "Permitir inserção para usuários autenticados" 
ON organizations FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura para todos" ON organizations;
CREATE POLICY "Permitir leitura para todos" 
ON organizations FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Permitir update para membros" ON organizations;
CREATE POLICY "Permitir update para membros" 
ON organizations FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = organizations.id
  )
);

-- 5. Políticas para PROFILES
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem criar seu próprio perfil" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem editar seu próprio perfil" ON profiles;
CREATE POLICY "Usuários podem editar seu próprio perfil" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);
