import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Clock, 
  Tag, 
  X,
  Check,
  Loader2,
  Trash2,
  Edit3,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';

interface MembershipPlan {
  id: string;
  membership_id: string;
  name: string;
  amount: number;
  billing_period: string;
  status: string;
}

interface Membership {
  id: string;
  name: string;
  description: string;
  modality_id: string;
  category_id: string;
  plans?: (MembershipPlan & { athlete_subscriptions: { id: string }[] })[];
  modality?: { name: string };
  category?: { name: string };
}

const FREQUENCIES = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' }
];

export default function Mensalidades() {
  const { organization } = useOrg();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [assignTab, setAssignTab] = useState<'athletes' | 'categories'>('athletes');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Form State
  // Form State
  const [mName, setMName] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mModalityId, setMModalityId] = useState('');
  const [mCategoryId, setMCategoryId] = useState('');
  const [mPlans, setMPlans] = useState<{ id?: string; name: string; amount: string; billing_period: string }[]>([
    { name: 'Mensal', amount: '', billing_period: 'monthly' }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const maskCurrency = (v: string) => {
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d)(\d{2})$/, "$1,$2");
    v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return v;
  };

  useEffect(() => {
    if (organization) {
      fetchMemberships();
      fetchAthletes();
      fetchTechnicalData();
    }
  }, [organization]);

  const fetchTechnicalData = async () => {
    if (!organization) return;
    try {
      const { data: modData } = await supabase!
        .from('athlete_modalities')
        .select('*')
        .eq('organization_id', organization.id);
      
      const { data: catData } = await supabase!
        .from('athlete_categories')
        .select('*')
        .eq('organization_id', organization.id);
      
      setModalities(modData || []);
      setCategories(catData || []);
    } catch (err) {
      console.error('Error fetching technical data:', err);
    }
  };

  const fetchAthletes = async () => {
    if (!organization) return;
    try {
      const { data: athletesData, error: athletesError } = await supabase!
        .from('athletes')
        .select('*')
        .eq('organization_id', organization.id)
        .order('full_name');
      
      if (athletesError) throw athletesError;
      
      const { data: categoriesData } = await supabase!
        .from('athlete_categories')
        .select('*')
        .eq('organization_id', organization.id);

      console.log('Dados carregados:', { athletes: athletesData?.length, categories: categoriesData?.length });

      setAthletes(athletesData?.map(a => ({
        ...a,
        name: a.full_name || 'Atleta sem nome',
        category: categoriesData?.find(c => c.id === a.category_id || c.id === a.category)?.name || 'Sem Categoria'
      })) || []);
    } catch (err: any) {
      console.error('Erro ao buscar atletas:', err);
      // alert('Erro ao carregar atletas: ' + err.message);
    }
  };

  const fetchMemberships = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase!
        .from('memberships')
        .select('*, modality:athlete_modalities(name), category:athlete_categories(name), plans:membership_plans(*, athlete_subscriptions(id))')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMemberships(data || []);
    } catch (err) {
      console.error('Error fetching memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (membership: Membership) => {
    setEditingId(membership.id);
    setMName(membership.name);
    setMDescription(membership.description || '');
    setMModalityId(membership.modality_id || '');
    setMCategoryId(membership.category_id || '');
    if (membership.plans) {
      setMPlans(membership.plans.map(p => ({
        id: p.id,
        name: p.name,
        amount: maskCurrency(p.amount.toFixed(2).replace('.', '')),
        billing_period: p.billing_period
      })) as any);
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Mensalidade',
      message: 'Deseja realmente excluir esta mensalidade? Todos os planos vinculados também serão removidos.',
      onConfirm: async () => {
        try {
          const { error } = await supabase!.from('memberships').delete().eq('id', id);
          if (error) throw error;
          showToast('Mensalidade excluída com sucesso!');
          fetchMemberships();
        } catch (err: any) {
          console.error(err);
          showToast('Erro ao excluir: ' + err.message, 'error');
        }
      }
    });
  };

  const handleAssign = async () => {
    if (!organization || !selectedPlan || selectedAthletes.length === 0) return;
    setIsAssigning(true);
    try {
      const assignments = selectedAthletes.map(athleteId => ({
        organization_id: organization.id,
        plan_id: selectedPlan.id,
        athlete_id: athleteId,
        next_billing_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        status: 'active'
      }));

      const { error } = await supabase!.from('athlete_subscriptions').insert(assignments);
      if (error) throw error;

      setIsAssignModalOpen(false);
      setSelectedAthletes([]);
      showToast(`${selectedAthletes.length} atletas atribuídos com sucesso!`);
    } catch (err: any) {
      console.error(err);
      showToast('Erro ao atribuir: ' + err.message, 'error');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);

    try {
      // VALIDATE BEFORE ANY DATABASE ACTION
      for (const p of mPlans) {
        const amount = parseFloat(p.amount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(amount) || amount < 30) {
          throw new Error(`O valor mínimo para qualquer plano deve ser R$ 30,00. O plano "${p.name || 'Principal'}" está com R$ ${p.amount || '0,00'}.`);
        }
      }

      // 1. Verificar se já existe uma mensalidade com este nome para esta organização (Prevenção de duplicidade)
      let membershipId = editingId;
      
      if (!editingId) {
        const { data: existing } = await supabase!
          .from('memberships')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('name', mName)
          .maybeSingle();
        
        if (existing) {
          membershipId = existing.id;
        }
      }

      if (membershipId) {
        // UPDATE MODE
        const { error: mError } = await supabase!
          .from('memberships')
          .update({
            name: mName,
            description: mDescription,
            modality_id: mModalityId || null,
            category_id: mCategoryId || null
          })
          .eq('id', membershipId);

        if (mError) throw mError;
      } else {
        // CREATE MODE
        const { data: membership, error: mError } = await supabase!
          .from('memberships')
          .insert({
            organization_id: organization.id,
            name: mName,
            description: mDescription,
            modality_id: mModalityId || null,
            category_id: mCategoryId || null
          })
          .select()
          .single();

        if (mError) throw mError;
        membershipId = membership.id;
      }

      // For plans: handle update/insert
      for (const p of mPlans) {
        const planData = {
          organization_id: organization.id,
          membership_id: membershipId,
          name: p.name,
          amount: parseFloat(p.amount.replace(/\./g, '').replace(',', '.')),
          billing_period: p.billing_period
        };

        if ((p as any).id) {
          await supabase!.from('membership_plans').update(planData).eq('id', (p as any).id);
        } else {
          // Antes de inserir, verifica se este plano já não existe para esta mensalidade
          const { data: existingPlan } = await supabase!
            .from('membership_plans')
            .select('id')
            .eq('membership_id', membershipId)
            .eq('name', p.name)
            .maybeSingle();

          if (existingPlan) {
            await supabase!.from('membership_plans').update(planData).eq('id', existingPlan.id);
          } else {
            await supabase!.from('membership_plans').insert(planData);
          }
        }
      }
      
      setIsModalOpen(false);
      fetchMemberships();
      
      // Reset form
      setEditingId(null);
      setMName('');
      setMDescription('');
      setMModalityId('');
      setMCategoryId('');
      setMPlans([{ name: 'Mensal', amount: '', billing_period: 'monthly' }]);
      
      showToast(editingId ? 'Mensalidade atualizada!' : 'Mensalidade criada!');
    } catch (err: any) {
      console.error('Error saving membership:', err);
      showToast('Erro ao salvar: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const uniqueCategories = Array.from(new Set(athletes.map(a => a.category))).filter(Boolean);

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none">Mensalidades</h1>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Gestão de planos e receita recorrente</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setMName('');
            setMDescription('');
            setMModalityId('');
            setMCategoryId('');
            setMPlans([{ name: 'Mensal', amount: '', billing_period: 'monthly' }]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={14} strokeWidth={3} />
          Criar Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {memberships.map(membership => (
          <div key={membership.id} className="bg-[var(--surface)] rounded-[32px] border border-[var(--border)] p-6 shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
            
            <div className="relative z-10 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                  <CreditCard size={20} />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingId(membership.id);
                      setMName(membership.name);
                      setMDescription(membership.description || '');
                      setMModalityId(membership.modality_id || '');
                      setMCategoryId(membership.category_id || '');
                      setMPlans(membership.plans?.map(p => ({
                        id: p.id,
                        name: p.name,
                        amount: p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        billing_period: p.billing_period
                      })) || []);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors bg-[var(--surface-soft)] rounded-xl"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(membership.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors bg-[var(--surface-soft)] rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/20">
                    {membership.modality?.name || 'Todas Modalidades'}
                  </span>
                  {membership.category?.name && (
                    <span className="px-2.5 py-0.5 bg-white/5 text-[var(--text-muted)] rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                      {membership.category.name}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black uppercase text-[var(--text)] italic leading-tight">{membership.name}</h3>
                <p className="text-[10px] text-[var(--text-muted)] font-medium line-clamp-2">{membership.description}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] italic">Planos Disponíveis:</p>
                {membership.plans?.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)] hover:border-primary/20 transition-all group/plan">
                    <div>
                      <p className="text-[10px] font-black uppercase italic text-[var(--text)]">{plan.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                          <Clock size={10} />
                          <span className="text-[8px] font-black uppercase tracking-widest">
                            {FREQUENCIES.find(f => f.value === plan.billing_period)?.label}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[7px] font-black rounded-full uppercase tracking-tighter">
                          {(plan.athlete_subscriptions?.length || 0)} ATIVOS
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-primary italic leading-none">
                          R$ {plan.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedMembership(membership);
                          setSelectedPlan(plan);
                          setIsAssignModalOpen(true);
                        }}
                        className="p-2 bg-[var(--text)] text-[var(--surface)] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Tag size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">Atribuir Plano</h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{selectedMembership?.name} - {selectedPlan?.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="p-4 bg-[var(--surface-soft)]/50 border-b border-[var(--border)] space-y-4">
              <div className="flex gap-2 p-1 bg-[var(--surface-soft)] rounded-xl w-fit">
                <button 
                  onClick={() => setAssignTab('athletes')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    assignTab === 'athletes' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)]"
                  )}
                >
                  Atletas
                </button>
                <button 
                  onClick={() => setAssignTab('categories')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    assignTab === 'categories' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)]"
                  )}
                >
                  Categorias
                </button>
              </div>
              <input 
                type="text"
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-primary text-[var(--text)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {assignTab === 'athletes' ? (
                filteredAthletes.length > 0 ? (
                  filteredAthletes.map(athlete => (
                    <label key={athlete.id} className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group",
                      selectedAthletes.includes(athlete.id) 
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/20"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          selectedAthletes.includes(athlete.id) ? "bg-primary border-primary" : "border-[var(--text-muted)]"
                        )}>
                          {selectedAthletes.includes(athlete.id) && <Check size={10} className="text-black stroke-[4]" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase italic text-[var(--text)] leading-none">{athlete.name}</p>
                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{athlete.category || 'Sem Categoria'}</p>
                        </div>
                      </div>
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={selectedAthletes.includes(athlete.id)}
                        onChange={() => {
                          if (selectedAthletes.includes(athlete.id)) {
                            setSelectedAthletes(prev => prev.filter(id => id !== athlete.id));
                          } else {
                            setSelectedAthletes(prev => [...prev, athlete.id]);
                          }
                        }}
                      />
                    </label>
                  ))
                ) : (
                  <div className="py-10 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nenhum atleta encontrado</p>
                  </div>
                )
              ) : (
                uniqueCategories.length > 0 ? (
                  uniqueCategories.map(cat => (
                    <label key={cat} className={cn(
                      "flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group",
                      athletes.filter(a => a.category === cat).every(a => selectedAthletes.includes(a.id))
                        ? "bg-primary/5 border-primary/30" 
                        : "bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/20"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                          athletes.filter(a => a.category === cat).every(a => selectedAthletes.includes(a.id)) ? "bg-primary border-primary" : "border-[var(--text-muted)]"
                        )}>
                          {athletes.filter(a => a.category === cat).every(a => selectedAthletes.includes(a.id)) && <Check size={10} className="text-black stroke-[4]" />}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase italic text-[var(--text)] leading-none">{cat}</p>
                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
                            {athletes.filter(a => a.category === cat).length} atletas nesta categoria
                          </p>
                        </div>
                      </div>
                      <input 
                        type="checkbox"
                        className="hidden"
                        onChange={(e) => {
                          const catAthletes = athletes.filter(a => a.category === cat).map(a => a.id);
                          if (e.target.checked) {
                            setSelectedAthletes(prev => Array.from(new Set([...prev, ...catAthletes])));
                          } else {
                            setSelectedAthletes(prev => prev.filter(id => !catAthletes.includes(id)));
                          }
                        }}
                      />
                    </label>
                  ))
                ) : (
                  <div className="py-10 text-center opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nenhuma categoria encontrada</p>
                  </div>
                )
              )}
            </div>
            <div className="p-5 border-t border-[var(--border)] bg-[var(--surface-soft)]/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                  {selectedAthletes.length} selecionados
                </span>
                <button 
                  onClick={() => setSelectedAthletes([])}
                  className="text-[9px] font-black uppercase text-rose-500 hover:underline"
                >
                  Limpar
                </button>
              </div>
              <button 
                onClick={handleAssign}
                disabled={isAssigning || selectedAthletes.length === 0}
                className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAssigning ? <Loader2 className="animate-spin" size={18} /> : `Atribuir Agora`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Plus size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">{editingId ? 'Editar Mensalidade' : 'Nova Mensalidade'}</h2>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{editingId ? 'Atualize os dados e valores' : 'Gestão de Cobranças Técnicas'}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            {/* Alerta de Taxas */}
            <div className="mx-6 mt-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <TrendingUp size={14} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Taxa de Processamento</p>
                <p className="text-[9px] font-bold text-[var(--text-muted)] mt-0.5">
                  Sobre cada transação deste plano, será descontado <span className="text-primary">R$ 1,00 + 3,99%</span>. 
                  O valor líquido será creditado na sua carteira.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateMembership} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome da Mensalidade</label>
                <input 
                  type="text" 
                  value={mName}
                  onChange={e => setMName(e.target.value)}
                  className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  placeholder="Ex: Mensalidade Futebol"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Modalidade</label>
                  <select 
                    value={mModalityId}
                    onChange={e => setMModalityId(e.target.value)}
                    className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  >
                    <option value="">Todas as Modalidades</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Categoria</label>
                  <select 
                    value={mCategoryId}
                    onChange={e => setMCategoryId(e.target.value)}
                    className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  >
                    <option value="">Todas as Categorias</option>
                    {categories.filter(c => !mModalityId || c.modality_id === mModalityId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Planos e Valores</label>
                  <button 
                    type="button"
                    onClick={() => setMPlans([...mPlans, { name: '', amount: '', billing_period: 'monthly' }])}
                    className="text-[9px] font-black uppercase text-primary hover:underline"
                  >+ Adicionar Plano</button>
                </div>
                
                {mPlans.map((plan, index) => (
                  <div key={index} className="p-4 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)] space-y-3 relative">
                    {mPlans.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => setMPlans(mPlans.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <div className="space-y-1">
                      <input 
                        type="text" 
                        value={plan.name}
                        onChange={e => {
                          const newPlans = [...mPlans];
                          newPlans[index].name = e.target.value;
                          setMPlans(newPlans);
                        }}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary text-[var(--text)]"
                        placeholder="Nome do Plano (Ex: Semestral)"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        value={plan.amount}
                        onChange={e => {
                          const newPlans = [...mPlans];
                          newPlans[index].amount = maskCurrency(e.target.value);
                          setMPlans(newPlans);
                        }}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary text-[var(--text)]"
                        placeholder="Valor R$"
                        required
                      />
                      <select 
                        value={plan.billing_period}
                        onChange={e => {
                          const newPlans = [...mPlans];
                          newPlans[index].billing_period = e.target.value;
                          setMPlans(newPlans);
                        }}
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-primary text-[var(--text)]"
                      >
                        {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? 'Salvar Alterações' : 'Criar Mensalidade')}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Confirmação */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />

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
