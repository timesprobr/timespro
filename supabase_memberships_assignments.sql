-- Tabela de Atribuições de Mensalidade
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'overdue'
  next_billing_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(athlete_id, plan_id)
);

-- RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Membership Assignments" ON memberships
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
