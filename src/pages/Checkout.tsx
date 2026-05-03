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
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary/30 font-sans">
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[5%] -left-[5%] w-[30%] h-[30%] bg-primary/20 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-[5%] -right-[5%] w-[30%] h-[30%] bg-primary/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Logo Compacta */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-center shadow-xl mb-4">
            {billing.organization?.logo_url ? (
              <img src={billing.organization.logo_url} alt={billing.organization.name} className="w-full h-full object-contain" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-center">
            {billing.organization?.name || 'Clube Parceiro'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <p className="text-[8px] font-black uppercase tracking-[0.4em] text-primary/80">Checkout Seguro • White Label</p>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo: Resumo */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Resumo da Cobrança</span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                  billing.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {billing.status === 'paid' ? 'Liquidado' : 'Pendente'}
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-primary leading-none">
                    R$ {billing.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h2>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mt-2">{billing.description}</p>
                </div>

                <div className="h-px bg-white/5 w-full"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Atleta</p>
                      <p className="text-xs font-black uppercase italic text-white truncate max-w-[120px]">{billing.athlete?.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Vencimento</p>
                      <p className="text-xs font-black uppercase italic text-white">Imediato</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
              <ShieldCheck className="text-emerald-500 w-4 h-4" />
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">
                Pagamento processado em ambiente seguro por <span className="text-primary">AbacatePay</span>.
              </p>
            </div>
          </div>

          {/* Lado Direito: Pagamento */}
          <div className="lg:col-span-5 relative">
            {!pixData && !cardUrl ? (
              <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 md:p-8 backdrop-blur-xl">
                <h3 className="text-sm font-black uppercase italic tracking-tighter mb-6 text-center">Selecione o Método</h3>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => handlePayment('pix')}
                    disabled={isProcessing}
                    className="group w-full p-4 rounded-2xl bg-white/5 border border-transparent hover:border-primary/50 hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <QrCode className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase italic leading-none">PIX</p>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Instantâneo</p>
                      </div>
                    </div>
                    {isProcessing && paymentMethod === 'pix' ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ArrowRight className="w-5 h-5 text-white/10 group-hover:text-primary" />}
                  </button>

                  <button 
                    onClick={() => handlePayment('card')}
                    disabled={isProcessing}
                    className="group w-full p-4 rounded-2xl bg-white/5 border border-transparent hover:border-primary/50 hover:bg-white/10 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <CreditCard className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black uppercase italic leading-none">Cartão</p>
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-1">Crédito até 12x</p>
                      </div>
                    </div>
                    {isProcessing && paymentMethod === 'card' ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ArrowRight className="w-5 h-5 text-white/10 group-hover:text-primary" />}
                  </button>
                </div>
              </div>
            ) : pixData ? (
              /* PIX INTEGRADO */
              <div className="bg-[#0a0a0a] border-2 border-primary rounded-[32px] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black uppercase italic tracking-tighter">Pague com PIX</h3>
                  <button onClick={() => setPixData(null)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white p-3 rounded-2xl shadow-inner mb-6 mx-auto w-fit">
                  <img src={pixData.qrcode} alt="QR Code Pix" className="w-40 h-40 md:w-48 md:h-48" />
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={copyPixCode}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group hover:border-primary transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-4 h-4 text-primary" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Copia e Cola</span>
                    </div>
                    <span className="text-[7px] font-bold text-white/30 uppercase truncate max-w-[120px]">{pixData.code}</span>
                  </button>
                  <p className="text-[8px] text-center text-emerald-500 font-black uppercase tracking-widest animate-pulse">
                    Aguardando confirmação do banco...
                  </p>
                </div>
              </div>
            ) : (
              /* CARTÃO INTEGRADO (IFRAME) */
              <div className="fixed inset-0 z-[100] lg:relative lg:inset-auto bg-[#0a0a0a] border-2 border-primary rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in duration-300">
                <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/10">
                  <h3 className="text-[10px] font-black uppercase tracking-widest">Pagamento via Cartão</h3>
                  <button onClick={() => setCardUrl(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-[600px] lg:h-[450px] w-full bg-white">
                   <iframe 
                    src={cardUrl!} 
                    className="w-full h-full border-none"
                    title="Checkout Seguro"
                   />
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center opacity-30">
          <p className="text-[9px] font-black uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} TimesPro • Sistema de Gestão Esportiva
          </p>
        </footer>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
