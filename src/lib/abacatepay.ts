// TimesPro - AbacatePay Integration Service

import { supabase } from './supabase';

export interface AbacateBillingRequest {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  customerTaxId: string; // CPF/CNPJ
  customerPhone: string;
  productId?: string; // ID do produto no AbacatePay
  externalId: string; // Nosso ID de transação
  category: 'mensalidade' | 'vaquinha' | 'saas';
  metadata?: any;
}

export const abacatePay = {
  /**
   * Cria uma cobrança única via Supabase Function (Proxy seguro)
   */
  async createBilling(data: AbacateBillingRequest) {
    if (!supabase) throw new Error('Supabase não configurado');

    try {
      const { data: result, error } = await supabase.functions.invoke('create-billing', {
        body: {
          amountCentavos: Math.round(data.amount * 100),
          description: data.description,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerTaxId: data.customerTaxId,
          customerPhone: data.customerPhone,
          productId: data.productId,
          externalId: data.externalId,
          returnUrl: `${window.location.origin}/doar/${data.metadata?.campaign_id || ''}`,
          completionUrl: `${window.location.origin}/doar/${data.metadata?.campaign_id || ''}?success=true`,
          methods: ['PIX']
        }
      });

      if (error) throw error;
      if (result.error) {
        console.error('Erro AbacatePay:', result);
        throw new Error(`${result.error} ${result.debug_payload ? '| Dados: ' + JSON.stringify(result.debug_payload) : ''}`);
      }
      
      // Retornamos o objeto data completo para ter acesso ao PIX
      return result.data; 
    } catch (error) {
      console.error('Erro ao criar cobrança via Function:', error);
      throw error;
    }
  },

};
