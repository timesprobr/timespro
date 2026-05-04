import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_URL = Deno.env.get('ASAAS_URL') || 'https://www.asaas.com/api/v3';

    const { pixKey } = await req.json();

    if (!pixKey) {
      throw new Error("Chave PIX é obrigatória");
    }

    console.log(`Verificando chave PIX: ${pixKey}`);

    if (!ASAAS_API_KEY) {
      throw new Error("Configuração do sistema pendente: ASAAS_API_KEY não encontrada.");
    }

    try {
      const response = await fetch(`${ASAAS_URL}/pix/addressKeys/validate?addressKey=${encodeURIComponent(pixKey)}`, {
        method: 'GET',
        headers: {
          'access_token': ASAAS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Status Asaas: ${response.status}`);
      
      const contentType = response.headers.get("content-type");
      let result;
      
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
        console.log('Resposta Asaas (JSON):', JSON.stringify(result));
      } else {
        const text = await response.text();
        console.log('Resposta Asaas (Texto):', text);
        throw new Error(`Resposta inválida do Asaas (Status ${response.status}).`);
      }

      if (!response.ok) {
        // Se o Asaas retornar erro (ex: chave não encontrada)
        const errorMsg = result?.errors?.[0]?.description || result?.message || `Chave PIX não encontrada (Status ${response.status}).`;
        throw new Error(errorMsg);
      }
      
      if (result.ownerName) {
        return new Response(JSON.stringify({
          success: true,
          ownerName: result.ownerName,
          taxId: result.cpfCnpj,
          bankName: result.ispbDescription || "Instituição Financeira",
          isReal: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error("Não foi possível identificar o titular desta chave PIX.");
      }
    } catch (e) {
      console.error('Erro na consulta ASAAS:', e);
      throw e;
    }

  } catch (error) {
    console.error('Erro final verify-pix-key:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      isReal: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Retornamos 200 para o frontend tratar o success: false
    });
  }
})
