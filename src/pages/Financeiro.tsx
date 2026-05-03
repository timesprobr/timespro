import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  History, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  QrCode,
  DollarSign,
  Loader2,
  Calendar,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Tag,
  ChevronRight,
  MoreVertical,
  X,
  Upload,
  Download,
  Package,
  Eye,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';
import { abacatePay } from '../lib/abacatepay';
import Toast from '../components/Toast';

interface FinancialCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

interface FinancialTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'paid' | 'pending' | 'cancelled';
  date: string;
  responsible_name?: string;
  nf_url?: string;
  nf_series?: string;
  nf_emission_date?: string;
  inventory_transaction_id?: string;
  inventory?: {
    item?: {
      photo_url?: string;
    }
  };
  is_recurring: boolean;
  due_day?: number;
  category?: { name: string };
  supplier_name?: string;
}

export default function Financeiro() {
  const { organization } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'incomes' | 'expenses' | 'recurring'>('overview');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [wallet, setWallet] = useState({ balance: 0, pending: 0 });
  const [inventoryValue, setInventoryValue] = useState(0);
  
  // Modal States
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTransactions, setHistoryTransactions] = useState<FinancialTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingNf, setIsUploadingNf] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form States
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    categoryId: '',
    responsible: '',
    isRecurring: false,
    dueDay: '',
    nfUrl: '',
    nfSeries: '',
    nfEmissionDate: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [entryForm, setEntryForm] = useState({
    name: '',
    email: '',
    taxId: '',
    amount: '',
    description: ''
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [catsRes, txsRes, walletRes] = await Promise.all([
        supabase!.from('financial_categories').select('*').eq('organization_id', organization.id),
        supabase!.from('financial_transactions').select('*, category:financial_categories(name), inventory:inventory_transactions(nf_url, item:inventory_items(photo_url))').eq('organization_id', organization.id).order('date', { ascending: false }),
        supabase!.from('wallets').select('balance, pending_balance').eq('organization_id', organization.id).single()
      ]);

      if (catsRes.data) setCategories(catsRes.data);
      if (txsRes.data) setTransactions(txsRes.data);
      if (walletRes.data) setWallet({ balance: walletRes.data.balance, pending: walletRes.data.pending_balance });

      // Calcular Patrimônio em Materiais
      const { data: invItems } = await supabase!
        .from('inventory_items')
        .select('current_stock, last_unit_price')
        .eq('organization_id', organization.id);
      
      if (invItems) {
        const total = invItems.reduce((acc, item) => acc + (item.current_stock * (item.last_unit_price || 0)), 0);
        setInventoryValue(total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setIsUploadingNf(true);
    try {
      const fileName = `${organization.id}/nf_${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase!.storage.from('finance').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase!.storage.from('finance').getPublicUrl(fileName);
      setExpenseForm(prev => ({ ...prev, nfUrl: publicUrl }));
      showToast('Nota Fiscal carregada com sucesso!');
    } catch (err) {
      showToast('Erro ao subir NF', 'error');
    } finally {
      setIsUploadingNf(false);
    }
  };

  const maskCurrency = (v: string) => {
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d)(\d{2})$/, "$1,$2");
    v = v.replace(/(?=(\d{3})+(\D))\B/g, ".");
    return v ? "R$ " + v : "";
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !expenseForm.title || !expenseForm.amount) return;
    setIsSaving(true);
    try {
      const rawValue = expenseForm.amount.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
      const { error } = await supabase!
        .from('financial_transactions')
        .insert({
          organization_id: organization.id,
          title: expenseForm.title,
          amount: parseFloat(rawValue),
          category_id: expenseForm.categoryId || null,
          type: 'expense',
          status: expenseForm.isRecurring ? 'pending' : 'paid',
          date: expenseForm.date,
          responsible_name: expenseForm.responsible,
          nf_url: expenseForm.nfUrl,
          nf_series: expenseForm.nfSeries,
          nf_emission_date: expenseForm.nfEmissionDate || null,
          is_recurring: expenseForm.isRecurring,
          due_day: expenseForm.isRecurring ? parseInt(expenseForm.dueDay) : null
        });

      if (error) throw error;
      showToast('Despesa registrada!');
      setIsExpenseModalOpen(false);
      setExpenseForm({ 
        title: '', amount: '', categoryId: '', responsible: '', isRecurring: false, 
        dueDay: '', nfUrl: '', nfSeries: '', nfEmissionDate: '', 
        date: new Date().toISOString().split('T')[0] 
      });
      fetchData();
    } catch (err) {
      showToast('Erro ao salvar', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !catForm.name) return;
    setIsSaving(true);
    try {
      await supabase!.from('financial_categories').insert({
        organization_id: organization.id,
        name: catForm.name,
        type: catForm.type
      });
      setIsCategoryModalOpen(false);
      setCatForm({ name: '', type: 'expense' });
      showToast('Categoria criada!');
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    try {
      const rawValue = entryForm.amount.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
      const billing = await abacatePay.createBilling({
        amount: parseFloat(rawValue),
        description: entryForm.description,
        customerName: entryForm.name,
        customerEmail: entryForm.email,
        customerTaxId: entryForm.taxId,
        category: 'mensalidade'
      });

      if (billing.url) window.open(billing.url, '_blank');
      showToast('Link de pagamento gerado!');
      setIsEntryModalOpen(false);
      setEntryForm({ name: '', email: '', taxId: '', amount: '', description: '' });
      fetchData();
    } catch (err) {
      showToast('Erro ao gerar cobrança', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = [
    { label: 'Saldo Disponível', value: wallet.balance, icon: Wallet, color: 'text-primary' },
    { label: 'Entradas (Mês)', value: transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0), icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Saídas (Mês)', value: transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0), icon: TrendingDown, color: 'text-rose-500' },
    { label: 'Contas a Pagar', value: transactions.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.amount, 0), icon: AlertCircle, color: 'text-amber-500' },
    { label: 'Patrimônio (Materiais)', value: inventoryValue, icon: Package, color: 'text-sky-500' },
  ];

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const headers = ["Data", "Titulo", "Tipo", "Categoria", "Valor", "Status", "Responsavel"];
    const filteredTxs = transactions.filter(t => {
      if (activeTab === 'incomes') return t.type === 'income';
      if (activeTab === 'expenses') return t.type === 'expense' && !t.is_recurring;
      if (activeTab === 'recurring') return t.is_recurring;
      return true;
    });

    const rows = filteredTxs.map(t => [
      new Date(t.date).toLocaleDateString('pt-BR'),
      t.title,
      t.type === 'income' ? 'Entrada' : 'Saida',
      t.category?.name || 'Sem Categoria',
      t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      t.status,
      t.responsible_name || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financeiro_timespro_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-20">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text)]">Gestão Financeira</h1>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Controle de Fluxo de Caixa e Despesas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]">
            <Download size={20} />
          </button>
          <button onClick={() => setIsCategoryModalOpen(true)} className="p-3 rounded-2xl border transition-all bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]">
            <Tag size={20} />
          </button>
          <button onClick={() => setIsExpenseModalOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">
            <ArrowDownLeft size={18} strokeWidth={3} />
            Nova Despesa
          </button>
          <button onClick={() => setIsEntryModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20">
            <ArrowUpRight size={18} strokeWidth={3} />
            Receber PIX
          </button>
        </div>
      </div>

      {/* Stats Cards Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="p-4 rounded-[24px] border relative overflow-hidden group bg-[var(--surface)] border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</span>
              <div className={cn("p-1.5 rounded-lg bg-[var(--surface-soft)]", stat.color)}>
                <stat.icon size={14} />
              </div>
            </div>
            <h3 className="text-xl font-black italic text-[var(--text)]">
              R$ {stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 p-1.5 bg-[var(--surface-soft)] rounded-2xl w-fit border border-[var(--border)]">
        {[
          { id: 'overview', label: 'Visão Geral', icon: History },
          { id: 'incomes', label: 'Entradas', icon: TrendingUp },
          { id: 'expenses', label: 'Saídas', icon: TrendingDown },
          { id: 'recurring', label: 'Recorrências', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-[var(--surface)] text-primary shadow-sm border border-[var(--border)]" 
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-[40px] border min-h-[400px] overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">
              {activeTab === 'overview' && 'Movimentações Recentes'}
              {activeTab === 'incomes' && 'Relatório de Entradas'}
              {activeTab === 'expenses' && 'Relatório de Saídas'}
              {activeTab === 'recurring' && 'Contas Recorrentes'}
            </h2>
          </div>

          <div className="space-y-3">
            {activeTab === 'recurring' && (
              <div className="grid grid-cols-12 gap-4 px-4 py-3 mb-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] border-b border-[var(--border)]">
                <div className="col-span-5">Despesa</div>
                <div className="col-span-2 text-center">Vencimento</div>
                <div className="col-span-2 text-right">Valor</div>
                <div className="col-span-2">Categoria</div>
                <div className="col-span-1"></div>
              </div>
            )}

            {transactions
              .filter(t => {
                if (activeTab === 'incomes') return t.type === 'income';
                if (activeTab === 'expenses') return t.type === 'expense' && !t.is_recurring;
                if (activeTab === 'recurring') return t.is_recurring;
                return true;
              })
              .map(tx => {
                if (activeTab === 'recurring') {
                  return (
                    <div key={tx.id} className="grid grid-cols-12 items-center gap-4 p-4 rounded-[20px] border transition-all group bg-[var(--surface-soft)]/30 border-[var(--border)] hover:border-primary/20 shadow-sm">
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500">
                          <Calendar size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-[13px] font-black uppercase italic leading-none text-[var(--text)]">{tx.title}</p>
                          <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Responsável: {tx.responsible_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[9px] font-black uppercase">Dia {tx.due_day}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <p className="text-base font-black italic text-rose-500">
                          R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{tx.category?.name || 'Sem Categoria'}</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button 
                          onClick={() => {
                            const history = transactions.filter(t => t.title === tx.title && !t.is_recurring);
                            setHistoryTransactions(history);
                            setSelectedTransaction(tx);
                            setIsHistoryModalOpen(true);
                          }} 
                          className="p-2.5 text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Ver Histórico de Pagamentos"
                        >
                          <History size={18} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-[20px] border transition-all group bg-[var(--surface-soft)]/30 border-[var(--border)] hover:border-primary/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                        tx.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                      )}>
                        {tx.type === 'income' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownLeft size={18} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-black uppercase italic leading-none text-[var(--text)]">{tx.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                          <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{tx.category?.name || 'Sem Categoria'}</span>
                          {tx.responsible_name && (
                            <>
                              <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
                              <span className="text-[8px] font-black text-primary uppercase">{tx.responsible_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {tx.status === 'pending' && tx.is_recurring && (
                        <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-lg animate-pulse">
                          <AlertCircle size={10} />
                          <span className="text-[7px] font-black uppercase">Venc. dia {tx.due_day}</span>
                        </div>
                      )}
                      <div className="text-right">
                        <p className={cn("text-base font-black italic", tx.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
                          {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                         <button 
                           onClick={() => {
                             setSelectedTransaction(tx);
                             setIsDetailsModalOpen(true);
                           }} 
                           className="p-2 text-[var(--text-muted)] hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                           title="Ver Detalhes"
                         >
                           <Eye size={16} />
                         </button>
                         <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)] rounded-lg transition-colors">
                           <MoreVertical size={16} />
                         </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            
            {transactions.length === 0 && (
              <div className="py-20 text-center opacity-20">
                <History size={48} className="mx-auto mb-4 text-[var(--text-muted)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Sem registros financeiros</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Despesa */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)] leading-none">Registrar Despesa</h2>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Controle suas saídas e pagamentos</p>
              </div>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-100px)] overflow-y-auto custom-scrollbar">
              <form onSubmit={handleSaveExpense} className="p-8 pt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setExpenseForm({...expenseForm, isRecurring: false})} className={cn("py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all", !expenseForm.isRecurring ? "bg-primary text-black border-primary" : "text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-soft)]")}>Única</button>
                <button type="button" onClick={() => setExpenseForm({...expenseForm, isRecurring: true})} className={cn("py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all", expenseForm.isRecurring ? "bg-primary text-black border-primary" : "text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-soft)]")}>Recorrente</button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Título da Despesa</label>
                <input required type="text" value={expenseForm.title} onChange={e => setExpenseForm({...expenseForm, title: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Ex: Aluguel da Sede, Material Treino..." />
              </div>
                   <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Valor (R$)</label>
                  <input required type="text" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: maskCurrency(e.target.value)})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Categoria</label>
                  <div className="flex gap-2">
                    <select value={expenseForm.categoryId} onChange={e => setExpenseForm({...expenseForm, categoryId: e.target.value})} className="flex-1 px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                      <option value="">Selecione...</option>
                      {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="p-3.5 bg-primary/10 text-primary rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all">
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>

              {expenseForm.isRecurring ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Dia do Vencimento</label>
                  <input required type="number" min={1} max={31} value={expenseForm.dueDay} onChange={e => setExpenseForm({...expenseForm, dueDay: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" placeholder="Ex: 10" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Anexar NF/Comprovante</label>
                    <div onClick={() => fileInputRef.current?.click()} className={cn("px-5 py-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all", expenseForm.nfUrl ? "border-emerald-500 bg-emerald-500/5 text-emerald-500" : "border-[var(--border)] text-[var(--text-muted)] hover:border-primary/50")}>
                      {isUploadingNf ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      <span className="text-[10px] font-black uppercase">{expenseForm.nfUrl ? 'NF Carregada' : 'Selecionar Arquivo'}</span>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleNfUpload} accept="image/*,application/pdf" />
                  </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Data de Pagamento</label>
                     <input type="date" value={expenseForm.date} onChange={e => setExpenseForm({...expenseForm, date: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" />
                   </div>
                 </div>
               )}

               {!expenseForm.isRecurring && (
                 <div className="p-5 rounded-[24px] border space-y-3 bg-[var(--surface-soft)]/30 border-[var(--border)] mt-2">
                   <p className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1 tracking-widest">Informações Fiscais (Opcional)</p>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Série da Nota</label>
                       <input type="text" value={expenseForm.nfSeries} onChange={e => setExpenseForm({...expenseForm, nfSeries: e.target.value})} className={cn("w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none transition-all", "bg-[var(--surface)] border-[var(--border)] text-[var(--text)]")} placeholder="001" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Data de Emissão</label>
                       <input type="date" value={expenseForm.nfEmissionDate} onChange={e => setExpenseForm({...expenseForm, nfEmissionDate: e.target.value})} className={cn("w-full px-4 py-2.5 rounded-xl text-xs border focus:outline-none transition-all", "bg-[var(--surface)] border-[var(--border)] text-[var(--text)]")} />
                     </div>
                   </div>
                 </div>
               )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Responsável pelo Pagamento</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="text" value={expenseForm.responsible} onChange={e => setExpenseForm({...expenseForm, responsible: e.target.value})} className="w-full px-12 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Nome do responsável..." />
                </div>
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-4 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={4} />}
                Confirmar Registro
              </button>
            </form>
          </div>
        </div>
      </div>
    )}

      {/* Modal Categoria */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-sm rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Nova Categoria</h2>
              <button onClick={() => setIsCategoryModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setCatForm({...catForm, type: 'income'})} className={cn("py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", catForm.type === 'income' ? "bg-emerald-500 text-white border-emerald-500" : "text-[var(--text-muted)] border-[var(--border)]")}>Receita</button>
                  <button type="button" onClick={() => setCatForm({...catForm, type: 'expense'})} className={cn("py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all", catForm.type === 'expense' ? "bg-rose-500 text-white border-rose-500" : "text-[var(--text-muted)] border-[var(--border)]")}>Despesa</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome da Categoria</label>
                <input required type="text" value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" placeholder="Ex: Material, Aluguel, Evento..." />
              </div>
              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} strokeWidth={4} />}
                Criar Categoria
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Receber (AbacatePay) */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Receber via PIX</h2>
              <button onClick={() => setIsEntryModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleCreateBilling} className="p-8 space-y-4">
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Pagador</label><input required value={entryForm.name} onChange={e => setEntryForm({...entryForm, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">E-mail</label><input required type="email" value={entryForm.email} onChange={e => setEntryForm({...entryForm, email: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">CPF/CNPJ</label><input required value={entryForm.taxId} onChange={e => setEntryForm({...entryForm, taxId: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Valor (R$)</label><input required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: maskCurrency(e.target.value)})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" placeholder="R$ 0,00" /></div>
              <button disabled={isSaving} className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 mt-4 shadow-xl shadow-primary/20">{isSaving ? <Loader2 className="animate-spin" /> : <QrCode size={18} />} Gerar PIX</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {isDetailsModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)] text-[var(--text)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Detalhes da Movimentação</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Informações completas do registro</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-6 bg-[var(--surface-soft)]/50 rounded-[32px] border border-[var(--border)]">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden", selectedTransaction.type === 'income' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                  {selectedTransaction.inventory?.item?.photo_url ? (
                    <img src={selectedTransaction.inventory.item.photo_url} className="w-full h-full object-cover" alt="Item" />
                  ) : (
                    selectedTransaction.type === 'income' ? <ArrowUpRight size={28} /> : <ArrowDownLeft size={28} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black uppercase italic">{selectedTransaction.title}</p>
                  <p className={cn("text-xl font-black italic mt-1", selectedTransaction.type === 'income' ? "text-emerald-500" : "text-rose-500")}>
                    {selectedTransaction.type === 'income' ? '+' : '-'} R$ {selectedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Data</label>
                  <p className="text-xs font-bold">{new Date(selectedTransaction.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Categoria</label>
                  <p className="text-xs font-bold uppercase">{selectedTransaction.category?.name || 'Sem Categoria'}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Responsável</label>
                  <p className="text-xs font-bold uppercase">{selectedTransaction.responsible_name || '---'}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Status</label>
                  <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", selectedTransaction.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
                    {selectedTransaction.status === 'paid' ? 'Pago/Confirmado' : 'Pendente'}
                  </span>
                </div>
              </div>

              <div className={"p-6 rounded-[32px] border bg-[var(--surface-soft)]/30 border-[var(--border)]"}>
                <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-4 ml-1">Dados Fiscais / Origem</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Série da Nota</label>
                    <p className="text-xs font-bold">{selectedTransaction.nf_series || '---'}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Emissão</label>
                    <p className="text-xs font-bold">
                      {selectedTransaction.nf_emission_date ? new Date(selectedTransaction.nf_emission_date).toLocaleDateString('pt-BR') : '---'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Fornecedor</label>
                    <p className="text-xs font-bold uppercase">{selectedTransaction.supplier_name || '---'}</p>
                  </div>
                </div>
                {(selectedTransaction.nf_url || selectedTransaction.inventory?.nf_url) && (
                  <button 
                    onClick={() => window.open(selectedTransaction.nf_url || selectedTransaction.inventory?.nf_url, '_blank')}
                    className="w-full mt-4 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <FileText size={16} /> Ver Nota Fiscal Vinculada
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal Histórico Recorrência */}
      {isHistoryModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)] leading-none">Histórico: {selectedTransaction.title}</h2>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Todas as transações efetuadas</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {historyTransactions.length > 0 ? (
                <div className="space-y-3">
                  {historyTransactions.map(htx => (
                    <div key={htx.id} className="flex items-center justify-between p-4 rounded-2xl border bg-[var(--surface-soft)]/20 border-[var(--border)]">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                          <CheckCircle2 size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-[var(--text)]">{new Date(htx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Pago por: {htx.responsible_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black italic text-[var(--text)]">R$ {htx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Confirmado</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center opacity-40">
                  <History size={40} className="mx-auto mb-4 text-[var(--text-muted)]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Nenhum pagamento registrado ainda</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-[var(--surface-soft)]/30 border-t border-[var(--border)] flex justify-end">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-8 py-3 bg-[var(--text)] text-[var(--surface)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
