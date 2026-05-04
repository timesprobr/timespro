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
      const paymentId = data.externalId // O UUID que enviamos no checkout
      
      if (paymentId) {
        console.log(`Processando pagamento confirmando: ${paymentId}`)
        
        // 1. Buscar detalhes do pagamento para criar a transação financeira
        const { data: paymentInfo, error: fetchError } = await supabaseClient
          .from('subscription_payments')
          .select(`
            *,
            athlete_subscriptions (
              athlete_id,
              athletes (full_name)
            )
          `)
          .eq('id', paymentId)
          .single()

        if (fetchError || !paymentInfo) {
          console.error('Erro ao buscar pagamento local:', fetchError)
          throw new Error('Pagamento não encontrado no banco de dados local.')
        }

        // 2. Atualizar status da fatura
        const { error: updateError } = await supabaseClient
          .from('subscription_payments')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            external_id: data.id,
            payment_method: data.method === 'PIX' ? 'pix' : 'credit_card'
          })
          .eq('id', paymentId)

        if (updateError) {
          console.error('Erro ao atualizar status do pagamento:', updateError)
          throw updateError
        }

        // 3. Criar registro no Fluxo de Caixa (Dashboard)
        const athleteName = paymentInfo.athlete_subscriptions?.athletes?.full_name || 'Atleta'
        
        const { error: txError } = await supabaseClient
          .from('financial_transactions')
          .insert({
            organization_id: paymentInfo.organization_id,
            title: `Mensalidade: ${athleteName}`,
            amount: paymentInfo.amount,
            type: 'income',
            status: 'paid',
            date: new Date().toISOString().split('T')[0],
            responsible_name: athleteName
          })

        if (txError) {
          console.warn('⚠️ Falha ao registrar no fluxo de caixa (mas o pagamento foi marcado como pago):', txError)
        }
        
        console.log('✅ Pagamento processado, banco atualizado e fluxo de caixa registrado!')
      } else {
        console.warn('⚠️ Webhook recebido sem externalId. Ignorando processamento automático.')
      }
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
