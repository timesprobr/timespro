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
  Plus,
  Check,
  Loader2,
  Upload,
  X,
  Save,
  ShieldCheck
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
import { cn } from '../lib/utils';
import Toast from '../components/Toast';
import NewAthleteForm from '../components/athletes/NewAthleteForm';

interface Athlete {
  id: string;
  full_name: string;
  photo_url: string | null;
  category?: { name: string };
  modality?: { name: string };
  position_data?: { name: string };
  position: string;
  number: string;
  whatsapp: string;
  document_cpf: string;
  document_rg: string;
  birth_date: string;
  status: 'active' | 'inactive' | 'pending';
  email?: string;
  organization_id: string;
  nickname?: string;
  address_json?: {
    zip: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  sizes_json?: {
    shirt: string;
    short: string;
    socks: string;
    boots: string;
  };
  gender?: string;
  created_at: string;
  club_shield_url?: string;
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

  // Membership Modal Form States
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [saveCard, setSaveCard] = useState(false);
  const [isFree, setIsFree] = useState(false);

  // Novos campos para Pagador (Checkout Transparente Card)
  const [payerCpf, setPayerCpf] = useState('');
  const [payerZip, setPayerZip] = useState('');
  const [payerStreet, setPayerStreet] = useState('');
  const [payerNumber, setPayerNumber] = useState('');
  const [payerComplement, setPayerComplement] = useState('');
  const [payerNeighborhood, setPayerNeighborhood] = useState('');
  const [payerCity, setPayerCity] = useState('');
  const [payerState, setPayerState] = useState('');

  // Dados do Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Document Modal States
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('RG');
  const [isUploading, setIsUploading] = useState(false);

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
      const { data, error } = await supabase!
        .from('athletes')
        .select(`
          *,
          category:category_id(name),
          modality:modality_id(name),
          position_data:position_id(name),
          subscription:athlete_subscriptions(
            *,
            plan:membership_plans(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      // Garantir que os joins sejam objetos e não arrays (comportamento comum do PostgREST em joins)
      const processedData = {
        ...data,
        category: Array.isArray(data.category) ? data.category[0] : data.category,
        modality: Array.isArray(data.modality) ? data.modality[0] : data.modality,
        position_data: Array.isArray(data.position_data) ? data.position_data[0] : data.position_data,
        subscription: Array.isArray(data.subscription) ? data.subscription[0] : data.subscription
      };

      setAthlete(processedData);

      // Fetch current subscription
      const { data: subData } = await supabase!
        .from('athlete_subscriptions')
        .select('*, plan:membership_plans(*, membership:memberships(name))')
        .eq('athlete_id', id)
        .eq('status', 'active')
        .maybeSingle();

      setCurrentSubscription(subData);

      if (subData) {
        setSelectedPlanId(subData.plan_id || 'FREE');
        setPayerName(subData.payer_name || '');
        setPayerPhone(subData.payer_phone || '');
        setPayerEmail(subData.payer_email || '');
        setDueDay(subData.due_day?.toString() || '10');
        setPaymentMethod(subData.payment_method || 'pix');
        setSaveCard(subData.auto_charge || false);
        setIsFree(subData.status === 'free');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar dados', 'error');
    } finally { setLoading(false); }
  };

  const handleSaveSubscription = async () => {
    if (!organization || (!selectedPlanId && !isFree)) return;
    setIsSavingSubscription(true);
    try {
      // 1. Salvar dados básicos no banco local
      const { error: dbError } = await supabase!
        .from('athlete_subscriptions')
        .upsert({
          athlete_id: id,
          organization_id: organization.id,
          plan_id: isFree ? null : selectedPlanId,
          next_billing_at: isFree ? null : new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          status: isFree ? 'free' : 'active',
          payer_name: payerName,
          payer_phone: payerPhone,
          payer_email: payerEmail,
          due_day: parseInt(dueDay),
          payment_method: paymentMethod,
          auto_charge: paymentMethod === 'card',
          payer_cpf: payerCpf,
          payer_address: {
            zip: payerZip,
            street: payerStreet,
            number: payerNumber,
            complement: payerComplement,
            neighborhood: payerNeighborhood,
            city: payerCity,
            state: payerState
          }
        }, { onConflict: 'athlete_id' });

      if (dbError) throw dbError;

      // 2. Se não for free, processar cobrança inicial via Edge Function
      if (!isFree) {
        const selectedPlan = memberships.flatMap(m => m.plans).find(p => p.id === selectedPlanId);

        const { data: billingData, error: billingError } = await supabase!.functions.invoke('create-billing', {
          body: {
            amountCentavos: (selectedPlan?.amount || 0) * 100,
            method: paymentMethod === 'pix' ? 'PIX' : 'CARD',
            customerName: payerName,
            customerEmail: payerEmail,
            customerTaxId: payerCpf,
            customerPhone: payerPhone,
            customerAddress: {
              zip: payerZip,
              street: payerStreet,
              number: payerNumber,
              complement: payerComplement,
              neighborhood: payerNeighborhood,
              city: payerCity,
              state: payerState
            },
            description: `Assinatura: ${selectedPlan?.name}`,
            externalId: `sub_${id}_${Date.now()}`,
            // Se for cartão, enviamos os dados para processamento transparente
            card: paymentMethod === 'card' ? {
              number: cardNumber.replace(/\s/g, ''),
              holder: cardHolder,
              expiry: cardExpiry,
              cvv: cardCvv
            } : null
          }
        });

        if (billingError) throw billingError;
        if (!billingData.success) throw new Error(billingData.error);

        if (paymentMethod === 'pix' && billingData.data?.pix) {
          // Mostrar QR Code Pix (Pode precisar de um modal de PIX aqui)
          showToast('Assinatura criada! Use o QR Code para pagar.', 'success');
        } else {
          showToast('Assinatura ativada com sucesso!');
        }
      } else {
        showToast('Isenção confirmada com sucesso!');
      }

      fetchAthleteData();
      setIsMembershipModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      showToast(err.message || 'Erro ao processar assinatura', 'error');
    } finally {
      setIsSavingSubscription(false);
    }
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
                className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden ${activeTab === tab ? 'text-black' : 'text-text-muted hover:text-text-main'
                  }`}
              >
                {activeTab === tab && <div className="absolute inset-0 bg-primary shadow-[0_4px_12px_rgba(189,255,1,0.3)]" />}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
          </div>
        </header>

        {/* GRID PRINCIPAL */}
        <div className="grid grid-cols-12 gap-5 items-stretch">

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
                  <div className="flex flex-col">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter text-text-main leading-none mb-1">{athlete.full_name}</h1>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] italic">{athlete.nickname || 'Sem Apelido'}</p>
                      {athlete.email && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-text-muted lowercase tracking-tight border-l border-border-main pl-3">
                          <span className="opacity-50">@</span>
                          {athlete.email}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {[
                      athlete.position_data?.name || athlete.position,
                      athlete.category?.name || 'Sem Categoria',
                      athlete.modality?.name || 'Sem Modalidade'
                    ].filter(Boolean).map((tag, i) => (
                      <span key={i} className="text-[7px] font-black uppercase bg-primary/10 border border-primary/20 text-primary-dark px-2 py-0.5 rounded-md italic tracking-tight">
                        {tag}
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
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-soft border border-border-main hover:border-primary/40 transition-all group/edit shadow-sm"
                >
                  <Edit3 className="w-3 h-3 text-text-subtle group-hover/edit:text-primary" />
                  <span className="text-[9px] font-black uppercase text-text-subtle group-hover/edit:text-text-main">Editar Atleta</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-2 flex items-center justify-between bg-surface-soft border border-border-main p-4 rounded-2xl">
                  <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase text-text-subtle tracking-widest">Nome Completo</p>
                    <p className="text-[11px] font-black italic text-text-main uppercase tracking-tight leading-tight">{athlete.full_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-text-subtle uppercase tracking-widest">Apelido</p>
                    <p className="text-xs font-black italic text-primary-dark uppercase">{athlete.nickname || '---'}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <CalendarDays className="w-3 h-3" /> Nascimento
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-black italic text-text-main uppercase tracking-tighter leading-tight">{athlete.birth_date ? new Date(athlete.birth_date).toLocaleDateString('pt-BR') : '---'}</p>
                    <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[8px] font-black italic text-primary-dark">{calculateAge(athlete.birth_date)} ANOS</span>
                  </div>
                </div>

                <div className="space-y-1 min-h-[45px]">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <MapPin className="w-3 h-3" /> Endereço
                  </p>
                  <p className="text-[10px] font-bold text-text-main uppercase tracking-tight leading-normal break-words" title={formatAddress(athlete.address_json)}>
                    {formatAddress(athlete.address_json) || 'Endereço não informado'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[7px] font-black uppercase text-text-subtle flex items-center gap-2 tracking-widest">
                    <IdCard className="w-3 h-3" /> CPF
                  </p>
                  <p className="text-[11px] font-black italic text-text-main uppercase tracking-tighter leading-tight">
                    {athlete.document_cpf || (athlete as any).cpf || athlete.address_json?.payerCpf || '---'}
                  </p>
                </div>

                <div>
                  <p className="text-[7px] font-black text-text-subtle uppercase mb-1 tracking-widest flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" /> RG
                  </p>
                  <p className="text-[11px] font-black italic text-text-main uppercase tracking-tighter leading-tight">
                    {athlete.document_rg || (athlete as any).rg || '---'}
                  </p>
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
                  <ShortsIcon className="w-6 h-6 text-primary mb-1.5 opacity-80 group-hover:scale-110 transition-transform" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1">Calção</p>
                  <p className="text-[11px] font-black italic text-text-main uppercase">
                    {athlete.sizes_json?.short || '---'}
                  </p>
                </div>

                <div className="bg-surface-soft border border-border-main rounded-xl p-2.5 flex flex-col items-center justify-center group hover:border-primary/30 transition-all cursor-default">
                  <SocksIcon className="w-6 h-6 text-primary mb-1.5 opacity-80 group-hover:scale-110 transition-transform" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1">Meião</p>
                  <p className="text-[11px] font-black italic text-text-main uppercase">
                    {athlete.sizes_json?.socks || '---'}
                  </p>
                </div>

                <div className="bg-surface-soft border border-border-main rounded-xl p-2.5 flex flex-col items-center justify-center group hover:border-primary/30 transition-all cursor-default">
                  <CleatsIcon className="w-6 h-6 text-primary mb-1.5 opacity-80 group-hover:scale-110 transition-transform" />
                  <p className="text-[6px] font-black text-text-subtle uppercase tracking-widest mb-1">Chuteira</p>
                  <p className="text-[11px] font-black italic text-text-main uppercase">
                    {athlete.sizes_json?.boots || '---'}
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
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase transition-all ${athlete.dominant_foot === 'Canhoto' ? 'bg-primary text-black' : 'bg-surface border border-border-main text-text-muted opacity-40'}`}>Canhoto</span>
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase transition-all ${athlete.dominant_foot === 'Destro' || !athlete.dominant_foot ? 'bg-primary text-black' : 'bg-surface border border-border-main text-text-muted opacity-40'}`}>Destro</span>
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic uppercase transition-all ${athlete.dominant_foot === 'Ambidestro' ? 'bg-primary text-black' : 'bg-surface border border-border-main text-text-muted opacity-40'}`}>Ambi</span>
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

              <div className="space-y-1.5 mb-4 overflow-y-auto max-h-[180px] no-scrollbar">
                {(athlete as any).documents_json && (athlete as any).documents_json.length > 0 ? (
                  (athlete as any).documents_json.map((doc: any, i: number) => (
                    <div
                      key={i}
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-surface-soft border border-border-main group/doc cursor-pointer hover:bg-surface-strong transition-all"
                    >
                      <div className="flex flex-col">
                        <p className="text-[8px] font-black uppercase text-text-main tracking-tighter truncate max-w-[150px]">{doc.name}</p>
                        <p className="text-[6px] font-bold uppercase text-primary/70 tracking-widest">{doc.category || 'Documento'}</p>
                      </div>
                      <Download className="w-3 h-3 text-text-subtle group-hover/doc:text-primary transition-colors" />
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center border border-dashed border-border-main rounded-xl">
                    <p className="text-[8px] font-black uppercase text-text-muted tracking-widest">Nenhum documento</p>
                  </div>
                )}
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

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
          <div className="bg-[var(--surface)] w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <CreditCard size={24} className="text-black" />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-[var(--text)] italic">Configurar Mensalidade</h2>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Atleta: {athlete.full_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMembershipModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center hover:border-primary/40 transition-all"
              >
                <Plus size={24} className="text-[var(--text-muted)] rotate-45" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Coluna Esquerda: Seleção de Plano */}
              <div className="w-full md:w-1/2 p-8 border-r border-[var(--border)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">1. Selecione o Plano</h3>
                    <button
                      onClick={() => {
                        setIsFree(!isFree);
                        if (!isFree) setSelectedPlanId('FREE');
                        else setSelectedPlanId('');
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        isFree
                          ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                          : "bg-surface border-border-main text-text-subtle hover:border-primary/40"
                      )}
                    >
                      Plano Gratuito
                    </button>
                  </div>

                  {!isFree ? (
                    <div className="space-y-6">
                      {memberships.map(membership => (
                        <div key={membership.id} className="space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] ml-1">{membership.name}</p>
                          <div className="grid grid-cols-1 gap-2.5">
                            {membership.plans?.map((plan: any) => (
                              <button
                                key={plan.id}
                                onClick={() => setSelectedPlanId(plan.id)}
                                className={cn(
                                  "flex items-center justify-between p-5 rounded-2xl border transition-all text-left group",
                                  selectedPlanId === plan.id
                                    ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(189,255,1,0.05)]"
                                    : "bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/40"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                    selectedPlanId === plan.id ? "border-primary bg-primary" : "border-[var(--border)] bg-transparent"
                                  )}>
                                    {selectedPlanId === plan.id && <Check size={10} className="text-black" strokeWidth={4} />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-black uppercase italic text-[var(--text)] group-hover:text-primary transition-colors">{plan.name}</p>
                                    <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                      {plan.billing_period === 'monthly' ? 'Pagamento Mensal' :
                                        plan.billing_period === 'quarterly' ? 'Pagamento Trimestral' :
                                          plan.billing_period === 'semiannual' ? 'Pagamento Semestral' : 'Pagamento Anual'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-base font-black italic text-primary">R$ {plan.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  {currentSubscription?.plan_id === plan.id && (
                                    <span className="text-[7px] font-black uppercase text-emerald-500 tracking-widest">Plano Atual</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed border-primary/20 rounded-[32px] bg-primary/5 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 h-[300px]">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        <Zap size={32} className="text-primary" />
                      </div>
                      <h4 className="text-sm font-black uppercase italic text-primary mb-2">Plano Gratuito Ativado</h4>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase leading-relaxed max-w-[240px]">
                        Isenção total de cobrança para este atleta.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Informações de Pagamento */}
              <div
                className="w-full md:w-1/2 p-8 bg-[var(--surface-soft)]/30 overflow-y-auto flex flex-col scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
              >
                <div className="space-y-8 flex-1">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">2. Dados do Pagador & Cobrança</h3>

                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome do Responsável</label>
                          <input
                            value={payerName}
                            onChange={(e) => setPayerName(e.target.value)}
                            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                            placeholder="Ex: Nome do Pai ou Mãe"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">WhatsApp / Celular</label>
                            <input
                              value={payerPhone}
                              onChange={(e) => setPayerPhone(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15))}
                              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">E-mail</label>
                            <input
                              type="email"
                              value={payerEmail}
                              onChange={(e) => setPayerEmail(e.target.value)}
                              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                              placeholder="pagamento@email.com"
                            />
                          </div>
                        </div>
                      </div>

                      {!isFree && (
                        <div className="space-y-5 pt-4 border-t border-[var(--border)]">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Dia de Vencimento</label>
                              <select
                                value={dueDay}
                                onChange={(e) => setDueDay(e.target.value)}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)] appearance-none"
                              >
                                {[5, 10, 15, 20, 25].map(d => <option key={d} value={d}>Dia {d}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Método Preferencial</label>
                              <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value as any)}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)] appearance-none"
                              >
                                <option value="pix">PIX (Mais Rápido)</option>
                                <option value="card">Cartão de Crédito</option>
                              </select>
                            </div>
                          </div>

                          {/* Seção Cartão: Dados do Pagador Avançados + Cartão */}
                          {paymentMethod === 'card' && (
                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                              <div className="pt-4 border-t border-border-main/50">
                                <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-4">Dados Fiscais do Pagador</p>
                                <div className="grid grid-cols-1 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CPF do Pagador</label>
                                    <input
                                      value={payerCpf}
                                      onChange={(e) => setPayerCpf(e.target.value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').substring(0, 14))}
                                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                      placeholder="000.000.000-00"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CEP</label>
                                      <input
                                        value={payerZip}
                                        onChange={(e) => setPayerZip(e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9))}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="00000-000"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Bairro</label>
                                      <input
                                        value={payerNeighborhood}
                                        onChange={(e) => setPayerNeighborhood(e.target.value)}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="Centro"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3 space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Logradouro (Rua/Av)</label>
                                      <input
                                        value={payerStreet}
                                        onChange={(e) => setPayerStreet(e.target.value)}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="Rua das Flores"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nº</label>
                                      <input
                                        value={payerNumber}
                                        onChange={(e) => setPayerNumber(e.target.value)}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="123"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t border-border-main/50">
                                <p className="text-[8px] font-black uppercase text-primary tracking-[0.2em] mb-4">Dados do Cartão de Crédito</p>
                                <div className="space-y-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Número do Cartão</label>
                                    <div className="relative">
                                      <input
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})(\d)/g, '$1 $2').substring(0, 19))}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="0000 0000 0000 0000"
                                      />
                                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-subtle" />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome no Cartão</label>
                                    <input
                                      value={cardHolder}
                                      onChange={(e) => setCardHolder(e.target.value)}
                                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                      placeholder="NOME IGUAL NO CARTÃO"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Validade (MM/AA)</label>
                                      <input
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5))}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="05/30"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CVV</label>
                                      <input
                                        value={cardCvv}
                                        onChange={(e) => setCardCvv(e.target.value)}
                                        type="password"
                                        maxLength={4}
                                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                                        placeholder="***"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>


                  <div className="mt-auto pt-6 border-t border-[var(--border)]">
                    <button
                      onClick={handleSaveSubscription}
                      disabled={isSavingSubscription || (!isFree && !selectedPlanId)}
                      className="w-full py-5 bg-primary text-black rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {isSavingSubscription ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} strokeWidth={3} />}
                      {isFree ? 'Confirmar Isenção' : 'Ativar Assinatura'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* MODAL: NOVO DOCUMENTO */}
      {isDocumentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Upload size={20} className="text-black" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight text-[var(--text)] italic">Novo Documento</h2>
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Anexar ao Dossiê</p>
                </div>
              </div>
              <button
                onClick={() => setIsDocumentModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center hover:border-primary/40 transition-all"
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Título do Documento</label>
                <input
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  placeholder="Ex: RG - Frente"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Categoria</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)] appearance-none"
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="Atestado Médico">Atestado Médico</option>
                  <option value="Contrato">Contrato</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <label className="relative border-2 border-dashed border-[var(--border)] rounded-[24px] p-10 flex flex-col items-center justify-center bg-[var(--surface-soft)]/30 hover:border-primary/40 transition-all cursor-pointer group">
                <input
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsUploading(true);
                    try {
                      const fileExt = file.name.split('.').pop();
                      const fileName = `doc-${Date.now()}.${fileExt}`;

                      const { error: uploadError } = await supabase!.storage
                        .from('documents')
                        .upload(fileName, file);

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = supabase!.storage.from('documents').getPublicUrl(fileName);

                      const newDoc = { name: docTitle || file.name, category: docCategory, url: publicUrl, date: new Date().toISOString() };
                      const currentDocs = athlete.documents_json || [];

                      const { error: updateError } = await supabase!
                        .from('athletes')
                        .update({ documents_json: [...currentDocs, newDoc] })
                        .eq('id', athlete.id);

                      if (updateError) throw updateError;

                      showToast('Documento enviado com sucesso!');
                      fetchAthleteData();
                      setIsDocumentModalOpen(false);
                      setDocTitle('');
                    } catch (err: any) {
                      showToast(err.message, 'error');
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                />
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase text-[var(--text)] mb-1">
                  {isUploading ? 'Enviando...' : 'Clique para selecionar arquivo'}
                </p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">PDF, PNG ou JPG (Max 5MB)</p>
              </label>

              <button
                disabled={isUploading || !docTitle}
                className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} strokeWidth={3} />}
                Salvar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatAddress(address: any) {
  if (!address || typeof address !== 'object') return 'Endereço não informado';
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.number) parts.push(address.number);
  if (address.complement) parts.push(address.complement);
  if (address.neighborhood) parts.push(address.neighborhood);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  return parts.length > 0 ? parts.join(', ') : 'Endereço não informado';
}
