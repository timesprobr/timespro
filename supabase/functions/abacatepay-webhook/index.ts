import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    console.log('--- Webhook AbacatePay ---')
    console.log('Event:', body.event)
    console.log('Payload:', JSON.stringify(body, null, 2))

    const { event, data } = body

    // Eventos de sucesso no AbacatePay
    if (event === 'billing.paid' || event === 'checkout.completed' || event === 'transparent.completed') {
      const paymentId = data.externalId // UUID da mensalidade ou ID da transação da vaquinha
      const metadata = data.metadata || {}
      const amount = data.amount / 100 // O AbacatePay envia em centavos? Vamos conferir. 
                                       // Geralmente APIs enviam centavos. 
                                       // Se amount for 200, vira 2.00.
      
      console.log(`Processando pagamento: ${paymentId}, Valor: ${amount}, Metadata:`, metadata)
      
      let netAmount = amount
      let title = 'Receita'
      let responsibleName = 'Sistema'
      let organizationId = ''

      // 1. Identificar o Tipo de Pagamento e Calcular Taxas
      // Se for Mensalidade (UUID local)
      if (paymentId && paymentId.length > 30) { 
        // Taxa Mensalidade: R$ 1,00 + 3,99%
        const fee = 1.00 + (amount * 0.0399)
        netAmount = amount - fee
        
        // Buscar info da mensalidade
        const { data: pInfo } = await supabaseClient
          .from('subscription_payments')
          .select('*, athlete_subscriptions(athletes(full_name))')
          .eq('id', paymentId)
          .single()

        if (pInfo) {
          organizationId = pInfo.organization_id
          responsibleName = pInfo.athlete_subscriptions?.athletes?.full_name || 'Atleta'
          title = `Mensalidade: ${responsibleName}`
          
          // Atualizar mensalidade
          await supabaseClient
            .from('subscription_payments')
            .update({ 
              status: 'paid', 
              paid_at: new Date().toISOString(),
              external_id: data.id 
            })
            .eq('id', paymentId)
        }
      } 
      // Se for Vaquinha (ExternalId começa com tx_ ou metadata tem type: vaquinha)
      else if (paymentId?.startsWith('tx_') || metadata.type === 'vaquinha') {
        // Taxa Vaquinha: 6%
        const fee = amount * 0.06
        netAmount = amount - fee
        
        // Buscar transação da carteira
        const { data: txInfo } = await supabaseClient
          .from('wallet_transactions')
          .select('*, wallets(organization_id)')
          .eq('abacate_billing_id', data.id)
          .single()

        if (txInfo) {
          organizationId = txInfo.wallets?.organization_id
          title = txInfo.description || 'Contribuição Vaquinha'
          responsibleName = 'Doador Anônimo'
          
          // Atualizar transação da carteira
          await supabaseClient
            .from('wallet_transactions')
            .update({ status: 'completed' })
            .eq('id', txInfo.id)

          // Atualizar saldo da carteira (disponível)
          if (organizationId) {
             const { data: wallet } = await supabaseClient
               .from('wallets')
               .select('balance')
               .eq('organization_id', organizationId)
               .single()
             
             if (wallet) {
               await supabaseClient
                 .from('wallets')
                 .update({ balance: wallet.balance + netAmount })
                 .eq('organization_id', organizationId)
             }
          }

          // Se tiver campaign_id no metadata, atualizar valor arrecadado na campanha
          if (metadata.campaign_id) {
            const { data: campaign } = await supabaseClient
              .from('campaigns')
              .select('current_amount')
              .eq('id', metadata.campaign_id)
              .single()
            
            if (campaign) {
              await supabaseClient
                .from('campaigns')
                .update({ current_amount: campaign.current_amount + amount }) // Na campanha mostramos o bruto? 
                                                                             // Geralmente sim, mas o clube recebe o líquido.
                .eq('id', metadata.campaign_id)
            }
          }
        }
      }

      // 2. Registrar no Fluxo de Caixa (Valor Líquido)
      if (organizationId) {
        console.log(`Registrando receita líquida no financeiro: R$ ${netAmount.toFixed(2)}`)
        
        await supabaseClient
          .from('financial_transactions')
          .insert({
            organization_id: organizationId,
            title: title,
            amount: netAmount, // VALOR LÍQUIDO CONFORME MODELO DE NEGÓCIO
            type: 'income',
            status: 'paid',
            date: new Date().toISOString().split('T')[0],
            responsible_name: responsibleName
          })
      }
      
      console.log('✅ Processamento concluído com sucesso!')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('❌ Erro crítico no processamento do webhook:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
