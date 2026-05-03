import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Grid, 
  List, 
  Plus, 
  MoreHorizontal, 
  Phone, 
  Clock,
  UserCheck,
  UserMinus,
  Download,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Tag,
  Shield,
  Trophy
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import NewAthleteForm from '../components/athletes/NewAthleteForm';
import ModalityManager from '../components/athletes/ModalityManager';

interface Category {
  id: string;
  name: string;
  modality_id: string;
  min_age: number;
  max_age: number;
}

interface Modality {
  id: string;
  name: string;
}

interface Athlete {
  id: string;
  full_name: string;
  nickname: string;
  position: string;
  number: number;
  status: string;
  photo_url: string | null;
  phone: string;
  birth_date: string;
  modality_id: string | null;
  category_id: string | null;
}

export default function Athletes() {
  const { organization } = useOrg();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedModality, setSelectedModality] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      fetchAthletes();
      fetchCategories();
      fetchModalities();
    }
  }, [organization]);

  async function fetchModalities() {
    try {
      const { data, error } = await supabase
        .from('athlete_modalities')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('name');
      if (error) throw error;
      setModalities(data || []);
    } catch (error) {
      console.error('Error fetching modalities:', error);
    }
  }

  async function fetchAthletes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('athletes')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('athlete_categories')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('min_age', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  const filteredAthletes = athletes.filter(athlete => {
    const matchesSearch = 
      athlete.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.number?.toString().includes(searchTerm);
    
    const matchesStatus = activeFilter === 'Todos' || athlete.status === activeFilter;
    
    const matchesCategory = selectedCategory === 'Todos' || athlete.category_id === selectedCategory;
    
    const matchesModality = selectedModality === 'Todos' || athlete.modality_id === selectedModality;

    return matchesSearch && matchesStatus && matchesCategory && matchesModality;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none">Gestão de Atletas</h1>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5">Controle total sobre o elenco e histórico</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsModModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--surface-soft)] text-[var(--text)] rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--border)] hover:bg-[var(--surface)] transition-all"
          >
            <Trophy size={14} />
            Modalidades
          </button>
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={16} strokeWidth={3} />
            Novo Atleta
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-[24px] border shadow-sm transition-colors duration-300 bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--surface-soft)] text-[var(--text-muted)]">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-[var(--text-muted)] tracking-widest">Total</p>
              <h3 className="text-xl font-bold leading-none mt-0.5 text-[var(--text)]">{athletes.length}</h3>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-[24px] border shadow-sm transition-colors duration-300 bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <UserCheck size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Ativos</p>
              <h3 className="text-xl font-black italic leading-none mt-0.5 text-[var(--text)]">
                {athletes.filter(a => a.status === 'Ativo').length}
              </h3>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-[24px] border shadow-sm transition-colors duration-300 bg-[var(--surface)] border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <UserMinus size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest">Inativos</p>
              <h3 className="text-xl font-black italic leading-none mt-0.5 text-[var(--text)]">
                {athletes.filter(a => a.status !== 'Ativo').length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4">
        <div className="relative flex-1 w-full rounded-2xl border transition-all shadow-sm overflow-hidden bg-[var(--surface)] border-[var(--border)]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por nome, posição ou número..." 
            className="w-full py-3.5 pl-12 pr-4 text-xs font-bold focus:outline-none transition-all bg-transparent text-[var(--text)]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select 
              value={selectedModality}
              onChange={(e) => {
                setSelectedModality(e.target.value);
                setSelectedCategory('Todos');
              }}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary text-[var(--text)]"
            >
              <option value="Todos">Todas Modalidades</option>
              {modalities.map(mod => (
                <option key={mod.id} value={mod.id}>{mod.name}</option>
              ))}
            </select>

            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              disabled={selectedModality === 'Todos'}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary text-[var(--text)] disabled:opacity-50"
            >
              <option value="Todos">Todas Categorias</option>
              {categories
                .filter(cat => cat.modality_id === selectedModality)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))
              }
            </select>

            <div className="w-px h-8 bg-[var(--border)] mx-2 hidden md:block" />

            {['Todos', 'Ativo', 'Inativo', 'Pendente'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeFilter === filter 
                    ? "bg-primary text-black" 
                    : "bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[var(--surface-soft)] p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <Grid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Athletes Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Carregando Elenco...</p>
        </div>
      ) : athletes.length === 0 ? (
        <div className="text-center py-20 bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] rounded-[40px]">
          <Users size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
          <h3 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Nenhum atleta encontrado</h3>
          <p className="text-[var(--text-muted)] text-xs mt-2 font-medium">Comece adicionando atletas ao seu clube.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAthletes.map((athlete) => (
            <div 
              key={athlete.id}
              onClick={() => navigate(`/atletas/${athlete.id}`)}
              className="group relative cursor-pointer"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="relative bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:border-primary/30">
                <div className="aspect-[4/5] relative overflow-hidden bg-[var(--surface-soft)]">
                  {athlete.photo_url ? (
                    <img 
                      src={athlete.photo_url} 
                      alt={athlete.full_name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                      <Users size={64} />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 w-10 h-10 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-primary font-black italic tracking-tighter text-lg">{athlete.number || '--'}</span>
                  </div>
                  
                  <div className="absolute top-4 left-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] backdrop-blur-md border",
                      athlete.status === 'Ativo' 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {athlete.status}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black uppercase text-primary tracking-widest">{athlete.position}</span>
                    <ChevronRight size={14} className="text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)] group-hover:text-primary transition-colors">
                    {athlete.nickname || athlete.full_name}
                  </h3>
                  
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {athlete.modality_id && (
                      <span className="px-2 py-0.5 rounded bg-[var(--surface-soft)] text-[8px] font-black uppercase text-[var(--text-muted)] border border-[var(--border)]">
                        {modalities.find(m => m.id === athlete.modality_id)?.name}
                      </span>
                    )}
                    {athlete.category_id && (
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary-dark text-[8px] font-black uppercase border border-primary/20">
                        {categories.find(c => c.id === athlete.category_id)?.name}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-1.5">
                      <Phone size={10} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">{athlete.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Clock size={10} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                        {athlete.birth_date ? `${new Date().getFullYear() - new Date(athlete.birth_date).getFullYear()} ANOS` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--surface-soft)]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Atleta</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Posição</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nº</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Telefone</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredAthletes.map((athlete) => (
                <tr 
                  key={athlete.id}
                  onClick={() => navigate(`/atletas/${athlete.id}`)}
                  className="hover:bg-[var(--surface-soft)] cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--surface-strong)] border border-[var(--border)]">
                        {athlete.photo_url ? (
                          <img src={athlete.photo_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                            <Users size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase italic tracking-tighter text-[var(--text)] group-hover:text-primary transition-colors">
                          {athlete.nickname || athlete.full_name}
                        </p>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{athlete.full_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">{athlete.position}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black italic text-primary">{athlete.number || '--'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                      athlete.status === 'Ativo' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {athlete.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{athlete.phone || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-[var(--surface-soft)] rounded-lg transition-colors text-[var(--text-muted)]">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {isFormOpen && (
        <NewAthleteForm onClose={() => { setIsFormOpen(false); fetchAthletes(); }} />
      )}
      {isModModalOpen && (
        <ModalityManager 
          onClose={() => setIsModModalOpen(false)}
          onUpdate={() => {
            fetchCategories();
            fetchModalities();
          }}
        />
      )}
    </div>
  );
}
