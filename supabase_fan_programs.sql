-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela para Programas de Sócio Torcedor
CREATE TABLE IF NOT EXISTS fan_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    benefits TEXT[] DEFAULT '{}',
    plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE fan_programs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Users can view fan programs of their organization" ON fan_programs;
CREATE POLICY "Users can view fan programs of their organization"
    ON fan_programs FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage fan programs" ON fan_programs;
CREATE POLICY "Admins can manage fan programs"
    ON fan_programs FOR ALL
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Adicionar vínculo nos atletas para o programa de sócio
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS fan_program_id UUID REFERENCES fan_programs(id) ON DELETE SET NULL;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_fan_programs_updated_at ON fan_programs;
CREATE TRIGGER set_fan_programs_updated_at
    BEFORE UPDATE ON fan_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
