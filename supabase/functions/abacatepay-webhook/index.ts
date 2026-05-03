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
    console.log('Webhook AbacatePay recebido:', JSON.stringify(body))

    const { event, data } = body

    // Eventos de sucesso no AbacatePay
    if (event === 'billing.paid' || event === 'checkout.completed' || event === 'transparent.completed') {
      const paymentId = data.externalId // O UUID que enviamos no checkout
      
      if (paymentId) {
        console.log(`Atualizando status do pagamento no banco: ${paymentId}`)
        
        const { error } = await supabaseClient
          .from('subscription_payments')
          .update({ 
            status: 'paid',
            paid_at: new Date().toISOString(),
            external_id: data.id // Salva o ID do AbacatePay (ex: bill_...)
          })
          .eq('id', paymentId)

        if (error) {
          console.error('Erro ao atualizar assinatura no banco:', error)
          throw error
        }
        
        console.log('✅ Pagamento processado e banco atualizado com sucesso!')
      } else {
        console.warn('⚠️ Webhook recebido sem externalId.')
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('❌ Erro no processamento do webhook:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400 
    })
  }
})
