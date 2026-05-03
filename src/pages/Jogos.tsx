import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  Target, 
  Users, 
  Clock, 
  MapPin,
  Plus,
  Calendar,
  X,
  Loader2,
  Check,
  Tag,
  Settings2,
  Trash2,
  Star
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface EventCategory {
  id: string;
  name: string;
  color: string;
}

interface ClubEvent {
  id: string;
  title: string;
  location: string;
  cep?: string;
  notes?: string;
  start_at: string;
  category_id: string;
  visibility: 'internal' | 'public';
  category?: EventCategory;
}

const CATEGORY_MAP: Record<string, { icon: any, color: string, bg: string }> = {
  'treino': { icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  'jogo': { icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
  'partida': { icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
  'amistoso': { icon: Trophy, color: 'text-primary', bg: 'bg-primary/10' },
  'reunião': { icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'viagem': { icon: MapPin, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  'social': { icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  'default': { icon: Calendar, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-soft)]' }
};

export default function Matches() {
  const { organization } = useOrg();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  // Form States
  const [eventFormData, setEventFormData] = useState({
    title: '',
    location: '',
    cep: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    categoryId: '',
    visibility: 'internal' as 'internal' | 'public'
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  const getCategoryStyles = (name: string = '') => {
    const key = name.toLowerCase();
    for (const k in CATEGORY_MAP) {
      if (key.includes(k)) return CATEGORY_MAP[k];
    }
    return CATEGORY_MAP.default;
  };

  const handleCepSearch = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setEventFormData(prev => ({
          ...prev,
          location: `${data.logradouro}, ${data.bairro}, ${data.localidade}-${data.uf}`
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization, currentMonth]);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data: cats } = await supabase!
        .from('event_categories')
        .select('*')
        .eq('organization_id', organization.id);
      
      if (cats) setCategories(cats);

      const { data: evs } = await supabase!
        .from('club_events')
        .select('*, category:event_categories(*)')
        .eq('organization_id', organization.id)
        .gte('start_at', monthStart.toISOString())
        .lte('start_at', monthEnd.toISOString());
      
      if (evs) setEvents(evs);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !newCategoryName) return;
    setIsSaving(true);
    try {
      const styles = getCategoryStyles(newCategoryName);
      const { error } = await supabase!
        .from('event_categories')
        .insert({
          organization_id: organization.id,
          name: newCategoryName,
          color: styles.color.replace('text-', '') // Simplified for DB
        });
      if (error) throw error;
      setNewCategoryName('');
      fetchData();
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Tem certeza? Eventos desta categoria ficarão sem categoria.')) return;
    try {
      await supabase!.from('event_categories').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);

    try {
      const startAt = new Date(`${eventFormData.date}T${eventFormData.time}:00`).toISOString();

      const { error } = await supabase!
        .from('club_events')
        .insert({
          organization_id: organization.id,
          category_id: eventFormData.categoryId || null,
          title: eventFormData.title,
          location: eventFormData.location,
          cep: eventFormData.cep,
          notes: eventFormData.notes,
          start_at: startAt,
          visibility: eventFormData.visibility
        });

      if (error) throw error;

      setIsEventModalOpen(false);
      setEventFormData({
        title: '',
        location: '',
        cep: '',
        notes: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '09:00',
        categoryId: '',
        visibility: 'internal'
      });
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar evento:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const renderHeader = () => {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Calendar className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase italic tracking-tight leading-none text-[var(--text)]">
              Agenda do Clube
            </h1>
            <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-widest mt-1">Gestão de partidas e atividades</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl border transition-colors mr-2 bg-[var(--surface)] border-[var(--border)]">
            <button onClick={prevMonth} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-all text-[var(--text-muted)]">
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 font-black text-[10px] uppercase tracking-widest min-w-[120px] text-center text-[var(--text)]">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={nextMonth} className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-all text-[var(--text-muted)]">
              <ChevronRight size={16} />
            </button>
          </div>

          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:text-primary"
          >
            <Tag size={14} />
            Categorias
          </button>
          
          <button 
            onClick={() => setIsEventModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-lg shadow-primary/10"
          >
            <Plus size={16} strokeWidth={3} />
            Novo Evento
          </button>
        </div>
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-px border rounded-[24px] overflow-hidden transition-all bg-[var(--border)] border-[var(--border)]">
        {calendarDays.map((date, i) => {
          const dayEvents = events.filter(e => isSameDay(parseISO(e.start_at), date));
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, monthStart);
          const isToday = isSameDay(date, new Date());
          
          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] p-3 transition-all cursor-pointer relative group",
                !isCurrentMonth ? "bg-[var(--surface-soft)] opacity-50" : "bg-[var(--surface)]",
                isSelected && "bg-primary/[0.05]",
                "hover:bg-primary/[0.02]"
              )}
              onClick={() => setSelectedDate(date)}
            >
              <div className="flex items-start justify-between mb-1">
                <span className={cn(
                  "text-[11px] font-black",
                  !isCurrentMonth ? "text-[var(--text-subtle)]" : "text-[var(--text)]",
                  isToday && "text-primary font-black"
                )}>
                  {format(date, 'd')}
                </span>
                <div className="flex gap-1">
                  {dayEvents.some(e => e.visibility === 'public') && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(163,230,53,0.5)]" title="Evento Público" />
                  )}
                  {dayEvents.some(e => e.visibility === 'internal' || !e.visibility) && (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.5)]" title="Evento Interno" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, idx) => {
                  const styles = getCategoryStyles(event.category?.name);
                  return (
                    <div key={idx} className={cn(
                      "px-2 py-0.5 rounded-lg text-[7.5px] font-black uppercase tracking-tight truncate border bg-[var(--surface-soft)] border-[var(--border)]",
                      styles.color
                    )}>
                      {event.title}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="text-[7px] font-black text-[var(--text-muted)] uppercase text-center mt-1">+{dayEvents.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSidePanel = () => {
    const eventsForDay = events.filter(e => isSameDay(parseISO(e.start_at), selectedDate));
    return (
      <div className="rounded-[32px] p-6 border h-full flex flex-col transition-all bg-[var(--surface)] border-[var(--border)] shadow-sm">
        <div className="mb-8">
          <h2 className="text-lg font-black tracking-tighter uppercase italic mb-1 text-[var(--text)]">
            {format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
          </h2>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{eventsForDay.length} COMPROMISSOS</span>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          {eventsForDay.map((event, i) => {
            const styles = getCategoryStyles(event.category?.name);
            const CategoryIcon = styles.icon;
            return (
              <div key={i} className="p-4 rounded-2xl border transition-all relative overflow-hidden group bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/30">
                <div className={cn("absolute top-0 left-0 w-1 h-full", styles.bg.replace('/10', ''))} />
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5", styles.bg, styles.color)}>
                    <CategoryIcon size={10} />
                    {event.category?.name || 'Evento'}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                      event.visibility === 'public' ? "bg-primary/10 text-primary border border-primary/20" : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                    )}>
                      {event.visibility === 'public' ? 'Público' : 'Interno'}
                    </div>
                    <div className="flex items-center gap-1 text-[var(--text-muted)]">
                      <Clock size={10} />
                      <span className="text-[10px] font-black">{format(parseISO(event.start_at), 'HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <h3 className="font-black text-xs uppercase italic leading-tight mb-3 text-[var(--text)]">{event.title}</h3>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-[var(--text-muted)] text-[9px] font-bold uppercase tracking-tight">
                    <MapPin size={12} className="text-primary flex-shrink-0" />
                    <span className="leading-relaxed">{event.location || 'Sem Local'}</span>
                  </div>
                  {event.notes && (
                    <div className="p-2.5 rounded-xl text-[9px] font-medium leading-relaxed border italic bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]">
                      {event.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {eventsForDay.length === 0 && (
            <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
              <Calendar size={40} className="text-[var(--text-muted)]" />
              <p className="text-[10px] font-black uppercase tracking-widest italic">Agenda Livre</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          {renderHeader()}
          <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <div key={day} className="text-center font-black text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{day}</div>)}
          </div>
          {renderCells()}
        </div>
        <div className="lg:w-[350px]">{renderSidePanel()}</div>
      </div>

      {/* Modal Novo Evento */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Agendar Novo Evento</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Organize as atividades do seu clube</p>
              </div>
              <button onClick={() => setIsEventModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={24} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Título do Compromisso</label>
                <input required type="text" value={eventFormData.title} onChange={e => setEventFormData({...eventFormData, title: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Ex: Treino Tático, Amistoso Beneficente..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Data</label>
                  <input required type="date" value={eventFormData.date} onChange={e => setEventFormData({...eventFormData, date: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Hora</label>
                  <input required type="time" value={eventFormData.time} onChange={e => setEventFormData({...eventFormData, time: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CEP (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      maxLength={9}
                      value={eventFormData.cep} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2');
                        setEventFormData({...eventFormData, cep: val});
                        if (val.replace('-', '').length === 8) handleCepSearch(val);
                      }} 
                      className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" 
                      placeholder="00000-000" 
                    />
                    {isSearchingCep && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Local Exato</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" value={eventFormData.location} onChange={e => setEventFormData({...eventFormData, location: e.target.value})} className="w-full px-12 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Ex: Arena Corinthians, Campo do Bairro..." />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Categoria do Evento</label>
                  <select value={eventFormData.categoryId} onChange={e => setEventFormData({...eventFormData, categoryId: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                    <option value="">Sem Categoria</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Visibilidade</label>
                  <select value={eventFormData.visibility} onChange={e => setEventFormData({...eventFormData, visibility: e.target.value as any})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                    <option value="internal">Somente Interno</option>
                    <option value="public">Público (Jogadores/Sócios)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Observações (Opcional)</label>
                <textarea rows={2} value={eventFormData.notes} onChange={e => setEventFormData({...eventFormData, notes: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all resize-none bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Detalhes importantes sobre o compromisso..." />
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />}
                {isSaving ? 'Processando...' : 'Confirmar Agendamento'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Gestão de Categorias */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Tag size={20} />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-tighter text-[var(--text)]">Categorias da Agenda</h2>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome da Categoria</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50"
                      placeholder="Ex: Treino, Reunião, Viagem..."
                    />
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-4 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl border bg-[var(--surface-soft)]/50 border-[var(--border)] group">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", getCategoryStyles(cat.name).bg.replace('/10', ''))} />
                      <span className="text-xs font-black uppercase italic text-[var(--text)]">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center py-10 opacity-30 italic text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest">
                    Nenhuma categoria criada
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
