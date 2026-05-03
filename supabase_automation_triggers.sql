-- TimesPro - Automação de Saldos e Pagamentos

-- 1. Função para atualizar o saldo da carteira com DEDUÇÃO DE TAXAS (SaaS Business Model)
CREATE OR REPLACE FUNCTION public.handle_transaction_confirmation()
RETURNS TRIGGER AS $$
DECLARE
  fee_amount DECIMAL(12,2) := 0.00;
  net_amount DECIMAL(12,2) := 0.00;
BEGIN
  -- Se o status mudou para 'confirmed'
  IF (OLD.status = 'pending' AND NEW.status = 'confirmed') THEN
    
    -- CALCULO DE TAXAS TIMESPRO
    IF (NEW.category = 'mensalidade') THEN
      fee_amount := (NEW.amount * 0.0299) + 1.00; -- R$ 1,00 + 2,99%
    ELSIF (NEW.category = 'vaquinha') THEN
      fee_amount := (NEW.amount * 0.0599); -- 5,99%
    ELSIF (NEW.category = 'saque') THEN
      fee_amount := 1.50; -- R$ 1,50 por saque
    END IF;

    net_amount := NEW.amount - fee_amount;

    -- Se for Crédito (Entrada de dinheiro)
    IF (NEW.type = 'credit') THEN
      UPDATE public.wallets
      SET balance = balance + net_amount,
          pending_balance = pending_balance - NEW.amount
      WHERE id = NEW.wallet_id;
    END IF;

    -- Se for Débito (Saída/Saque)
    IF (NEW.type = 'debit') THEN
      -- No saque, debitamos o valor total + a taxa de R$ 1,50 do saldo do clube
      UPDATE public.wallets
      SET balance = balance - (NEW.amount + fee_amount)
      WHERE id = NEW.wallet_id;
    END IF;

    -- Registrar o lucro do SaaS em um log (opcional, mas recomendado)
    -- RAISE NOTICE 'Taxa de R$ % retida para a transação %', fee_amount, NEW.id;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para a tabela de transações
DROP TRIGGER IF EXISTS on_transaction_confirmed ON public.wallet_transactions;
CREATE TRIGGER on_transaction_confirmed
  AFTER UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_transaction_confirmation();

-- 2. Função segura para incrementar valor de vaquinha
CREATE OR REPLACE FUNCTION public.increment_campaign_amount(c_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.campaigns
  SET current_amount = current_amount + amount
  WHERE id = c_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
