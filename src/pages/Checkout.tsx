import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Copy, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  Smartphone,
  Info,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { useParams } from 'react-router-dom';

const Checkout: React.FC = () => {
  const { organization } = useOrg();
  const { id } = useParams();
  const [billingData, setBillingData] = useState<any>(null);
  const [amount, setAmount] = useState<number>(49.90);
  const [organizationOverride, setOrganizationOverride] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const displayOrg = organization || organizationOverride;
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: ''
  });

  const [cardData, setCardData] = useState({ 
    number: '', 
    expiry: '', 
    cvv: '', 
    name: '' 
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const loadCheckoutData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        // 1. Verificar se é um payload de fallback (f_)
        if (id.startsWith('f_')) {
          console.log('Detectado payload de fallback:', id);
          const payloadBase64 = id.substring(2);
          const decodedData = JSON.parse(atob(payloadBase64));
          console.log('Dados decodificados:', decodedData);
          
          setBillingData(decodedData);
          setAmount(decodedData.amount || 49.90);
          setOrganizationOverride({
            name: decodedData.org_name || 'Clube Parceiro',
            logo_url: decodedData.org_logo
          });
          
          if (decodedData.athlete_name) {
            setFormData(prev => ({ ...prev, name: decodedData.athlete_name }));
          }
        } 
        // 2. Se for um UUID, buscar no banco
        else {
          const { data: billing, error: billingError } = await supabase!
            .from('athlete_billings')
            .select('*, athletes(full_name, cpf, email, whatsapp, organization_id)')
            .eq('id', id)
            .single();

          if (billingError) throw billingError;

          if (billing) {
            setBillingData(billing);
            setAmount(billing.amount);
            
            // Preencher form com dados do atleta se disponíveis
            if (billing.athletes) {
              setFormData({
                name: billing.athletes.full_name || '',
                taxId: billing.athletes.cpf || '',
                email: billing.athletes.email || '',
                phone: billing.athletes.whatsapp || ''
              });
            }

            // Buscar organização
            const { data: org } = await supabase!
              .from('organizations')
              .select('*')
              .eq('id', billing.organization_id)
              .single();
            
            if (org) setOrganizationOverride(org);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados do checkout:', err);
        showToast('Não foi possível carregar as informações da cobrança', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [id]);

  useEffect(() => {
    if (pixData && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pixData, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCPF = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11);
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.substring(0, 3)}.${v.substring(3)}`;
    if (v.length <= 9) return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
    return `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
  };

  const formatPhone = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 11);
    if (v.length <= 2) return v;
    if (v.length <= 7) return `(${v.substring(0, 2)}) ${v.substring(2)}`;
    return `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 16);
    return v.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, '').substring(0, 4);
    if (v.length >= 3) return `${v.substring(0, 2)}/${v.substring(2)}`;
    return v;
  };

  const formatCVV = (value: string) => value.replace(/\D/g, '').substring(0, 4);

  const copyToClipboard = () => {
    if (pixData?.code) {
      navigator.clipboard.writeText(pixData.code);
      showToast('Código copiado!', 'success');
    }
  };

  const handlePayment = async (method: 'pix' | 'card') => {
    try {
      // Validação básica
      if (!formData.name || !formData.email || !formData.taxId || !formData.phone) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
      }

      setLoading(true);
      setPaymentMethod(method);

      if (!supabase) throw new Error('Supabase não configurado');

      const productId = import.meta.env.VITE_ABACATEPAY_PRODUTO_MENSAL_AVULSO_ID;

      console.log('Iniciando pagamento:', { method, amount, productId });

      const { data: result, error } = await supabase.functions.invoke('create-billing', {
        body: {
          amountCentavos: Math.round(amount * 100),
          description: billingData?.description || 'Assinatura TimesPro - Plano Profissional',
          customerName: formData.name,
          customerEmail: formData.email,
          customerTaxId: formData.taxId.replace(/\D/g, ''),
          customerPhone: formData.phone.replace(/\D/g, ''),
          productId: productId,
          externalId: id?.startsWith('f_') ? (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).substring(2)) : id,
          returnUrl: window.location.href,
          completionUrl: `${window.location.origin}/dashboard?success=true`,
          methods: method === 'pix' ? ['PIX'] : ['CREDIT_CARD']
        }
      });

      if (error) {
        console.error('Erro na chamada da Function:', error);
        throw error;
      }
      
      console.log('Resposta bruta da Function:', result);
      
      // AbacatePay v2 pode retornar { data: { billing: ... } } ou { billing: ... } ou direto o objeto
      const data = result?.data?.billing || result?.data || result?.billing || result;
      console.log('Dados processados para UI:', data);

      if (data?.error || result?.error) {
        throw new Error(data?.error || result?.error);
      }

      if (method === 'pix') {
        if (data?.pix) {
          setPixData({
            qrcode: data.pix.qrcode,
            code: data.pix.code,
            url: data.url || result.url
          });
          setTimeLeft(1800);
          showToast('Código PIX gerado com sucesso!');
        } else {
          console.error('Dados do PIX ausentes na resposta:', data);
          throw new Error('A API não retornou os dados do PIX. Verifique os logs.');
        }
      } else if (method === 'card' && data?.url) {
        window.location.href = data.url;
      } else if (data?.url) {
        // Fallback para qualquer URL retornada
        window.location.href = data.url;
      } else {
        throw new Error('Não foi possível gerar o link de pagamento.');
      }
    } catch (err: any) {
      console.error('Erro detalhado no pagamento:', err);
      showToast(err.message || 'Erro ao processar pagamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !billingData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-[#A3E635]/20 border-t-[#A3E635] rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-[#0F172A]">Carregando checkout...</h2>
        <p className="text-slate-500 mt-2">Estamos preparando seu ambiente de pagamento seguro.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A] pb-20 selection:bg-[#A3E635]/30 overflow-x-hidden">
      {/* Header Minimalista e Seguro */}
      <header className="py-6 px-6 bg-white sticky top-0 z-50">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => window.history.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
               <ArrowLeft className="w-5 h-5 text-slate-400" />
             </button>
             <div className="flex flex-col">
               <span className="font-display font-extrabold text-[18px] leading-tight text-slate-900 tracking-tight">Checkout</span>
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-[#A3E635] rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ambiente Seguro</span>
               </div>
             </div>
          </div>
          {displayOrg?.logo_url && (
            <img src={displayOrg.logo_url} alt={displayOrg.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-50 shadow-sm" />
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6">
        {!pixData ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out">
            
            {/* Premium Summary Card - Estilo Wallet Modern */}
            <div className="relative">
              <div className="bg-[#0D0D0D] rounded-[32px] p-8 text-white shadow-2xl overflow-hidden border border-white/5">
                {/* Wallet Ghost Icon */}
                <Wallet className="absolute -right-6 top-1/2 -translate-y-1/2 w-48 h-48 text-white/[0.03] -rotate-12 pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#A3E635] shadow-[0_0_8px_#A3E635]"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Resumo do Plano</span>
                      </div>
                      <h3 className="font-display font-black text-[26px] text-white leading-tight tracking-tight">
                        {billingData?.description || 'Mensalidade - Atleta'}
                      </h3>
                      <p className="text-[13px] text-[#A3E635] font-black uppercase tracking-widest">
                        {displayOrg?.name || 'Racing FC'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <ShieldCheck className="w-4 h-4 text-[#A3E635]" />
                      <span className="text-[10px] font-black text-white/70 uppercase tracking-widest leading-none">Pagamento Seguro</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Valor Total</p>
                      <div className="text-[34px] font-black text-white tracking-tighter whitespace-nowrap leading-none">
                        R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Selecione o método de pagamento</p>
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-[24px] border border-slate-200/50 w-full max-w-[340px] shadow-inner">
                  <button
                    onClick={() => setPaymentMethod('pix')}
                    className={`flex-1 py-4 px-6 rounded-[20px] font-black text-[13px] transition-all flex items-center justify-center gap-3 ${
                      paymentMethod === 'pix' 
                        ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-[1.02] border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Smartphone className={`w-4 h-4 ${paymentMethod === 'pix' ? 'text-[#A3E635]' : ''}`} />
                    PIX
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex-1 py-4 px-6 rounded-[20px] font-black text-[13px] transition-all flex items-center justify-center gap-3 ${
                      paymentMethod === 'card' 
                        ? 'bg-white text-slate-900 shadow-xl shadow-slate-200/50 scale-[1.02] border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${paymentMethod === 'card' ? 'text-[#A3E635]' : ''}`} />
                    CARTÃO
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="pt-2">
                {!paymentMethod ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Smartphone className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-900">Aguardando seleção</p>
                      <p className="text-sm text-slate-400">Escolha PIX ou Cartão para continuar</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Personal Information */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#A3E635]/10 rounded-lg flex items-center justify-center">
                          <Info className="w-4 h-4 text-[#A3E635]" />
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight">Seus Dados</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Nome Completo</label>
                          <input 
                            type="text" 
                            placeholder="Ex: João Silva" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] focus:ring-4 focus:ring-[#A3E635]/5 focus:bg-white transition-all"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">CPF</label>
                            <input 
                              type="text" 
                              placeholder="000.000.000-00" 
                              value={formData.taxId}
                              onChange={(e) => setFormData({...formData, taxId: formatCPF(e.target.value)})}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] focus:ring-4 focus:ring-[#A3E635]/5 focus:bg-white transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Celular</label>
                            <input 
                              type="text" 
                              placeholder="(00) 00000-0000" 
                              value={formData.phone}
                              onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] focus:ring-4 focus:ring-[#A3E635]/5 focus:bg-white transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">E-mail</label>
                          <input 
                            type="email" 
                            placeholder="seu@email.com" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] focus:ring-4 focus:ring-[#A3E635]/5 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Credit Card Section */}
                    {paymentMethod === 'card' && (
                      <div className="space-y-6 pt-4 animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-blue-500" />
                          </div>
                          <h2 className="text-[18px] font-extrabold text-slate-900 tracking-tight">Dados do Cartão</h2>
                        </div>
                        
                        <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-5">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Número do Cartão</label>
                            <div className="relative">
                              <input 
                                type="text" 
                                placeholder="0000 0000 0000 0000" 
                                value={cardData.number}
                                onChange={(e) => setCardData({...cardData, number: formatCardNumber(e.target.value)})}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] transition-all"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-50">
                                <div className="w-7 h-4 bg-slate-200 rounded-sm"></div>
                                <div className="w-7 h-4 bg-slate-200 rounded-sm"></div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Validade</label>
                              <input 
                                type="text" 
                                placeholder="MM/AA" 
                                value={cardData.expiry}
                                onChange={(e) => setCardData({...cardData, expiry: formatExpiry(e.target.value)})}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] transition-all"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">CVV</label>
                              <input 
                                type="text" 
                                placeholder="123" 
                                value={cardData.cvv}
                                onChange={(e) => setCardData({...cardData, cvv: formatCVV(e.target.value)})}
                                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-400 ml-1 uppercase tracking-wider">Nome no Cartão</label>
                            <input 
                              type="text" 
                              placeholder="COMO IMPRESSO" 
                              value={cardData.name}
                              onChange={(e) => setCardData({...cardData, name: e.target.value.toUpperCase()})}
                              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[16px] focus:outline-none focus:border-[#A3E635] transition-all uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-6 pb-12 space-y-6">
                      <button 
                        onClick={() => handlePayment(paymentMethod)}
                        disabled={loading}
                        className="w-full py-5 bg-[#A3E635] hover:bg-[#94D12D] text-[#0F172A] rounded-[24px] font-black text-[18px] flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-[#A3E635]/20 group"
                      >
                        {loading ? (
                          <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>{paymentMethod === 'pix' ? 'Gerar Código PIX' : 'Pagar Agora'}</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>

                      <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
                          <Lock className="w-3.5 h-3.5 text-[#A3E635]" />
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tecnologia AbacatePay • SSL 256 bits</span>
                        </div>
                        <div className="flex items-center gap-8 opacity-20 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-700">
                          <img src="https://logodownload.org/wp-content/uploads/2020/02/pix-bc-logo.png" alt="PIX" className="h-4" />
                          <img src="https://logodownload.org/wp-content/uploads/2014/10/visa-logo-1.png" alt="Visa" className="h-3" />
                          <img src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo.png" alt="Mastercard" className="h-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 max-w-sm mx-auto">
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 text-center space-y-8 shadow-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-[#A3E635]/10 rounded-full flex items-center justify-center mb-1 border-4 border-[#A3E635]/5">
                  <Smartphone className="w-10 h-10 text-[#A3E635]" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-display font-black text-[28px] text-slate-900 tracking-tight">PIX Gerado!</h2>
                  <p className="text-slate-500 text-[14px] font-medium leading-relaxed px-4">
                    Escaneie o código abaixo no app do seu banco para pagar.
                  </p>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="relative inline-block bg-white p-6 rounded-[36px] border border-slate-100 shadow-xl group">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#A3E635]/5 to-blue-500/5 rounded-[36px]"></div>
                {pixData.qrcode && (
                  <img 
                    src={pixData.qrcode} 
                    alt="PIX QR Code" 
                    className="relative z-10 w-52 h-52 mix-blend-multiply"
                  />
                )}
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-center gap-3 text-slate-500 font-bold text-[12px] uppercase tracking-widest bg-slate-50 py-3 rounded-2xl border border-slate-100">
                  <Clock className="w-4 h-4 text-[#A3E635] animate-pulse" />
                  <span>Expira em:</span>
                  <span className="text-slate-900 tabular-nums font-black">{formatTime(timeLeft)}</span>
                </div>

                <div className="space-y-3">
                   <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Pix Copia e Cola</p>
                   <button 
                    onClick={copyToClipboard}
                    className="w-full p-2 bg-[#0F172A] text-white rounded-2xl flex items-center justify-between group active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                  >
                    <span className="text-[13px] font-medium truncate px-4 opacity-40 font-mono">
                      {pixData.code}
                    </span>
                    <div className="flex items-center gap-2 bg-[#A3E635] text-[#0F172A] px-5 py-3 rounded-xl text-[12px] font-black flex-shrink-0 shadow-lg shadow-[#A3E635]/20">
                      <Copy className="w-4 h-4" />
                      COPIAR
                    </div>
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setPixData(null)}
                className="text-slate-400 hover:text-slate-900 text-[13px] font-bold flex items-center justify-center gap-2 mx-auto transition-all group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Alterar forma de pagamento
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#A3E635] rounded-full animate-ping"></div>
                Aguardando Confirmação
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="max-w-xl mx-auto px-6 mt-12 text-center pb-12">
        <div className="pt-8 border-t border-slate-100 space-y-4">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            TimesPro • Gestão Inteligente
          </p>
        </div>
      </footer>

      {/* Toast Notification Premium */}
      {toast && (
        <div className="fixed bottom-10 left-6 right-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 text-[14px] font-extrabold border ${
            toast.type === 'success' ? 'bg-white border-[#A3E635]/20 text-slate-900' : 
            toast.type === 'error' ? 'bg-white border-red-100 text-red-600' : 
            'bg-[#0F172A] text-white border-white/10'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-[#A3E635]/10 text-[#A3E635]' : 
              toast.type === 'error' ? 'bg-red-50 text-red-600' : 
              'bg-white/10 text-white'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {toast.type === 'error' && <Info className="w-5 h-5" />}
            </div>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

