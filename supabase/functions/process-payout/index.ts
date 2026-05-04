import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v2';
const ABACATEPAY_API_KEY = Deno.env.get('ABACATEPAY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletId, amount, pixKey, pixKeyType, withdrawalId } = await req.json()

    if (!ABACATEPAY_API_KEY) {
      throw new Error('Chave de API do AbacatePay não configurada no servidor.')
    }

    // 1. Verificar valor mínimo (AbacatePay exige min R$ 3,50)
    if (amount < 3.5) {
      throw new Error('O valor mínimo para saque via AbacatePay é R$ 3,50.')
    }

    // 2. Verificar saldo novamente no servidor por segurança
    const { data: wallet, error: walletError } = await supabaseClient
      .from('wallets')
      .select('balance')
      .eq('id', walletId)
      .single()

    if (walletError || !wallet) {
      throw new Error('Carteira não encontrada')
    }

    if (wallet.balance < amount) {
      throw new Error('Saldo insuficiente para o saque solicitado')
    }

    // 3. Chamar AbacatePay para enviar o PIX
    console.log(`Iniciando pagamento AbacatePay para ${pixKey} (${pixKeyType}) no valor de R$ ${amount}`);
    
    const payoutPayload = {
      amount: Math.round(amount * 100), // Converter para centavos
      externalId: withdrawalId || crypto.randomUUID(),
      description: `Saque TimesPro - ID ${withdrawalId}`,
      pix: {
        key: pixKey,
        type: pixKeyType // CPF, CNPJ, PHONE, EMAIL, RANDOM
      }
    };

    const payoutResponse = await fetch(`${ABACATEPAY_API_URL}/pix/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
      },
      body: JSON.stringify(payoutPayload)
    });

    const payoutResult = await payoutResponse.json();
    console.log('Resultado AbacatePay:', JSON.stringify(payoutResult));

    if (!payoutResponse.ok || !payoutResult.success) {
      const errorMsg = payoutResult.error || (payoutResult.errors && payoutResult.errors[0]?.message) || 'Erro na API do AbacatePay';
      
      // Se falhar na API, vamos marcar o saque como falho no banco para liberar o saldo "preso" no frontend
      await supabaseClient
        .from('wallet_withdrawals')
        .update({ status: 'failed', processed_at: new Date().toISOString() })
        .eq('id', withdrawalId);

      throw new Error(errorMsg);
    }

    // 4. Atualizar saldo e registro de saque se o pagamento foi solicitado com sucesso
    const { error: updateBalanceError } = await supabaseClient
      .from('wallets')
      .update({ balance: wallet.balance - amount })
      .eq('id', walletId)

    if (updateBalanceError) {
      console.error('ERRO CRÍTICO: Pagamento enviado mas saldo não deduzido!', updateBalanceError);
    }

    await supabaseClient
      .from('wallet_withdrawals')
      .update({ 
        status: 'completed', 
        processed_at: new Date().toISOString(),
        external_id: payoutResult.data?.id
      })
      .eq('id', withdrawalId)

    return new Response(JSON.stringify({ 
      success: true, 
      data: payoutResult.data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro no processamento do saque:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
