import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Plus, 
  Target, 
  Calendar, 
  User, 
  Phone, 
  Image as ImageIcon, 
  MoreHorizontal,
  TrendingUp,
  X,
  Upload,
  Check,
  Loader2,
  ExternalLink,
  Share2,
  ArrowLeft,
  Edit3,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';
import { abacatePay } from '../lib/abacatepay';

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  image_url: string | null;
  end_date: string | null;
  responsible_name: string;
  responsible_whatsapp: string;
  status: string;
  created_at: string;
}

export default function Vaquinhas() {
  const { organization } = useOrg();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newWhatsApp, setNewWhatsApp] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isContributing, setIsContributing] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [goalDisplay, setGoalDisplay] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'donors'>('campaigns');
  const [viewingResults, setViewingResults] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);

  const handleCopyLink = (campaignId: string) => {
    const url = `${window.location.origin}/doar/${campaignId}`;
    navigator.clipboard.writeText(url);
    alert('Link de doação copiado!');
  };

  const maskCurrency = (value: string) => {
    let v = value.replace(/\D/g, "");
    v = (Number(v) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    });
    return v;
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = maskCurrency(e.target.value);
    setGoalDisplay(maskedValue);
    const numericValue = maskedValue.replace(/\./g, '').replace(',', '.');
    setNewGoal(numericValue);
  };

  useEffect(() => {
    if (organization) {
      fetchCampaigns();
    }
  }, [organization]);

  const fetchDonations = async () => {
    if (!organization || !supabase) return;
    setLoadingDonations(true);
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('organization_id', organization.id)
        .single();

      if (wallet) {
        const { data, error } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('wallet_id', wallet.id)
          .eq('category', 'vaquinha')
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDonations(data || []);
      }
    } catch (err) {
      console.error('Error fetching donations:', err);
    } finally {
      setLoadingDonations(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'donors') {
      fetchDonations();
    }
  }, [activeTab]);

  const handleContribute = async (campaign: Campaign) => {
    const amountStr = prompt(`Quanto deseja contribuir para "${campaign.title}"?`, "50.00");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const email = prompt("Seu E-mail para receber o PIX:");
    if (!email) return;

    const cpf = prompt("Seu CPF (apenas números):");
    if (!cpf) return;

    setIsContributing(campaign.id);
    try {
      if (!supabase) throw new Error("Supabase não configurado");

      const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('organization_id', organization?.id)
        .single();

      if (!wallet) throw new Error("Carteira não encontrada");

      const transactionId = `tx_${Math.random().toString(36).substr(2, 9)}`;

      const billing = await abacatePay.createBilling({
        amount,
        description: `Contribuição Vaquinha: ${campaign.title}`,
        customerName: "Doador Anônimo",
        customerEmail: email,
        customerTaxId: cpf,
        externalId: transactionId,
        category: 'vaquinha',
        metadata: { 
          campaign_id: campaign.id,
          type: 'vaquinha'
        }
      });

      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          amount: amount,
          type: 'credit',
          category: 'vaquinha',
          description: `Contribuição: ${campaign.title}`,
          status: 'pending',
          abacate_billing_id: billing.id
        });
          
      if (billing.url) {
        window.open(billing.url, '_blank');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro na integração: ${err.message}`);
    } finally {
      setIsContributing(null);
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setIsEditing(true);
    setEditingId(campaign.id);
    setNewTitle(campaign.title);
    setNewDescription(campaign.description);
    setNewGoal(campaign.goal_amount.toString());
    setGoalDisplay(campaign.goal_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setNewEndDate(campaign.end_date ? campaign.end_date.split('T')[0] : '');
    setNewResponsible(campaign.responsible_name);
    setNewWhatsApp(campaign.responsible_whatsapp);
    setStep(1);
    setIsModalOpen(true);
  };

  const handleStatusToggle = async (campaign: Campaign) => {
    if (!supabase) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      
      if (error) throw error;
      fetchCampaigns();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Erro ao atualizar status');
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?') || !supabase) return;
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw error;
      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Erro ao excluir campanha');
    }
  };

  const fetchCampaigns = async () => {
    if (!organization || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !supabase) return;
    setIsSaving(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(`campaigns/${fileName}`, imageFile);
        
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(`campaigns/${fileName}`);
        imageUrl = publicUrl;
      }

      if (isEditing && editingId) {
        const { error } = await supabase
          .from('campaigns')
          .update({
            title: newTitle,
            description: newDescription,
            goal_amount: parseFloat(newGoal),
            end_date: newEndDate || null,
            responsible_name: newResponsible,
            responsible_whatsapp: newWhatsApp,
            ...(imageUrl && { image_url: imageUrl })
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campaigns')
          .insert({
            organization_id: organization.id,
            title: newTitle,
            description: newDescription,
            goal_amount: parseFloat(newGoal),
            end_date: newEndDate || null,
            responsible_name: newResponsible,
            responsible_whatsapp: newWhatsApp,
            image_url: imageUrl,
            status: 'active'
          });

        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setIsEditing(false);
      setEditingId(null);
      fetchCampaigns();
      setNewTitle('');
      setNewDescription('');
      setNewGoal('');
      setGoalDisplay('');
      setNewEndDate('');
      setNewResponsible('');
      setNewWhatsApp('');
      setImageFile(null);
      setStep(1);
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      alert('Erro ao salvar campanha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {viewingResults ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setViewingResults(null)}
                  className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:scale-110 transition-all text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none">{viewingResults.title}</h1>
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Dashboard de Resultados da Campanha</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopyLink(viewingResults.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all"
                >
                  <Share2 size={14} />
                  Compartilhar
                </button>
                <button 
                  onClick={() => handleEdit(viewingResults)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-blue-500 transition-all"
                >
                  <Edit3 size={14} />
                  Editar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Arrecadado</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[var(--text)] italic">R$ {viewingResults.current_amount.toLocaleString('pt-BR')}</span>
                  <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">
                    +{Math.min(100, (viewingResults.current_amount / viewingResults.goal_amount) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Meta Total</span>
                <span className="text-3xl font-black text-[var(--text)] italic">R$ {viewingResults.goal_amount.toLocaleString('pt-BR')}</span>
              </div>

              <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">O que falta</span>
                <span className="text-3xl font-black text-primary italic">R$ {Math.max(0, viewingResults.goal_amount - viewingResults.current_amount).toLocaleString('pt-BR')}</span>
              </div>

              <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] shadow-sm">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block mb-2">Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    viewingResults.status === 'active' ? "bg-emerald-500" : "bg-zinc-400"
                  )} />
                  <span className="text-sm font-black uppercase italic text-[var(--text)]">
                    {viewingResults.status === 'active' ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-[40px] border border-[var(--border)] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Users size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] italic">Histórico de Contribuições</h3>
              </div>
              <div className="px-4 py-2 bg-[var(--surface)] rounded-2xl border border-[var(--border)]">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total de Doações: </span>
                <span className="text-xs font-black text-primary">{donations.filter(d => d.description?.includes(viewingResults.title)).length}</span>
              </div>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]/50">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Doador</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data e Hora</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Valor</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">ID Transação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {donations.filter(d => d.description?.includes(viewingResults.title)).map(donation => (
                  <tr key={donation.id} className="hover:bg-[var(--surface-soft)]/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center text-[11px] font-black text-[var(--text-muted)] group-hover:bg-primary/20 group-hover:text-primary transition-all">
                          {donation.description?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[var(--text)]">Doador Anônimo</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter italic">Processado via AbacatePay</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text)]">{new Date(donation.created_at).toLocaleDateString('pt-BR')}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">{new Date(donation.created_at).toLocaleTimeString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-emerald-500 italic">R$ {donation.amount.toLocaleString('pt-BR')}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{donation.id.slice(0, 8)}...</span>
                    </td>
                  </tr>
                ))}
                {donations.filter(d => d.description?.includes(viewingResults.title)).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-20">
                        <Heart size={48} strokeWidth={1} />
                        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Nenhuma doação registrada nesta campanha</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none">Campanhas de Vaquinha</h1>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Arrecadação coletiva para projetos do clube</p>
              </div>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  setNewTitle('');
                  setNewDescription('');
                  setNewGoal('');
                  setGoalDisplay('');
                  setNewEndDate('');
                  setNewResponsible('');
                  setNewWhatsApp('');
                  setImageFile(null);
                  setStep(1);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Plus size={16} strokeWidth={3} />
                Nova Campanha
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <Check size={18} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Campanhas Ativas</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text)]">
                    {campaigns.filter(c => c.status === 'active').length}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Em andamento</span>
                </div>
              </div>

              <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <TrendingUp size={18} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Total Arrecadado</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text)]">
                    R$ {campaigns.reduce((acc, c) => acc + c.current_amount, 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-[10px] font-bold text-primary uppercase">Acumulado</span>
                </div>
              </div>

              <div className="bg-[var(--surface)] p-4 rounded-3xl border border-[var(--border)] shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Target size={18} strokeWidth={3} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Quanto Falta</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text)]">
                    {(() => {
                      const totalGoal = campaigns.reduce((acc, c) => acc + c.goal_amount, 0);
                      const totalCurrent = campaigns.reduce((acc, c) => acc + c.current_amount, 0);
                      if (totalGoal === 0) return '0%';
                      const diff = Math.max(0, totalGoal - totalCurrent);
                      return `${((diff / totalGoal) * 100).toFixed(0)}%`;
                    })()}
                  </span>
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Para a Meta</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-1.5 bg-[var(--surface-soft)] rounded-2xl w-fit">
              <button 
                onClick={() => setActiveTab('campaigns')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'campaigns' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                Campanhas
              </button>
              <button 
                onClick={() => setActiveTab('donors')}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'donors' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                )}
              >
                Doadores
              </button>
            </div>
          </div>

          {activeTab === 'campaigns' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {campaigns.map(campaign => {
                const progress = Math.min((campaign.current_amount / campaign.goal_amount) * 100, 100);
                return (
                  <div key={campaign.id} className="bg-[var(--surface)] rounded-[24px] border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-all group">
                    <div className="h-32 bg-[var(--surface-soft)] relative overflow-hidden">
                      {campaign.image_url ? (
                        <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          <Heart size={32} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border backdrop-blur-md",
                          campaign.status === 'active' ? "bg-primary/20 text-primary border-primary/20" : "bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border)]"
                        )}>
                          {campaign.status === 'active' ? 'Ativa' : campaign.status === 'paused' ? 'Pausada' : 'Encerrada'}
                        </span>
                        
                        <div className="relative group/menu">
                          <button className="p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-lg transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                          
                          <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10">
                            <button 
                              onClick={() => handleEdit(campaign)}
                              className="w-full px-3 py-2 text-left text-[10px] font-bold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] flex items-center gap-2"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => handleStatusToggle(campaign)}
                              className="w-full px-3 py-2 text-left text-[10px] font-bold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] flex items-center gap-2"
                            >
                              {campaign.status === 'active' ? 'Pausar' : 'Ativar'}
                            </button>
                            <button 
                              onClick={() => handleDelete(campaign.id)}
                              className="w-full px-3 py-2 text-left text-[10px] font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-xs font-black uppercase text-[var(--text)] leading-tight mb-1 truncate">{campaign.title}</h3>
                        <p className="text-[9px] text-[var(--text-muted)] line-clamp-1 leading-relaxed">{campaign.description}</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Progresso</span>
                          <span className="text-[10px] font-black text-primary italic">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-[var(--surface-soft)] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-[var(--text)]">R$ {campaign.current_amount.toLocaleString('pt-BR')}</span>
                          <span className="text-[var(--text-muted)]">Meta: R$ {campaign.goal_amount.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-lg">
                            <User size={12} />
                          </div>
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)] truncate" title={campaign.responsible_name}>
                            {campaign.responsible_name ? campaign.responsible_name.split(' ')[0] : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                            <Phone size={12} />
                          </div>
                          <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">{campaign.responsible_whatsapp}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCopyLink(campaign.id)}
                          className="p-2 bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-primary rounded-lg transition-all"
                          title="Copiar link de doação"
                        >
                          <Share2 size={14} />
                        </button>
                        <button 
                          onClick={() => window.open(`/doar/${campaign.id}`, '_blank')}
                          className="p-2 bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-blue-500 rounded-lg transition-all"
                          title="Ver página pública"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button 
                          onClick={() => setViewingResults(campaign)}
                          className="p-2 bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-emerald-500 rounded-lg transition-all"
                          title="Ver resultados detalhados"
                        >
                          <TrendingUp size={14} />
                        </button>
                        <button 
                          onClick={() => handleContribute(campaign)}
                          disabled={isContributing === campaign.id}
                          className="flex-1 py-2 bg-[var(--surface-soft)] text-[var(--text)] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all flex items-center justify-center gap-2"
                        >
                          {isContributing === campaign.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              Contribuir
                              <Heart size={12} fill="currentColor" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {campaigns.length === 0 && !loading && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-full flex items-center justify-center mx-auto text-[var(--text-muted)]">
                    <Heart size={32} />
                  </div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhuma vaquinha ativa no momento.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--surface)] rounded-[32px] border border-[var(--border)] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Doador</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {donations.map(donation => (
                    <tr key={donation.id} className="hover:bg-[var(--surface-soft)]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[10px]">
                            {donation.description?.split(': ')[1]?.charAt(0) || 'D'}
                          </div>
                          <span className="text-xs font-bold text-[var(--text)]">Doador Anônimo</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-muted)]">
                        {new Date(donation.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-emerald-500">
                          R$ {donation.amount.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-muted)] italic">
                        {donation.description}
                      </td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                        Nenhuma doação processada ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col md:flex-row h-[600px] animate-in zoom-in duration-300">
            
            <div className="w-full md:w-80 bg-[var(--surface-soft)] border-r border-[var(--border)] p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-10">
                  <div className="p-2 bg-primary text-black rounded-xl shadow-lg shadow-primary/20">
                    <Heart size={20} fill="currentColor" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">
                    {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
                  </h2>
                </div>

                <div className="space-y-6">
                  {[
                    { n: 1, label: 'Informações', active: step === 1, done: step > 1 },
                    { n: 2, label: 'Metas e Prazos', active: step === 2, done: step > 2 },
                    { n: 3, label: 'Responsável', active: step === 3, done: step > 3 },
                  ].map((s) => (
                    <div key={s.n} className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                        s.active ? "bg-primary text-black scale-110" : s.done ? "bg-primary/20 text-primary" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                      )}>
                        {s.done ? <Check size={14} strokeWidth={4} /> : s.n}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors",
                        s.active ? "text-[var(--text)]" : "text-[var(--text-muted)]"
                      )}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border)] space-y-3">
                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Live Preview</p>
                <div className="h-24 rounded-2xl bg-[var(--surface-soft)] overflow-hidden">
                   {imageFile ? (
                     <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" alt="Preview" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]"><ImageIcon size={24} /></div>
                   )}
                </div>
                <h4 className="text-[10px] font-black text-[var(--text)] uppercase truncate">{newTitle || 'Título da Vaquinha'}</h4>
                <div className="h-1.5 w-full bg-[var(--surface-soft)] rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[30%]" />
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-end">
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                  <X size={20} className="text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="flex-1 p-10 overflow-y-auto no-scrollbar">
                {step === 1 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-[var(--text)] uppercase italic">Qual o objetivo?</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Dê um nome e descreva sua campanha</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Título da Campanha</label>
                        <input 
                          type="text" 
                          value={newTitle}
                          onChange={e => setNewTitle(e.target.value)}
                          className="w-full bg-transparent border-b-2 border-[var(--border)] py-3 text-lg font-bold focus:outline-none focus:border-primary transition-all placeholder:text-[var(--text-muted)] text-[var(--text)]"
                          placeholder="Ex: Novos Uniformes 2024"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Descrição</label>
                        <textarea 
                          value={newDescription}
                          onChange={e => setNewDescription(e.target.value)}
                          className="w-full bg-[var(--surface-soft)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 h-32 resize-none text-[var(--text)]"
                          placeholder="Conte a história por trás dessa arrecadação..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-[var(--text)] uppercase italic">Metas e Prazos</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Quanto você precisa arrecadar?</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Meta da Campanha</label>
                        <div className="relative group">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-black text-primary italic mr-2">R$</span>
                          <input 
                            type="text" 
                            value={goalDisplay}
                            onChange={handleGoalChange}
                            className="w-full bg-transparent border-b-2 border-[var(--border)] pl-12 py-3 text-3xl font-black italic focus:outline-none focus:border-primary transition-all placeholder:text-[var(--text-muted)] text-[var(--text)]"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data de Encerramento</label>
                        <input 
                          type="date" 
                          value={newEndDate}
                          onChange={e => setNewEndDate(e.target.value)}
                          className="w-full bg-[var(--surface-soft)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[var(--text)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                        <div className="p-3 bg-primary text-black rounded-2xl">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Taxa da Plataforma</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] mt-0.5">
                            Campanhas possuem uma taxa de <span className="text-primary">6%</span> sobre o bruto arrecadado.
                          </p>
                        </div>
                      </div>

                      <div className="p-6 rounded-3xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center gap-4">
                        <div className="p-3 bg-[var(--text-muted)]/10 text-[var(--text-muted)] rounded-2xl">
                          <Target size={24} />
                        </div>
                        <p className="text-[9px] font-bold text-[var(--text-muted)] leading-relaxed uppercase">
                          Dica: Campanhas com metas realistas têm mais chance de sucesso.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-[var(--text)] uppercase italic">Quem é o responsável?</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Dados de contato para transparência</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nome Completo</label>
                          <input 
                            type="text" 
                            value={newResponsible}
                            onChange={e => setNewResponsible(e.target.value)}
                            className="w-full bg-[var(--surface-soft)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[var(--text)]"
                            placeholder="Ex: João da Silva"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp</label>
                          <input 
                            type="text" 
                            value={newWhatsApp}
                            onChange={e => setNewWhatsApp(e.target.value)}
                            className="w-full bg-[var(--surface-soft)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 text-[var(--text)]"
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Imagem de Capa</label>
                        <div className="flex items-center gap-6">
                          <label className="flex-1 h-32 border-2 border-dashed border-[var(--border)] rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all group">
                             <Upload size={24} className="text-[var(--text-muted)] group-hover:text-primary transition-colors mb-2" />
                             <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Upload da Imagem</span>
                             <input type="file" className="hidden" onChange={e => e.target.files && setImageFile(e.target.files[0])} />
                          </label>
                          {(imageFile || (isEditing && editingId)) && (
                            <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-primary">
                              <img src={imageFile ? URL.createObjectURL(imageFile) : campaigns.find(c => c.id === editingId)?.image_url || ''} className="w-full h-full object-cover" alt="Preview" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
                <button 
                  onClick={() => setStep(s => Math.max(1, s - 1))}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    step === 1 ? "opacity-0 pointer-events-none" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  )}
                >
                  Voltar
                </button>

                {step < 3 ? (
                  <button 
                    onClick={() => setStep(s => s + 1)}
                    className="px-10 py-4 bg-[var(--text)] text-[var(--surface)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all shadow-xl shadow-black/20"
                  >
                    Próximo Passo
                  </button>
                ) : (
                  <button 
                    onClick={handleCreateCampaign}
                    disabled={isSaving}
                    className="px-10 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? 'Salvar Alterações' : 'Finalizar e Lançar')}
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
