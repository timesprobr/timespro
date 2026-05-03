-- TimesPro - Módulo de Carteira e Saques

-- Adicionar dados bancários à tabela de wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bank_agency TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bank_pix_key TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS tax_id TEXT; -- CNPJ da Instituição

-- Tabela de Histórico de Saques
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  fee_amount DECIMAL(12,2) DEFAULT 1.50, -- Taxa fixa de saque
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
  bank_details JSONB, -- Cópia dos dados bancários no momento do saque
  receipt_url TEXT, -- Comprovante do saque
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para Saques
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Withdrawal Access" ON wallet_withdrawals
  FOR ALL USING (wallet_id IN (SELECT id FROM wallets WHERE organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())));
