import React, { useState, useEffect } from 'react';
import { Users, Plus, Mail, Shield, MoreVertical, X, Check, Loader2, Trash2, UserPlus, ShieldAlert, ShieldCheck, Building2, Clock, Lock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import Toast from '../components/Toast';

interface Profile {
  id: string;
  full_name: string;
  role: 'owner' | 'admin' | 'staff';
  avatar_url?: string;
  created_at: string;
}

type PermKey = string;
interface ModulePerms { label: string; icon: string; perms: { key: PermKey; label: string }[] }

const MODULES: ModulePerms[] = [
  { label: 'Bilheteria', icon: '🎟️', perms: [
    { key: 'bilheteria.view', label: 'Ver bilheteria' },
    { key: 'bilheteria.create', label: 'Criar evento' },
    { key: 'bilheteria.edit', label: 'Editar evento' },
    { key: 'bilheteria.delete', label: 'Excluir evento' },
    { key: 'bilheteria.sales', label: 'Ver vendas' },
  ]},
  { label: 'Financeiro', icon: '💰', perms: [
    { key: 'financeiro.view', label: 'Ver financeiro' },
    { key: 'financeiro.create', label: 'Lançar receita/despesa' },
    { key: 'financeiro.delete', label: 'Excluir lançamentos' },
    { key: 'financeiro.relatorios', label: 'Ver relatórios' },
  ]},
  { label: 'Atletas', icon: '⚽', perms: [
    { key: 'atletas.view', label: 'Ver atletas' },
    { key: 'atletas.create', label: 'Cadastrar atleta' },
    { key: 'atletas.edit', label: 'Editar atleta' },
    { key: 'atletas.delete', label: 'Excluir atleta' },
  ]},
  { label: 'Materiais', icon: '👕', perms: [
    { key: 'materiais.view', label: 'Ver estoque' },
    { key: 'materiais.create', label: 'Adicionar item' },
    { key: 'materiais.edit', label: 'Editar item' },
    { key: 'materiais.delete', label: 'Excluir item' },
  ]},
  { label: 'Vaquinhas', icon: '❤️', perms: [
    { key: 'vaquinhas.view', label: 'Ver campanhas' },
    { key: 'vaquinhas.manage', label: 'Criar/editar campanhas' },
    { key: 'vaquinhas.delete', label: 'Excluir campanhas' },
  ]},
  { label: 'Mensalidades', icon: '📅', perms: [
    { key: 'mensalidades.view', label: 'Ver mensalidades' },
    { key: 'mensalidades.manage', label: 'Gerenciar cobranças' },
  ]},
  { label: 'Documentos', icon: '📄', perms: [
    { key: 'documentos.view', label: 'Ver documentos' },
    { key: 'documentos.upload', label: 'Fazer upload' },
    { key: 'documentos.delete', label: 'Excluir documentos' },
  ]},
  { label: 'Usuários', icon: '👥', perms: [
    { key: 'usuarios.view', label: 'Ver usuários' },
    { key: 'usuarios.invite', label: 'Convidar usuários' },
    { key: 'usuarios.remove', label: 'Remover usuários' },
  ]},
];

const PRESETS: Record<string, PermKey[]> = {
  staff: ['bilheteria.view','bilheteria.sales','atletas.view','materiais.view','vaquinhas.view','mensalidades.view','documentos.view'],
  admin: MODULES.flatMap(m => m.perms.map(p => p.key)),
};

export default function Usuarios() {
  const { organization } = useOrg();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [search, setSearch] = useState('');
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<Set<PermKey>>(new Set(PRESETS.staff));

  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'staff' as 'admin' | 'staff' });

  useEffect(() => { if (organization) fetchProfiles(); }, [organization]);

  const fetchProfiles = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const { data, error } = await supabase!.from('profiles').select('*').eq('organization_id', organization.id).order('role', { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleRoleChange = (role: 'admin' | 'staff') => {
    setInviteForm(f => ({ ...f, role }));
    setPermissions(new Set(PRESETS[role]));
  };

  const togglePerm = (key: PermKey) => {
    setPermissions(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleModule = (label: string) => {
    const mod = MODULES.find(m => m.label === label)!;
    const allOn = mod.perms.every(p => permissions.has(p.key));
    setPermissions(prev => {
      const next = new Set(prev);
      mod.perms.forEach(p => allOn ? next.delete(p.key) : next.add(p.key));
      return next;
    });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setToast({ message: 'Convite enviado para ' + inviteForm.email, type: 'success' });
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', fullName: '', role: 'staff' });
      setPermissions(new Set(PRESETS.staff));
      setIsSaving(false);
    }, 1000);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <span className="px-2 py-0.5 bg-primary text-black text-[8px] font-black uppercase rounded">Proprietário</span>;
      case 'admin': return <span className="px-2 py-0.5 bg-sky-500/10 text-sky-500 text-[8px] font-black uppercase rounded border border-sky-500/20">Administrador</span>;
      default: return <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-500 text-[8px] font-black uppercase rounded border border-zinc-500/20">Equipe</span>;
    }
  };

  const filteredProfiles = profiles.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-[var(--text)]">Gestão de Usuários</h1>
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Controle quem acessa o painel do {organization?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
            <input type="text" placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl text-[11px] font-bold focus:outline-none border transition-all w-40 md:w-56 bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" />
          </div>
          <button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">
            <UserPlus size={16} strokeWidth={3} /> Convidar
          </button>
        </div>
      </div>

      <div className="rounded-[40px] border overflow-hidden bg-[var(--surface)] border-[var(--border)] shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)] text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              <th className="px-8 py-5">Usuário</th>
              <th className="px-8 py-5">Nível de Acesso</th>
              <th className="px-8 py-5">Data de Ingresso</th>
              <th className="px-8 py-5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y border-[var(--border)]">
            {loading ? (
              <tr><td colSpan={4} className="px-8 py-20 text-center">
                <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Carregando...</p>
              </td></tr>
            ) : filteredProfiles.map(profile => (
              <tr key={profile.id} className="hover:bg-[var(--surface-soft)] group transition-colors">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-soft)] flex items-center justify-center border border-[var(--border)] overflow-hidden">
                      {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <Users size={18} className="text-[var(--text-muted)]" />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase italic leading-none text-[var(--text)]">{profile.full_name || 'Usuário Sem Nome'}</p>
                      <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-1">ID: ...{profile.id.slice(-8)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4">{getRoleBadge(profile.role)}</td>
                <td className="px-8 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase">{new Date(profile.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-8 py-4 text-right">
                  <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"><MoreVertical size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] bg-[var(--surface)] border-[var(--border)]">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--surface-soft)]/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><UserPlus size={18} /></div>
                <div>
                  <h2 className="text-base font-black uppercase italic tracking-tighter text-[var(--text)]">Convidar Membro</h2>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Configure as permissões de acesso</p>
                </div>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={20} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 no-scrollbar p-6 space-y-6">
              <form onSubmit={handleInvite} id="invite-form" className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nome Completo</label>
                      <input required type="text" value={inviteForm.fullName}
                        onChange={e => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)]/50"
                        placeholder="João da Silva" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">E-mail</label>
                      <input required type="email" value={inviteForm.email}
                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)]/50"
                        placeholder="joao@email.com" />
                    </div>
                  </div>

                  {/* Role Preset */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Perfil Base</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'staff', label: 'Equipe', desc: 'Acesso limitado de visualização', icon: <Users size={16} /> },
                        { value: 'admin', label: 'Administrador', desc: 'Controle total do sistema', icon: <ShieldCheck size={16} /> },
                      ].map(opt => (
                        <button key={opt.value} type="button" onClick={() => handleRoleChange(opt.value as any)}
                          className={cn("flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                            inviteForm.role === opt.value
                              ? "border-primary bg-primary/5"
                              : "border-[var(--border)] hover:border-primary/20 bg-[var(--surface-soft)]/30"
                          )}>
                          <div className={cn("p-2 rounded-xl", inviteForm.role === opt.value ? "bg-primary text-black" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
                            {opt.icon}
                          </div>
                          <div>
                            <p className={cn("text-[10px] font-black uppercase", inviteForm.role === opt.value ? "text-primary" : "text-[var(--text)]")}>{opt.label}</p>
                            <p className="text-[8px] text-[var(--text-muted)] font-medium mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                {inviteForm.role === 'admin' ? (
                  <div className="p-1">
                    <div className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-2xl">
                      <div className="p-3 bg-primary rounded-2xl text-black shrink-0">
                        <ShieldCheck size={22} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-primary">Acesso Total Concedido</p>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium mt-1 leading-relaxed">
                          Administradores têm acesso irrestrito a todos os módulos e funcionalidades do sistema. Nenhuma configuração adicional é necessária.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">Permissões Detalhadas</span>
                    </div>
                    <span className="text-[9px] font-bold text-[var(--text-muted)]">{permissions.size} de {MODULES.flatMap(m => m.perms).length} ativas</span>
                  </div>

                  {MODULES.map(mod => {
                    const allOn = mod.perms.every(p => permissions.has(p.key));
                    const someOn = mod.perms.some(p => permissions.has(p.key));
                    const isOpen = !!openModules[mod.label];
                    return (
                      <div key={mod.label} className="rounded-2xl border overflow-hidden transition-all border-[var(--border)] shadow-sm">
                        {/* Module Header */}
                        <div className="flex items-center justify-between px-4 py-3 cursor-pointer bg-[var(--surface-soft)] hover:bg-[var(--surface-strong)] transition-colors"
                          onClick={() => setOpenModules(o => ({ ...o, [mod.label]: !o[mod.label] }))}>
                          <div className="flex items-center gap-3">
                            {/* Module toggle checkbox */}
                            <button type="button" onClick={e => { e.stopPropagation(); toggleModule(mod.label); }}
                              className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                                allOn ? "bg-primary border-primary" : someOn ? "bg-primary/30 border-primary/50" : "border-[var(--text-muted)]"
                              )}>
                              {allOn && <Check size={11} strokeWidth={3} className="text-black" />}
                              {someOn && !allOn && <div className="w-2 h-0.5 bg-primary rounded-full" />}
                            </button>
                            <span className="text-sm">{mod.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text)]">{mod.label}</span>
                            <span className="text-[8px] font-bold text-[var(--text-muted)]">{mod.perms.filter(p => permissions.has(p.key)).length}/{mod.perms.length}</span>
                          </div>
                          {isOpen ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                        </div>

                        {/* Permissions List */}
                        {isOpen && (
                          <div className="px-4 py-3 space-y-2 border-t border-[var(--border)] bg-[var(--surface)]">
                            {mod.perms.map(perm => {
                              const active = permissions.has(perm.key);
                              return (
                                <label key={perm.key} className="flex items-center gap-3 cursor-pointer group">
                                  <button type="button" onClick={() => togglePerm(perm.key)}
                                    className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                                      active ? "bg-primary border-primary" : "border-[var(--text-muted)] group-hover:border-primary/50"
                                    )}>
                                    {active && <Check size={11} strokeWidth={3} className="text-black" />}
                                  </button>
                                  <span className={cn("text-[11px] font-semibold transition-colors", active ? "text-[var(--text)]" : "text-[var(--text-muted)]")}>{perm.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border)] shrink-0 bg-[var(--surface-soft)]/50">
              <button form="invite-form" type="submit" disabled={isSaving}
                className="w-full py-4 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><Mail size={16} /> Enviar Convite com Permissões</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
