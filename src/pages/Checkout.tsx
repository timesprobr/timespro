import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  CreditCard, 
  Smartphone, 
  ArrowLeft, 
  Info, 
  CheckCircle2, 
  Copy, 
  Wallet,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';

interface BillingData {
  id?: string;
  description: string;
  amount: number;
  athlete_id?: string;
  organization_id?: string;
  athletes?: {
    full_name: string;
    document_cpf: string;
    email: string;
    whatsapp: string;
    organization_id: string;
  };
}

export default function Checkout() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { organization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [amount, setAmount] = useState(0);
  const [displayOrg, setDisplayOrg] = useState<any>(null);
  const [pixData, setPixData] = useState<{ qrcode: string; code: string; url?: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [step, setStep] = useState(1); // 1: Personal Data, 2: Payment Details (for Card)
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

  useEffect(() => {
    loadCheckoutData();
  }, [id, slug]);

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      
      // 1. Decodificar Payload Base64 (Legacy/Fallback)
      if (id?.startsWith('f_')) {
        try {
          const base64 = id.substring(2);
          const decoded = JSON.parse(atob(base64));
          
          setBillingData({
            description: decoded.ds || 'Mensalidade',
            amount: decoded.am,
            athlete_id: decoded.at,
            organization_id: decoded.og
          });
          setAmount(decoded.am);

          // Buscar organização pelo ID do payload
          if (decoded.og) {
            const { data: org } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', decoded.og)
              .single();
            if (org) setDisplayOrg(org);
          }
        } catch (e) {
          console.error('Erro ao decodificar payload:', e);
        }
      } 
      // 2. Buscar no banco (Novo padrão UUID)
      else {
        const { data: payment, error: paymentError } = await supabase
          .from('subscription_payments')
          .select(`
            *,
            athlete_subscriptions!inner (
              id,
              athletes (
                full_name,
                document_cpf,
                email,
                whatsapp,
                organization_id
              ),
              membership_plans (
                name
              )
            )
          `)
          .eq('id', id)
          .single();

        if (paymentError) throw paymentError;

        if (payment) {
          const subscription = payment.athlete_subscriptions;
          const athlete = subscription.athletes;
          const plan = subscription.membership_plans;

          setBillingData({
            ...payment,
            description: plan?.name || 'Mensalidade - Atleta',
            athletes: athlete
          });
          
          setAmount(Number(payment.amount));
          
          if (athlete) {
            setFormData({
              name: athlete.full_name || '',
              taxId: athlete.document_cpf || '',
              email: athlete.email || '',
              phone: athlete.whatsapp || ''
            });

            const { data: org } = await supabase
              .from('organizations')
              .select('*')
              .eq('id', payment.organization_id || athlete.organization_id)
              .single();
            
            if (org) setDisplayOrg(org);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCardNumber = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
  };

  const formatCVV = (value: string) => {
    return value.replace(/\D/g, '').substring(0, 4);
  };

  const handlePayment = async () => {
    try {
      // Se for cartão e estiver no passo 1, avança para o passo 2
      if (paymentMethod === 'card' && step === 1) {
        setStep(2);
        return;
      }

      setLoading(true);
      
      const payload = {
        amountCentavos: Math.round(amount * 100),
        description: billingData?.description || 'Mensalidade TimesPro',
        customerName: formData.name,
        customerTaxId: formData.taxId,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        externalId: id,
        method: paymentMethod?.toUpperCase() || 'PIX'
      };

      const { data: result, error } = await supabase.functions.invoke('create-billing', {
        body: payload
      });

      if (error) throw error;

      const data = result?.data?.billing || result?.data || result?.billing || result;

      if (paymentMethod === 'pix') {
        if (data?.pix) {
          setPixData({
            qrcode: data.pix.qrcode,
            code: data.pix.code,
            url: data.url || result.url || data.pix.url
          });
          setTimeLeft(1800);
        } else if (data?.url) {
          window.location.href = data.url;
        }
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      alert(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.code) {
      navigator.clipboard.writeText(pixData.code);
      alert('Código PIX copiado!');
    }
  };

  if (loading && !billingData) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-[#A3E635]/20 border-t-[#A3E635] rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold text-[#0F172A]">Carregando checkout...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A] pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="py-6 px-6 bg-white sticky top-0 z-50 border-b border-slate-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button onClick={() => window.history.back()} className="p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors">
               <ArrowLeft className="w-5 h-5 text-slate-400" />
             </button>
             <div className="flex flex-col">
               <span className="font-bold text-lg text-slate-900 tracking-tight">Checkout</span>
               <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-[#A3E635] rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ambiente Seguro</span>
               </div>
             </div>
          </div>
          {displayOrg?.logo_url && (
            <img src={displayOrg.logo_url} alt={displayOrg.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-50" />
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          
          {/* Coluna Esquerda: Branding e Resumo (Sempre visível) */}
          <div className="space-y-8 lg:sticky lg:top-32">
            <div className="flex items-center gap-4 mb-6 lg:mb-10">
              {displayOrg?.logo_url && (
                <img src={displayOrg.logo_url} alt={displayOrg.name} className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover shadow-xl border border-slate-100" />
              )}
              <div className="space-y-1">
                <h1 className="font-black text-2xl lg:text-3xl text-slate-900 tracking-tight leading-none uppercase italic">
                  {displayOrg?.name || 'Clube'}
                </h1>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#A3E635]" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pagamento Verificado</span>
                </div>
              </div>
            </div>

            {/* Premium Summary Card */}
            <div className="relative group">
              <div className="bg-gradient-to-br from-[#1C1C1C] via-[#2D2D2D] to-[#1C1C1C] rounded-[32px] p-8 text-white shadow-2xl overflow-hidden border border-white/10 relative transition-all duration-500">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#A3E635]/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <CreditCard className="absolute -right-8 -bottom-8 w-64 h-64 text-white/[0.03] -rotate-12 pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635]"></div>
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Resumo do Atleta</span>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-slate-400 text-sm font-medium">Atleta</p>
                      <h3 className="font-black text-2xl text-white tracking-tight uppercase italic">
                        {formData.name || billingData?.athletes?.full_name || 'Atleta'}
                      </h3>
                    </div>

                    <div className="pt-4 space-y-1">
                      <p className="text-slate-400 text-sm font-medium">Referente a</p>
                      <h4 className="font-bold text-lg text-[#A3E635]">
                        {billingData?.description || 'Mensalidade'}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10 flex items-center justify-between gap-6">
                    <div className="text-right w-full">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 text-left">Valor Total</p>
                      <div className="text-[44px] lg:text-[54px] font-black text-white tracking-tighter leading-none flex items-baseline gap-2">
                        <span className="text-[20px] text-white/40 font-bold">R$</span>
                        {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">Precisa de ajuda?</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Se tiver alguma dúvida sobre este pagamento, entre em contato diretamente com a secretaria do {displayOrg?.name}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Condicional (Formulário ou QR Code) */}
          <div className="space-y-6">
            {!pixData ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                {/* Seletor de Método (Só mostra no Step 1) */}
                {step === 1 && (
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Método de Pagamento</p>
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[24px] border border-slate-100 w-full">
                      <button
                        onClick={() => setPaymentMethod('pix')}
                        className={`flex-1 py-3 rounded-[18px] font-black text-[12px] transition-all duration-300 flex items-center justify-center gap-2 ${
                          paymentMethod === 'pix' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-400'
                        }`}
                      >
                        <Smartphone className={`w-3.5 h-3.5 ${paymentMethod === 'pix' ? 'text-[#A3E635]' : ''}`} />
                        PIX
                      </button>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`flex-1 py-3 rounded-[18px] font-black text-[12px] transition-all duration-300 flex items-center justify-center gap-2 ${
                          paymentMethod === 'card' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-400'
                        }`}
                      >
                        <CreditCard className={`w-3.5 h-3.5 ${paymentMethod === 'card' ? 'text-[#A3E635]' : ''}`} />
                        CARTÃO
                      </button>
                    </div>
                  </div>
                )}

                {/* Passo 1: Dados Pessoais */}
                {step === 1 ? (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#A3E635]/10 rounded-lg flex items-center justify-center text-[#A3E635] font-bold text-xs">1</div>
                        <h2 className="text-[16px] font-extrabold text-slate-900 tracking-tight">Dados do Pagador</h2>
                      </div>
                      {paymentMethod === 'card' && <span className="text-[10px] font-bold text-slate-400 uppercase">Passo 1 de 2</span>}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                        <input 
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#A3E635] transition-all text-sm"
                          placeholder="Nome como no documento"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CPF</label>
                          <input 
                            type="text" 
                            value={formData.taxId}
                            onChange={(e) => setFormData({...formData, taxId: formatCPF(e.target.value)})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#A3E635] transition-all text-sm"
                            placeholder="000.000.000-00"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Celular</label>
                          <input 
                            type="text" 
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: formatPhone(e.target.value)})}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#A3E635] transition-all text-sm"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-[#A3E635] transition-all text-sm"
                          placeholder="seu@email.com"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Passo 2: Dados do Cartão */
                  <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setStep(1)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                          <ArrowLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <div className="w-7 h-7 bg-[#A3E635]/10 rounded-lg flex items-center justify-center text-[#A3E635] font-bold text-xs">2</div>
                        <h2 className="text-[16px] font-extrabold text-slate-900 tracking-tight">Dados do Cartão</h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Passo 2 de 2</span>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Número do Cartão</label>
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000"
                          value={cardData.number}
                          onChange={(e) => setCardData({...cardData, number: formatCardNumber(e.target.value)})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Validade</label>
                          <input 
                            type="text" 
                            placeholder="MM/AA"
                            value={cardData.expiry}
                            onChange={(e) => setCardData({...cardData, expiry: formatExpiry(e.target.value)})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">CVV</label>
                          <input 
                            type="text" 
                            placeholder="000"
                            value={cardData.cvv}
                            onChange={(e) => setCardData({...cardData, cvv: formatCVV(e.target.value)})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome no Cartão</label>
                        <input 
                          type="text" 
                          placeholder="Como impresso no cartão"
                          value={cardData.name}
                          onChange={(e) => setCardData({...cardData, name: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm uppercase"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={loading || !paymentMethod}
                  className="w-full py-4 bg-[#A3E635] text-[#0F172A] rounded-[20px] font-black text-base shadow-xl shadow-[#A3E635]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#0F172A]/20 border-t-[#0F172A] rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      {paymentMethod === 'card' && step === 1 ? 'PRÓXIMO PASSO' : 'FINALIZAR PAGAMENTO'}
                    </>
                  )}
                </button>

                {/* Segurança e Rodapé Compacto */}
                <div className="pt-6 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <ShieldCheck className="w-8 h-8 text-[#A3E635]" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Segurança Total</p>
                      <p className="text-[10px] text-slate-500 leading-tight">Dados protegidos por criptografia de ponta.</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">© 2026 TimesPro</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-[#A3E635] rounded-full"></div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Sistema Oficial</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tela de Sucesso / QR Code (Já otimizada) */
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-[#A3E635]/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Smartphone className="w-6 h-6 text-[#A3E635]" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 italic uppercase">PIX Gerado!</h2>
                  <p className="text-xs text-slate-500">Escaneie o código abaixo para pagar</p>
                </div>

                <div className="p-3 bg-white border-2 border-slate-50 rounded-[24px] shadow-inner flex items-center justify-center">
                  <img src={pixData.qrcode} alt="QR Code PIX" className="w-56 h-56" />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={copyPixCode}
                    className="w-full py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                    COPIAR CÓDIGO PIX
                  </button>
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando pagamento...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* Footer original removido pois foi movido para cima */}
    </div>
  );
}
