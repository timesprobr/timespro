import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw,
  AlertTriangle,
  History,
  Tag,
  X,
  Check,
  Loader2,
  Camera,
  User,
  MapPin,
  FileText,
  Filter,
  ChevronRight,
  MoreVertical,
  Boxes,
  Download,
  ListFilter,
  Layers,
  Scale,
  LayoutGrid,
  List,
  Building2,
  Calendar,
  Hash,
  Upload,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';

interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  unit: string;
  observations?: string;
  photo_url?: string;
  min_stock: number;
  current_stock: number;
  type: 'consumable' | 'returnable';
  category_id?: string;
  category_name?: string;
  last_unit_price: number;
}

interface InventoryCategory {
  id: string;
  name: string;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  item_name: string;
  type: 'entry' | 'exit' | 'return';
  quantity: number;
  amount?: number;
  date: string;
  responsible_name: string;
  destination?: string;
  is_pending_return?: boolean;
  nf_series?: string;
  nf_emission_date?: string;
  supplier_name?: string;
  nf_url?: string;
}

export default function Materiais() {
  const { organization } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'stock' | 'history' | 'pending'>('stock');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<InventoryTransaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingNf, setIsUploadingNf] = useState(false);
  const [showNfFields, setShowNfFields] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isDeletingCategory, setIsDeletingCategory] = useState<string | null>(null);

  // Forms
  const [itemForm, setItemForm] = useState({ 
    name: '', brand: '', unit: 'Unidade', categoryId: '', minStock: '0', type: 'consumable' as any, photoUrl: '', observations: ''
  });
  const [entryForm, setEntryForm] = useState({ 
    itemId: '', quantity: '', amount: '', date: new Date().toISOString().split('T')[0], responsible: '', 
    nfUrl: '', nfSeries: '', nfEmissionDate: '', supplier: '' 
  });
  const [exitForm, setExitForm] = useState({ itemId: '', quantity: '', destination: '', responsible: '' });

  useEffect(() => {
    if (organization) fetchData();
  }, [organization]);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [itemsRes, catsRes, txsRes] = await Promise.all([
        supabase!.from('inventory_items').select('*, category:inventory_categories(name)').eq('organization_id', organization.id).order('name'),
        supabase!.from('inventory_categories').select('*').eq('organization_id', organization.id).order('name'),
        supabase!.from('inventory_transactions').select('*, item:inventory_items(name)').eq('organization_id', organization.id).order('date', { ascending: false })
      ]);

      if (itemsRes.data) setItems(itemsRes.data.map(i => ({ ...i, category_name: i.category?.name })));
      if (catsRes.data) setCategories(catsRes.data);
      if (txsRes.data) setTransactions(txsRes.data.map(t => ({
        id: t.id,
        item_id: t.item_id,
        item_name: t.item?.name,
        type: t.type,
        quantity: t.quantity,
        amount: t.amount,
        date: t.date,
        responsible_name: t.responsible_name,
        destination: t.destination,
        is_pending_return: t.is_pending_return,
        nf_series: t.nf_series,
        nf_emission_date: t.nf_emission_date,
        supplier_name: t.supplier_name,
        nf_url: t.nf_url
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !categoryName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('inventory_categories')
        .insert({
          organization_id: organization.id,
          name: categoryName.trim()
        });

      if (error) throw error;
      showToast('Categoria criada!');
      setCategoryName('');
      setIsCategoryModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar categoria', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Excluir esta categoria? Materiais vinculados ficarão sem categoria.')) return;
    try {
      await supabase!.from('inventory_categories').delete().eq('id', id);
      showToast('Categoria excluída!');
      fetchData();
    } catch (err) {
      showToast('Erro ao excluir categoria', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    setIsUploadingPhoto(true);
    try {
      const fileName = `${organization.id}/item_${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase!.storage.from('inventory').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase!.storage.from('inventory').getPublicUrl(fileName);
      setItemForm(prev => ({ ...prev, photoUrl: publicUrl }));
      showToast('Foto carregada!');
    } catch (err) {
      showToast('Erro no upload', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleNfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    setIsUploadingNf(true);
    try {
      const fileName = `${organization.id}/nf_${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase!.storage.from('inventory').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase!.storage.from('inventory').getPublicUrl(fileName);
      setEntryForm(prev => ({ ...prev, nfUrl: publicUrl }));
      showToast('Documento vinculado!');
    } catch (err) {
      showToast('Erro no upload da NF', 'error');
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSaving(true);
    try {
      const payload = {
        organization_id: organization.id,
        name: itemForm.name,
        brand: itemForm.brand,
        unit: itemForm.unit,
        category_id: itemForm.categoryId || null,
        min_stock: parseInt(itemForm.minStock) || 0,
        type: itemForm.type,
        photo_url: itemForm.photoUrl,
        observations: itemForm.observations
      };

      if (editingItem) {
        await supabase!.from('inventory_items').update(payload).eq('id', editingItem.id);
        showToast('Item atualizado!');
      } else {
        await supabase!.from('inventory_items').insert(payload);
        showToast('Item cadastrado!');
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', brand: '', unit: 'Unidade', categoryId: '', minStock: '0', type: 'consumable', photoUrl: '', observations: '' });
      fetchData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Excluir este material permanentemente?')) return;
    try {
      await supabase!.from('inventory_items').delete().eq('id', id);
      showToast('Item excluído!');
      fetchData();
    } catch (err) {
      showToast('Erro ao excluir', 'error');
    }
  };

  const handleDeleteTransaction = async (tx: InventoryTransaction) => {
    if (!window.confirm('Excluir movimentação e reverter estoque?')) return;
    try {
      const item = items.find(i => i.id === tx.item_id);
      if (item) {
        let newStock = item.current_stock;
        if (tx.type === 'entry') newStock -= tx.quantity;
        if (tx.type === 'exit') newStock += tx.quantity;
        await supabase!.from('inventory_items').update({ current_stock: Math.max(0, newStock) }).eq('id', item.id);
      }
      await supabase!.from('inventory_transactions').delete().eq('id', tx.id);
      showToast('Movimentação excluída!');
      fetchData();
    } catch (err) {
      showToast('Erro ao excluir', 'error');
    }
  };

  const handleEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !entryForm.itemId || !entryForm.quantity) return;
    setIsSaving(true);
    try {
      const qty = parseInt(entryForm.quantity);
      const rawValueString = entryForm.amount.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
      const totalAmount = parseFloat(rawValueString) || 0;
      const unitPrice = qty > 0 ? totalAmount / qty : 0;
      
      if (editingTransaction) {
        // Reverter estoque antigo
        const item = items.find(i => i.id === entryForm.itemId);
        const oldQty = editingTransaction.quantity;
        const revertedStock = (item?.current_stock || 0) - oldQty;
        
        await supabase!.from('inventory_transactions').update({
          quantity: qty,
          amount: totalAmount,
          responsible_name: entryForm.responsible,
          date: entryForm.date,
          nf_url: entryForm.nfUrl,
          nf_series: entryForm.nfSeries,
          nf_emission_date: entryForm.nfEmissionDate || null,
          supplier_name: entryForm.supplier
        }).eq('id', editingTransaction.id);

        await supabase!.from('inventory_items').update({ 
          current_stock: revertedStock + qty,
          last_unit_price: unitPrice
        }).eq('id', entryForm.itemId);
        
        showToast('Movimentação atualizada!');
      } else {
        const { error: txError } = await supabase!.from('inventory_transactions').insert({
          organization_id: organization.id,
          item_id: entryForm.itemId,
          type: 'entry',
          quantity: qty,
          amount: totalAmount,
          responsible_name: entryForm.responsible,
          date: entryForm.date,
          nf_url: entryForm.nfUrl,
          nf_series: entryForm.nfSeries,
          nf_emission_date: entryForm.nfEmissionDate || null,
          supplier_name: entryForm.supplier
        });
        
        if (txError) throw txError;

        const item = items.find(i => i.id === entryForm.itemId);
        await supabase!.from('inventory_items').update({ 
          current_stock: (item?.current_stock || 0) + qty,
          last_unit_price: unitPrice
        }).eq('id', entryForm.itemId);
        showToast('Entrada registrada!');
      }
      
      setIsEntryModalOpen(false);
      setEditingTransaction(null);
      setEntryForm({ itemId: '', quantity: '', amount: '', date: new Date().toISOString().split('T')[0], responsible: '', nfUrl: '', nfSeries: '', nfEmissionDate: '', supplier: '' });
      setShowNfFields(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao processar', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-20 px-4 md:px-0">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
      <input type="file" ref={nfInputRef} className="hidden" onChange={handleNfUpload} />

      {/* Header Compacto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text)]">Almoxarifado</h1>
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Gestão de Patrimônio e Logística</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl">
            <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-[var(--surface)] text-primary shadow-sm border border-[var(--border)]" : "text-[var(--text-muted)]")}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-[var(--surface)] text-primary shadow-sm border border-[var(--border)]" : "text-[var(--text-muted)]")}><List size={16} /></button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 pr-4 py-2.5 rounded-xl text-[11px] font-bold focus:outline-none border transition-all w-40 md:w-56 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 focus:ring-4 focus:ring-primary/5 shadow-sm" 
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" size={12} />
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)} 
                className="pl-8 pr-10 py-2.5 rounded-xl text-[11px] font-bold border focus:outline-none bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-primary/30 transition-all appearance-none cursor-pointer shadow-sm min-w-[150px]"
              >
                <option value="all">Todas Categorias</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none rotate-90" size={12} />
            </div>

            <button 
              onClick={() => setIsCategoryModalOpen(true)} 
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--surface-soft)] text-[var(--text)] rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] hover:border-primary/30 transition-all group shadow-sm"
            >
              <Tag size={14} className="text-[var(--text-muted)] group-hover:text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Categorias</span>
            </button>
          </div>

          <button 
            onClick={() => { setEditingItem(null); setItemForm({ name: '', brand: '', unit: 'Unidade', categoryId: '', minStock: '0', type: 'consumable', photoUrl: '', observations: '' }); setIsItemModalOpen(true); }} 
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline">Novo Item</span><span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de Itens', value: items.length, icon: Package, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Valor em Estoque', value: items.reduce((acc, i) => acc + (i.current_stock * (i.last_unit_price || 0)), 0), icon: Scale, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
          { label: 'Estoque Crítico', value: items.filter(i => i.current_stock <= i.min_stock).length, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/5' },
          { label: 'Saídas (Mês)', value: transactions.filter(t => t.type === 'exit').length, icon: ArrowDownLeft, color: 'text-sky-500', bg: 'bg-sky-500/5' },
        ].map((stat, i) => (
          <div key={i} className="p-5 rounded-[32px] border relative overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-primary transition-colors">{stat.label}</span>
              <div className={cn("p-2.5 rounded-2xl transition-colors", stat.bg, stat.color)}><stat.icon size={16} /></div>
            </div>
            <h3 className="text-2xl font-black italic text-[var(--text)]">
              {i === 1 ? `R$ ${stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : stat.value}
            </h3>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-soft)]/50 border border-[var(--border)] rounded-xl">
          {[
            { id: 'stock', label: 'Estoque', icon: Boxes },
            { id: 'history', label: 'Movimentações', icon: History },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === tab.id ? "bg-[var(--surface)] text-primary shadow-sm border border-[var(--border)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
              <tab.icon size={12} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsEntryModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-colors">
            <ArrowUpRight size={14} /> Registrar Entrada
          </button>
          <button onClick={() => setIsExitModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-colors">
            <ArrowDownLeft size={14} /> Registrar Saída
          </button>
        </div>
      </div>

      {/* Stock View */}
      {activeTab === 'stock' && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-in slide-in-from-bottom-4 duration-500">
              {filteredItems.map(item => {
                const isLowStock = item.current_stock <= item.min_stock;
                return (
                  <div key={item.id} className={cn("rounded-2xl border overflow-hidden transition-all group relative bg-[var(--surface)] border-[var(--border)] shadow-sm hover:shadow-md", isLowStock && "border-rose-500/40")}>
                    <div className="h-28 bg-[var(--surface-soft)]/50 relative flex items-center justify-center border-b border-[var(--border)]">
                      {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" /> : <Package size={32} className="text-[var(--text-muted)] opacity-20" />}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button onClick={() => { setEditingItem(item); setItemForm({ name: item.name, brand: item.brand || '', unit: item.unit, categoryId: item.category_id || '', minStock: item.min_stock.toString(), type: item.type, photoUrl: item.photo_url || '', observations: item.observations || '' } as any); setIsItemModalOpen(true); }} className="p-1.5 bg-[var(--surface)] text-[var(--text-muted)] hover:text-primary rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-[var(--border)]"><Pencil size={10} /></button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-[var(--surface)] text-[var(--text-muted)] hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-[var(--border)]"><Trash2 size={10} /></button>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-[10px] font-black uppercase italic leading-tight truncate text-[var(--text)]">{item.name}</h3>
                      <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase mt-0.5 truncate">{item.brand || 'Original'}</p>
                      <div className="flex items-end justify-between mt-3 pt-2 border-t border-[var(--border)]">
                        <div>
                          <p className="text-[7px] font-black uppercase text-[var(--text-muted)]">Saldo</p>
                          <p className={cn("text-sm font-black italic", isLowStock ? "text-rose-500" : "text-[var(--text)]")}>{item.current_stock} <span className="text-[8px] italic">{item.unit}</span></p>
                        </div>
                        <div className="text-right">
                           <p className="text-[7px] font-black uppercase text-[var(--text-muted)]">Mín</p>
                           <p className="text-[10px] font-bold text-[var(--text-muted)]">{item.min_stock}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--surface-soft)]/50">
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Marca</th>
                    <th className="px-6 py-4 text-center">Saldo</th>
                    <th className="px-6 py-4 text-center">Mínimo</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-[var(--surface-soft)]/30 text-xs transition-colors">
                      <td className="px-6 py-3 font-black uppercase italic text-[var(--text)]">{item.name}</td>
                      <td className="px-6 py-3 text-[var(--text-muted)] uppercase font-bold">{item.category_name || '-'}</td>
                      <td className="px-6 py-3 text-[var(--text-muted)] uppercase font-bold">{item.brand || '-'}</td>
                      <td className={cn("px-6 py-3 text-center font-black italic", item.current_stock <= item.min_stock ? "text-rose-500" : "text-[var(--text)]")}>{item.current_stock} {item.unit}</td>
                      <td className="px-6 py-3 text-center text-[var(--text-muted)] font-bold">{item.min_stock}</td>
                      <td className="px-6 py-3">
                         <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", item.type === 'consumable' ? "bg-sky-500/10 text-sky-500" : "bg-primary/10 text-primary")}>{item.type === 'consumable' ? 'Consumivel' : 'Retornavel'}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => { setEditingItem(item); setItemForm({ name: item.name, brand: item.brand || '', unit: item.unit, categoryId: item.category_id || '', minStock: item.min_stock.toString(), type: item.type, photoUrl: item.photo_url || '', observations: item.observations || '' } as any); setIsItemModalOpen(true); }} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors"><Pencil size={14} /></button>
                           <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* History View */}
      {activeTab === 'history' && (
        <div className="rounded-3xl border overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--surface-soft)]/50">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Material</th>
                  <th className="px-6 py-4">Operação</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4">Responsável</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[var(--surface-soft)]/30 transition-colors">
                    <td className="px-6 py-4 text-[var(--text-muted)]">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-black uppercase italic text-[var(--text)]">{tx.item_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-1 rounded text-[8px] font-black uppercase", tx.type === 'entry' ? "bg-emerald-500/10 text-emerald-500" : tx.type === 'exit' ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary")}>{tx.type}</span>
                        {tx.type === 'entry' && (!tx.nf_url || !tx.supplier_name || !tx.nf_series || !tx.nf_emission_date) && (
                          <div className="group relative">
                            <AlertTriangle size={14} className="text-amber-500 animate-pulse cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[8px] font-bold text-[var(--text)] opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none shadow-2xl scale-95 group-hover:scale-100 origin-bottom">
                              <p className="text-[10px] font-black uppercase italic mb-2 text-amber-500">Dados Faltantes:</p>
                              {!tx.nf_url && <p className="text-[var(--text-muted)] mt-1 flex items-center gap-1.5"><X size={8} className="text-rose-500" /> ANEXO DA NF</p>}
                              {!tx.supplier_name && <p className="text-[var(--text-muted)] flex items-center gap-1.5"><X size={8} className="text-rose-500" /> FORNECEDOR</p>}
                              {!tx.nf_series && <p className="text-[var(--text-muted)] flex items-center gap-1.5"><X size={8} className="text-rose-500" /> SÉRIE DA NOTA</p>}
                              {!tx.nf_emission_date && <p className="text-[var(--text-muted)] flex items-center gap-1.5"><X size={8} className="text-rose-500" /> DATA DE EMISSÃO</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-black italic text-[var(--text)]">{tx.quantity}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)] uppercase font-bold">{tx.responsible_name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => { setSelectedTransaction(tx); setIsDetailsModalOpen(true); }}
                            className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors bg-[var(--surface-soft)] rounded-lg border border-[var(--border)]"
                            title="Detalhes"
                          >
                            <Eye size={14} />
                          </button>
                          {tx.nf_url && (
                            <button 
                              onClick={() => window.open(tx.nf_url, '_blank')}
                              className="p-2 text-[var(--text-muted)] hover:text-emerald-500 transition-colors bg-[var(--surface-soft)] rounded-lg border border-[var(--border)]"
                              title="Ver Nota"
                            >
                              <FileText size={14} />
                            </button>
                          )}
                          <button onClick={() => {
                            setEditingTransaction(tx);
                            if (tx.type === 'entry') {
                              setEntryForm({
                                itemId: tx.item_id,
                                quantity: tx.quantity.toString(),
                                amount: tx.amount ? `R$ ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '',
                                date: tx.date.split('T')[0],
                                responsible: tx.responsible_name,
                                nfUrl: tx.nf_url || '',
                                nfSeries: tx.nf_series || '',
                                nfEmissionDate: tx.nf_emission_date || '',
                                supplier: tx.supplier_name || ''
                              });
                              setShowNfFields(!!(tx.nf_url || tx.nf_series || tx.nf_emission_date || tx.supplier_name));
                              setIsEntryModalOpen(true);
                            } else {
                              setExitForm({
                                itemId: tx.item_id,
                                quantity: tx.quantity.toString(),
                                destination: tx.destination || '',
                                responsible: tx.responsible_name
                              });
                              setIsExitModalOpen(true);
                            }
                          }} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors bg-[var(--surface-soft)] rounded-lg border border-[var(--border)]"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteTransaction(tx)} className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors bg-[var(--surface-soft)] rounded-lg border border-[var(--border)]"><Trash2 size={14} /></button>
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl my-8 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
              <button onClick={() => setIsItemModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-8 space-y-4">
              <div className="flex justify-center mb-4">
                <div onClick={() => fileInputRef.current?.click()} className={cn("w-20 h-20 rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all", itemForm.photoUrl ? "border-primary" : "border-[var(--border)] bg-[var(--surface-soft)]/50")}>
                   {isUploadingPhoto ? <Loader2 className="animate-spin text-primary" /> : itemForm.photoUrl ? <img src={itemForm.photoUrl} className="w-full h-full object-cover" /> : <Camera size={20} className="text-[var(--text-muted)]" />}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Nome</label>
                <input required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none placeholder:text-[var(--text-muted)]/40" placeholder="Ex: Bola de Futebol, Camisa de Treino..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Marca</label><input value={itemForm.brand} onChange={e => setItemForm({...itemForm, brand: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" /></div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Unidade</label>
                  <select value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none">
                    {['Unidade', 'Kilos', 'Litros', 'Metros', 'Pacote', 'Caixa', 'Par'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Categoria</label>
                  <select value={itemForm.categoryId} onChange={e => setItemForm({...itemForm, categoryId: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none">
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Mínimo</label>
                  <input type="number" value={itemForm.minStock} onChange={e => setItemForm({...itemForm, minStock: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" />
                </div>
              </div>
              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={18} /> : (editingItem ? 'Salvar Alterações' : 'Cadastrar Item')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Entry Modal Compacto */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl my-4 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-base font-black uppercase italic tracking-tighter text-[var(--text)]">
                {editingTransaction ? 'Editar Entrada' : 'Registrar Entrada'}
              </h2>
              <button onClick={() => { setIsEntryModalOpen(false); setEditingTransaction(null); setShowNfFields(false); }}><X size={20} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleEntry} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Material</label>
                <select required value={entryForm.itemId} onChange={e => setEntryForm({...entryForm, itemId: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border focus:outline-none bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                  <option value="">Escolha...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Quantidade</label><input required type="number" value={entryForm.quantity} onChange={e => setEntryForm({...entryForm, quantity: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Valor Total</label><input required value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: maskCurrency(e.target.value)})} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
              </div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Responsável</label><input required value={entryForm.responsible} onChange={e => setEntryForm({...entryForm, responsible: e.target.value})} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" /></div>
              
              {/* NF Module Compact */}
              <div className="p-4 rounded-[24px] border bg-[var(--surface-soft)]/30 border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Documento Fiscal (NF)</span>
                  <button type="button" onClick={() => setShowNfFields(!showNfFields)} className={cn("w-8 h-4 rounded-full relative transition-all", showNfFields ? "bg-primary" : "bg-[var(--surface-soft)]")}><div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", showNfFields ? "left-4.5 shadow-md" : "left-0.5")} /></button>
                </div>
                {showNfFields && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><label className="text-[8px] font-black uppercase text-[var(--text-muted)] ml-1">Série</label><input value={entryForm.nfSeries} onChange={e => setEntryForm({...entryForm, nfSeries: e.target.value})} className="w-full px-3 py-2 rounded-lg text-xs border bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black uppercase text-[var(--text-muted)] ml-1">Data Emissão</label><input type="date" value={entryForm.nfEmissionDate} onChange={e => setEntryForm({...entryForm, nfEmissionDate: e.target.value})} className="w-full px-3 py-2 rounded-lg text-xs border bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-[var(--text-muted)] ml-1">Fornecedor</label><input value={entryForm.supplier} onChange={e => setEntryForm({...entryForm, supplier: e.target.value})} className="w-full px-3 py-2 rounded-lg text-xs border bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" /></div>
                    
                    <div className="space-y-1">
                      <div onClick={() => nfInputRef.current?.click()} className={cn("w-full px-3 py-2 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all", entryForm.nfUrl ? "border-emerald-500 text-emerald-500 bg-emerald-500/5" : "border-[var(--border)] text-[var(--text-muted)]")}>
                        {isUploadingNf ? <Loader2 size={12} className="animate-spin" /> : entryForm.nfUrl ? <Check size={12} /> : <Upload size={12} />}
                        <span className="text-[9px] font-black uppercase">{entryForm.nfUrl ? 'Anexado' : 'Subir Nota'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                Confirmar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text)]">
                {editingTransaction ? 'Editar Saída' : 'Registrar Saída'}
              </h2>
              <button onClick={() => { setIsExitModalOpen(false); setEditingTransaction(null); }}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!organization) return;
              setIsSaving(true);
              try {
                const qty = parseInt(exitForm.quantity);
                const item = items.find(i => i.id === exitForm.itemId);
                
                if (editingTransaction) {
                  const revertedStock = (item?.current_stock || 0) + editingTransaction.quantity;
                  if (revertedStock < qty) return showToast('Estoque insuficiente!', 'error');

                  await supabase!.from('inventory_transactions').update({
                    quantity: qty,
                    responsible_name: exitForm.responsible,
                    destination: exitForm.destination
                  }).eq('id', editingTransaction.id);

                  await supabase!.from('inventory_items').update({ current_stock: revertedStock - qty }).eq('id', exitForm.itemId);
                  showToast('Saída atualizada!');
                } else {
                  if ((item?.current_stock || 0) < qty) return showToast('Estoque insuficiente!', 'error');

                  const { error: txError } = await supabase!.from('inventory_transactions').insert({
                    organization_id: organization.id,
                    item_id: exitForm.itemId,
                    type: 'exit',
                    quantity: qty,
                    responsible_name: exitForm.responsible,
                    destination: exitForm.destination,
                    is_pending_return: item?.type === 'returnable'
                  });
                  if (txError) throw txError;

                  await supabase!.from('inventory_items').update({ current_stock: (item?.current_stock || 0) - qty }).eq('id', exitForm.itemId);
                  showToast('Saída registrada!');
                }
                setIsExitModalOpen(false);
                setEditingTransaction(null);
                fetchData();
              } catch (err) {
                showToast('Erro ao processar saída', 'error');
              } finally {
                setIsSaving(false);
              }
            }} className="p-8 space-y-4">
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Item</label><select required value={exitForm.itemId} onChange={e => setExitForm({...exitForm, itemId: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none"><option value="">Selecione...</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Quantidade</label><input required type="number" value={exitForm.quantity} onChange={e => setExitForm({...exitForm, quantity: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" /></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Destino</label><input required value={exitForm.destination} onChange={e => setExitForm({...exitForm, destination: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" /></div>
              </div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Responsável</label><input required value={exitForm.responsible} onChange={e => setExitForm({...exitForm, responsible: e.target.value})} className="w-full px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" /></div>
              <button disabled={isSaving} className="w-full py-4 bg-rose-500 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-rose-500/20 hover:scale-[1.02] transition-all">
                {isSaving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar Saída'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Movimentação */}
      {isDetailsModalOpen && selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)] text-[var(--text)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter">Detalhes da Movimentação</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Almoxarifado e Logística</p>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 p-6 bg-[var(--surface-soft)] rounded-[32px] border border-[var(--border)]">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                   <Package size={32} className="text-[var(--text-muted)] opacity-40" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase italic">{selectedTransaction.item_name}</p>
                  <p className={cn("text-xl font-black italic mt-1", selectedTransaction.type === 'entry' ? "text-emerald-500" : "text-rose-500")}>
                    {selectedTransaction.type === 'entry' ? '+' : '-'} {selectedTransaction.quantity} Unidades
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Data</label>
                  <p className="text-xs font-bold">{new Date(selectedTransaction.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Operação</label>
                  <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", selectedTransaction.type === 'entry' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                    {selectedTransaction.type}
                  </span>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Responsável</label>
                  <p className="text-xs font-bold uppercase">{selectedTransaction.responsible_name || '---'}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-[var(--text-muted)] block mb-1">Valor Unitário</label>
                  <p className="text-xs font-bold">
                    {selectedTransaction.amount ? `R$ ${(selectedTransaction.amount / selectedTransaction.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                  </p>
                </div>
              </div>

              {(selectedTransaction.nf_series || selectedTransaction.nf_url || selectedTransaction.supplier_name) && (
                <div className="p-6 rounded-[32px] border bg-[var(--surface-soft)]/50 border-[var(--border)]">
                  <p className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-4 ml-1">Dados Fiscais / Origem</p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Fornecedor</span>
                      <span className="text-[10px] font-black uppercase">{selectedTransaction.supplier_name || '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Série da Nota</span>
                      <span className="text-[10px] font-black uppercase">{selectedTransaction.nf_series || '---'}</span>
                    </div>
                    {selectedTransaction.nf_url && (
                      <button onClick={() => window.open(selectedTransaction.nf_url, '_blank')} className="w-full mt-4 py-3 bg-[var(--surface)] hover:bg-[var(--surface-soft)] rounded-xl flex items-center justify-center gap-2 transition-all border border-[var(--border)] shadow-sm">
                        <FileText size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ver Documento Anexo</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl bg-[var(--surface)] border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Categorias</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Organização do Almoxarifado</p>
              </div>
              <button onClick={() => setIsCategoryModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <form onSubmit={handleSaveCategory} className="space-y-3">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Nova Categoria</label>
                <div className="flex gap-2">
                  <input 
                    required 
                    value={categoryName} 
                    onChange={e => setCategoryName(e.target.value)} 
                    placeholder="Ex: Escritório, Limpeza..."
                    className="flex-1 px-5 py-3 rounded-xl text-xs font-bold border bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary outline-none" 
                  />
                  <button 
                    disabled={isSaving} 
                    type="submit" 
                    className="p-3 bg-primary text-black rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/20"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-[var(--text-muted)] ml-1">Categorias Existentes</label>
                <div className="max-h-[250px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-soft)]/50 border border-[var(--border)] group hover:bg-[var(--surface-soft)] transition-all">
                        <span className="text-[10px] font-black uppercase italic text-[var(--text)]">{cat.name}</span>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 opacity-40">
                      <Layers size={24} className="mx-auto mb-2 text-[var(--text-muted)]" />
                      <p className="text-[8px] font-black uppercase tracking-widest">Nenhuma categoria criada</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-[var(--surface-soft)]/30 border-t border-[var(--border)] flex justify-end">
              <button onClick={() => setIsCategoryModalOpen(false)} className="px-8 py-3 bg-[var(--text)] text-[var(--surface)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
