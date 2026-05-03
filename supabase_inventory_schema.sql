-- Categorias do Almoxarifado
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Itens do Almoxarifado
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  photo_url TEXT,
  min_stock INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('consumable', 'returnable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Movimentações do Almoxarifado
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'return')),
  quantity INTEGER NOT NULL,
  amount DECIMAL(12,2), -- Apenas para entradas
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  nf_url TEXT, -- Apenas para entradas
  responsible_name TEXT NOT NULL,
  destination TEXT, -- Apenas para saídas
  returned_by TEXT, -- Apenas para devoluções
  is_pending_return BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas Tenant
CREATE POLICY "Tenant Data Access" ON inventory_categories
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant Data Access" ON inventory_items
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant Data Access" ON inventory_transactions
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
