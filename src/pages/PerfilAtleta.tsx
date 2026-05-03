import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  FileText, 
  TrendingUp,
  CreditCard,
  User as UserIcon,
  Download,
  Fingerprint,
  CalendarDays,
  MapPin,
  Clock,
  MessageSquare,
  Edit3,
  IdCard,
  Hash,
  Mail,
  Shirt,
  Layers,
  Square,
  Zap,
  Footprints,
  Plus
} from 'lucide-react';

// Ícones Customizados para Uniforme (SaaS High-Fidelity)
const CleatsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 16c0-2.5 1-4.5 3-5.5 1.5-1 4-1 6-1 2.5 0 5 0.5 7 1.5 1 0.5 2 2 2 4.5l-1 2.5H4l-1-2.5z" />
    <path d="M16 10l1-2" />
    <path d="M12 9.5l0.5-2" />
    <path d="M8 10l-0.5-2" />
    <path d="M6 18.5v1M10 18.5v1M14 18.5v1M18 18.5v1" />
  </svg>
);

const ShortsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 3h12l1.5 10.5-5 0.5v-3.5h-5v3.5l-5-0.5L6 3z" />
    <path d="M9 3v2M12 3v2M15 3v2" />
  </svg>
);

const SocksIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 3h6v12.5l3.5 2.5V21h-7v-3l-2.5-2.5V3z" />
    <path d="M9.5 6.5h5M9.5 9h5M9.5 11.5h5" />
  </svg>
);

import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import Toast from '../components/Toast';
import NewAthleteForm from '../components/athletes/NewAthleteForm';

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
  sizes_json?: {
    boots: string;
    shirt: string;
    short: string;
    socks: string;
  };
}



export default function PerfilAtleta() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrg();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'performance' | 'financeiro'>('geral');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);


  useEffect(() => {
    fetchAthleteData();
  }, [id]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  const fetchAthleteData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase!.from('athletes').select('*').eq('id', id).single();
      if (error) throw error;
      setAthlete(data);

      // Fetch current subscription
      const { data: subData } = await supabase!
        .from('athlete_subscriptions')
        .select('*, plan:membership_plans(*, membership:memberships(name))')
        .eq('athlete_id', id)
        .eq('status', 'active')
        .maybeSingle();
      
      setCurrentSubscription(subData);
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados', 'error');
    } finally { setLoading(false); }
  };

  const fetchMemberships = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase!
        .from('memberships')
        .select('*, plans:membership_plans(*)')
        .eq('organization_id', organization.id);
      
      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error fetching memberships:', err);
    }
  };

  useEffect(() => {
    if (isMembershipModalOpen) {
      fetchMemberships();
    }
  }, [isMembershipModalOpen, organization]);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '--';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
    </div>
  );

  if (!athlete) return null;

  return (
    <div className="min-h-screen bg-bg text-text-main pb-8 font-sans selection:bg-primary selection:text-black overflow-hidden transition-colors duration-300">
      
      <div className="max-w-[1400px] mx-auto px-6 pt-6 relative z-10">
        
        {/* HEADER */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-xl bg-surface border border-border-main hover:border-primary/40 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-text-muted" />
            </button>
            <div>
              <h1 className="text-lg font-black italic uppercase tracking-tighter text-text-main leading-none">
                {athlete.full_name} 
                <span className="text-text-subtle text-[9px] font-bold not-italic ml-3 tracking-[0.2em] opacity-60 uppercase">PERFIL DO ATLETA</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-surface border border-border-main rounded-2xl shadow-sm backdrop-blur-xl">
            {(['geral', 'performance', 'financeiro'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${
                  activeTab === tab ? 'text-black' : 'text-text-muted hover:text-text-main'
                }`}
              >
                {activeTab === tab && <div className="absolute inset-0 bg-primary shadow-[0_4px_12px_rgba(189,255,1,0.3)]" />}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-12 gap-5 items-start">
          
          {/* COLUNA ESQUERDA - CARD DO ATLETA */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-surface border border-border-main rounded-[32px] overflow-hidden relative group shadow-sm backdrop-blur-xl h-full flex flex-col">
              {/* Foto com Presença - Ajustada para alinhamento total */}
              <div className="relative h-[340px] w-full overflow-hidden bg-surface-soft flex-shrink-0">
                {athlete.photo_url ? (
                  <img src={athlete.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-subtle/20"><UserIcon className="w-12 h-12" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
                
                {/* Camisa #10 */}
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-surface/90 backdrop-blur-md px-2 py-1 rounded-lg border border-border-main shadow-sm">
                  <Shirt className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-black italic text-text-main tracking-tighter">#{athlete.number || '10'}</span>
                </div>
              </div>

              <div className="p-5 -mt-8 relative z-10 flex flex-col flex-grow">
                <div className="flex-grow">
                  <div className="mb-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter text-text-main leading-tight mb-1.5">
                      {athlete.nickname || athlete.full_name.split(' ')[0]}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {[athlete.position, athlete.category, athlete.modality].map((tag, i) => (
                        <span key={i} className="text-[7px] font-black uppercase bg-primary/10 border border-primary/20 text-primary-dark px-2 py-0.5 rounded-md italic tracking-tight">
                          {tag || '---'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contatos */}
                  <div className="border-t border-border-main pt-4 space-y-3">
                    <div className="flex items-center gap-2.5 group/info">
                      <div className="p-1.5 rounded-lg bg-surface-soft border border-border-main group-hover/info:border-primary/20 transition-colors">
                        <Mail className="w-3 h-3 text-text-subtle group-hover/info:text-primary transition-colors" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[6px] font-black text-text-subtle uppercase tracking-[0.2em] mb-0.5">Email</p>
                        <p className="text-[10px] font-black italic text-text-main/80 truncate">{athlete.email || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 group/info">
                      <div className="p-1.5 rounded-lg bg-surface-soft border border-border-main group-hover/info:border-primary/20 transition-colors">
                        <Phone className="w-3 h-3 text-text-subtle group-hover/info:text-primary transition-colors" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[6px] font-black text-text-subtle uppercase tracking-[0.2em] mb-0.5">Telefone</p>
                        <p className="text-[10px] font-black italic text-text-main/80">{athlete.whatsapp || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => window.open(`https://wa.me/${athlete.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                  className="w-full mt-6 py-3 bg-primary rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(189,255,1,0.2)] hover:scale-[1.02] transition-all group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-black group-hover:rotate-12 transition-transform" />
                  <span className="text-black font-black italic uppercase text-[9px] tracking-widest">WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* COLUNA CENTRAL */}
          <div className="col-span-12 lg:col-span-6 flex flex-col gap-5">
            {/* INFORMAÇÕES PESSOAIS */}
            <div className="bg-surface border border-border-main rounded-[32px] p-7 shadow-sm relative overflow-hidden group backdrop-blur-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main">Informações Pessoais</h3>
                    <p className="text-[7px] font-bold text-text-subtle uppercase tracking-widest">Dossiê Completo</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-soft border border-border-main hover:border-primary/40 transition-all group/edit"
                >
                  <Edit3 className="w-3 h-3 text-text-subtle group-hover/edit:text-primary" />
                  <span className="text-[9px] font-black uppercase text-text-subtle group-hover/edit:text-text-main">Editar</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-2 flex items-center justify-between bg-surface-soft border border-border-main p-4 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase text-text-subtle tracking-widest">Nome Completo</p>
                    <p className="text-sm font-black italic text-text-main uppercase tracking-tight">{athlete.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-text-subtle uppercase tracking-widest">Apelido</p>
                    <p className="text-xs font-black italic text-primary-dark uppercase">{athlete.nickname || '---'}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <CalendarDays className="w-3 h-3"/> Nascimento
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-black italic text-text-main uppercase tracking-tighter">{athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString('pt-BR') : '---'}</p>
                    <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-black italic text-primary-dark">{calculateAge(athlete.birth_date)} ANOS</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <MapPin className="w-3 h-3"/> Endereço
                  </p>
                  <p className="text-sm font-black italic text-text-main uppercase tracking-tighter truncate">{athlete.address || '---'}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <IdCard className="w-3 h-3"/> CPF
                  </p>
                  <p className="text-sm font-black italic text-text-main uppercase tracking-tighter">{athlete.cpf || '---'}</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <Hash className="w-3 h-3"/> RG
                  </p>
                  <p className="text-sm font-black italic text-text-main uppercase tracking-tighter">{athlete.rg || '---'}</p>
                </div>
              </div>
            </div>

            {/* EVOLUÇÃO TÉCNICA */}
            {/* KIT & UNIFORME */}
            <div className="bg-surface border border-border-main rounded-[32px] p-5 shadow-sm relative backdrop-blur-xl group overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-primary" />
                  <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-main">Kit & Uniforme</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-full">
                    <span className="text-[8px] font-black italic text-primary-dark uppercase">Oficiais</span>
                  </div>
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1 rounded-lg bg-surface-soft border border-border-main hover:border-primary/40 transition-all group/edit"
                  >
                    <Edit3 className="w-2.5 h-2.5 text-text-subtle group-hover/edit:text-primary" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {/* Camisa */}
                <div className="bg-surface-soft border border-border-main p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-primary/30 transition-all">
                  <Shirt className="w-5 h-5 text-text-subtle" />
                  <p className="text-[6px] font-black uppercase text-text-subtle tracking-widest">Camisa</p>
                  <p className="text-xs font-black italic text-text-main uppercase">{athlete.sizes_json?.shirt || '---'}</p>
                </div>
                {/* Calção */}
                <div className="bg-surface-soft border border-border-main rounded-xl p-2.5 flex flex-col items-center justify-center group hover:border-primary/30 transition-all cursor-default">
                  <ShortsIcon className="w-5 h-5 text-text-subtle mb-1.5 group-hover:text-primary transition-colors opacity-60" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1 group-hover:text-primary/70 transition-colors">Calção</p>
                  <p className="text-[11px] font-black italic text-text-main group-hover:text-primary transition-colors uppercase">
                    {athlete.sizes_json?.short || 'M'}
                  </p>
                </div>

                <div className="bg-surface-soft border border-border-main rounded-xl p-2.5 flex flex-col items-center justify-center group hover:border-primary/30 transition-all cursor-default">
                  <SocksIcon className="w-5 h-5 text-text-subtle mb-1.5 group-hover:text-primary transition-colors opacity-60" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1 group-hover:text-primary/70 transition-colors">Meião</p>
                  <p className="text-[11px] font-black italic text-text-main group-hover:text-primary transition-colors uppercase">
                    {athlete.sizes_json?.socks || '38-40'}
                  </p>
                </div>

                <div className="bg-surface-soft border border-border-main rounded-xl p-2.5 flex flex-col items-center justify-center group hover:border-primary/30 transition-all cursor-default">
                  <CleatsIcon className="w-5 h-5 text-text-subtle mb-1.5 group-hover:text-primary transition-colors opacity-60" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1 group-hover:text-primary/70 transition-colors">Chuteira</p>
                  <p className="text-[11px] font-black italic text-text-main group-hover:text-primary transition-colors uppercase">
                    {athlete.sizes_json?.boots || '41'}
                  </p>
                </div>
              </div>

              {/* Lateralidade */}
              <div className="mt-4 bg-surface-soft border border-border-main rounded-xl p-3 flex items-center justify-between group/foot">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg group-hover/foot:bg-primary/20 transition-colors">
                    <Footprints className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[6px] font-black uppercase text-text-subtle tracking-widest">Pé Preferencial</p>
                    <p className="text-[9px] font-black italic text-text-main uppercase leading-none">Lateralidade</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase transition-all ${athlete.gender === 'canhoto' ? 'bg-primary text-black' : 'bg-surface border border-border-main text-text-muted opacity-40'}`}>Canhoto</span>
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase transition-all ${athlete.gender !== 'canhoto' ? 'bg-primary text-black' : 'bg-surface border border-border-main text-text-muted opacity-40'}`}>Destro</span>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="col-span-12 lg:col-span-3 flex flex-col gap-5 h-full">
            {/* MENSALIDADE */}
            <div className="bg-surface border border-border-main rounded-[32px] p-6 shadow-sm relative overflow-hidden group backdrop-blur-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <h3 className="text-[10px] font-black uppercase text-text-main tracking-widest">Mensalidade</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[8px] font-black px-2 py-1 rounded-lg uppercase",
                    currentSubscription?.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary-dark"
                  )}>
                    {currentSubscription?.status === 'active' ? 'Ativo' : 'Pendente'}
                  </span>
                  <button 
                    onClick={() => setIsMembershipModalOpen(true)}
                    className="p-1 rounded-lg bg-surface-soft border border-border-main hover:border-primary/40 transition-all group/edit"
                  >
                    <Edit3 className="w-2.5 h-2.5 text-text-subtle group-hover/edit:text-primary" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border-main pb-4">
                  <p className="text-xs font-black italic text-text-main/80 uppercase">
                    {currentSubscription?.plan?.membership?.name} - {currentSubscription?.plan?.name || 'Sem Plano'}
                  </p>
                  <p className="text-lg font-black italic text-primary-dark">
                    R$ {currentSubscription?.plan?.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[7px] font-black text-text-subtle uppercase mb-1 tracking-widest">Frequência</p>
                    <p className="text-[10px] font-black italic text-text-main/70 uppercase">
                      {currentSubscription?.plan?.billing_period === 'monthly' ? 'Mensal' : 
                       currentSubscription?.plan?.billing_period === 'quarterly' ? 'Trimestral' :
                       currentSubscription?.plan?.billing_period === 'semiannual' ? 'Semestral' :
                       currentSubscription?.plan?.billing_period === 'annual' ? 'Anual' : '---'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-text-subtle uppercase mb-1 tracking-widest">Próx. Vencimento</p>
                    <p className="text-[10px] font-black italic text-text-main/70 uppercase">
                      {currentSubscription?.next_billing_at ? new Date(currentSubscription.next_billing_at).toLocaleDateString('pt-BR') : '---'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DOCUMENTOS */}
            <div className="bg-surface border border-border-main rounded-[32px] p-5 shadow-sm flex flex-col backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <h3 className="text-[9px] font-black uppercase text-text-main tracking-widest">Documentos</h3>
              </div>
              
              <div className="space-y-1.5 mb-4">
                {['RG', 'CPF', 'Atestado Médico'].map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-soft border border-border-main group/doc cursor-pointer hover:bg-surface-strong transition-all">
                    <p className="text-[9px] font-black uppercase text-text-muted tracking-tighter">{d}</p>
                    <Download className="w-3 h-3 text-text-subtle group-hover/doc:text-primary transition-colors" />
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-border-main">
                <button 
                  onClick={() => setIsDocumentModalOpen(true)}
                  className="w-full bg-primary/5 border border-primary/20 border-dashed rounded-xl p-3 flex flex-col items-center justify-center group cursor-pointer hover:bg-primary/10 text-center transition-all"
                >
                  <Plus className="w-4 h-4 text-primary mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-[8px] font-black italic text-primary-dark uppercase tracking-widest">Novo Documento</p>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)} />}

      {/* MODAL: EDITAR ATLETA */}
      {isEditModalOpen && (
        <NewAthleteForm 
          onClose={() => setIsEditModalOpen(false)} 
          onSuccess={() => {
            fetchAthleteData();
            setIsEditModalOpen(false);
          }}
          athlete={athlete}
        />
      )}

      {/* MODAL: MENSALIDADE */}
      {isMembershipModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">Selecionar Mensalidade</h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Atribuir plano para {athlete.full_name}</p>
                </div>
              </div>
              <button onClick={() => setIsMembershipModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <Plus size={20} className="text-[var(--text-muted)] rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {memberships.map(membership => (
                <div key={membership.id} className="space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary ml-2">{membership.name}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {membership.plans?.map((plan: any) => (
                      <button 
                        key={plan.id}
                        onClick={async () => {
                          if (!organization) return;
                          setIsSavingSubscription(true);
                          try {
                            const { error } = await supabase!
                              .from('athlete_subscriptions')
                              .upsert({
                                organization_id: organization.id,
                                plan_id: plan.id,
                                athlete_id: athlete.id,
                                next_billing_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
                                status: 'active'
                              }, { onConflict: 'athlete_id' });
                            
                            if (error) throw error;
                            showToast('Mensalidade atualizada com sucesso!');
                            fetchAthleteData();
                            setIsMembershipModalOpen(false);
                          } catch (err: any) {
                            showToast(err.message, 'error');
                          } finally {
                            setIsSavingSubscription(false);
                          }
                        }}
                        disabled={isSavingSubscription}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                          currentSubscription?.plan_id === plan.id 
                            ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(189,255,1,0.1)]" 
                            : "bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/40"
                        )}
                      >
                        <div>
                          <p className="text-[11px] font-black uppercase italic text-[var(--text)]">{plan.name}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                            {plan.billing_period === 'monthly' ? 'Mensal' : 
                             plan.billing_period === 'quarterly' ? 'Trimestral' :
                             plan.billing_period === 'semiannual' ? 'Semestral' : 'Anual'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black italic text-primary">R$ {plan.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          {currentSubscription?.plan_id === plan.id && (
                            <span className="text-[8px] font-black uppercase text-primary">Plano Atual</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO DOCUMENTO */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">Novo Documento</h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Upload de Dossiê</p>
                </div>
              </div>
              <button onClick={() => setIsDocumentModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <Plus size={20} className="text-[var(--text-muted)] rotate-45" />
              </button>
            </div>
            <form className="p-6 space-y-5" onSubmit={(e) => {
              e.preventDefault();
              showToast('Upload realizado com sucesso! (Demonstração)');
              setIsDocumentModalOpen(false);
            }}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Título do Documento</label>
                <input 
                  type="text" 
                  placeholder="Ex: Atestado Médico 2024"
                  className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Arquivo</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="w-full bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] group-hover:border-primary/40 rounded-2xl p-8 flex flex-col items-center justify-center transition-all">
                    <Plus size={24} className="text-primary/40 group-hover:text-primary mb-2 transition-colors" />
                    <p className="text-[10px] font-black uppercase text-[var(--text-muted)]">Clique ou arraste o arquivo</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)] opacity-40 uppercase mt-1">PDF, JPG ou PNG (Máx 5MB)</p>
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 mt-2"
              >
                Enviar Documento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
