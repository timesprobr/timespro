import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string;
  slug: string;
  organization_id: string;
  data: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada nos Secrets do Supabase.')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { to, slug, organization_id, data } = await req.json() as EmailRequest

    console.log(`[Email] Iniciando envio: ${slug} para ${to} (Org: ${organization_id})`)

    // 1. Buscar Template (Prioridade: Org > Global)
    let { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('slug', slug)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle()

    // Se não achar do clube, pega o global (null)
    if (!template) {
      const { data: globalTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('slug', slug)
        .is('organization_id', null)
        .eq('is_active', true)
        .maybeSingle()
      
      template = globalTemplate
    }

    if (!template) {
      throw new Error(`Template não encontrado para o slug: ${slug}`)
    }

    // 2. Buscar Dados do Clube para Placeholders Universais
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', organization_id)
      .single()

    // 3. Mesclar Dados (Placeholders)
    const placeholders: Record<string, string> = {
      '{{club_name}}': org?.name || 'Clube',
      '{{club_logo}}': org?.logo_url || 'https://timespro.com.br/logo.png',
      ...data
    }

    let html = template.content
    let subject = template.subject

    Object.entries(placeholders).forEach(([key, value]) => {
      // Usar split/join para evitar problemas com caracteres especiais do RegExp como {{ }}
      html = html.split(key).join(value || '')
      subject = subject.split(key).join(value || '')
    })

    // 4. Enviar via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'TimesPro <contato@timespro.com.br>', 
        to: [to],
        subject: subject,
        html: html,
      }),
    })

    const resData = await res.json()

    if (!res.ok) {
      throw new Error(`Erro no Resend: ${JSON.stringify(resData)}`)
    }

    console.log(`[Email] Enviado com sucesso! ID: ${resData.id}`)

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error(`[Email Error] ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
