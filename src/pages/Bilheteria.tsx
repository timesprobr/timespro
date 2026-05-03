import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Ticket, 
  MapPin, 
  Calendar, 
  Bus, 
  Clock, 
  PlusCircle, 
  X, 
  ChevronRight,
  MoreVertical,
  Check,
  AlertCircle,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface GameTicket {
  id: string;
  opponent: string;
  location: string;
  game_date: string;
  base_price: number;
  fan_price_type: 'fixed' | 'percent';
  fan_price_value: number;
  has_transport: boolean;
  transport_check_in_time: string;
  transport_check_in_location: string;
  transport_check_out_time: string;
  transport_check_out_location: string;
  transport_vacancies: number;
  extra_services: string[];
  status: 'active' | 'inactive' | 'sold_out';
  opponent_crest_url?: string;
  banner_url?: string;
  stadium_name?: string;
  total_inventory?: number;
  transport_price?: number;
}

interface TicketPurchase {
  id: string;
  ticket_id: string;
  paid_amount: number;
  wants_transport: boolean;
  buyer_name: string;
  created_at: string;
  payment_method: string;
}

export default function Bilheteria() {
  const { organization } = useOrg();
  const [tickets, setTickets] = useState<GameTicket[]>([]);
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ingressos' | 'vendas'>('ingressos');
  
  // Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    opponent: '',
    opponent_crest_url: '',
    stadium_name: '',
    location: '',
    cep: '',
    game_date: '',
    game_time: '',
    banner_url: '',
    base_price: '',
    fan_price_type: 'percent' as 'fixed' | 'percent',
    fan_price_value: '',
    has_transport: false,
    transport_check_in_time: '',
    transport_check_in_location: '',
    transport_check_out_time: '',
    transport_check_out_location: '',
    transport_vacancies: '',
    transport_price: '',
    extra_services: [] as string[],
    total_inventory: '100'
  });
  
  const [newService, setNewService] = useState('');

  useEffect(() => {
    if (organization) {
      fetchTickets();
    }
  }, [organization]);

  async function fetchTickets() {
    try {
      setLoading(true);
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('game_tickets')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('game_date', { ascending: true });

      if (ticketsError) throw ticketsError;
      setTickets(ticketsData || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPurchases() {
    try {
      const { data, error } = await supabase
        .from('ticket_purchases')
        .select(`
          *,
          game_tickets (
            opponent
          )
        `)
        .eq('organization_id', organization?.id)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Erro ao buscar compras:', error);
    }
  }

  useEffect(() => {
    if (activeTab === 'vendas' && organization) {
      fetchPurchases();
    }
  }, [activeTab, organization]);

  const handleEdit = (ticket: GameTicket) => {
    setFormData({
      opponent: ticket.opponent,
      opponent_crest_url: ticket.opponent_crest_url || '',
      stadium_name: ticket.stadium_name || '',
      location: ticket.location,
      cep: '',
      game_date: ticket.game_date ? ticket.game_date.split('T')[0] : '',
      game_time: ticket.game_date ? ticket.game_date.split('T')[1].substring(0, 5) : '',
      banner_url: ticket.banner_url || '',
      base_price: (ticket.base_price * 100).toString(),
      fan_price_type: ticket.fan_price_type,
      fan_price_value: ticket.fan_price_type === 'percent' ? ticket.fan_price_value.toString() : (ticket.fan_price_value * 100).toString(),
      has_transport: ticket.has_transport,
      transport_check_in_time: ticket.transport_check_in_time || '',
      transport_check_in_location: ticket.transport_check_in_location || '',
      transport_check_out_time: ticket.transport_check_out_time || '',
      transport_check_out_location: ticket.transport_check_out_location || '',
      transport_vacancies: ticket.transport_vacancies?.toString() || '',
      transport_price: ticket.transport_price ? (ticket.transport_price * 100).toString() : '',
      extra_services: ticket.extra_services || [],
      total_inventory: ticket.total_inventory?.toString() || '100'
    });
    setIsEditing(true);
    setEditId(ticket.id);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      opponent: '',
      opponent_crest_url: '',
      stadium_name: '',
      location: '',
      cep: '',
      game_date: '',
      game_time: '',
      banner_url: '',
      base_price: '',
      fan_price_type: 'percent',
      fan_price_value: '',
      has_transport: false,
      transport_check_in_time: '',
      transport_check_in_location: '',
      transport_check_out_time: '',
      transport_check_out_location: '',
      transport_vacancies: '',
      transport_price: '',
      extra_services: [],
      total_inventory: '100'
    });
    setIsEditing(false);
    setEditId(null);
    setStep(1);
  };

  const handleAddService = () => {
    if (newService.trim()) {
      setFormData(prev => ({
        ...prev,
        extra_services: [...prev.extra_services, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      extra_services: prev.extra_services.filter((_, i) => i !== index)
    }));
  };

  const handleCEPChange = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: cleanCEP }));
    
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            location: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`
          }));
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'banner_url' | 'opponent_crest_url') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCurrency = (value: string | number) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
    }
    const amount = value.replace(/\D/g, '');
    if (!amount) return '';
    const formatted = (parseInt(amount) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    return formatted;
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'base_price' | 'fan_price_value' | 'transport_price') => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [field]: rawValue }));
  };

  const calculateFanPrice = () => {
    const base = parseFloat(formData.base_price) / 100 || 0;
    const value = parseFloat(formData.fan_price_value) || 0;
    
    if (formData.fan_price_type === 'percent') {
      return base * (1 - value / 100);
    }
    return value / 100;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      const combinedDateTime = formData.game_date && formData.game_time 
        ? `${formData.game_date}T${formData.game_time}:00`
        : null;

      const ticketData = {
        organization_id: organization.id,
        opponent: formData.opponent,
        opponent_crest_url: formData.opponent_crest_url,
        stadium_name: formData.stadium_name,
        location: formData.location,
        game_date: combinedDateTime,
        banner_url: formData.banner_url,
        base_price: formData.base_price ? parseFloat(formData.base_price) / 100 : 0,
        fan_price_type: formData.fan_price_type,
        fan_price_value: formData.fan_price_type === 'percent' 
          ? (formData.fan_price_value ? parseFloat(formData.fan_price_value) : 0)
          : (formData.fan_price_value ? parseFloat(formData.fan_price_value) / 100 : 0),
        has_transport: formData.has_transport,
        transport_check_in_time: formData.transport_check_in_time,
        transport_check_in_location: formData.transport_check_in_location,
        transport_check_out_time: formData.transport_check_out_time,
        transport_check_out_location: formData.transport_check_out_location,
        transport_vacancies: formData.transport_vacancies ? parseInt(formData.transport_vacancies) : null,
        transport_price: formData.transport_price ? parseFloat(formData.transport_price) / 100 : 0,
        extra_services: formData.extra_services,
        total_inventory: formData.total_inventory ? parseInt(formData.total_inventory) : 100,
        status: 'active'
      };

      if (isEditing && editId) {
        const { error } = await supabase
          .from('game_tickets')
          .update(ticketData)
          .eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('game_tickets')
          .insert([ticketData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchTickets();
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      alert(`Erro ao salvar ingresso: ${error.message || 'Verifique os dados.'}`);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.opponent.toLowerCase().includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase text-[var(--text)]">Bilheteria Profissional</h1>
          <p className="text-sm text-[var(--text-muted)]">Gestão de ingressos, logística e benefícios para sócios.</p>
        </div>
        <button 
          onClick={() => {
            setIsEditing(false);
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#a3e635] text-black px-4 py-2.5 rounded-[16px] font-black italic tracking-tighter uppercase shadow-lg shadow-[#a3e635]/20 hover:scale-105 active:scale-95 transition-all text-xs"
        >
          <Plus size={18} strokeWidth={3} />
          Configurar Ingresso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-[20px] border shadow-sm transition-all bg-[var(--surface)] border-[var(--border)] shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Ticket size={16} className="text-primary" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Jogos Ativos</span>
          </div>
          <p className="text-xl font-black italic tracking-tighter text-[var(--text)]">{tickets.filter(t => t.status === 'active').length}</p>
        </div>

        <div className="p-4 rounded-[20px] border shadow-sm transition-all bg-[var(--surface)] border-[var(--border)] shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <Bus size={16} className="text-blue-500" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Transporte Ativo</span>
          </div>
          <p className="text-xl font-black italic tracking-tighter text-[var(--text)]">{tickets.filter(t => t.has_transport).length}</p>
        </div>

        <div className="p-4 rounded-[20px] border shadow-sm transition-all bg-[var(--surface)] border-[var(--border)] shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-500/10 rounded-lg">
              <Check size={16} className="text-purple-500" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Vendas Totais</span>
          </div>
          <p className="text-xl font-black italic tracking-tighter text-[var(--text)]">{purchases.length}</p>
        </div>

        <div className="p-4 rounded-[20px] border shadow-sm transition-all bg-[var(--surface)] border-[var(--border)] shadow-none">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg">
              <DollarSign size={16} className="text-emerald-500" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Valor Arrecadado</span>
          </div>
          <p className="text-xl font-black italic tracking-tighter text-emerald-400">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchases.reduce((acc, p) => acc + (p.paid_amount || 0), 0))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('ingressos')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'ingressos' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          Ingressos
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            activeTab === 'vendas' 
              ? "bg-primary text-black shadow-lg shadow-primary/20" 
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          )}
        >
          Vendas
        </button>
      </div>

      {activeTab === 'ingressos' ? (
        <>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-[var(--text-muted)]" size={18} />
            <input 
              type="text"
              placeholder="Buscar por adversário ou local..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-[16px] text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
            />
          </div>

          {/* Tickets Grid */}
          {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-[24px] border p-4 relative overflow-hidden group transition-all bg-[var(--surface)] border-[var(--border)] shadow-none">
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center border overflow-hidden p-1.5 shadow-inner bg-[var(--surface-soft)] border-[var(--border)]">
                    {ticket.opponent_crest_url ? (
                      <img src={ticket.opponent_crest_url} className="w-full h-full object-contain" alt="Escudo" />
                    ) : (
                      <Ticket size={24} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-none mb-1 uppercase italic tracking-tighter text-[var(--text)]">{ticket.opponent}</h3>
                    <div className="flex items-center gap-2 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      <MapPin size={10} className="text-primary" />
                      {ticket.stadium_name || ticket.location}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2.5">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] ${
                    ticket.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {ticket.status === 'active' ? 'Vendas Abertas' : 'Encerrado'}
                  </span>
                  <button 
                    onClick={() => handleEdit(ticket)}
                    className="flex items-center gap-1 text-[10px] font-black text-[var(--text-muted)] hover:text-[var(--text)] uppercase tracking-widest transition-colors"
                  >
                    Editar Dados <Edit3 size={12} />
                  </button>
                </div>
              </div>

              {/* Estatísticas do Ingresso */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(() => {
                  const ticketPurchases = purchases.filter(p => p.ticket_id === ticket.id);
                  const totalRevenue = ticketPurchases.reduce((acc, p) => acc + p.paid_amount, 0);
                  const remainingStock = (ticket.total_inventory || 100) - ticketPurchases.length;
                  const transportOccupied = ticketPurchases.filter(p => p.wants_transport).length;

                  return (
                    <>
                      <div className="p-3 rounded-xl border transition-all bg-emerald-500/5 border-emerald-500/10">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-emerald-500/70">Arrecadado</p>
                        <p className="font-black text-lg italic tracking-tighter text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border transition-all bg-[var(--surface-soft)] border-[var(--border)]">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-[var(--text-muted)]">Restam p/ Esgotar</p>
                        <p className="font-black text-lg italic tracking-tighter text-[var(--text)]">
                          {remainingStock} / {ticket.total_inventory || 100} <span className="text-[9px] text-[var(--text-muted)]">unids</span>
                        </p>
                      </div>

                      {ticket.has_transport && (
                        <div className="col-span-2 p-3 rounded-xl border transition-all bg-blue-500/5 border-blue-500/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Bus size={12} className="text-blue-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Ingresso + Transporte</span>
                            </div>
                            <span className="text-xs font-black italic tracking-tighter text-blue-400">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticket.base_price + (ticket.transport_price || 0))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">{transportOccupied}/{ticket.transport_vacancies} ocupados</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--surface-soft)]">
                            <div 
                              className="h-full bg-blue-600 transition-all duration-700 ease-out" 
                              style={{ width: `${(transportOccupied / (ticket.transport_vacancies || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between pt-3 border-t transition-colors border-white/5">
                <div className="flex gap-2">
                  {ticket.extra_services.slice(0, 2).map((service, i) => (
                    <span key={i} className="px-3 py-1 text-[9px] font-black rounded-lg border uppercase tracking-widest transition-colors bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border)]">
                      + {service}
                    </span>
                  ))}
                </div>
                <a 
                  href={`/ingresso/${ticket.id}`} 
                  target="_blank"
                  className="text-[10px] font-black hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg text-primary bg-transparent"
                >
                  Página Pública <ChevronRight size={12} strokeWidth={3} />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border-2 border-dashed p-12 text-center transition-all bg-[var(--surface)] border-[var(--border)]">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors bg-[var(--surface-soft)] text-[var(--text-muted)]">
            <Ticket size={32} />
          </div>
          <h3 className="text-lg font-bold mb-2 text-[var(--text)]">Nenhum ingresso criado</h3>
          <p className="text-sm mb-6 text-[var(--text-muted)]">Comece a vender ingressos agora mesmo criando seu primeiro jogo.</p>
          <button 
            onClick={() => {
              setStep(1);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#a3e635] text-black px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#a3e635]/20 hover:scale-105 transition-transform"
          >
            <Plus size={18} strokeWidth={3} />
            CRIAR MEU PRIMEIRO INGRESSO
          </button>
        </div>
      )}
    </>
  ) : (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-[32px] border overflow-hidden bg-[var(--surface)] border-[var(--border)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b transition-colors border-[var(--border)] bg-[var(--surface-soft)]">
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Comprador</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Jogo</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data/Hora</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Pagamento</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Transporte</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Valor</th>
                    <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="group transition-colors border-b hover:bg-[var(--surface-soft)] border-[var(--border)]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark font-black text-[10px]">
                            {purchase.buyer_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-sm text-[var(--text)]">
                            {purchase.buyer_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-slate-500 uppercase italic">
                          vs {(purchase as any).game_tickets?.opponent || '---'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[var(--text)]">
                            {format(new Date(purchase.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {format(new Date(purchase.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest",
                            purchase.payment_method === 'pix' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                          )}>
                            {purchase.payment_method}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {purchase.wants_transport ? (
                          <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs uppercase italic">
                            <Bus size={12} />
                            <span>Incluso</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase font-medium">NÃO</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-black italic tracking-tighter text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.paid_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="p-2 hover:bg-[var(--surface-soft)] rounded-lg text-[var(--text-muted)] transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)] text-sm italic">
                        Nenhuma venda registrada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar Ingresso - Multi Step */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl relative z-10 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 z-10 bg-[var(--surface)] border-[var(--border)]">
              <div>
                <h2 className="text-lg font-black italic tracking-tighter uppercase text-[var(--text)]">
                  {isEditing ? 'Editar Ingresso' : 'Configurar Novo Ingresso'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      step >= i ? "w-8 bg-primary shadow-sm shadow-primary/20" : "w-4 bg-[var(--surface-soft)]"
                    )} />
                  ))}
                  <span className="text-[10px] uppercase tracking-widest font-black ml-2 text-[var(--text-muted)]">Etapa {step} de 3</span>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl transition-colors hover:bg-[var(--surface-soft)] text-[var(--text-muted)]">
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar size={18} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tighter italic">Informações do Evento</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">Time Adversário</label>
                      <input 
                        type="text"
                        value={formData.opponent}
                        onChange={e => setFormData({...formData, opponent: e.target.value})}
                        placeholder="Ex: Rio Branco FC"
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest ml-1 text-[var(--text-muted)]">Escudo do Adversário</label>
                      <label className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-dashed rounded-xl text-xs cursor-pointer transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]">
                        <Upload size={14} />
                        {formData.opponent_crest_url ? 'Trocar Escudo' : 'Anexar Escudo'}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'opponent_crest_url')} />
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">CEP Local</label>
                      <input 
                        type="text"
                        value={formData.cep}
                        onChange={e => handleCEPChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">Local do Jogo</label>
                      <input 
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        placeholder="Ex: Estádio Municipal"
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">Total de Ingressos</label>
                      <input 
                        type="number"
                        value={formData.total_inventory}
                        onChange={e => setFormData({...formData, total_inventory: e.target.value})}
                        placeholder="Ex: 1000"
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest ml-1 text-[var(--text-muted)]">Data do Jogo</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input 
                          type="date"
                          value={formData.game_date}
                          onChange={e => setFormData({...formData, game_date: e.target.value})}
                          className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest ml-1 text-[var(--text-muted)]">Horário do Jogo</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                        <input 
                          type="time"
                          value={formData.game_time}
                          onChange={e => setFormData({...formData, game_time: e.target.value})}
                          className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest ml-1 text-[var(--text-muted)]">Banner de Chamada (Anexo)</label>
                      <label className="flex flex-col items-center justify-center gap-3 w-full p-6 border border-dashed rounded-2xl cursor-pointer transition-all bg-[var(--surface-soft)] border-[var(--border)] hover:bg-[var(--surface-soft)]">
                        {formData.banner_url ? (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden">
                            <img src={formData.banner_url} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-white text-xs font-bold uppercase">Trocar Imagem</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 bg-primary/10 rounded-full text-primary">
                              <ImageIcon size={32} />
                            </div>
                             <div className="text-center">
                               <p className={cn(
                                 "text-sm font-bold",
                                 "text-[var(--text)]"
                               )}>Clique para anexar o banner</p>
                               <p className="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-1">Recomendado: 800x1000px (Vertical)</p>
                             </div>
                          </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner_url')} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <DollarSign size={18} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tighter italic">Precificação e Sócios</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">Preço Base (R$)</label>
                      <input 
                        type="text"
                        value={formatCurrency(formData.base_price)}
                        onChange={e => handleCurrencyChange(e, 'base_price')}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">Tipo de Desconto Sócio</label>
                      <select 
                        value={formData.fan_price_type}
                        onChange={e => setFormData({...formData, fan_price_type: e.target.value as 'fixed' | 'percent'})}
                        className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                      >
                        <option value="percent">Porcentagem (%)</option>
                        <option value="fixed">Valor Fixo (R$)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]">
                        {formData.fan_price_type === 'percent' ? 'Desconto (%)' : 'Preço p/ Sócio (R$)'}
                      </label>
                      {formData.fan_price_type === 'percent' ? (
                        <input 
                          type="number"
                          value={formData.fan_price_value}
                          onChange={e => setFormData({...formData, fan_price_value: e.target.value})}
                          placeholder="0"
                          className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                        />
                      ) : (
                        <input 
                          type="text"
                          value={formatCurrency(formData.fan_price_value)}
                          onChange={e => handleCurrencyChange(e, 'fan_price_value')}
                          placeholder="R$ 0,00"
                          className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-[var(--text-muted)] bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-2xl flex items-center justify-between transition-colors bg-primary/5 border-primary/20">
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Preview p/ Sócio Torcedor</p>
                      <p className="text-xs text-[var(--text-muted)]">Valor final que o sócio pagará</p>
                    </div>
                    <p className="text-xl font-black italic tracking-tighter text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateFanPrice())}
                    </p>
                  </div>

                  {/* Transport Toggle & Price Moved to Step 2 */}
                  <div className="space-y-4 pt-2 border-t border-dashed border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between p-4 border rounded-2xl transition-colors bg-blue-500/5 border-blue-500/10">
                      <div className="flex items-center gap-3">
                        <Bus className="text-blue-500" size={20} />
                        <div>
                          <p className="text-sm font-bold text-[var(--text)]">Oferecer Transporte?</p>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase font-medium">Logística de deslocamento para o jogo</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, has_transport: !formData.has_transport})}
                        className={cn(
                          "w-12 h-6 rounded-full transition-colors relative",
                          formData.has_transport ? 'bg-primary' : 'bg-white/10'
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          formData.has_transport ? 'right-1' : 'left-1'
                        )} />
                      </button>
                    </div>

                    {formData.has_transport && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]")}>Valor Adicional Transporte (R$)</label>
                          <input 
                            type="text"
                            value={formatCurrency(formData.transport_price)}
                            onChange={e => handleCurrencyChange(e, 'transport_price')}
                            placeholder="R$ 0,00"
                            className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>

                        <div className="p-4 border rounded-2xl flex items-center justify-between transition-all bg-blue-500/10 border-blue-500/20">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Total com Transp.</span>
                            <span className="text-lg font-black italic tracking-tighter text-blue-500">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                (parseFloat(formData.base_price.replace(/\D/g, '')) || 0) / 100 + 
                                (parseFloat(formData.transport_price.replace(/\D/g, '')) || 0) / 100
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border rounded-2xl transition-colors bg-emerald-500/5 border-emerald-500/10">
                    <p className="text-xs font-bold mb-1 text-emerald-400">DICA PROFISSIONAL</p>
                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                      Sócios Torcedores ativos terão o valor calculado automaticamente na página de checkout.
                    </p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Bus size={18} />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tighter italic">Logística e Adicionais</span>
                  </div>

                  <div className="space-y-4">
                    {formData.has_transport && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-2xl animate-in fade-in slide-in-from-top-4 border-blue-500/10 bg-blue-500/[0.02]">
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]")}>Check-in (Horário)</label>
                          <input 
                            type="time"
                            value={formData.transport_check_in_time}
                            onChange={e => setFormData({...formData, transport_check_in_time: e.target.value})}
                            className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]")}>Check-in (Local)</label>
                          <input 
                            type="text"
                            value={formData.transport_check_in_location}
                            onChange={e => setFormData({...formData, transport_check_in_location: e.target.value})}
                            placeholder="Ex: Sede do Clube"
                            className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]")}>Retorno (Horário)</label>
                          <input 
                            type="time"
                            value={formData.transport_check_out_time}
                            onChange={e => setFormData({...formData, transport_check_out_time: e.target.value})}
                            className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest ml-1 text-[var(--text-muted)]")}>Vagas Disponíveis</label>
                          <input 
                            type="number"
                            value={formData.transport_vacancies}
                            onChange={e => setFormData({...formData, transport_vacancies: e.target.value})}
                            placeholder="Ex: 44"
                            className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest ml-1 text-[var(--text-muted)]">Serviços Adicionais no Pacote</label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={newService}
                        onChange={e => setNewService(e.target.value)}
                        placeholder="Ex: Camiseta, Almoço..."
                        className="flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]"
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                      />
                      <button 
                        type="button"
                        onClick={handleAddService}
                        className="p-2.5 bg-primary text-black rounded-xl hover:scale-105 transition-transform"
                      >
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.extra_services.map((service, index) => (
                        <div key={index} className="flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs transition-colors bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                          <span>{service}</span>
                          <button onClick={() => removeService(index)} type="button" className="text-[var(--text-muted)] hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Card before publishing */}
                  <div className="p-4 border rounded-2xl space-y-3 transition-colors bg-[var(--surface-soft)] border-[var(--border)]">
                    <h3 className="text-xs font-black uppercase tracking-widest text-center text-[var(--text-muted)]">Resumo da Publicação</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">EVENTO</span>
                        <span className="text-xs font-bold truncate uppercase italic text-[var(--text)]">{formData.opponent || '---'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">LOCAL</span>
                        <span className="text-xs font-bold truncate uppercase text-[var(--text)]">{formData.stadium_name || '---'}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">PREÇO BASE</span>
                        <span className="text-xs font-bold text-[var(--text)]">{formatCurrency(formData.base_price)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">SÓCIO</span>
                        <span className="text-xs font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateFanPrice())}</span>
                      </div>
                      {formData.has_transport && (
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-blue-400 uppercase">COM TRANSPORTE</span>
                          <span className="text-xs font-bold text-blue-500">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              (parseFloat(formData.base_price.replace(/\D/g, '')) || 0) / 100 + 
                              (parseFloat(formData.transport_price.replace(/\D/g, '')) || 0) / 100
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">INVENTÁRIO</span>
                        <span className="text-xs font-bold text-[var(--text)]">{formData.total_inventory} unidades</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {step > 1 && (
                    <button 
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="flex-1 px-4 py-2.5 font-bold rounded-xl transition-colors text-xs bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                    >
                    VOLTAR
                  </button>
                )}
                
                {step < 3 ? (
                  <button 
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="flex-[2] px-4 py-2.5 bg-primary text-black font-black italic tracking-tighter uppercase rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                  >
                    PRÓXIMA ETAPA
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={handleSubmit}
                    className="flex-[2] px-4 py-2.5 bg-[#a3e635] text-black font-black italic tracking-tighter uppercase rounded-xl shadow-lg shadow-[#a3e635]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-xs"
                  >
                    PUBLICAR INGRESSO
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

