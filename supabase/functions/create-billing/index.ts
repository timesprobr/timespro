import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v2';
const ABACATEPAY_API_KEY = Deno.env.get('ABACATEPAY_API_KEY') || 'abc_dev_Whj1QkRgGBKuFPsxCRcjz1zE';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const data = await req.json();

    const rawAmount = Number.parseInt(String(data.amountCentavos));
    const finalAmount = isNaN(rawAmount) ? 1000 : rawAmount;

    // Na v2, o formato mudou de 'products' para 'items'
    // e o endpoint principal agora é /checkouts/create
    const payload = {
      frequency: 'ONE_TIME',
      methods: data.methods || ['PIX'],
      items: [
        {
          id: String(data.productId || 'prod_default'),
          quantity: 1,
          price: finalAmount // Usar o valor dinâmico enviado
        }
      ],
      customer: {
        name: String(data.customerName),
        email: String(data.customerEmail),
        taxId: String(data.customerTaxId),
        cellphone: String(data.customerPhone)
      },
      returnUrl: data.returnUrl,
      completionUrl: data.completionUrl
    };

    console.log('Sending v2 Payload to AbacatePay (Direct Billing):', JSON.stringify(payload));

    // Passo 2: Criar o checkout
    const response = await fetch(`${ABACATEPAY_API_URL}/billings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('AbacatePay Direct Billing Response:', result);

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: `API Error: ${JSON.stringify(result)}`,
        debug_payload: payload 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Retornamos 200 aqui também
    });
  }
})
