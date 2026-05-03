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
  DollarSign,
  MapPin,
  Users,
  Fingerprint,
  CalendarDays
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
  organization_id: string;
  nickname?: string;
  address?: string;
  gender?: string;
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

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '--';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleGenerateCheckoutLink = async () => {
    if (!athlete) return;
    try {
      setIsGeneratingCheckout(true);
      const orgId = organization?.id || athlete.organization_id;
      
      if (!orgId) {
        throw new Error('ID da organização não encontrado. Verifique os dados do atleta.');
      }

      const generateSlug = (name: string) => {
        return name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      };

      const athleteSlug = generateSlug(athlete.full_name);
      const targetOrgId = athlete.organization_id || organization?.id;
      
      const { data: subscription, error: subError } = await supabase!
        .from('athlete_subscriptions')
        .select('id, plan_id')
        .eq('athlete_id', athlete.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription) {
        const compactPayload = { at: athlete.id, am: parseFloat(monthlyFee) };
        const payload = btoa(unescape(encodeURIComponent(JSON.stringify(compactPayload))));
        const checkoutUrl = `${window.location.origin}/checkout/${athleteSlug}/f_${payload}`;
        const message = `Olá! Segue o link para o pagamento:\n\n${checkoutUrl}`;
        window.open(`https://wa.me/${athlete.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
        return;
      }

      const { data: payment, error: dbError } = await supabase!
        .from('subscription_payments')
        .insert([{
          subscription_id: subscription.id,
          organization_id: targetOrgId,
          amount: parseFloat(monthlyFee),
          due_date: new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(dueDate)).toISOString().split('T')[0],
          status: 'pending'
        }])
        .select()
        .single();

      let checkoutUrl = '';
      if (!dbError && payment) {
        checkoutUrl = `${window.location.origin}/checkout/${athleteSlug}/${payment.id}`;
      } else {
        const compactPayload = { at: athlete.id, am: parseFloat(monthlyFee) };
        const payload = btoa(unescape(encodeURIComponent(JSON.stringify(compactPayload))));
        checkoutUrl = `${window.location.origin}/checkout/${athleteSlug}/f_${payload}`;
      }

      const message = `Olá! Segue o link para o pagamento da mensalidade do atleta ${athlete.full_name}:\n\n${checkoutUrl}`;
      const whatsappUrl = `https://wa.me/${athlete.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      showToast(!dbError ? 'Link de checkout gerado!' : 'Link gerado (Modo Offline)', !dbError ? 'success' : 'info');
    } catch (err) {
      console.error('Error geral ao gerar checkout:', err);
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
      {/* Background Decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 relative">
        {/* Header Superior - Mais limpo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all group backdrop-blur-md"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                  {athlete.nickname || athlete.full_name.split(' ')[0]}
                </h1>
                <div className="px-3 py-1.5 bg-primary rounded-xl shadow-[0_0_20px_rgba(189,255,1,0.2)]">
                  <span className="text-black text-[10px] font-black italic">#{athlete.number || '10'}</span>
                </div>
              </div>
              <p className="text-white/30 font-black tracking-[0.2em] uppercase text-[8px] mt-1.5">
                Painel de Controle • Perfil do Atleta
              </p>
            </div>
          </div>

          {/* Navegação de Abas Premium */}
          <div className="flex items-center gap-1 p-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
            {(['geral', 'performance', 'financeiro'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                  ? 'bg-primary text-black shadow-[0_5px_15px_rgba(189,255,1,0.2)] scale-105' 
                  : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* COLUNA ESQUERDA: PROFILE CARD VERTICAL */}
          <div className="lg:col-span-4">
            <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 relative overflow-hidden backdrop-blur-2xl shadow-2xl group">
              {/* Efeitos de Iluminação no Card */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative flex flex-col items-center">
                {/* Foto com Aro Neon */}
                <div className="relative mb-8">
                  <div className="w-40 h-40 rounded-full p-1.5 bg-gradient-to-tr from-primary to-white/5 shadow-[0_0_30px_rgba(189,255,1,0.1)]">
                    <div className="w-full h-full rounded-full border-[6px] border-[#0a0a0a] overflow-hidden bg-[#111]">
                      {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.full_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">
                          <UserIcon className="w-16 h-16" />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Badge de Status no Canto da Foto */}
                  <div className="absolute bottom-2 right-2 w-8 h-8 bg-[#0a0a0a] rounded-full p-1 border-2 border-primary/20">
                    <div className={`w-full h-full rounded-full ${athlete.status === 'active' ? 'bg-[#A3E635]' : 'bg-red-500'} shadow-[0_0_10px_rgba(163,230,53,0.5)]`} />
                  </div>
                </div>

                {/* Nome e Info Principal */}
                <div className="text-center space-y-1 mb-8">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{athlete.full_name}</h2>
                  <p className="text-primary font-black italic tracking-tight uppercase text-sm">
                    {athlete.nickname || 'Sem Apelido'}
                  </p>
                </div>

                {/* Grid de Atributos do Card */}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-white/5 rounded-3xl p-5 text-center border border-white/5 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase text-white/30 mb-1 tracking-widest">Posição</p>
                    <p className="text-sm font-black italic text-white uppercase">{athlete.position || '---'}</p>
                  </div>
                  <div className="bg-white/5 rounded-3xl p-5 text-center border border-white/5 backdrop-blur-md">
                    <p className="text-[9px] font-black uppercase text-white/30 mb-1 tracking-widest">Categoria</p>
                    <p className="text-sm font-black italic text-white uppercase">{athlete.category || '---'}</p>
                  </div>
                </div>

                {/* Camisa Grande */}
                <div className="mt-8 flex flex-col items-center opacity-20">
                  <span className="text-[80px] font-black italic leading-none tracking-tighter text-white/10">
                    {athlete.number || '10'}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] -mt-4 text-white/20">Número</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: CONTEÚDO DAS ABAS */}
          <div className="lg:col-span-8">
            {activeTab === 'geral' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* Seção de Informações Pessoais */}
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3 text-primary">
                    <UserIcon className="w-4 h-4" />
                    Informações Pessoais
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
                    {[
                      { label: 'Idade', value: `${calculateAge(athlete.birth_date)} anos`, icon: Activity },
                      { label: 'Data de Nascimento', value: athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString('pt-BR') : '---', icon: CalendarDays },
                      { label: 'Sexo', value: athlete.gender || 'Não Informado', icon: Users },
                      { label: 'Endereço', value: athlete.address || 'Não cadastrado', icon: MapPin },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                          <item.icon className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase text-white/30 tracking-widest">{item.label}</p>
                          <p className="text-sm font-black italic text-white uppercase tracking-tight">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção de Documentos e Social */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-2 text-primary">
                      <Fingerprint className="w-4 h-4" />
                      Documentos
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-white/30">CPF</span>
                        <span className="text-sm font-black italic tracking-tighter text-white">{athlete.cpf || '---'}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-white/30">RG</span>
                        <span className="text-sm font-black italic tracking-tighter text-white">{athlete.rg || '---'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 backdrop-blur-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 flex items-center gap-2 text-primary">
                      <Phone className="w-4 h-4" />
                      Contato Social
                    </h3>
                    <div className="p-6 rounded-[28px] bg-primary/10 border border-primary/20 text-center">
                      <p className="text-[9px] font-black uppercase text-primary/60 mb-2 tracking-[0.2em]">WhatsApp Oficial</p>
                      <p className="text-2xl font-black italic tracking-tighter text-white">{athlete.whatsapp || '---'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'performance' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-primary">Radar de Habilidades</h3>
                    <div className="h-[280px] w-full">
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
                  <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-primary">Evolução Técnica</h3>
                    <div className="h-[280px] w-full">
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
              </div>
            )}
            
            {activeTab === 'financeiro' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="bg-white/5 border border-white/10 rounded-[40px] p-10 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5">
                    <DollarSign className="w-64 h-64 text-primary" />
                  </div>
                  
                  <div className="max-w-xl mx-auto space-y-10 relative z-10">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 border border-primary/20">
                        <CreditCard className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter">Gestão Financeira</h3>
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Configure a mensalidade do atleta</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">VALOR MENSAL</label>
                        <div className="relative group">
                          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black italic text-sm">R$</span>
                          <input 
                            type="number"
                            value={monthlyFee}
                            onChange={(e) => setMonthlyFee(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-8 text-white font-black italic outline-none focus:border-primary text-base transition-all backdrop-blur-md"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">DIA DE VENCIMENTO</label>
                        <div className="relative">
                          <select 
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white font-black italic outline-none focus:border-primary text-base cursor-pointer appearance-none backdrop-blur-md"
                          >
                            {[5, 10, 15, 20, 25].map(day => (
                              <option key={day} value={day} className="bg-[#0a0a0a]">Dia {day}</option>
                            ))}
                          </select>
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                            <Calendar className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateCheckoutLink}
                      disabled={isGeneratingCheckout}
                      className="w-full py-5 rounded-[28px] bg-primary text-black font-black italic uppercase tracking-tighter text-lg flex items-center justify-center gap-4 shadow-[0_15px_35px_rgba(189,255,1,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-10"
                    >
                      {isGeneratingCheckout ? (
                        <div className="w-6 h-6 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                      ) : (
                        <Zap className="w-6 h-6 fill-black" />
                      )}
                      <span>{isGeneratingCheckout ? 'Gerando...' : 'Gerar Link de Pagamento'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
