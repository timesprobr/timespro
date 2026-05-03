-- Script robusto para adicionar colunas de Série e Data de Emissão para Notas Fiscais

-- 1. Tratar a tabela financial_transactions
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS nf_series TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS nf_emission_date DATE;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS inventory_transaction_id UUID REFERENCES inventory_transactions(id) ON DELETE SET NULL;

-- 2. Tratar a tabela inventory_transactions de forma segura
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'nf_serie') 
     AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'nf_series') THEN
    ALTER TABLE inventory_transactions RENAME COLUMN nf_serie TO nf_series;
  ELSIF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'nf_serie') 
     AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_transactions' AND COLUMN_NAME = 'nf_series') THEN
    UPDATE inventory_transactions SET nf_series = nf_serie WHERE nf_series IS NULL;
    ALTER TABLE inventory_transactions DROP COLUMN nf_serie;
  END IF;
END $$;

ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS nf_series TEXT;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS nf_emission_date DATE;

-- 3. Atualizar a função de sincronização para incluir novos campos e suportar UPDATES
CREATE OR REPLACE FUNCTION public.sync_inventory_to_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
    v_item_name TEXT;
BEGIN
    -- Buscar nome do item para o título
    SELECT name INTO v_item_name FROM inventory_items WHERE id = NEW.item_id;

    -- Apenas processar entradas que tenham valor (amount > 0)
    IF (NEW.type = 'entry' AND NEW.amount > 0) THEN
        
        -- Buscar ou criar categoria "Almoxarifado"
        SELECT id INTO v_category_id FROM financial_categories 
        WHERE organization_id = NEW.organization_id AND name = 'Almoxarifado' 
        LIMIT 1;

        IF v_category_id IS NULL THEN
            INSERT INTO financial_categories (organization_id, name, type)
            VALUES (NEW.organization_id, 'Almoxarifado', 'expense')
            RETURNING id INTO v_category_id;
        END IF;

        -- Se for um INSERT novo
        IF (TG_OP = 'INSERT') THEN
            INSERT INTO financial_transactions (
                organization_id, category_id, title, amount, type, date,
                responsible_name, nf_url, nf_series, nf_emission_date,
                supplier_name, inventory_transaction_id, status
            ) VALUES (
                NEW.organization_id, v_category_id, 'Compra de Material: ' || v_item_name,
                NEW.amount, 'expense', NEW.date, NEW.responsible_name,
                NEW.nf_url, NEW.nf_series, NEW.nf_emission_date,
                NEW.supplier_name, NEW.id, 'paid'
            );
        -- Se for um UPDATE em um registro que já existia
        ELSIF (TG_OP = 'UPDATE') THEN
            UPDATE financial_transactions SET
                amount = NEW.amount,
                date = NEW.date,
                responsible_name = NEW.responsible_name,
                nf_url = NEW.nf_url,
                nf_series = NEW.nf_series,
                nf_emission_date = NEW.nf_emission_date,
                supplier_name = NEW.supplier_name,
                title = 'Compra de Material: ' || v_item_name
            WHERE inventory_transaction_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-criar o trigger para suportar UPDATE também
DROP TRIGGER IF EXISTS tr_sync_inventory_to_finance ON inventory_transactions;
CREATE TRIGGER tr_sync_inventory_to_finance
AFTER INSERT OR UPDATE ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_finance();

-- 5. Migração de dados para registros existentes (Backfill)
UPDATE financial_transactions ft
SET 
    inventory_transaction_id = it.id,
    nf_url = COALESCE(NULLIF(ft.nf_url, ''), it.nf_url),
    nf_series = COALESCE(NULLIF(ft.nf_series, ''), it.nf_series),
    nf_emission_date = COALESCE(ft.nf_emission_date, it.nf_emission_date),
    supplier_name = COALESCE(NULLIF(ft.supplier_name, ''), it.supplier_name)
FROM inventory_transactions it
JOIN inventory_items ii ON it.item_id = ii.id
WHERE (ft.inventory_transaction_id IS NULL OR ft.nf_url IS NULL OR ft.nf_url = '' OR ft.supplier_name IS NULL)
  AND ft.organization_id = it.organization_id
  AND ft.amount = it.amount
  AND ft.date = it.date
  AND UPPER(ft.title) = UPPER('Compra de Material: ' || ii.name);
