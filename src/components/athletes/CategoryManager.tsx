import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../context/OrgContext';
import Toast from '../Toast';
import ConfirmModal from '../ConfirmModal';

interface Category {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
}

interface CategoryManagerProps {
  onClose: () => void;
  onUpdate: () => void;
}

export default function CategoryManager({ onClose, onUpdate }: CategoryManagerProps) {
  const { organization } = useOrg();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newMax, setNewMax] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const fetchCategories = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase!
        .from('categories')
        .select('*')
        .order('min_age', { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [organization]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !newName || !newMin || !newMax) return;

    try {
      const { error } = await supabase!
        .from('categories')
        .insert([{
          organization_id: organization.id,
          name: newName,
          min_age: parseInt(newMin),
          max_age: parseInt(newMax)
        }]);

      if (error) throw error;
      setNewName('');
      setNewMin('');
      setNewMax('');
      fetchCategories();
      onUpdate();
      showToast('Categoria criada com sucesso!');
    } catch (err: any) {
      showToast('Erro ao criar categoria: ' + err.message, 'error');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      title: 'Excluir Categoria',
      message: 'Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase!
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchCategories();
      onUpdate();
      showToast('Categoria excluída com sucesso!');
    } catch (err: any) {
      showToast('Erro ao excluir: ' + err.message, 'error');
    } finally {
      setConfirmModal(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--surface)] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic">Categorias</h2>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Gerencie as faixas etárias</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleAdd} className="p-4 bg-[var(--surface-soft)] rounded-2xl border border-[var(--border)] space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome (ex: Sub-13)</label>
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                placeholder="Nome da categoria"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Idade Mínima</label>
                <input 
                  type="number" 
                  value={newMin}
                  onChange={e => setNewMin(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Idade Máxima</label>
                <input 
                  type="number" 
                  value={newMax}
                  onChange={e => setNewMax(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-primary transition-all text-[var(--text)]"
                  placeholder="99"
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={16} />
              Adicionar Categoria
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-[var(--surface-soft)] rounded-lg text-xs font-black text-primary italic">
                    {cat.min_age}
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--text)] italic">{cat.name}</h4>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{cat.min_age} a {cat.max_age} anos</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!loading && categories.length === 0 && (
              <p className="text-center py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase italic">Nenhuma categoria criada.</p>
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
