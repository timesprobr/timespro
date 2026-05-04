import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Smartphone, 
  Copy, 
  Clock,
  Info,
  CreditCard
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { organization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [amount, setAmount] = useState(0);
  const [displayOrg, setDisplayOrg] = useState<any>(null);
  const [pixData, setPixData] = useState<{ qrcode: string; code: string; url?: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    loadCheckoutData();
  }, [id]);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{1})(\d{4})(\d)/, '$2-$3')
      .replace(/(\(\d{2}\)) (\d) (\d{4})(\d)/, '$1 $2 $3-$4')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, taxId: formatted }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const loadCheckoutData = async () => {
    try {
      setLoading(true);
      // Se o ID parece um UUID, buscamos por ID, senão apenas por external_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      let query = supabase
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
        `);

      if (isUUID) {
        query = query.or(`id.eq.${id},external_id.eq.${id}`);
      } else {
        query = query.eq('external_id', id);
      }

      const { data: payment, error: paymentError } = await query.maybeSingle();

      if (paymentError) throw paymentError;

      if (payment) {
        const subscription = payment.athlete_subscriptions;
        const athlete = subscription.athletes;
        const plan = subscription.membership_plans;

        // Definimos os dados do faturamento para o Card
        setBillingData({
          ...payment,
          description: plan?.name || 'Mensalidade',
          athletes: athlete
        });
        
        setAmount(Number(payment.amount));
        
        // GARANTIA: Formulário SEMPRE inicia vazio para o pagador
        setFormData({
          name: '',
          taxId: '',
          email: '',
          phone: ''
        });
        
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', payment.organization_id || athlete?.organization_id)
          .single();
        
        if (org) setDisplayOrg(org);
      }
    } catch (err) {
      console.error('Erro ao carregar checkout:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (loading) return;
    if (!formData.name || !formData.taxId) {
      alert('Por favor, preencha nome e CPF para gerar o PIX');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amountCentavos: Math.round(amount * 100),
        description: billingData?.description || 'Mensalidade TimesPro',
        customerName: formData.name,
        customerTaxId: formData.taxId.replace(/\D/g, ''), // Limpar para AbacatePay
        customerEmail: formData.email,
        customerPhone: formData.phone.replace(/\D/g, ''), // Limpar para AbacatePay
        externalId: id,
        method: 'PIX',
        clubeId: billingData?.organization_id || displayOrg?.id || billingData?.athletes?.organization_id
      };

      const { data: result, error } = await supabase.functions.invoke('create-billing', {
        body: payload
      });

      if (error) throw error;
      const data = result?.data?.billing || result?.data || result?.billing || result;

      if (data?.pix) {
        setPixData({
          qrcode: data.pix.qrcode,
          code: data.pix.code
        });
        setTimeLeft(1800);
      } else {
        throw new Error(result?.error || 'Não foi possível gerar o PIX.');
      }
    } catch (err: any) {
      console.error('Erro no pagamento:', err);
      alert(err.message || 'Erro ao gerar pagamento. Tente novamente.');
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
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h2 className="text-sm font-bold text-slate-900">Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-500/10 pb-6 overflow-x-hidden">
      {/* Header Ultra-Compacto */}
      <header className="py-2 px-4 bg-white sticky top-0 z-50 border-b border-slate-50 flex items-center justify-between">
        <button onClick={() => window.history.back()} className="p-1.5 -ml-1.5 text-slate-400">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-black text-base text-slate-900 tracking-tight leading-none uppercase italic">Checkout</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1 h-1 bg-[#A3E635] rounded-full"></div>
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pagamento Seguro</span>
          </div>
        </div>
        <div className="w-8 flex justify-end">
          {displayOrg?.logo_url && (
            <img src={displayOrg.logo_url} alt={displayOrg.name} className="w-6 h-6 rounded-full object-cover border border-slate-100" />
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 pt-4 space-y-6">
        
        {/* Card Estilo "Cartão de Sócio" - Clube integrado no topo do card */}
        <div className="relative">
          <div className="bg-[#1C1C1C] rounded-[28px] p-6 text-white shadow-2xl overflow-hidden relative border border-white/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A3E635]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/[0.02] rounded-full blur-[40px]" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  {displayOrg?.logo_url && (
                    <img src={displayOrg.logo_url} className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-black/20 border border-white/10" alt="" />
                  )}
                  <div className="space-y-0.5">
                    <h2 className="font-black text-lg text-white uppercase italic leading-none tracking-tight">
                      {displayOrg?.name || 'CLUBE'}
                    </h2>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#A3E635]" />
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Verificado</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A3E635] mb-1"></div>
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Membro Oficial</span>
                </div>
              </div>
              
              <div className="flex justify-between items-end pt-2">
                <div className="space-y-1">
                  <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Identificação do Atleta</p>
                  <h3 className="font-black text-xl text-white uppercase italic leading-none">
                    {billingData?.athletes?.full_name || 'ATLETA'}
                  </h3>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest">Plano Ativo</p>
                  <h4 className="font-bold text-[11px] text-[#A3E635] uppercase leading-none">
                    {billingData?.description}
                  </h4>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex items-end justify-between">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Total a Pagar</p>
                  <div className="text-[36px] font-black text-white tracking-tighter leading-none flex items-baseline gap-1.5">
                    <span className="text-sm text-white/40 font-bold">R$</span>
                    {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <CreditCard className="w-10 h-10 text-white/5 -rotate-12" />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Logic */}
        {!pixData ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#A3E635]/10 text-slate-900 rounded flex items-center justify-center font-black text-xs">1</div>
                <h3 className="text-base font-black text-slate-900 uppercase italic tracking-tight">Dados do Pagador</h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Nome Completo</label>
                  <input 
                    type="text"
                    autoComplete="new-password"
                    placeholder="Nome como no documento"
                    className="w-full bg-[#F8F9FA] border border-slate-100 rounded-xl py-3 px-4 text-[13px] text-slate-900 font-medium focus:bg-white focus:border-[#A3E635] outline-none transition-all placeholder:text-slate-300"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">CPF</label>
                    <input 
                      type="text"
                      autoComplete="new-password"
                      placeholder="000.000.000-00"
                      className="w-full bg-[#F8F9FA] border border-slate-100 rounded-xl py-3 px-4 text-[13px] text-slate-900 font-medium focus:bg-white focus:border-[#A3E635] outline-none transition-all placeholder:text-slate-300"
                      value={formData.taxId}
                      onChange={handleCPFChange}
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Celular</label>
                    <input 
                      type="text"
                      autoComplete="new-password"
                      placeholder="(00) 0 0000-0000"
                      className="w-full bg-[#F8F9FA] border border-slate-100 rounded-xl py-3 px-4 text-[13px] text-slate-900 font-medium focus:bg-white focus:border-[#A3E635] outline-none transition-all placeholder:text-slate-300"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      maxLength={16}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                  <input 
                    type="email"
                    autoComplete="new-password"
                    placeholder="seu@email.com"
                    className="w-full bg-[#F8F9FA] border border-slate-100 rounded-xl py-3 px-4 text-[13px] text-slate-900 font-medium focus:bg-white focus:border-[#A3E635] outline-none transition-all placeholder:text-slate-300"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-[#A3E635] hover:bg-[#94d12d] disabled:bg-slate-100 text-[#0F172A] rounded-2xl py-4 font-black text-base shadow-lg shadow-[#A3E635]/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] uppercase italic mt-2"
              >
                {loading ? <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {loading ? 'Processando...' : 'Finalizar Pagamento'}
              </button>

              <div className="pt-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2.5 p-3 bg-slate-50/50 rounded-xl border border-slate-100 w-full">
                  <ShieldCheck className="w-6 h-6 text-[#A3E635]" />
                  <div className="space-y-0">
                    <p className="text-[9px] font-black text-slate-900 uppercase">Segurança Total</p>
                    <p className="text-[8px] text-slate-500 leading-tight">Pagamento processado com criptografia.</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-1 pt-2 opacity-40">
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">TimesPro | Plataforma para gestão de clubes</p>
                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">© 2026 Todos os direitos reservados</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Success Screen Compacta */
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl space-y-6 animate-in zoom-in-95 duration-500 text-center mx-auto max-w-[340px]">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#A3E635]/10 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6 text-[#A3E635]" />
              </div>
              <h2 className="text-xl font-black text-slate-900 italic uppercase">PIX Gerado!</h2>
              <p className="text-[10px] text-slate-500 max-w-[180px] mx-auto uppercase font-bold tracking-tight">Escaneie o código no app do seu banco</p>
            </div>

            <div className="p-3 bg-white border border-slate-50 rounded-[24px] shadow-sm flex items-center justify-center">
              <img src={pixData.qrcode} alt="QR Code PIX" className="w-48 h-48" />
            </div>

            <div className="space-y-3">
              <button
                onClick={copyPixCode}
                className="w-full py-3.5 bg-[#0F172A] text-white rounded-[18px] font-black text-[12px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all uppercase italic"
              >
                <Copy className="w-4 h-4" />
                Copiar Código PIX
              </button>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Clock className="w-3.5 h-3.5 animate-spin-slow" />
                <span className="text-[8px] font-black uppercase tracking-widest">Aguardando Pagamento...</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
