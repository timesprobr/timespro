import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Settings, 
  CreditCard, 
  Calendar, 
  Phone, 
  FileText, 
  TrendingUp, 
  Target, 
  Award,
  CheckCircle2,
  Zap,
  User as UserIcon,
  LayoutDashboard,
  Activity,
  History,
  DollarSign
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

interface Athlete {
  id: string;
  full_name: string;
  photo_url: string | null;
  category: string;
  position: string;
  number: string;
  whatsapp: string;
  cpf: string;
  rg: string;
  birth_date: string;
  status: 'active' | 'inactive' | 'pending';
  modality: string;
  email?: string;
}

const PERFORMANCE_DATA = [
  { subject: 'Velocidade', A: 85, fullMark: 100 },
  { subject: 'Físico', A: 70, fullMark: 100 },
  { subject: 'Chute', A: 90, fullMark: 100 },
  { subject: 'Passe', A: 75, fullMark: 100 },
  { subject: 'Drible', A: 80, fullMark: 100 },
  { subject: 'Defesa', A: 50, fullMark: 100 },
];

const EVOLUTION_DATA = [
  { name: 'Jan', score: 65 },
  { name: 'Fev', score: 68 },
  { name: 'Mar', score: 75 },
  { name: 'Abr', score: 82 },
  { name: 'Mai', score: 85 },
  { name: 'Jun', score: 88 },
];

export default function PerfilAtleta() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'performance' | 'financeiro'>('geral');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingCheckout, setIsGeneratingCheckout] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [monthlyFee, setMonthlyFee] = useState('80.00');
  const [dueDate, setDueDate] = useState('10');

  useEffect(() => {
    fetchAthleteData();
    fetchOrganizationData();
  }, [id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const fetchOrganizationData = async () => {
    try {
      const { data, error } = await supabase!
        .from('organizations')
        .select('*')
        .single();
      if (data) setOrganization(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAthleteData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase!
        .from('athletes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAthlete(data);
    } catch (err) {
      console.error('Error fetching athlete:', err);
      showToast('Erro ao carregar dados do atleta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCheckoutLink = async () => {
    if (!athlete) return;
    try {
      setIsGeneratingCheckout(true);
      const billingData = {
        athlete_id: athlete.id,
        organization_id: organization?.id || athlete.id,
        amount: parseFloat(monthlyFee),
        description: `Mensalidade - ${athlete.full_name}`,
        due_date: new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(dueDate)).toISOString(),
        status: 'pending'
      };

      const { data, error } = await supabase!
        .from('athlete_billings')
        .insert([billingData])
        .select()
        .single();

      let checkoutUrl = '';
      if (error) {
        const payloadData = {
          ...billingData,
          athlete_name: athlete.full_name,
          org_name: organization?.name || 'Clube Parceiro',
          org_logo: organization?.logo_url,
          amount: parseFloat(monthlyFee)
        };
        // Codificação segura para UTF-8 no navegador
        const payload = btoa(encodeURIComponent(JSON.stringify(payloadData)));
        checkoutUrl = `${window.location.origin}/checkout/f_${payload}`;
      } else {
        checkoutUrl = `${window.location.origin}/checkout/${data.id}`;
      }

      const message = `Olá! Segue o link para o pagamento da mensalidade do atleta ${athlete.full_name}:\n\n${checkoutUrl}`;
      const whatsappUrl = `https://wa.me/${athlete.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      showToast('Link de checkout gerado!', 'success');
    } catch (err) {
      console.error('Error:', err);
      showToast('Erro ao gerar link', 'error');
    } finally {
      setIsGeneratingCheckout(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );

  if (!athlete) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-8 font-sans selection:bg-primary selection:text-black">
      {/* Background Decorativo Suave */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-4 relative">
        {/* Header Compacto */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-0.5">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">
                  {athlete.full_name.split(' ')[0]}
                </h1>
                <div className="px-3 py-1 bg-primary rounded-full shadow-[0_0_15px_rgba(189,255,1,0.2)]">
                  <span className="text-black text-xs font-black italic">#{athlete.number || '10'}</span>
                </div>
              </div>
              <p className="text-white/40 font-black tracking-[0.2em] uppercase text-[9px]">
                {athlete.position} • {athlete.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
            {(['geral', 'performance', 'financeiro'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                  ? 'bg-primary text-black shadow-[0_0_10px_rgba(189,255,1,0.3)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Avatar e Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 relative overflow-hidden backdrop-blur-xl group">
              <div className="relative flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-primary/20">
                    <div className="w-full h-full rounded-full border-[4px] border-[#0a0a0a] overflow-hidden">
                      {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
                          <UserIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-0.5">{athlete.full_name}</h2>
                <p className="text-white/40 text-[9px] font-black tracking-widest uppercase mb-8">ID Profissional</p>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">Status</p>
                    <p className="text-xs font-black italic text-primary uppercase">Ativo</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                    <p className="text-[8px] font-black uppercase text-white/30 mb-0.5">Nível</p>
                    <p className="text-xs font-black italic text-white uppercase">Elite</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Info Protocol
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Modalidade', value: athlete.modality, icon: Zap },
                  { label: 'Categoria', value: athlete.category, icon: Target },
                  { label: 'Posição', value: athlete.position, icon: LayoutDashboard },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-[10px] font-black uppercase text-white/40">{item.label}</span>
                    </div>
                    <span className="text-xs font-black italic text-white uppercase">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Dashboard */}
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'geral' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 overflow-hidden relative backdrop-blur-xl">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <DollarSign className="w-48 h-48 text-primary" />
                  </div>
                  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter">Financeiro</h3>
                      <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black italic tracking-tighter text-primary">R$ {monthlyFee}</span>
                        <span className="text-white/30 font-black text-[9px] uppercase tracking-widest">/ mensal</span>
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateCheckoutLink}
                      disabled={isGeneratingCheckout}
                      className="px-8 py-4 rounded-[24px] bg-primary text-black font-black italic uppercase tracking-tighter text-sm flex items-center gap-3 shadow-[0_10px_30px_rgba(189,255,1,0.15)] hover:scale-105 active:scale-95 transition-all"
                    >
                      <Zap className="w-5 h-5 fill-black" />
                      <span>Gerar Link</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      Social
                    </h3>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black uppercase text-white/30 mb-1">WhatsApp</p>
                      <p className="text-xl font-black italic tracking-tighter text-white">{athlete.whatsapp || '---'}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Documentos
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <span className="text-[9px] font-black uppercase text-white/40">CPF</span>
                        <span className="text-xs font-black italic">{athlete.cpf || '---'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <span className="text-[9px] font-black uppercase text-white/40">RG</span>
                        <span className="text-xs font-black italic">{athlete.rg || '---'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-8">Radar de Habilidades</h3>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={PERFORMANCE_DATA}>
                        <PolarGrid stroke="#ffffff10" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff30', fontSize: 9, fontWeight: 900 }} />
                        <Radar
                          name="Atleta"
                          dataKey="A"
                          stroke="#bdff01"
                          fill="#bdff01"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest mb-8">Evolução Técnica</h3>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={EVOLUTION_DATA}>
                        <defs>
                          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#bdff01" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#bdff01" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff30', fontSize: 9 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                          itemStyle={{ color: '#bdff01', fontWeight: 900 }}
                        />
                        <Area type="monotone" dataKey="score" stroke="#bdff01" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'financeiro' && (
              <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                <div className="max-w-xl mx-auto space-y-8">
                  <div className="text-center space-y-3 mb-8">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">Cobrança</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-3">VALOR</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 font-black italic text-xs">R$</span>
                        <input 
                          type="number"
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white font-black italic outline-none focus:border-primary text-sm transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-3">VENCIMENTO</label>
                      <select 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-black italic outline-none focus:border-primary text-sm cursor-pointer appearance-none"
                      >
                        {[5, 10, 15, 20, 25].map(day => (
                          <option key={day} value={day} className="bg-[#0a0a0a]">Dia {day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notificação Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
