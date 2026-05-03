-- 1. Categorias Financeiras (Estrutura)
CREATE TABLE IF NOT EXISTS financial_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Transações Financeiras (Estrutura)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES financial_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'cancelled')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  responsible_name TEXT,
  nf_url TEXT,
  is_recurring BOOLEAN DEFAULT false,
  due_day INTEGER,
  last_generated_at DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas Tenant (Limpar e Recriar)
DROP POLICY IF EXISTS "Tenant Data Access" ON financial_categories;
CREATE POLICY "Tenant Data Access" ON financial_categories
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenant Data Access" ON financial_transactions;
CREATE POLICY "Tenant Data Access" ON financial_transactions
  FOR ALL TO authenticated USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- NOTA: Removido o INSERT de categorias padrão a pedido do usuário.
