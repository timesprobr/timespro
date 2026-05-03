import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Heart, 
  Target, 
  Calendar, 
  User, 
  Loader2, 
  TrendingUp,
  ShieldCheck,
  MapPin,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { abacatePay } from '../lib/abacatepay';
import { toPng } from 'html-to-image';
import { Share2, X, Download, Share } from 'lucide-react';

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  image_url: string | null;
  gallery_urls?: string[];
  end_date: string | null;
  responsible_name: string;
  status: string;
  organization_id: string;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  address: string | null;
}

export default function VaquinhaPublica() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isContributing, setIsContributing] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [paymentData, setPaymentData] = useState<{url: string, pix?: {qrcode: string, code: string}} | null>(null);
  
  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Countdown State
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  // Form State
  const [amount, setAmount] = useState('50,00');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');

  // Share State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [base64Logo, setBase64Logo] = useState<string | null>(null);
  const [base64Campaign, setBase64Campaign] = useState<string | null>(null);

  // Pre-fetch images to base64 for CORS
  useEffect(() => {
    const convertToBase64 = async (url: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Error converting image:', e);
        return null;
      }
    };

    if (org?.logo_url) convertToBase64(org.logo_url).then(setBase64Logo);
    if (campaign?.image_url) convertToBase64(campaign.image_url).then(setBase64Campaign);
  }, [org?.logo_url, campaign?.image_url]);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  useEffect(() => {
    if (campaign?.end_date) {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(campaign.end_date!).getTime();
        const diff = end - now;

        if (diff <= 0) {
          clearInterval(timer);
          setTimeLeft(null);
        } else {
          setTimeLeft({
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000)
          });
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [campaign]);

  const fetchAllData = async () => {
    try {
      // Fetch Campaign
      const { data: campaignData, error: campaignError } = await supabase!
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();
      
      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch Organization
      if (campaignData.organization_id) {
        const { data: orgData, error: orgError } = await supabase!
          .from('organizations')
          .select('*')
          .eq('id', campaignData.organization_id)
          .single();
        
        if (!orgError) setOrg(orgData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const maskCurrency = (value: string) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
    return v;
  };

  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setIsContributing(true);
    try {
      const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
      const transactionId = `pub_tx_${Math.random().toString(36).substr(2, 9)}`;

      const billing = await abacatePay.createBilling({
        amount: numericAmount,
        description: `Doação Vaquinha: ${campaign.title}`,
        customerName: name || "Doador Anônimo",
        customerEmail: email,
        customerTaxId: cpf.replace(/\D/g, ''),
        externalId: transactionId,
        category: 'vaquinha',
        metadata: { campaign_id: campaign.id }
      });

      await supabase!
        .from('wallet_transactions')
        .insert({
          wallet_id: (await supabase!.from('wallets').select('id').eq('organization_id', campaign.organization_id).single()).data?.id,
          amount: numericAmount,
          type: 'credit',
          category: 'vaquinha',
          description: `Doação: ${campaign.title} (por ${name})`,
          status: 'pending',
          abacate_billing_id: billing.id
        });
          
      if (paymentMethod === 'pix') {
        setPaymentData(billing);
      } else {
        if (billing.url) window.location.href = billing.url;
      }
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      const errorMessage = err.details?.error || err.message || 'Erro desconhecido';
      alert(`Erro no pagamento: ${errorMessage}`);
    } finally {
      setIsContributing(false);
    }
  };

  const handleShare = async () => {
    const element = document.getElementById('story-card');
    if (!element) return;

    setIsGenerating(true);
    try {
      // Pequeno delay para garantir renderização
      await new Promise(r => setTimeout(r, 100));
      
      const dataUrl = await toPng(element, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#09090b',
        cacheBust: true,
      });
      
      setShareImage(dataUrl);
      setShowShareModal(true);
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem para compartilhamento.');
    } finally {
      setIsGenerating(false);
    }
  };

  const executeNativeShare = async () => {
    if (!shareImage) return;

    try {
      const response = await fetch(shareImage);
      const blob = await response.blob();
      const file = new File([blob], `vaquinha-${campaign?.title}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Ajude o ${org?.name}`,
          text: `Estamos com uma campanha aberta: ${campaign?.title}. Contribua agora!`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = `vaquinha-${campaign?.title}.png`;
        link.href = shareImage;
        link.click();
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      // Fallback download
      const link = document.createElement('a');
      link.download = `vaquinha-${campaign?.title}.png`;
      link.href = shareImage;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="text-primary animate-spin" size={40} />
      </div>
    );
  }

  if (!campaign) return null;

  const images = [campaign.image_url, ...(campaign.gallery_urls || [])].filter(Boolean) as string[];
  const progress = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-primary selection:text-black font-sans relative">
      {/* Hidden Story Card for Generation */}
      <div 
        id="story-card"
        className="fixed -left-[2000px] top-0 w-[400px] h-[711px] bg-[#09090b] flex flex-col overflow-hidden"
        style={{ zIndex: -1 }}
      >
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-full h-full bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-full h-full bg-primary/10 blur-[100px] rounded-full" />
        </div>

        {/* Main Content */}
        <div className="relative z-10 p-8 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden">
              {base64Logo ? (
                <img src={base64Logo} className="w-12 h-12 object-contain" alt="Logo" />
              ) : (
                <span className="text-2xl font-black text-primary">TP</span>
              )}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase italic tracking-tight text-white">{org?.name}</h4>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Campanha Oficial</p>
            </div>
          </div>

          {/* Campaign Image */}
          <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8 bg-zinc-900">
            {base64Campaign ? (
              <img src={base64Campaign} className="w-full h-full object-cover" alt="Campaign" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Heart size={48} className="text-zinc-800" />
              </div>
            )}
          </div>

          {/* Campaign Info */}
          <div className="flex-1 space-y-6">
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
              {campaign.title}
            </h1>
            
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Arrecadado</p>
                  <p className="text-4xl font-black italic">R$ {campaign.current_amount.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Meta</p>
                  <p className="text-lg font-black text-white italic">R$ {campaign.goal_amount.toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary shadow-[0_0_20px_rgba(163,230,53,0.4)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-8 border-t border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.2em]">Contribua em</p>
              <p className="text-[11px] font-black text-white italic">WWW.TIMESPRO.COM.BR</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black italic uppercase">Times Pro</span>
              <div className="w-6 h-6 bg-primary text-black rounded flex items-center justify-center font-black text-[10px]">TP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Share Button */}
      <button
        onClick={handleShare}
        disabled={isGenerating}
        className="fixed bottom-6 right-6 z-40 bg-primary text-black p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group overflow-hidden"
      >
        {isGenerating ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          <>
            <Share2 size={24} className="relative z-10" />
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </>
        )}
      </button>

      {/* Share Preview Modal */}
      {showShareModal && shareImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowShareModal(false)} />
          
          <div className="relative w-full max-w-sm bg-zinc-950 rounded-[40px] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header Modal */}
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-xs font-black uppercase tracking-widest italic">Preview do Card</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Image */}
            <div className="p-6 bg-zinc-900/50">
              <div className="aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                <img src={shareImage} className="w-full h-full object-contain" alt="Preview" />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 grid grid-cols-2 gap-4">
              <button
                onClick={executeNativeShare}
                className="flex items-center justify-center gap-2 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
              >
                <Share size={16} />
                Compartilhar
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `vaquinha-${campaign?.title}.png`;
                  link.href = shareImage;
                  link.click();
                }}
                className="flex items-center justify-center gap-2 py-4 bg-zinc-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all border border-white/5"
              >
                <Download size={16} />
                Salvar Foto
              </button>
            </div>
            
            <p className="text-[8px] text-zinc-500 uppercase font-bold text-center pb-6 tracking-tight">
              Poste no Instagram ou WhatsApp para ajudar o clube
            </p>
          </div>
        </div>
      )}
      {/* Header do Clube */}
      <div className="bg-zinc-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {org?.logo_url ? (
              <img src={org.logo_url} className="w-10 h-10 object-contain rounded-lg" alt={org.name} />
            ) : (
              <div className="w-10 h-10 bg-primary/20 text-primary rounded-lg flex items-center justify-center font-black">TP</div>
            )}
            <div>
              <h4 className="text-xs font-black uppercase italic tracking-tight leading-none text-white">{org?.name || 'Clube Parceiro'}</h4>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Campanha Oficial de Arrecadação</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
               <ShieldCheck size={14} className="text-primary" />
               <span className="text-[9px] font-black uppercase text-zinc-400">Ambiente Seguro</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <img src="/abacatepay.png" className="h-6 object-contain" alt="AbacatePay" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Lado Esquerdo: Conteúdo e Galeria (7 colunas) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Galeria / Carousel */}
            <div className="space-y-3">
              <div className="aspect-[16/9] rounded-[24px] overflow-hidden bg-zinc-900 border border-white/5 relative group shadow-2xl">
                <img 
                  src={images[activeImage]} 
                  className="w-full h-full object-cover animate-in fade-in duration-500" 
                  alt="Slide" 
                />
                
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setActiveImage(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-black"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button 
                      onClick={() => setActiveImage(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-black"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Miniaturas */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {images.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setActiveImage(idx)}
                      className={cn(
                        "w-16 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                        activeImage === idx ? "border-primary" : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black uppercase text-primary tracking-widest">Verificada</span>
                <span className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Lançada em {new Date(campaign.created_at).toLocaleDateString()}</span>
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">{campaign.title}</h1>
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-zinc-400 text-sm leading-relaxed">{campaign.description}</p>
              </div>

              {/* Destaque de Meta & Countdown */}
              <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Arrecadado</p>
                    <h2 className="text-3xl font-black italic">R$ {campaign.current_amount.toLocaleString('pt-BR')}</h2>
                  </div>
                  <div className="text-right space-y-0.5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Meta do Clube</p>
                    <p className="text-xl font-black text-white italic">R$ {campaign.goal_amount.toLocaleString('pt-BR')}</p>
                  </div>
                </div>

                {timeLeft && (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: timeLeft.days, label: 'Dias' },
                      { val: timeLeft.hours, label: 'Horas' },
                      { val: timeLeft.minutes, label: 'Min' },
                      { val: timeLeft.seconds, label: 'Seg' }
                    ].map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-2 text-center border border-white/5">
                        <p className="text-lg font-black leading-none text-primary">{String(t.val).padStart(2, '0')}</p>
                        <p className="text-[7px] font-black uppercase text-zinc-500 mt-1">{t.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary shadow-[0_0_15px_rgba(163,230,53,0.3)] transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase text-primary">{progress.toFixed(1)}% Completo</span>
                    <span className="text-[9px] font-black uppercase text-zinc-500 italic">Juntos somos mais fortes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Fiscais do Clube */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Dados do Clube</h5>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-primary mt-0.5" />
                    <span className="text-[11px] font-bold text-zinc-300">{org?.name}</span>
                  </div>
                  {org?.cnpj && (
                    <div className="flex items-start gap-2">
                      <FileText size={14} className="text-zinc-500 mt-0.5" />
                      <span className="text-[10px] text-zinc-500">CNPJ: {org.cnpj}</span>
                    </div>
                  )}
                  {org?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-zinc-500 mt-0.5" />
                      <span className="text-[10px] text-zinc-500 leading-snug">{org.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col justify-center text-center">
                 <ShieldCheck size={24} className="text-primary mx-auto mb-2" />
                 <h6 className="text-[9px] font-black uppercase text-white tracking-widest">Pagamento Seguro</h6>
                 <p className="text-[8px] text-zinc-400 mt-1 uppercase font-bold tracking-tight">Gerenciado pela Times Pro</p>
              </div>
            </div>
          </div>

          {/* Lado Direito: Checkout (5 colunas) */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <div className="p-6 rounded-[32px] bg-white text-zinc-950 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              
              {paymentData ? (
                <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black italic uppercase">Pagamento Gerado!</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Escaneie o QR Code ou copie o código abaixo</p>
                  </div>

                  {/* Display para QR Code / Checkout Integrado */}
                  <div className="w-full aspect-[4/5] mx-auto bg-zinc-50 border-2 border-zinc-100 rounded-2xl overflow-hidden relative">
                    <iframe 
                      src={paymentData.url} 
                      className="w-full h-full border-none"
                      title="Checkout AbacatePay"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-zinc-100 flex flex-col gap-2">
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(paymentData.url);
                          alert('Código copiado!');
                        }}
                        className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2"
                      >
                        Copiar Link de Pagamento
                        <FileText size={12} />
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setPaymentData(null)} className="text-[9px] font-black uppercase text-zinc-400 hover:text-primary transition-all underline">Fazer outra doação</button>

                  <div className="pt-4 border-t border-zinc-100 flex items-center justify-center gap-2">
                     <span className="text-[8px] font-black text-zinc-400 uppercase">Processado por</span>
                     <img src="/abacatepay.png" className="h-2.5 opacity-70" alt="AbacatePay" />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContribute} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">Quanto deseja doar?</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-primary italic">R$</span>
                      <input 
                        type="text" 
                        value={amount}
                        onChange={e => setAmount(maskCurrency(e.target.value))}
                        className="w-full bg-zinc-50 border-2 border-transparent focus:border-primary rounded-xl py-3 pl-12 text-2xl font-black italic focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Seleção de Método de Pagamento */}
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        paymentMethod === 'pix' ? "border-primary bg-primary/5" : "border-zinc-100 grayscale opacity-60"
                      )}
                    >
                      <TrendingUp size={20} className={paymentMethod === 'pix' ? "text-primary" : "text-zinc-400"} />
                      <span className="text-[9px] font-black uppercase">PIX</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                        paymentMethod === 'card' ? "border-primary bg-primary/5" : "border-zinc-100 grayscale opacity-60"
                      )}
                    >
                      <CreditCard size={20} className={paymentMethod === 'card' ? "text-primary" : "text-zinc-400"} />
                      <span className="text-[9px] font-black uppercase">Cartão</span>
                    </button>
                  </div>

                  {paymentMethod === 'card' ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="relative">
                        <CreditCard size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                        <input 
                          type="text" 
                          value={cardNumber} 
                          onChange={e => setCardNumber(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" 
                          placeholder="0000 0000 0000 0000" 
                        />
                      </div>
                      <input 
                        type="text" 
                        value={cardName} 
                        onChange={e => setCardName(e.target.value)} 
                        className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" 
                        placeholder="NOME IMPRESSO NO CARTÃO" 
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          value={cardExpiry} 
                          onChange={e => setCardExpiry(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" 
                          placeholder="MM/AA" 
                        />
                        <input 
                          type="text" 
                          value={cardCvv} 
                          onChange={e => setCardCvv(e.target.value)} 
                          className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" 
                          placeholder="CVV" 
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" placeholder="Seu Nome Completo" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" placeholder="Seu E-mail" />
                  <div className="relative">
                    <FileText size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300" />
                    <input 
                      type="text" 
                      value={cpf} 
                      onChange={e => setCpf(maskCPF(e.target.value))} 
                      required 
                      className="w-full bg-zinc-50 border border-zinc-100 rounded-lg pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-primary" 
                      placeholder="000.000.000-00" 
                      maxLength={14}
                    />
                  </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isContributing}
                    className="w-full py-4 bg-zinc-950 text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-70 group"
                  >
                    {isContributing ? <Loader2 className="animate-spin" size={16} /> : (
                      <>
                        {paymentMethod === 'pix' ? 'Gerar PIX de Doação' : 'Pagar com Cartão'}
                        <div className="flex items-center gap-1 ml-1">
                          <TrendingUp size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          <CreditCard size={16} className="opacity-70" />
                        </div>
                      </>
                    )}
                  </button>
                </form>
              )}
              
              <div className="flex flex-col items-center gap-2 pt-1 border-t border-zinc-50 mt-2">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <ShieldCheck size={12} className="text-primary" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Checkout Seguro</span>
                </div>
                <p className="text-[7px] font-bold text-zinc-400 uppercase tracking-tight text-center leading-tight">
                  Oficial do clube e gerenciado pela <span className="text-zinc-600">Times Pro</span>.<br/>
                  Pagamentos processados por <img src="/abacatepay.png" className="h-2.5 inline-block ml-1 opacity-70" alt="AbacatePay" />.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Simples */}
      <footer className="py-12 border-t border-white/5 text-center space-y-4">
         <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-primary text-black rounded-lg flex items-center justify-center font-black text-xs">TP</div>
            <span className="text-xs font-black uppercase italic tracking-tight">Times Pro</span>
         </div>
         <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">© 2026 Plataforma de Gestão Esportiva. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
