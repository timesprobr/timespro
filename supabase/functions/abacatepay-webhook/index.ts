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
      const paymentId = data.externalId 
      const metadata = data.metadata || {}
      const rawAmount = data.amount
      const amount = rawAmount / 100 
      
      console.log(`Processando pagamento: ${paymentId}, Valor Bruto: ${amount}, Metadata:`, metadata)
      
      let netAmount = amount
      let title = 'Receita'
      let responsibleName = 'Sistema'
      let organizationId = ''
      let paymentType = metadata.type || 'other'

      // 1. Identificar o Tipo de Pagamento e Calcular Taxas
      
      // CASO A: MENSALIDADE (paymentId longo ou metadata.type === 'monthly')
      if (paymentId && paymentId.length > 30 || paymentType === 'monthly') {
        // Taxa Mensalidade: R$ 1,00 + 3,99%
        const fee = 1.00 + (amount * 0.0399)
        netAmount = amount - fee
        
        // Buscar info da mensalidade (incluindo e-mail do atleta)
        const { data: pInfo } = await supabaseClient
          .from('subscription_payments')
          .select('*, athlete_subscriptions(athletes(full_name, email))')
          .eq('id', paymentId)
          .maybeSingle()

        if (pInfo) {
          organizationId = pInfo.organization_id
          const athlete = pInfo.athlete_subscriptions?.athletes
          responsibleName = athlete?.full_name || 'Atleta'
          title = `Mensalidade: ${responsibleName}`
          
          // Atualizar status do pagamento
          await supabaseClient
            .from('subscription_payments')
            .update({ 
              status: 'paid', 
              paid_at: new Date().toISOString(),
              external_id: data.id 
            })
            .eq('id', paymentId)

          // DISPARAR E-MAIL DE CONFIRMAÇÃO
          if (athlete?.email) {
            console.log(`[Webhook] Solicitando envio de e-mail para: ${athlete.email}`)
            // Chamada interna para a outra Edge Function
            await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: athlete.email,
                slug: 'payment_confirmed',
                organization_id: organizationId,
                data: {
                  '{{athlete_name}}': responsibleName,
                  '{{amount}}': amount.toFixed(2),
                  '{{due_date}}': pInfo.due_date ? new Date(pInfo.due_date).toLocaleDateString('pt-BR') : '--'
                }
              }),
            }).catch(e => console.error('Erro ao chamar send-email-notification:', e))
          }
        }
      } 
      // CASO B: VAQUINHA (externalId começa com tx_ ou metadata.type === 'vaquinha')
      else if (paymentId?.startsWith('tx_') || paymentType === 'vaquinha') {
        // Taxa Vaquinha: 6%
        const fee = amount * 0.06
        netAmount = amount - fee
        
        // Buscar transação da carteira ou campanha
        // Se for doação via checkout, podemos ter o campaign_id no metadata
        if (metadata.campaign_id) {
          // Tentar descobrir a organization_id via campanha
          const { data: campaign } = await supabaseClient
            .from('campaigns')
            .select('*, organization_id') // Assumindo que campaigns tem organization_id
            .eq('id', metadata.campaign_id)
            .maybeSingle()
          
          if (campaign) {
            organizationId = campaign.organization_id
            title = `Doação: ${campaign.title}`
            responsibleName = 'Doador Anônimo'

            // Atualizar valor arrecadado na campanha (Bruto)
            await supabaseClient
              .from('campaigns')
              .update({ current_amount: (campaign.current_amount || 0) + amount })
              .eq('id', metadata.campaign_id)
          }
        }
      }

      // 2. Processamento Universal de Carteira e Financeiro
      if (organizationId) {
        console.log(`Registrando valor líquido: R$ ${netAmount.toFixed(2)} para Org: ${organizationId}`)

        // A. Atualizar ou Criar Carteira
        const { data: wallet } = await supabaseClient
          .from('wallets')
          .select('id, balance')
          .eq('organization_id', organizationId)
          .maybeSingle()

        let walletId;
        if (!wallet) {
          const { data: newWallet, error: createError } = await supabaseClient
            .from('wallets')
            .insert({ organization_id: organizationId, balance: netAmount })
            .select('id')
            .single()
          if (createError) throw createError
          walletId = newWallet.id
        } else {
          const { error: updateError } = await supabaseClient
            .from('wallets')
            .update({ 
              balance: (Number(wallet.balance) || 0) + netAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id)
          if (updateError) throw updateError
          walletId = wallet.id
        }

        // B. Registrar Transação na História da Carteira
        await supabaseClient
          .from('wallet_transactions')
          .insert({
            wallet_id: walletId,
            amount: netAmount,
            type: 'income',
            category: paymentType,
            description: title,
            status: 'completed',
            abacate_billing_id: data.id
          })

        // C. Registrar no Fluxo de Caixa (Dashboard)
        await supabaseClient
          .from('financial_transactions')
          .insert({
            organization_id: organizationId,
            title: title + ' (Líquido)',
            amount: netAmount,
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
