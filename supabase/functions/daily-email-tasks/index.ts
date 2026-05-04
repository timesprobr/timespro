import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('[Cron] Iniciando verificação diária de faturas...')

  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  const dateToday = formatDate(today)
  const dateIn3Days = formatDate(new Date(new Date().setDate(today.getDate() + 3)))
  const dateYesterday = formatDate(new Date(new Date().setDate(today.getDate() - 1)))

  const tasks = [
    { date: dateIn3Days, slug: 'billing_upcoming', label: 'Vencimento em 3 dias' },
    { date: dateToday, slug: 'billing_today', label: 'Vencimento hoje' },
    { date: dateYesterday, slug: 'billing_late_1d', label: 'Atrasado 1 dia' },
  ]

  let totalSent = 0

  for (const task of tasks) {
    console.log(`[Cron] Processando ${task.label} para data: ${task.date}`)

    // Buscar pagamentos pendentes para a data específica
    const { data: payments, error } = await supabase
      .from('subscription_payments')
      .select('*, athlete_subscriptions(athletes(full_name, email))')
      .eq('status', 'pending')
      .eq('due_date', task.date)

    if (error) {
      console.error(`Erro ao buscar pagamentos (${task.label}):`, error)
      continue
    }

    for (const payment of payments) {
      const athlete = payment.athlete_subscriptions?.athletes
      if (athlete?.email) {
        console.log(`[Cron] Enviando ${task.slug} para ${athlete.email}`)
        
        await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: athlete.email,
            slug: task.slug,
            organization_id: payment.organization_id,
            data: {
              '{{athlete_name}}': athlete.full_name,
              '{{amount}}': Number(payment.amount).toFixed(2),
              '{{due_date}}': new Date(payment.due_date).toLocaleDateString('pt-BR'),
              '{{payment_link}}': `https://timespro.com.br/checkout/${payment.id}` // Exemplo de link
            }
          }),
        }).catch(e => console.error('Erro ao disparar e-mail:', e))
        
        totalSent++
      }
    }
  }

  return new Response(JSON.stringify({ success: true, sent_count: totalSent }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
