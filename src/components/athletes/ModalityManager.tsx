import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Trophy, Target, ChevronRight, Loader2, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../context/OrgContext';
import { cn } from '../../lib/utils';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';

interface Modality {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  modality_id: string;
  min_age: number;
  max_age: number;
}

interface Position {
  id: string;
  name: string;
  modality_id: string;
}

interface ModalityManagerProps {
  onClose: () => void;
  onUpdate: () => void;
}

export default function ModalityManager({ onClose, onUpdate }: ModalityManagerProps) {
  const { organization } = useOrg();
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);
  const [activeTab, setActiveTab] = useState<'categories' | 'positions'>('categories');

  // New Entity States
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newMax, setNewMax] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (organization) {
      fetchAll();
    }
  }, [organization]);

  const fetchAll = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [modRes, catRes, posRes] = await Promise.all([
        supabase!.from('athlete_modalities').select('*').eq('organization_id', organization.id).order('name'),
        supabase!.from('athlete_categories').select('*').eq('organization_id', organization.id).order('min_age'),
        supabase!.from('athlete_positions').select('*').eq('organization_id', organization.id).order('name')
      ]);

      setModalities(modRes.data || []);
      setCategories(catRes.data || []);
      setPositions(posRes.data || []);
      
      if (modRes.data && modRes.data.length > 0 && !selectedModality) {
        setSelectedModality(modRes.data[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !newName.trim()) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase!
        .from('athlete_modalities')
        .insert([{ organization_id: organization.id, name: newName.trim() }])
        .select();

      if (error) throw error;
      setNewName('');
      fetchAll();
      if (data) setSelectedModality(data[0]);
      showToast('Modalidade criada!');
    } catch (err: any) {
      showToast('Erro ao criar modalidade: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !selectedModality || !newName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('athlete_categories')
        .insert([{
          organization_id: organization.id,
          modality_id: selectedModality.id,
          name: newName.trim(),
          min_age: parseInt(newMin) || 0,
          max_age: parseInt(newMax) || 99
        }]);

      if (error) throw error;
      setNewMax('');
      fetchAll();
      onUpdate();
      showToast('Categoria criada!');
    } catch (err: any) {
      showToast('Erro ao criar categoria: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !selectedModality || !newName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('athlete_positions')
        .insert([{
          organization_id: organization.id,
          modality_id: selectedModality.id,
          name: newName.trim()
        }]);

      if (error) throw error;
      setNewName('');
      fetchAll();
      onUpdate();
      showToast('Posição criada!');
    } catch (err: any) {
      showToast('Erro ao criar posição: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (table: string, id: string) => {
    setConfirmModal({
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
      onConfirm: () => executeDelete(table, id)
    });
  };

  const executeDelete = async (table: string, id: string) => {
    try {
      const { error } = await supabase!.from(table).delete().eq('id', id);
      if (error) throw error;
      fetchAll();
      onUpdate();
      showToast('Item excluído com sucesso!');
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setConfirmModal(null);
    }
  };

  const filteredCategories = categories.filter(c => c.modality_id === selectedModality?.id);
  const filteredPositions = positions.filter(p => p.modality_id === selectedModality?.id);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] w-full max-w-4xl rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">Gestão de Modalidades</h2>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Configure modalidades, categorias e posições</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Modalidades */}
          <div className="w-64 border-r border-[var(--border)] bg-[var(--surface-soft)]/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Minhas Modalidades</h3>
            </div>
            
            <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
              {modalities.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModality(mod)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-bold transition-all group",
                    selectedModality?.id === mod.id 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                  )}
                >
                  <span>{mod.name}</span>
                  <div className="flex items-center gap-2">
                    {selectedModality?.id === mod.id && <ChevronRight size={14} />}
                    <Trash2 
                      size={12} 
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" 
                      onClick={(e) => { e.stopPropagation(); handleDelete('athlete_modalities', mod.id); }}
                    />
                  </div>
                </button>
              ))}
              
              <form onSubmit={handleAddModality} className="mt-4 px-2">
                <div className="relative">
                  <input 
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="+ Nova Modalidade"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-[10px] font-bold focus:outline-none focus:border-primary text-[var(--text)]"
                  />
                  {isSaving && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
                </div>
              </form>
            </div>
          </div>

          {/* Main Content: Categories & Positions */}
          <div className="flex-1 flex flex-col bg-[var(--surface)]">
            {!selectedModality ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                <Trophy size={48} className="mb-4" />
                <p className="text-xs font-black uppercase italic">Selecione ou crie uma modalidade</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-primary">{selectedModality.name}</h3>
                  <div className="flex bg-[var(--surface-soft)] p-1 rounded-xl border border-[var(--border)]">
                    <button 
                      onClick={() => setActiveTab('categories')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'categories' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)]"
                      )}
                    >
                      Categorias
                    </button>
                    <button 
                      onClick={() => setActiveTab('positions')}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'positions' ? "bg-[var(--surface)] text-primary shadow-sm" : "text-[var(--text-muted)]"
                      )}
                    >
                      Posições
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  {/* Form for Categories/Positions */}
                  <form 
                    onSubmit={activeTab === 'categories' ? handleAddCategory : handleAddPosition}
                    className="mb-6 p-4 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)] space-y-4"
                  >
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">
                          {activeTab === 'categories' ? 'Nome da Categoria (ex: Sub-17)' : 'Nome da Posição (ex: Goleiro)'}
                        </label>
                        <input 
                          type="text" 
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                          placeholder="Digite aqui..."
                          required
                        />
                      </div>
                      {activeTab === 'categories' && (
                        <>
                          <div className="w-24 space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Mín</label>
                            <input 
                              type="number" 
                              value={newMin}
                              onChange={e => setNewMin(e.target.value)}
                              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                              placeholder="0"
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Máx</label>
                            <input 
                              type="number" 
                              value={newMax}
                              onChange={e => setNewMax(e.target.value)}
                              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                              placeholder="99"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex items-end">
                        <button 
                          type="submit"
                          disabled={isSaving}
                          className="p-2.5 bg-primary text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                          <Plus size={20} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTab === 'categories' ? (
                      filteredCategories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-[var(--surface-soft)]/20 border border-[var(--border)] rounded-2xl group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-lg text-[10px] font-black italic">
                              {cat.min_age}
                            </div>
                            <div>
                              <h4 className="text-xs font-black uppercase text-[var(--text)] italic leading-none">{cat.name}</h4>
                              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">{cat.min_age} a {cat.max_age} anos</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete('athlete_categories', cat.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    ) : (
                      filteredPositions.map(pos => (
                        <div key={pos.id} className="flex items-center justify-between p-3 bg-[var(--surface-soft)]/20 border border-[var(--border)] rounded-2xl group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                              <Target size={14} />
                            </div>
                            <h4 className="text-xs font-black uppercase text-[var(--text)] italic leading-none">{pos.name}</h4>
                          </div>
                          <button 
                            onClick={() => handleDelete('athlete_positions', pos.id)}
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmModal && (
        <ConfirmModal
          isOpen={true}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
