import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  MapPin, 
  Calendar, 
  Bus, 
  Check, 
  ChevronLeft, 
  CreditCard, 
  Smartphone, 
  ShieldCheck,
  QrCode,
  Download,
  Share2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GameTicket {
  id: string;
  opponent: string;
  location: string;
  game_date: string;
  base_price: number;
  fan_price_type: 'fixed' | 'percent';
  fan_price_value: number;
  has_transport: boolean;
  banner_url: string;
  opponent_crest_url: string;
  stadium_name?: string;
  transport_check_in_time: string;
  transport_check_in_location: string;
  transport_vacancies: number;
  extra_services: string[];
  organization_id: string;
}

export default function CompraIngresso() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<GameTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseStep, setPurchaseStep] = useState(1); // 1: Info, 2: Checkout, 3: Success
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [isFanMember, setIsFanMember] = useState(false);
  const [wantsTransport, setWantsTransport] = useState(false);
  
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    document: '',
    email: ''
  });

  useEffect(() => {
    fetchTicketData();
  }, [id]);

  async function fetchTicketData() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  }

  const finalPrice = ticket ? (
    isFanMember 
      ? (ticket.fan_price_type === 'fixed' ? ticket.fan_price_value : ticket.base_price * (1 - ticket.fan_price_value / 100))
      : ticket.base_price
  ) : 0;

  const handlePurchase = async () => {
    if (!ticket) return;
    
    try {
      const { error } = await supabase
        .from('ticket_purchases')
        .insert([{
          ticket_id: ticket.id,
          organization_id: ticket.organization_id,
          buyer_name: buyerInfo.name,
          buyer_document: buyerInfo.document,
          buyer_email: buyerInfo.email,
          is_fan_member: isFanMember,
          wants_transport: wantsTransport,
          paid_amount: finalPrice,
          payment_status: 'paid', // Simulando pagamento já confirmado
          payment_method: paymentMethod
        }]);

      if (error) throw error;
      setPurchaseStep(3);
    } catch (error) {
      console.error('Error recording purchase:', error);
      alert('Erro ao processar compra. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10">
          <Ticket size={40} className="text-zinc-500" />
        </div>
        <h1 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Ingresso Não Encontrado</h1>
        <p className="text-zinc-400 max-w-xs mb-8 text-sm uppercase font-bold tracking-widest">Este evento pode ter sido encerrado ou o link está incorreto.</p>
        <button onClick={() => navigate(-1)} className="px-8 py-3 bg-white text-black font-black italic tracking-tighter uppercase rounded-2xl">
          VOLTAR
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-20">
      {/* Header Fixo Mobile */}
      <div className="fixed top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-[#09090b] to-transparent pointer-events-none">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 text-white pointer-events-auto hover:scale-110 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {purchaseStep === 3 ? (
        <div className="max-w-md mx-auto px-6 pt-12 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <Check size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-3xl font-black italic tracking-tighter uppercase">COMPRA CONFIRMADA!</h2>
            <p className="text-zinc-400 text-xs font-bold tracking-widest mt-2 uppercase">Apresente o ingresso abaixo no evento</p>
          </div>

          {/* Virtual Ticket */}
          <div className="bg-[#18181b] rounded-[40px] overflow-hidden border border-white/10 shadow-2xl relative">
            {/* Top Section */}
            <div className="relative h-48">
              <img src={ticket.banner_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800"} className="w-full h-full object-cover" alt="Banner" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6 flex items-center gap-4">
                {ticket.opponent_crest_url && (
                  <div className="w-12 h-12 rounded-full bg-white p-1 border border-white/20 overflow-hidden shrink-0">
                    <img src={ticket.opponent_crest_url} className="w-full h-full object-contain" alt="Escudo" />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">{ticket.opponent}</h3>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{ticket.stadium_name || ticket.location}</p>
                </div>
              </div>
            </div>

            {/* Middle Section */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">DATA E HORA</p>
                  <p className="font-bold text-sm">
                    {ticket.game_date ? format(new Date(ticket.game_date), "dd/MM 'às' HH:mm", { locale: ptBR }) : '--/--'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">TITULAR</p>
                  <p className="font-bold text-sm uppercase truncate">{buyerInfo.name || 'TORCEDOR VIP'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col items-center">
                <div className="bg-white p-4 rounded-3xl mb-4">
                  <QrCode size={120} className="text-black" />
                </div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">VALIDAÇÃO DIGITAL</p>
                <p className="text-[11px] font-bold text-primary mt-1">#TSPRO-{Math.random().toString(36).substring(7).toUpperCase()}</p>
              </div>
            </div>

            {/* Ticket Cutout Design */}
            <div className="absolute left-0 top-[200px] -translate-x-1/2 w-8 h-8 bg-[#09090b] rounded-full" />
            <div className="absolute right-0 top-[200px] translate-x-1/2 w-8 h-8 bg-[#09090b] rounded-full" />
            <div className="absolute left-4 right-4 top-[216px] border-t-2 border-dashed border-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl font-black italic tracking-tighter uppercase hover:bg-white/10 transition-all">
              <Download size={18} /> SALVAR
            </button>
            <button className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl font-black italic tracking-tighter uppercase hover:bg-white/10 transition-all">
              <Share2 size={18} /> COMPARTILHAR
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna da Esquerda: Banner e Identidade */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative rounded-[32px] overflow-hidden shadow-2xl border border-white/5 group">
                <img 
                  src={ticket.banner_url || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800"} 
                  className="w-full aspect-[4/5] lg:aspect-auto lg:h-[600px] object-cover group-hover:scale-105 transition-transform duration-700" 
                  alt="Game Banner" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
                
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-primary text-black text-[9px] font-black uppercase tracking-widest rounded-md">EM ALTA</span>
                    <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">INGRESSOS LIMITADOS</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {ticket.opponent_crest_url && (
                      <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl p-2 border border-white/20 shadow-2xl">
                        <img src={ticket.opponent_crest_url} className="w-full h-full object-contain" alt="Escudo" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none mb-1.5">{ticket.opponent}</h1>
                      <div className="flex flex-wrap items-center gap-3 text-zinc-400 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-primary" />
                          {ticket.stadium_name || ticket.location}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {ticket.game_date ? format(new Date(ticket.game_date), "dd 'de' MMMM", { locale: ptBR }) : '--'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna da Direita: Informações e Compra */}
            <div className="lg:col-span-5 lg:sticky lg:top-8">
              {purchaseStep === 1 ? (
                <div className="space-y-4">
                  {/* Info Card */}
                  <div className="bg-[#18181b] p-6 rounded-[32px] border border-white/10 shadow-2xl space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Ticket size={16} />
                        </div>
                        <h3 className="text-base font-black italic tracking-tighter uppercase">Sobre o Evento</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors">
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">VALOR UNITÁRIO</p>
                          <p className="text-lg font-black italic tracking-tighter">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticket.base_price)}
                          </p>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 hover:bg-primary/10 transition-colors">
                          <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">SÓCIO TORCEDOR</p>
                          <p className="text-lg font-black italic tracking-tighter text-primary">
                            {ticket.fan_price_type === 'fixed' 
                              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticket.fan_price_value)
                              : `${ticket.fan_price_value}% OFF`}
                          </p>
                        </div>
                      </div>
                    </div>

                    {ticket.has_transport && (
                      <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/20">
                        <div className="flex items-center gap-2.5 mb-3">
                          <Bus className="text-blue-500" size={20} />
                          <span className="text-sm font-black italic tracking-tighter uppercase">Logística de Transporte</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Encontro</span>
                            <span className="text-xs font-bold text-zinc-200">{ticket.transport_check_in_location}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Check-in</span>
                            <span className="text-xs font-bold text-zinc-200">{ticket.transport_check_in_time}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Disponíveis</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-md border border-emerald-500/20">
                              {ticket.transport_vacancies} VAGAS
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {ticket.extra_services.length > 0 && (
                      <div>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1">SERVIÇOS INCLUSOS</p>
                        <div className="flex flex-wrap gap-2">
                          {ticket.extra_services.map((service, i) => (
                            <div key={i} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold flex items-center gap-1.5 hover:border-primary/30 transition-colors">
                              <Check size={12} className="text-primary" /> {service.toUpperCase()}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setPurchaseStep(2)}
                    className="w-full py-4 bg-primary text-black font-black italic tracking-tighter uppercase rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-base"
                  >
                    CONTINUAR PARA O PAGAMENTO
                  </button>
                </div>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                  <div className="bg-[#18181b] p-6 rounded-[32px] border border-white/10 shadow-2xl">
                    <h3 className="text-base font-black italic tracking-tighter uppercase mb-6 text-center">Finalizar Compra</h3>
                    
                    <div className="space-y-4 mb-8">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">NOME COMPLETO</label>
                        <input 
                          type="text"
                          value={buyerInfo.name}
                          onChange={e => setBuyerInfo({...buyerInfo, name: e.target.value})}
                          placeholder="Como no seu documento"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">CPF DO TITULAR</label>
                        <input 
                          type="text"
                          value={buyerInfo.document}
                          onChange={e => setBuyerInfo({...buyerInfo, document: e.target.value})}
                          placeholder="000.000.000-00"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                      </div>

                      {/* Sócio Membership Toggle */}
                      <button 
                        onClick={() => setIsFanMember(!isFanMember)}
                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${isFanMember ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/5' : 'bg-white/5 border-white/10'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isFanMember ? 'bg-primary text-black' : 'bg-white/5 text-zinc-500'}`}>
                            <ShieldCheck size={20} />
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-black italic tracking-tighter uppercase ${isFanMember ? 'text-white' : 'text-zinc-400'}`}>Sócio Torcedor?</p>
                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Aplicar desconto exclusivo</p>
                          </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isFanMember ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {isFanMember && <Check size={14} className="text-black" strokeWidth={4} />}
                        </div>
                      </button>

                      {/* Transport Seat Toggle */}
                      {ticket.has_transport && (
                        <button 
                          onClick={() => setWantsTransport(!wantsTransport)}
                          className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${wantsTransport ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5' : 'bg-white/5 border-white/10'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${wantsTransport ? 'bg-blue-500 text-white' : 'bg-white/5 text-zinc-500'}`}>
                              <Bus size={20} />
                            </div>
                            <div className="text-left">
                              <p className={`text-xs font-black italic tracking-tighter uppercase ${wantsTransport ? 'text-white' : 'text-zinc-400'}`}>Vaga no Transporte?</p>
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Garantir assento no ônibus</p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${wantsTransport ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                            {wantsTransport && <Check size={14} className="text-white" strokeWidth={4} />}
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">FORMA DE PAGAMENTO</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setPaymentMethod('pix')}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'pix' ? 'bg-white/10 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/10'}`}
                        >
                          <Smartphone size={24} className={paymentMethod === 'pix' ? 'text-primary' : 'text-zinc-500'} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">PIX</span>
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('credit_card')}
                          className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${paymentMethod === 'credit_card' ? 'bg-white/10 border-primary shadow-lg shadow-primary/10' : 'bg-white/5 border-white/10'}`}
                        >
                          <CreditCard size={24} className={paymentMethod === 'credit_card' ? 'text-primary' : 'text-zinc-500'} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">CARTÃO</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">TOTAL A PAGAR</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter mt-0.5">Taxas inclusas</p>
                      </div>
                      <p className="text-3xl font-black italic tracking-tighter text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice)}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={handlePurchase}
                    disabled={!buyerInfo.name || !buyerInfo.document}
                    className="w-full py-4 bg-primary text-black font-black italic tracking-tighter uppercase rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 text-base"
                  >
                    CONFIRMAR PAGAMENTO
                  </button>
                  <button 
                    onClick={() => setPurchaseStep(1)}
                    className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors"
                  >
                    REVISAR DETALHES
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
