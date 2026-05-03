import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  FolderPlus, 
  Plus, 
  Search, 
  Folder, 
  File, 
  Download, 
  MoreVertical, 
  X, 
  Check, 
  Loader2,
  Filter,
  Eye,
  Trash2,
  Calendar,
  Building2,
  History,
  ArrowRight,
  Upload,
  ChevronRight
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';

interface Document {
  id: string;
  title: string;
  url: string;
  file_type: string;
  file_size: string;
  category: string;
  folder_id?: string;
  created_at: string;
}

interface Folder {
  id: string;
  name: string;
}

interface NfDocument {
  id: string;
  title: string;
  amount: number;
  date: string;
  supplier?: string;
  nf_url: string;
  source: 'finance' | 'inventory';
  nf_series?: string;
  nf_emission_date?: string;
}

export default function Documentos() {
  const { organization } = useOrg();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'general' | 'nfs'>('general');
  const [loading, setLoading] = useState(true);
  const [nfs, setNfs] = useState<NfDocument[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    url: '',
    folder_id: '' as string
  });

  useEffect(() => {
    if (organization) fetchAll();
  }, [organization]);

  const fetchAll = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [finRes, invRes] = await Promise.all([
        supabase!.from('financial_transactions')
          .select('id, title, amount, date, nf_url, nf_series, nf_emission_date')
          .eq('organization_id', organization.id)
          .not('nf_url', 'is', null)
          .neq('nf_url', ''),
        supabase!.from('inventory_transactions')
          .select('id, item_id, amount, date, nf_url, supplier_name, nf_series, nf_emission_date')
          .eq('organization_id', organization.id)
          .not('nf_url', 'is', null)
          .neq('nf_url', '')
      ]);

      const consolidatedNfs: NfDocument[] = [];
      if (invRes.data) {
        invRes.data.forEach(i => {
          consolidatedNfs.push({ 
            id: i.id, 
            title: 'Entrada de Material', 
            amount: i.amount || 0, 
            date: i.date, 
            supplier: i.supplier_name, 
            nf_url: i.nf_url, 
            source: 'inventory',
            nf_series: i.nf_series,
            nf_emission_date: i.nf_emission_date
          });
        });
      }

      if (finRes.data) {
        finRes.data.forEach(f => {
          const isDuplicate = consolidatedNfs.some(nf => nf.nf_url === f.nf_url);
          if (!isDuplicate) {
            consolidatedNfs.push({ 
              id: f.id, 
              title: f.title, 
              amount: f.amount, 
              date: f.date, 
              nf_url: f.nf_url, 
              source: 'finance',
              nf_series: f.nf_series,
              nf_emission_date: f.nf_emission_date
            });
          }
        });
      }
      setNfs(consolidatedNfs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      const { data: folderData } = await supabase!.from('document_folders').select('*').eq('organization_id', organization.id).order('name');
      setFolders(folderData || []);

      const { data: docData } = await supabase!.from('documents').select('*').eq('organization_id', organization.id).eq('category', 'general');
      setDocuments(docData || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !newFolderName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!.from('document_folders').insert({ organization_id: organization.id, name: newFolderName.trim() });
      if (error) throw error;
      setToast({ message: 'Pasta criada!', type: 'success' });
      setNewFolderName('');
      setIsFolderModalOpen(false);
      fetchAll();
    } catch (err) {
      setToast({ message: 'Erro ao criar pasta', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;
    setIsSaving(true);
    try {
      const fileName = `${organization.id}/doc_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase!.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase!.storage.from('documents').getPublicUrl(fileName);
      
      setUploadForm(prev => ({ 
        ...prev, 
        url: publicUrl, 
        title: file.name,
        file_type: file.name.split('.').pop() || '',
        file_size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      } as any));
      setToast({ message: 'Arquivo carregado!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erro no upload', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !uploadForm.url || !uploadForm.title) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!.from('documents').insert({
        organization_id: organization.id,
        title: uploadForm.title,
        url: uploadForm.url,
        folder_id: uploadForm.folder_id || null,
        file_type: (uploadForm as any).file_type,
        file_size: (uploadForm as any).file_size,
        category: 'general'
      });
      if (error) throw error;
      setToast({ message: 'Documento registrado!', type: 'success' });
      setIsUploadModalOpen(false);
      setUploadForm({ title: '', url: '', folder_id: '' });
      fetchAll();
    } catch (err) {
      setToast({ message: 'Erro ao salvar documento', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    try {
      const { error } = await supabase!.from('documents').delete().eq('id', id);
      if (error) throw error;
      setToast({ message: 'Documento excluído!', type: 'success' });
      fetchAll();
    } catch (err) {
      setToast({ message: 'Erro ao excluir', type: 'error' });
    }
  };

  const filteredNfs = nfs.filter(nf => nf.title.toLowerCase().includes(search.toLowerCase()) || nf.supplier?.toLowerCase().includes(search.toLowerCase()));
  
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = selectedFolderId ? doc.folder_id === selectedFolderId : true;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700 pb-20">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text)]">Central de Documentos</h1>
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Gestão de Notas Fiscais e Arquivos Administrativos</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Buscar documento..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl text-[11px] font-bold focus:outline-none border transition-all w-40 md:w-56 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" 
            />
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            <Plus size={16} strokeWidth={3} /> Novo Arquivo
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-soft)] rounded-xl w-fit mb-8">
        {[
          { id: 'general', label: 'Arquivos do Clube', icon: Folder },
          { id: 'nfs', label: 'Notas Fiscais', icon: FileText },
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
             <div className="p-6 rounded-[32px] border bg-[var(--surface)] border-[var(--border)]">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Minhas Pastas</h3>
                   <button onClick={() => setIsFolderModalOpen(true)} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20"><FolderPlus size={14} /></button>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => setSelectedFolderId(null)}
                    className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all", !selectedFolderId ? "bg-primary/10 text-primary" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]")}
                  >
                    <div className="flex items-center gap-2.5">
                      <Folder size={14} />
                      <span>Todos os Arquivos</span>
                    </div>
                  </button>
                  {folders.map((folder) => (
                    <button 
                      key={folder.id} 
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={cn("w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all", selectedFolderId === folder.id ? "bg-primary/10 text-primary" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]")}
                    >
                       <div className="flex items-center gap-2.5">
                         <Folder size={14} />
                         <span>{folder.name}</span>
                       </div>
                       <ChevronRight size={12} className="opacity-40" />
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="md:col-span-3">
             <div className="rounded-[40px] border overflow-hidden bg-[var(--surface)] border-[var(--border)]">
                <div className="p-8 border-b border-[var(--border)] bg-[var(--surface-soft)]/30 flex items-center justify-between">
                   <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                     {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.name : 'Arquivos em Geral'}
                   </h2>
                   <span className="text-[9px] font-black uppercase text-[var(--text-subtle)]">{filteredDocs.length} arquivos</span>
                </div>
                <div className="divide-y divide-[var(--border)] min-h-[400px]">
                   {loading ? (
                     <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                   ) : filteredDocs.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <File size={40} className="mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum arquivo encontrado</p>
                     </div>
                   ) : filteredDocs.map((doc) => (
                     <div key={doc.id} className="p-5 flex items-center justify-between hover:bg-[var(--surface-soft)]/50 transition-colors group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-primary transition-colors">
                              <File size={20} />
                           </div>
                           <div>
                              <p className="text-[13px] font-black uppercase italic leading-none text-[var(--text)]">{doc.title}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                 <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{doc.file_size || 'N/A'}</span>
                                 <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
                                 <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => window.open(doc.url, '_blank')} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors" title="Visualizar"><Eye size={18} /></button>
                           <button onClick={() => window.open(doc.url, '_blank')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" title="Baixar"><Download size={18} /></button>
                           <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={18} /></button>
                        </div>
                     </div>
                   ))}
                </div>
                <div className="p-12 text-center border-t border-[var(--border)] opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Repositório Seguro Ativo</p>
                </div>
             </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[40px] border overflow-hidden bg-[var(--surface)] border-[var(--border)]">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] bg-[var(--surface-soft)]/50">
                    <th className="px-8 py-5">Nota Fiscal</th>
                    <th className="px-8 py-5">Série</th>
                    <th className="px-8 py-5">Emissão</th>
                    <th className="px-8 py-5">Fornecedor</th>
                    <th className="px-8 py-5">Origem</th>
                    <th className="px-8 py-5 text-center">Valor</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="animate-spin text-primary mx-auto" /></td></tr>
                ) : filteredNfs.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center text-[10px] font-black uppercase opacity-20">Nenhuma nota fiscal encontrada</td></tr>
                ) : filteredNfs.map((nf) => (
                  <tr key={nf.id} className="hover:bg-[var(--surface-soft)]/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><FileText size={16} /></div>
                        <div>
                          <p className="text-xs font-black uppercase italic leading-none text-[var(--text)]">{nf.title}</p>
                          <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase">{new Date(nf.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{nf.nf_series || '---'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {nf.nf_emission_date ? new Date(nf.nf_emission_date).toLocaleDateString('pt-BR') : '---'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{nf.supplier || 'Geral'}</span>
                    </td>
                    <td className="px-8 py-6">
                       <span className={cn("px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase", nf.source === 'inventory' ? "bg-primary/10 text-primary border border-primary/20" : "bg-sky-500/10 text-sky-500 border border-sky-500/20")}>
                         {nf.source === 'inventory' ? 'Almoxarifado' : 'Financeiro'}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-center text-[11px] font-black italic text-[var(--text)]">R$ {nf.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(nf.nf_url, '_blank')} className="p-2 text-[var(--text-muted)] hover:text-primary transition-colors" title="Visualizar"><Eye size={18} /></button>
                          <button onClick={() => window.open(nf.nf_url, '_blank')} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" title="Baixar"><Download size={18} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Novo Documento</h2>
              <button onClick={() => setIsUploadModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveDocument} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Título do Arquivo</label>
                <input 
                  required 
                  type="text" 
                  value={uploadForm.title}
                  onChange={e => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl text-xs font-bold border focus:outline-none transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Pasta</label>
                <select 
                  value={uploadForm.folder_id}
                  onChange={e => setUploadForm({...uploadForm, folder_id: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl text-xs font-bold border focus:outline-none transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50"
                >
                  <option value="">Geral</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Arquivo</label>
                <div onClick={() => fileInputRef.current?.click()} className={cn("px-5 py-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all", uploadForm.url ? "border-emerald-500 bg-emerald-500/5 text-emerald-500" : "border-[var(--border)] text-[var(--text-muted)] hover:border-primary/50")}>
                   {isSaving && !uploadForm.url ? <Loader2 className="animate-spin" /> : uploadForm.url ? <Check size={24} /> : <Upload size={24} />}
                   <span className="text-[10px] font-black uppercase">{uploadForm.url ? 'Arquivo Pronto' : 'Clique para subir'}</span>
                </div>
              </div>
              <button disabled={isSaving || !uploadForm.url} className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase shadow-xl shadow-primary/20 mt-4 flex items-center justify-center gap-2">
                {isSaving && uploadForm.url ? <Loader2 className="animate-spin" size={16} /> : null}
                Salvar Documento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-sm rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Nova Pasta</h2>
              <button onClick={() => setIsFolderModalOpen(false)}><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-[var(--text-muted)]">Nome da Pasta</label>
                <input 
                  required 
                  type="text" 
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="w-full px-5 py-3 rounded-2xl text-xs font-bold border focus:outline-none transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50" 
                />
              </div>
              <button disabled={isSaving || !newFolderName.trim()} className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase shadow-xl shadow-primary/20 mt-4 flex items-center justify-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
                Criar Pasta
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
