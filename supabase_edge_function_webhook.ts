// Supabase Edge Function: abacatepay-webhook
// Este código deve ser implantado no Supabase para processar pagamentos reais.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log('Webhook recebido da AbacatePay:', payload);

    // 1. Validar o evento (AbacatePay v2 usa checkout.completed)
    const validEvents = ['checkout.completed', 'subscription.completed'];
    if (!validEvents.includes(payload.event)) {
      return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
    }

    const billing = payload.data;
    const metadata = billing.metadata || {}; // Usaremos metadados para saber a origem

    // 2. Localizar a transação no nosso banco
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*, wallets(organization_id)')
      .eq('abacate_billing_id', billing.id)
      .single();

    if (txError || !transaction) {
      console.error('Transação não encontrada:', billing.id);
      return new Response('Transaction not found', { status: 404 });
    }

    // 3. ATUALIZAÇÃO LÓGICA POR CATEGORIA
    
    // Se for VAQUINHA
    if (transaction.category === 'vaquinha' && metadata.campaign_id) {
      await supabase.rpc('increment_campaign_amount', { 
        c_id: metadata.campaign_id, 
        amount: transaction.amount 
      });
    }

    // Se for MENSALIDADE
    if (transaction.category === 'mensalidade' && metadata.member_id) {
      await supabase
        .from('members')
        .update({ 
          payment_status: 'Em dia', 
          last_payment: new Date().toISOString() 
        })
        .eq('id', metadata.member_id);
    }

    // 4. Confirmar a Transação e Atualizar Carteira
    const { error: finalError } = await supabase
      .from('wallet_transactions')
      .update({ status: 'confirmed' })
      .eq('id', transaction.id);

    // O gatilho de banco (SQL Trigger) cuidará de somar o valor ao saldo da carteira (wallet.balance)

    if (finalError) throw finalError;

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error('Erro no Webhook:', err.message);
    return new Response(err.message, { status: 500 });
  }
});
