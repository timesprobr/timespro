import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  CreditCard, 
  AlertCircle, 
  TrendingUp, 
  X, 
  Check, 
  Loader2, 
  PlusCircle, 
  Trash2,
  Ticket,
  Star,
  Gift,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

interface FanProgram {
  id: string;
  title: string;
  benefits: string[];
  plan_id: string;
  active: boolean;
  member_count: number;
  plan?: {
    title: string;
    amount: number;
  };
}

interface MembershipPlan {
  id: string;
  title: string;
  amount: number;
}

export default function Members() {
  const { organization } = useOrg();
  const [activeTab, setActiveTab] = useState<'programs' | 'members'>('programs');
  const [programs, setPrograms] = useState<FanProgram[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    conversionRate: 0,
    churnRate: 2.1,
    totalAthletes: 0
  });

  // Form State
  const [title, setTitle] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const fetchData = async () => {
    try {
      const [programsRes, plansRes, athletesRes] = await Promise.all([
        supabase!
          .from('fan_programs')
          .select('*, plan:membership_plans(title, amount)')
          .eq('organization_id', organization.id),
        supabase!
          .from('membership_plans')
          .select('id, title, amount')
          .eq('organization_id', organization.id),
        supabase!
          .from('athletes')
          .select('*, fan_program:fan_programs(title)')
          .eq('organization_id', organization.id)
          .order('full_name')
      ]);

      if (programsRes.error) throw programsRes.error;
      if (plansRes.error) throw plansRes.error;
      if (athletesRes.error) throw athletesRes.error;

      const athletesData = athletesRes.data || [];
      const programsData = (programsRes.data || []).map(prog => ({
        ...prog,
        member_count: athletesData.filter(a => a.fan_program_id === prog.id).length
      }));

      setPrograms(programsData);
      setPlans(plansRes.data || []);
      setAthletes(athletesData);

      // Calculate Stats
      const totalRevenue = programsData.reduce((acc, curr) => 
        acc + (curr.member_count * (curr.plan?.amount || 0)), 0
      );
      
      const membersCount = athletesData.filter(a => a.fan_program_id).length;
      const conversionRate = athletesData.length > 0 ? (membersCount / athletesData.length) * 100 : 0;

      setStats({
        totalRevenue,
        conversionRate,
        churnRate: 2.1,
        totalAthletes: athletesData.length
      });

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.fan_program_id && (
      a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.fan_program?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setBenefits([...benefits, benefitInput.trim()]);
      setBenefitInput('');
    }
  };

  const removeBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);

    try {
      const { error } = await supabase!
        .from('fan_programs')
        .insert({
          organization_id: organization.id,
          title,
          benefits,
          plan_id: selectedPlanId || null,
          active: true
        });

      if (error) throw error;

      setToast({ message: 'Programa criado com sucesso!', type: 'success' });
      setIsModalOpen(false);
      setTitle('');
      setBenefits([]);
      setSelectedPlanId('');
      fetchData();
    } catch (err: any) {
      setToast({ message: 'Erro ao criar programa: ' + err.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[var(--text)] uppercase italic font-display leading-none">
            Sócio Torcedor
          </h1>
          <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            <ShieldCheck size={10} className="text-primary" /> Gestão de Programas e Fidelidade
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'members' && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-primary transition-colors">
                <Search size={14} />
              </div>
              <input 
                type="text"
                placeholder="Buscar sócio..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[var(--surface-soft)] border-transparent focus:border-primary/50 border-2 rounded-xl text-[10px] font-bold focus:outline-none transition-all w-48 text-[var(--text)]"
              />
            </div>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-black rounded-xl text-[9px] font-black shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 uppercase tracking-widest"
          >
            <PlusCircle size={14} strokeWidth={3} />
            Novo Programa
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 p-1 bg-[var(--surface-soft)] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('programs')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'programs' 
              ? "bg-[var(--surface)] text-primary shadow-sm" 
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          <Ticket size={14} />
          Programas
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'members' 
              ? "bg-[var(--surface)] text-primary shadow-sm" 
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          <ShieldCheck size={14} />
          Sócios Ativos
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border p-5 rounded-[24px] shadow-sm relative overflow-hidden group transition-all duration-300 bg-[var(--surface)] border-[var(--border)]">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
            <Gift size={60} className="text-primary" />
          </div>
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] leading-none">Receita Mensal Prevista</p>
          <div className="flex items-baseline gap-2 mt-3">
            <p className="text-xl font-black text-[var(--text)] tracking-tight italic leading-none">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <span className="text-[9px] text-primary font-black uppercase tracking-widest flex items-center gap-1">
              <TrendingUp size={10} strokeWidth={3} /> +8%
            </span>
          </div>
        </div>
        
        <div className="border p-5 rounded-[24px] shadow-sm relative overflow-hidden group transition-all duration-300 bg-[var(--surface)] border-[var(--border)]">
          <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] leading-none">Taxa de Conversão</p>
          <p className="text-xl font-black mt-3 text-[var(--text)] tracking-tight italic leading-none">{stats.conversionRate.toFixed(1)}%</p>
          <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mt-2">Base de {stats.totalAthletes} atletas</p>
        </div>

        <div className="border p-5 rounded-[24px] shadow-sm relative overflow-hidden group transition-all duration-300 bg-rose-500/5 border-rose-500/10">
          <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-[0.2em] leading-none">Churn Rate</p>
          <p className="text-xl font-black mt-3 text-rose-500 tracking-tight italic leading-none">{stats.churnRate}%</p>
          <p className="text-[9px] text-rose-500/40 font-black uppercase tracking-widest mt-2">Cancelamentos baixos</p>
        </div>
      </div>

      {activeTab === 'programs' ? (
        /* Program Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {programs.map((program) => (
            <div 
              key={program.id}
              className="p-5 rounded-[28px] border transition-all duration-500 group relative overflow-hidden flex flex-col min-h-[280px] bg-[var(--surface)] border-[var(--border)] hover:border-primary/30"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
              
              <div className="relative z-10 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Star size={18} fill="currentColor" />
                  </div>
                  {program.plan && (
                    <div className="text-right">
                      <p className="text-[8px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">Mensal</p>
                      <p className="text-base font-black text-primary italic leading-none">
                        R$ {program.plan.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black uppercase italic text-[var(--text)] mb-4 leading-tight">
                  {program.title}
                </h3>
                
                <div className="space-y-2 mt-4">
                  {program.benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[10px] font-bold text-[var(--text-muted)]">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                      {benefit}
                    </div>
                  ))}
                  {program.benefits.length > 3 && (
                    <p className="text-[9px] font-bold text-primary/60 uppercase tracking-widest pl-3.5">+ {program.benefits.length - 3} benefícios</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[1, 2].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border-2 border-[var(--surface)] bg-[var(--surface-soft)] flex items-center justify-center text-[7px] font-black text-[var(--text)] uppercase">
                        {String.fromCharCode(64 + i)}
                      </div>
                    ))}
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--surface)] bg-primary flex items-center justify-center text-[7px] font-black text-black">
                      {program.member_count}
                    </div>
                  </div>
                  <span className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest ml-1">
                    {program.member_count} {program.member_count === 1 ? 'sócio' : 'sócios'}
                  </span>
                </div>
                <button className="p-1.5 text-[var(--text-muted)] hover:text-primary transition-colors">
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {programs.length === 0 && !loading && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="p-6 rounded-[28px] border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-3 group hover:border-primary/40 transition-all duration-500 min-h-[280px]"
            >
              <div className="p-3 bg-[var(--surface-soft)] rounded-full text-[var(--text-muted)] group-hover:text-primary group-hover:scale-110 transition-all">
                <Ticket size={32} strokeWidth={1} />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nenhum programa ativo</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1 uppercase">Clique para começar</p>
              </div>
            </button>
          )}
        </div>
      ) : (
        /* Members List View */
        <div className="rounded-[32px] border overflow-hidden animate-in slide-in-from-bottom duration-500 bg-[var(--surface)] border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-6 py-5 text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Sócio</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Programa</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Contato</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest text-center">Status</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredAthletes.map((athlete) => (
                  <tr key={athlete.id} className="group hover:bg-[var(--surface-soft)]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[10px] font-black text-[var(--text-muted)] group-hover:bg-primary group-hover:text-black transition-all">
                          {athlete.full_name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase italic text-[var(--text)] leading-none">{athlete.full_name}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1 uppercase">ID: #{athlete.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <Star size={10} className="text-primary" fill="currentColor" />
                        <span className="text-[9px] font-black text-primary uppercase">{athlete.fan_program?.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                          <Mail size={10} /> {athlete.email || 'N/A'}
                        </p>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1.5">
                          <Phone size={10} /> {athlete.phone || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                          <Check size={10} strokeWidth={3} />
                          <span className="text-[9px] font-black uppercase">Ativo</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors">
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAthletes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Search size={40} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nenhum sócio encontrado</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - REDUCED SIZES */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col md:flex-row max-h-[85vh]">
            {/* Left Side */}
            <div className="hidden md:flex md:w-2/5 bg-primary p-8 flex-col justify-between text-black relative overflow-hidden">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 blur-3xl -mr-24 -mt-24 rounded-full" />
               <div className="relative z-10">
                 <ShieldCheck size={36} strokeWidth={3} />
                 <h2 className="text-2xl font-black uppercase italic leading-none mt-4">Criar Programa</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest mt-3 opacity-70">Defina os privilégios dos sócios.</p>
               </div>
            </div>

            {/* Right Side */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-[var(--surface-soft)] rounded-xl transition-colors ml-auto">
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <form onSubmit={handleCreateProgram} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Título do Programa</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Sócio Ouro"
                    className="w-full bg-[var(--surface-soft)] border-2 border-transparent focus:border-primary rounded-xl px-5 py-3 text-xs font-bold focus:outline-none transition-all text-[var(--text)]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Mensalidade</label>
                  <div className="relative">
                    <select 
                      value={selectedPlanId}
                      onChange={e => setSelectedPlanId(e.target.value)}
                      className="w-full bg-[var(--surface-soft)] border-2 border-transparent focus:border-primary rounded-xl px-5 py-3 text-xs font-bold focus:outline-none appearance-none transition-all cursor-pointer text-[var(--text)]"
                      required
                    >
                      <option value="">Selecione um plano...</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id} className="bg-[var(--surface)] text-[var(--text)]">
                          {plan.title} - R$ {plan.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                      <CreditCard size={14} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] ml-1">Benefícios</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={benefitInput}
                      onChange={e => setBenefitInput(e.target.value)}
                      placeholder="Novo benefício"
                      className="flex-1 bg-[var(--surface-soft)] border-2 border-transparent focus:border-primary rounded-xl px-5 py-3 text-xs font-bold focus:outline-none transition-all text-[var(--text)]"
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                    />
                    <button 
                      type="button"
                      onClick={handleAddBenefit}
                      className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                  
                  <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)] group">
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-primary" strokeWidth={3} />
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">{benefit}</span>
                        </div>
                        <button type="button" onClick={() => removeBenefit(index)} className="text-[var(--text-muted)] hover:text-rose-500 p-0.5">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSaving || benefits.length === 0}
                  className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : 'Finalizar Programa'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
