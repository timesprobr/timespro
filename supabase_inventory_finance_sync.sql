-- Função para integrar Almoxarifado com Financeiro automaticamente
CREATE OR REPLACE FUNCTION public.sync_inventory_to_finance()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Apenas processar entradas que tenham valor (amount > 0)
    IF (NEW.type = 'entry' AND NEW.amount > 0) THEN
        
        -- Buscar ou criar categoria "Almoxarifado" no financeiro
        SELECT id INTO v_category_id FROM financial_categories 
        WHERE organization_id = NEW.organization_id AND name = 'Almoxarifado' 
        LIMIT 1;

        IF v_category_id IS NULL THEN
            INSERT INTO financial_categories (organization_id, name, type)
            VALUES (NEW.organization_id, 'Almoxarifado', 'expense')
            RETURNING id INTO v_category_id;
        END IF;

        -- Criar transação financeira de despesa
        INSERT INTO financial_transactions (
            organization_id,
            category_id,
            title,
            amount,
            type,
            date,
            responsible_name,
            nf_url,
            status
        ) VALUES (
            NEW.organization_id,
            v_category_id,
            'Compra de Material: ' || (SELECT name FROM inventory_items WHERE id = NEW.item_id),
            NEW.amount,
            'expense',
            NEW.date,
            NEW.responsible_name,
            NEW.nf_url,
            'paid'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para disparar a integração
DROP TRIGGER IF EXISTS tr_sync_inventory_to_finance ON inventory_transactions;
CREATE TRIGGER tr_sync_inventory_to_finance
AFTER INSERT ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_finance();
