import React from 'react';
import { 
  Users, 
  Wallet, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Target, 
  ChevronRight, 
  Trophy,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  AlertTriangle,
  FileText,
  Clock,
  Star,
  Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { formatCurrency, formatDate } from '../lib/utils';

const filters = ['HOJE', '07 DIAS', 'ESSE MÊS', '30 DIAS', '90 DIAS', 'MÁXIMO'];

const StatCard = ({ title, value, trend, trendLabel, icon: Icon, color }: any) => {
  return (
    <div className="border rounded-[24px] p-5 transition-all duration-300 group relative overflow-hidden bg-[var(--surface)] border-[var(--border)] hover:border-primary/30 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-2.5 rounded-xl transition-colors", color)}>
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="text-right">
          <h3 className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 text-[var(--text-muted)]">{title}</h3>
          <p className="text-xl font-black tracking-tighter font-display italic leading-none text-[var(--text)]">{value}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase",
          trend > 0 ? "text-primary" : "text-rose-500"
        )}>
          {trend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
          {Math.abs(trend)}%
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">{trendLabel}</span>
      </div>
    </div>
  );
};

const SquadRing = ({ value, label, total, color }: any) => {
  const percentage = (value / total) * 100;
  const strokeDasharray = `${percentage} ${100 - percentage}`;
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle 
            cx="18" cy="18" r="16" 
            fill="none" 
            className="stroke-zinc-100 dark:stroke-white/5" 
            strokeWidth="3.5" 
          />
          <circle 
            cx="18" cy="18" r="16" 
            fill="none" 
            className={color}
            strokeWidth="3.5" 
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black font-display italic text-[var(--text)]">
            {value}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] text-center leading-tight">
        {label}
      </span>
    </div>
  );
};

export default function Dashboard() {
  const { organization } = useOrg();
  const [filter, setFilter] = React.useState('ESSE MÊS');
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    athletes: 0,
    revenue: 0,
    members: 0,
    events: 0,
    revenueChange: '+0%',
    athletesChange: '+0%',
    membersChange: '+0%',
    eventsChange: '+0'
  });
  const [cashFlow, setCashFlow] = React.useState<any[]>([]);
  const [vaquinha, setVaquinha] = React.useState({
    totalAmount: 0,
    goalAmount: 0,
    percentage: 0,
    title: 'Nenhuma Campanha Ativa'
  });
  const [delinquency, setDelinquency] = React.useState({
    athletesCount: 0,
    athletesAmount: 0,
    membersCount: 0,
    membersAmount: 0
  });

  React.useEffect(() => {
    if (organization) {
      fetchDashboardData();
    }
  }, [organization, filter]);

  const fetchDashboardData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      // 1. Atletas
      const { count: athletesCount } = await supabase!
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      // 2. Sócios
      const { count: membersCount } = await supabase!
        .from('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .not('fan_program_id', 'is', null);

      // 3. Eventos Próximos
      const { data: upcomingEvents } = await supabase!
        .from('club_events')
        .select('*, category:event_categories(*)')
        .eq('organization_id', organization.id)
        .gte('start_at', new Date().toISOString())
        .order('start_at', { ascending: true })
        .limit(3);
      
      if (upcomingEvents) setEvents(upcomingEvents);

      // 4. Financeiro (Receita do mês)
      const now = new Date();
      const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const { data: transactions } = await supabase!
        .from('financial_transactions')
        .select('amount, type, date')
        .eq('organization_id', organization.id)
        .gte('date', firstDayMonth);

      const monthlyRevenue = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) || 0;

      // 5. Fluxo de Caixa (Últimos 5 meses)
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      
      const { data: historyTx } = await supabase!
        .from('financial_transactions')
        .select('amount, type, date')
        .eq('organization_id', organization.id)
        .gte('date', fiveMonthsAgo.toISOString());

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const flowData = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthName = months[d.getMonth()];
        const monthTxs = historyTx?.filter(t => {
          const txDate = new Date(t.date);
          return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear();
        }) || [];
        
        return {
          name: monthName,
          entrada: monthTxs.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          saida: monthTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
        };
      });
      setCashFlow(flowData);

      // 6. Vaquinha Ativa
      const { data: campaigns } = await supabase!
        .from('campaigns')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        const c = campaigns[0];
        setVaquinha({
          totalAmount: c.current_amount,
          goalAmount: c.goal_amount,
          percentage: Math.min(100, (c.current_amount / c.goal_amount) * 100),
          title: c.title
        });
      }

      const { data: pendingTxs } = await supabase!
        .from('financial_transactions')
        .select('amount')
        .eq('organization_id', organization.id)
        .eq('status', 'pending');

      const totalPending = pendingTxs?.reduce((acc, t) => acc + t.amount, 0) || 0;

      // Atualizar Stats
      setStats({
        athletes: athletesCount || 0,
        revenue: monthlyRevenue,
        members: membersCount || 0,
        events: upcomingEvents?.length || 0,
        revenueChange: '+0%', 
        athletesChange: '+0%',
        membersChange: '+0%',
        eventsChange: `+${upcomingEvents?.length || 0}`
      });

      setDelinquency(prev => ({
        ...prev,
        athletesCount: pendingTxs?.length || 0,
        athletesAmount: totalPending
      }));

    } catch (err) {
      console.error('Erro ao carregar dados da dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventStyle = (event: any) => {
    const title = event.title.toLowerCase();
    const cat = event.category?.name?.toLowerCase() || '';
    
    if (title.includes('treino') || cat.includes('treino')) return { icon: Target, color: 'text-emerald-500 bg-emerald-500/10', label: 'Treino' };
    if (title.includes('jogo') || title.includes('partida') || cat.includes('jogo')) return { icon: Trophy, color: 'text-primary bg-primary/10', label: 'Jogo' };
    if (title.includes('reunião') || cat.includes('reunião')) return { icon: Users, color: 'text-amber-500 bg-amber-500/10', label: 'Reunião' };
    if (title.includes('social') || title.includes('festa') || cat.includes('social')) return { icon: Star, color: 'text-purple-500 bg-purple-500/10', label: 'Social' };
    return { icon: Calendar, color: 'text-[var(--text-muted)] bg-[var(--surface-soft)]', label: 'Evento' };
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] animate-pulse">Sincronizando Ecossistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header com Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Dashboard</h1>
          <p className="text-[11px] font-bold text-[var(--text-subtle)] uppercase tracking-widest mt-1">Gestão Analítica de Alto Nível</p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)]">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all whitespace-nowrap",
                filter === f ? "bg-primary text-black" : "text-[var(--text-muted)] hover:text-primary"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Atletas', value: stats.athletes.toString(), icon: Users, change: stats.athletesChange },
          { label: 'Receita', value: formatCurrency(stats.revenue), icon: Wallet, change: stats.revenueChange },
          { label: 'Sócios', value: stats.members.toString(), icon: ShieldCheck, change: stats.membersChange },
          { label: 'Eventos', value: events.length.toString(), icon: Calendar, change: stats.eventsChange },
        ].map((stat, i) => (
          <div 
            key={i}
            className="p-5 rounded-2xl border transition-all bg-[var(--surface)] border-[var(--border)] shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)]">
                <stat.icon size={16} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-bold tracking-tight text-[var(--text)]">{stat.value}</h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Financeiro e Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 border rounded-[24px] p-6 transition-all bg-[var(--surface)] border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm tracking-tight text-[var(--text)]">Fluxo de Caixa</h3>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-[var(--text-muted)]">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /> Receitas</div>
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--text-muted)]" /> Despesas</div>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlow}>
                <defs>
                  <linearGradient id="colorEntrada" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: 'var(--text-muted)'}} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 700 }}
                  labelStyle={{ fontSize: '10px', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="entrada" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorEntrada)" />
                <Area type="monotone" dataKey="saida" stroke="var(--text-muted)" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 border rounded-[24px] p-6 transition-all bg-[var(--surface)] border-[var(--border)] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-sm tracking-tight text-[var(--text)]">Próximos Eventos</h3>
            <Calendar size={16} className="text-primary" />
          </div>
          <div className="space-y-4">
            {events.map((event, i) => {
              const style = getEventStyle(event);
              const dateObj = new Date(event.start_at);
              return (
                <div key={event.id} className="flex items-center gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center min-w-[36px] py-1 px-2 rounded-lg bg-[var(--surface-soft)] border border-[var(--border)] shadow-sm">
                    <span className="text-[10px] font-bold text-[var(--text)]">
                      {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-[7px] font-bold text-[var(--text-muted)] uppercase">
                      {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate group-hover:text-primary transition-colors text-[var(--text)]">
                      {event.title}
                    </p>
                    <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      {event.category?.name || style.label}
                    </span>
                  </div>
                  <div className={cn("p-2 rounded-lg", style.color)}>
                    <style.icon size={14} />
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase text-center py-10 italic">Nenhum evento agendado</p>
            )}
          </div>
          <button 
            onClick={() => window.location.href = '/jogos'}
            className="w-full mt-6 py-3 border border-dashed border-[var(--border)] rounded-xl text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest hover:border-primary/50 hover:text-primary transition-all"
          >
            Ver Agenda Completa
          </button>
        </div>
      </div>

      {/* Relatório Executivo e Vaquinha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
        <div className="lg:col-span-8 border rounded-[32px] p-8 transition-all relative overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />
          
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            {/* Gráfico Circular */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-[var(--surface-soft)]" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-primary" strokeWidth="3" strokeDasharray={`${stats.athletes > 0 ? (stats.members / stats.athletes) * 100 : 0} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tracking-tighter text-[var(--text)]">{stats.members}</span>
                <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Sócios Ativos</span>
              </div>
            </div>

            {/* Detalhes do Relatório */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Pagamentos Pendentes</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-xl font-bold text-[var(--text)]">{formatCurrency(delinquency.athletesAmount)}</h4>
                      <span className="text-[10px] font-bold text-rose-500">({delinquency.athletesCount} lançamentos)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none mb-1">Eficiência de Cobrança</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-xl font-bold text-[var(--text)]">
                        {stats.revenue > 0 ? ((stats.revenue / (stats.revenue + delinquency.athletesAmount)) * 100).toFixed(1) : '100'}%
                      </h4>
                      <span className="text-[10px] font-bold text-amber-500">Taxa de Recebimento</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subcard Vaquinha */}
        <div className="lg:col-span-4 border rounded-[32px] p-8 transition-all relative overflow-hidden flex flex-col justify-between bg-[var(--surface)] border-[var(--border)] shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <TrendingUp size={24} />
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">Meta: {vaquinha.percentage.toFixed(0)}%</span>
            </div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Arrecadação Vaquinha</p>
            <h3 className="text-3xl font-bold tracking-tight text-[var(--text)]">{formatCurrency(vaquinha.totalAmount)}</h3>
          </div>

          <div className="relative z-10 mt-8">
            <div className="h-2 w-full bg-[var(--surface-soft)] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${vaquinha.percentage}%` }} />
            </div>
            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center italic">Campanha: {vaquinha.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
