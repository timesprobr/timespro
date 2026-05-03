-- TimesPro - Módulo de Mensalidades (Planos de Assinatura)

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  frequency TEXT NOT NULL, -- 'monthly', 'quarterly', 'semiannual', 'annual'
  category TEXT NOT NULL, -- 'escolinha', 'socio-torcedor', 'outros'
  status TEXT DEFAULT 'active', -- 'active', 'inactive'
  abacate_plan_id TEXT, -- Referência para automação na AbacatePay (futuro)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Membership Access" ON membership_plans
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
