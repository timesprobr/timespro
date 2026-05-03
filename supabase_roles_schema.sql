-- 1. Tabela de Cargos vinculada ao Departamento
CREATE TABLE IF NOT EXISTS staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES staff_departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Atualizando Staff para referenciar o Cargo
ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

-- 3. Habilitar RLS para Cargos
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Data Access" ON staff_roles
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
