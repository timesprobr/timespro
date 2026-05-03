// TimesPro - AbacatePay Integration Service

import { supabase } from './supabase';

export interface AbacateBillingRequest {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerTaxId: string; // CPF/CNPJ
  customerPhone?: string;
  productId?: string; // ID do produto no AbacatePay
  externalId?: string; // Nosso ID de transação
  category?: 'mensalidade' | 'vaquinha' | 'saas';
  methods?: ('PIX' | 'CREDIT_CARD')[];
  metadata?: any;
}

/**
 * Cria uma cobrança única via Supabase Function (Proxy seguro)
 */
export async function createBilling(method: 'pix' | 'card') {
  if (!supabase) throw new Error('Supabase não configurado');

  // Valores padrão para o teste/checkout
  const amount = 49.90;
  const productId = import.meta.env.VITE_ABACATEPAY_PRODUTO_MENSAL_AVULSO_ID;

  try {
    const { data: result, error } = await supabase.functions.invoke('create-billing', {
      body: {
        amountCentavos: Math.round(amount * 100),
        description: 'Assinatura TimesPro - Plano Profissional',
        customerName: 'Cliente Teste',
        customerEmail: 'teste@timespro.com',
        customerTaxId: '12345678909',
        customerPhone: '11999999999',
        productId: productId,
        externalId: crypto.randomUUID(),
        returnUrl: window.location.href,
        completionUrl: `${window.location.origin}/dashboard?success=true`,
        methods: method === 'pix' ? ['PIX'] : ['CREDIT_CARD']
      }
    });

    if (error) throw error;
    console.log('Resultado bruto da Function:', result);
    
    if (result.error) {
      console.error('Erro AbacatePay:', result);
      throw new Error(`${result.error}`);
    }
    
    return result.data || result; 
  } catch (error) {
    console.error('Erro ao criar cobrança via Function:', error);
    throw error;
  }
}

export const abacatePay = {
  createBilling
};

export default abacatePay;
