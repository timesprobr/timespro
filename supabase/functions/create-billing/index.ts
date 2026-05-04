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
    const isCard = method === 'CARD';
    
    let endpoint = '';
    let payload = {};

    if (isPix || (isCard && data.card)) {
      endpoint = '/transparents/create';
      payload = {
        method: isPix ? 'PIX' : 'CARD',
        data: {
          amount: amount,
          description: data.description || 'Assinatura TimesPro',
          externalId: data.externalId,
          customer: {
            name: data.customerName,
            email: data.customerEmail,
            taxId: data.customerTaxId,
            cellphone: data.customerPhone,
            address: data.customerAddress
          },
          metadata: {
            type: 'monthly'
          }
        }
      };

      if (isCard && data.card) {
        // @ts-ignore
        payload.data.card = {
          number: data.card.number,
          holder: data.card.holder,
          expiry: data.card.expiry,
          cvv: data.card.cvv
        };
      }
    } else {
      // Passo 1: Garantir que o produto existe no catálogo do AbacatePay v2
      // Usamos um ID baseado no valor para evitar duplicados mas permitir preços diferentes
      const productId = `timespro_plan_${amount}`;
      
      console.log('Garantindo produto no catálogo:', productId);
      
      try {
        await fetch(`${ABACATEPAY_API_URL}/products/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ABACATEPAY_API_KEY}`
          },
          body: JSON.stringify({
            externalId: productId,
            name: `Plano TimesPro - R$ ${(amount/100).toFixed(2)}`,
            price: amount,
            description: 'Assinatura de Atleta'
          })
        });
        // Ignoramos erro de "já existe" pois o importante é ele estar lá
      } catch (e) {
        console.log('Produto já deve existir ou erro silenciado:', e.message);
      }

      // Passo 2: Criar o checkout usando o ID do produto
      endpoint = '/checkouts/create';
      payload = {
        frequency: 'ONE_TIME',
        methods: ['CARD'],
        items: [
          {
            id: productId, // Agora passamos o ID que registramos acima
            quantity: 1
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
