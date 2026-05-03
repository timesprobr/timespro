-- TimesPro - Módulo de Vaquinhas & Campanhas

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0.00,
  image_url TEXT,
  end_date TIMESTAMP WITH TIME ZONE,
  responsible_name TEXT NOT NULL,
  responsible_whatsapp TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'ended', 'paused'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Campaign Access" ON campaigns
  FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
