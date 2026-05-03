-- Expandir transações de estoque para detalhes de NF e Fornecedor
ALTER TABLE inventory_transactions 
ADD COLUMN IF NOT EXISTS nf_serie TEXT,
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Indexar fornecedores para buscas futuras mais rápidas
CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_transactions(supplier_name);
