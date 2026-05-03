-- 1. Tabela de Departamentos
CREATE TABLE IF NOT EXISTS staff_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela Staff (Criando do zero para evitar erros)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES staff_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Membro',
  birth_date DATE,
  gender TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS (Segurança)
ALTER TABLE staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso (Multi-tenant)
DROP POLICY IF EXISTS "Tenant Data Access" ON staff_departments;
CREATE POLICY "Tenant Data Access" ON staff_departments
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant Data Access" ON staff;
CREATE POLICY "Tenant Data Access" ON staff
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
