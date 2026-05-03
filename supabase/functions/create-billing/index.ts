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
    const isPix = data.methods?.includes('PIX');
    
    let endpoint = '';
    let payload = {};

    if (isPix) {
      // Usar Checkout Transparente para PIX (conforme desejado pelo usuário para ficar no ambiente)
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
      // Usar Checkout Padrão para Cartão (Redirecionamento)
      endpoint = '/checkouts/create';
      payload = {
        frequency: 'ONE_TIME',
        methods: ['CARD'],
        products: [
          {
            externalId: data.productId || 'prod_default',
            name: data.description || 'Assinatura TimesPro',
            quantity: 1,
            price: amount // Tentar passar o preço dinâmico
          }
        ],
        returnUrl: data.returnUrl,
        completionUrl: data.completionUrl,
        customerId: data.externalId // Usar externalId como customerId se disponível
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
      return new Response(JSON.stringify({ 
        success: false,
        error: result.error || `API Error: ${response.statusText}`,
        debug_endpoint: endpoint,
        debug_payload: payload 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Mapear resposta para o formato esperado pelo frontend
    // O frontend espera data.pix.qrcode e data.pix.code para PIX
    if (isPix && result.data) {
      const pixInfo = {
        qrcode: result.data.brCodeBase64,
        code: result.data.brCode,
        id: result.data.id
      };
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: { 
          pix: pixInfo,
          url: result.data.url, // URL de checkout se o usuário preferir abrir
          ...result.data 
        } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Para Cartão, o AbacatePay v2 retorna a URL no nível superior ou dentro de data
    const url = result.data?.url || result.url;
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result.data,
        url: url
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
