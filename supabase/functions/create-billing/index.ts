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
    console.log('Recebido na Function:', JSON.stringify(data));

    const amount = Number.parseInt(String(data.amountCentavos)) || 1000;
    const method = String(data.method || 'PIX').toUpperCase();
    const isPix = method === 'PIX';
    
    let endpoint = '';
    let payload = {};

    if (isPix) {
      endpoint = '/transparents/create';
      payload = {
        method: 'PIX',
        data: {
          amount: amount,
          description: data.description || 'Assinatura TimesPro',
          externalId: data.externalId,
          customer: {
            name: data.customerName,
            email: data.customerEmail,
            taxId: data.customerTaxId,
            cellphone: data.customerPhone
          }
        }
      };
    } else {
      endpoint = '/checkouts/create';
      payload = {
        frequency: 'ONE_TIME',
        methods: ['CARD'],
        items: [
          {
            externalId: data.externalId || 'prod_default',
            name: data.description || 'Assinatura TimesPro',
            quantity: 1,
            price: amount
          }
        ],
        returnUrl: data.returnUrl || 'https://timespro.com.br',
        completionUrl: data.completionUrl || 'https://timespro.com.br',
      };
    }

    console.log(`Calling AbacatePay v2 (${endpoint}):`, JSON.stringify(payload));

    const response = await fetch(`${ABACATEPAY_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('AbacatePay Response:', JSON.stringify(result));

    if (!response.ok) {
      const errorMessage = result.error || (result.errors && result.errors[0]?.message) || `API Error: ${response.statusText}`;
      return new Response(JSON.stringify({ 
        success: false,
        error: errorMessage,
        debug: result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (isPix && result.data) {
      return new Response(JSON.stringify({ 
        success: true, 
        data: { 
          pix: {
            qrcode: result.data.brCodeBase64,
            code: result.data.brCode,
            id: result.data.id
          },
          url: result.data.url,
          ...result.data 
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result.data,
        url: result.data?.url || result.url
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
})
