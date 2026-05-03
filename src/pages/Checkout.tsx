import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  CheckCircle2, 
  CreditCard, 
  QrCode, 
  Copy, 
  ShieldCheck,
  ArrowRight,
  Info,
  Calendar,
  User,
  ExternalLink,
  ChevronLeft,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { abacatePay } from '../lib/abacatepay';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';

interface Billing {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'expired';
  organization_id: string;
  athlete_id: string;
  athlete?: {
    full_name: string;
    photo_url: string | null;
  };
  organization?: {
    name: string;
    logo_url: string | null;
    primary_color?: string;
  };
}

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; code: string; url: string } | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (id) fetchBillingData();
  }, [id]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      if (id?.startsWith('f_')) {
        const payload = id.substring(2);
        try {
          const decodedData = JSON.parse(atob(payload));
          setBilling({
            id: 'fallback',
            amount: decodedData.amount,
            description: decodedData.description,
            status: 'pending',
            organization_id: decodedData.organization_id,
            athlete_id: decodedData.athlete_id,
            athlete: {
              full_name: decodedData.athlete_name,
              photo_url: null
            },
            organization: {
              name: decodedData.org_name,
              logo_url: decodedData.org_logo || null
            }
          });
          return;
        } catch (e) {
          throw new Error('Link de checkout inválido');
        }
      }

      const { data: billingData, error: billingError } = await supabase!
        .from('athlete_billings')
        .select(`
          *,
          athlete:athletes(full_name, photo_url),
          organization:organizations(name, logo_url, primary_color)
        `)
        .eq('id', id)
        .single();

      if (billingError) throw billingError;
      setBilling(billingData);
    } catch (err) {
      console.error('Error:', err);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (method: 'pix' | 'card') => {
    if (!billing) return;
    setPaymentMethod(method);
    setIsProcessing(true);

    try {
      const response = await abacatePay.createBilling({
        amount: billing.amount,
        description: billing.description || `Mensalidade - ${billing.athlete?.full_name}`,
        customerName: billing.athlete?.full_name || 'Atleta',
        customerEmail: 'financeiro@timespro.com.br',
        customerTaxId: '00000000000',
        methods: method === 'pix' ? ['PIX'] : ['CREDIT_CARD'],
        productId: import.meta.env.VITE_ABACATEPAY_PRODUTO_MENSAL_AVULSO_ID
      });

      if (method === 'pix' && response.pix) {
        setPixData({
          qrcode: response.pix.qrcode,
          code: response.pix.code,
          url: response.url
        });
      } else if (method === 'card' && response.url) {
        setCardUrl(response.url);
      }
    } catch (err) {
      console.error('Payment error:', err);
      showToast('Erro ao processar pagamento', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.code) {
      navigator.clipboard.writeText(pixData.code);
      showToast('Código Pix copiado!', 'success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Iniciando Checkout...</p>
        </div>
      </div>
    );
  }

  if (!billing) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 flex flex-col items-center">
        {/* Logo Minimalista */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-14 h-14 bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center justify-center shadow-2xl mb-3">
            {billing.organization?.logo_url ? (
              <img src={billing.organization.logo_url} alt={billing.organization.name} className="w-full h-full object-contain" />
            ) : (
              <ShieldCheck className="w-7 h-7 text-primary" />
            )}
          </div>
          <h1 className="text-lg font-black uppercase italic tracking-tight text-center text-white/90">
            {billing.organization?.name || 'Clube Parceiro'}
          </h1>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Lado Esquerdo: Resumo Compacto */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">Resumo da Cobrança</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider",
                  billing.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {billing.status === 'paid' ? 'Liquidado' : 'Pendente'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-primary leading-tight">
                    R$ {billing.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide mt-1">{billing.description}</p>
                </div>

                <div className="h-px bg-white/10 w-full"></div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 border border-white/5">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-wider text-white/40">Atleta</p>
                      <p className="text-[11px] font-black uppercase italic text-white/90 truncate max-w-[100px]">{billing.athlete?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 border border-white/5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-wider text-white/40">Vencimento</p>
                      <p className="text-[11px] font-black uppercase italic text-white/90">Imediato</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-5 py-3 bg-white/5 rounded-xl border border-white/5 opacity-60">
              <ShieldCheck className="text-emerald-500 w-3.5 h-3.5" />
              <p className="text-[7px] font-bold uppercase tracking-wider text-white/50">
                Pagamento processado em ambiente seguro por <span className="text-primary font-black">AbacatePay</span>.
              </p>
            </div>
          </div>

          {/* Lado Direito: Área de Pagamento Branca (Foco e Credibilidade) */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-[24px] p-6 md:p-7 shadow-2xl overflow-hidden text-slate-900 border border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-black uppercase italic tracking-tighter text-slate-400">Pagamento Nativo</h3>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              
              {!pixData && !cardUrl ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => setPaymentMethod('pix')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                        paymentMethod === 'pix' ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      <QrCode className={cn("w-5 h-5", paymentMethod === 'pix' ? "text-primary" : "text-slate-400")} />
                      <span className="text-[9px] font-black uppercase tracking-widest">PIX</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                        paymentMethod === 'card' ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      <CreditCard className={cn("w-5 h-5", paymentMethod === 'card' ? "text-primary" : "text-slate-400")} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Cartão</span>
                    </button>
                  </div>

                  {paymentMethod === 'pix' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <p className="text-[9px] font-bold text-slate-500 uppercase text-center">Clique para gerar seu código PIX</p>
                        <button 
                          onClick={() => handlePayment('pix')}
                          disabled={isProcessing}
                          className="w-full bg-slate-900 text-white p-3.5 rounded-xl font-black uppercase italic text-[11px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar Código PIX"}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                      <div className="space-y-3">
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="NÚMERO DO CARTÃO" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all"
                          />
                          <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            placeholder="VALIDADE (MM/AA)" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all"
                          />
                          <input 
                            type="text" 
                            placeholder="CVV" 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all"
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="NOME NO CARTÃO" 
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all"
                        />
                        <button 
                          onClick={() => handlePayment('card')}
                          disabled={isProcessing}
                          className="w-full bg-primary text-black p-3.5 rounded-xl font-black uppercase italic text-[11px] tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar Pagamento"}
                        </button>
                      </div>
                      <p className="text-[8px] text-center text-slate-400 font-bold uppercase tracking-widest">
                        Processamento seguro via SSL de 256 bits
                      </p>
                    </div>
                  )}

                  {!paymentMethod && (
                    <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Selecione uma opção acima</p>
                    </div>
                  )}
                </div>
              ) : pixData ? (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento via PIX</p>
                    <button onClick={() => setPixData(null)} className="text-[9px] font-black text-primary uppercase underline">Voltar</button>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                      <img src={pixData.qrcode} alt="QR Code Pix" className="w-40 h-40" />
                    </div>
                    
                    <button 
                      onClick={copyPixCode}
                      className="w-full p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between group hover:bg-black transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <Copy className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Copiar Código</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-active:opacity-100 transition-opacity" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Sincronizando com o banco...</p>
                    </div>
                    <p className="text-[7px] text-slate-400 uppercase font-bold">O comprovante é gerado automaticamente</p>
                  </div>
                </div>
              ) : (
                /* REDIRECIONAMENTO NATIVO (NO IFRAME) */
                <div className="space-y-5 animate-in fade-in duration-300 text-center py-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic">Ambiente de Segurança</h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-2 px-8">
                      Você será levado ao ambiente seguro de processamento de cartão para finalizar sua transação.
                    </p>
                  </div>
                  <button 
                    onClick={() => window.open(cardUrl!, '_blank')}
                    className="w-full bg-slate-900 text-white p-4 rounded-xl font-black uppercase italic text-[11px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    Abrir Checkout Seguro <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={() => setCardUrl(null)} className="text-[9px] font-black text-slate-400 uppercase underline">Cancelar e Voltar</button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-10 text-center opacity-20">
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-white">
            © {new Date().getFullYear()} TimesPro • High Performance Checkout
          </p>
        </footer>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
