import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Briefcase, 
  UserPlus, 
  Trash2, 
  MoreVertical,
  X,
  Check,
  Loader2,
  Camera,
  Calendar,
  Contact2
} from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface Department {
  id: string;
  name: string;
}

interface StaffRole {
  id: string;
  name: string;
  department_id: string;
}

interface StaffMember {
  id: string;
  name: string;
  department_id: string;
  role_id?: string;
  birth_date?: string;
  gender?: string;
  avatar_url?: string;
  role_name?: string;
  whatsapp?: string;
  email?: string;
}

export default function Equipe() {
  const { organization } = useOrg();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Modal States
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Form States
  const [deptName, setDeptName] = useState('');
  const [roleForm, setRoleForm] = useState({ name: '', departmentId: '' });
  const [memberForm, setMemberForm] = useState({
    name: '',
    departmentId: '',
    roleId: '',
    birthDate: '',
    gender: 'Masculino',
    avatarUrl: '',
    whatsapp: '',
    email: ''
  });

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setIsUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase!.storage
        .from('staff')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase!.storage
        .from('staff')
        .getPublicUrl(filePath);

      setMemberForm(prev => ({ ...prev, avatarUrl: publicUrl }));
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro ao subir foto. Verifique se o bucket "staff" foi criado.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const { data: depts } = await supabase!
        .from('staff_departments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');
      
      const { data: staffRoles } = await supabase!
        .from('staff_roles')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      const { data: members } = await supabase!
        .from('staff')
        .select('*, role:staff_roles(name)')
        .eq('organization_id', organization.id)
        .order('name');

      if (depts) setDepartments(depts);
      if (staffRoles) setRoles(staffRoles);
      if (members) setStaff(members.map(m => ({ ...m, role_name: m.role?.name })));
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !deptName) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('staff_departments')
        .insert({ organization_id: organization.id, name: deptName });
      if (error) throw error;
      setDeptName('');
      setIsDeptModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !roleForm.name || !roleForm.departmentId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('staff_roles')
        .insert({ 
          organization_id: organization.id, 
          department_id: roleForm.departmentId,
          name: roleForm.name 
        });
      if (error) throw error;
      setRoleForm({ name: '', departmentId: '' });
      setIsRoleModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !memberForm.name || !memberForm.departmentId || !memberForm.roleId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase!
        .from('staff')
        .insert({
          organization_id: organization.id,
          name: memberForm.name,
          department_id: memberForm.departmentId,
          role_id: memberForm.roleId,
          birth_date: memberForm.birthDate || null,
          gender: memberForm.gender,
          avatar_url: memberForm.avatarUrl || null,
          whatsapp: memberForm.whatsapp || null,
          email: memberForm.email || null
        });
      if (error) throw error;
      setMemberForm({ name: '', departmentId: '', roleId: '', birthDate: '', gender: 'Masculino', avatarUrl: '', whatsapp: '', email: '' });
      setIsMemberModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDept = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Departamento',
      message: 'Tem certeza que deseja excluir este departamento? Os membros ficarão sem setor definido.',
      onConfirm: async () => {
        await supabase!.from('staff_departments').delete().eq('id', id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchData();
      }
    });
  };

  const handleDeleteMember = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Membro',
      message: 'Tem certeza que deseja remover este profissional da equipe?',
      onConfirm: async () => {
        await supabase!.from('staff').delete().eq('id', id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchData();
      }
    });
  };

  const handleDeleteRole = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Cargo',
      message: 'Deseja realmente excluir este cargo da estrutura?',
      onConfirm: async () => {
        await supabase!.from('staff_roles').delete().eq('id', id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        fetchData();
      }
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-20">
      {/* Hidden input for photo upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        className="hidden" 
        accept="image/*" 
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none text-[var(--text)]">
              Estrutura Organizacional
            </h1>
            <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5">Gestão de Departamentos e Profissionais</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block text-[var(--text)]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
            <input 
              type="text" 
              placeholder="Buscar na equipe..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 rounded-2xl text-xs font-bold focus:outline-none border transition-all w-64 bg-[var(--surface)] border-[var(--border)] focus:border-primary/50 text-[var(--text)] placeholder-[var(--text-muted)]/50"
            />
          </div>
          <button 
            onClick={() => setIsDeptModalOpen(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 text-[10px] font-black uppercase tracking-widest bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
          >
            <Briefcase size={18} />
            Dept.
          </button>
          <button 
            onClick={() => setIsMemberModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
          >
            <UserPlus size={18} strokeWidth={3} />
            Novo Membro
          </button>
        </div>
      </div>

      {/* Grid de Departamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {departments.map(dept => {
          const deptMembers = staff.filter(m => m.department_id === dept.id && m.name.toLowerCase().includes(search.toLowerCase()));
          const deptRoles = roles.filter(r => r.department_id === dept.id);
          
          return (
            <div 
              key={dept.id}
              className="rounded-[32px] border overflow-hidden flex flex-col transition-all group bg-[var(--surface)] border-[var(--border)] shadow-sm"
            >
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/30">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-sm font-black uppercase italic text-[var(--text)]">{dept.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                      setRoleForm({ ...roleForm, departmentId: dept.id });
                      setIsRoleModalOpen(true);
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all"
                    title="Adicionar Cargo"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                  <button 
                    onClick={() => handleDeleteDept(dept.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Lista de Cargos (Chips) */}
              {deptRoles.length > 0 && (
                <div className="px-6 py-3 bg-[var(--surface-soft)]/50 border-b border-[var(--border)] flex flex-wrap gap-2">
                  {deptRoles.map(role => (
                    <div key={role.id} className="flex items-center gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm">
                      <span className="text-[8px] font-black uppercase text-[var(--text-muted)]">{role.name}</span>
                      <button onClick={() => handleDeleteRole(role.id)} className="text-rose-500 hover:scale-110 transition-transform">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 space-y-2 flex-1">
                {deptMembers.map(member => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-2xl border transition-all bg-[var(--surface-soft)] border-[var(--border)] hover:border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Contact2 size={18} className="text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase leading-tight text-[var(--text)]">{member.name}</p>
                        <p className="text-[9px] font-black text-primary uppercase tracking-tight">{member.role_name || 'Membro'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {deptMembers.length === 0 && (
                  <div className="py-12 text-center opacity-20">
                    <Users size={32} className="mx-auto mb-2 text-[var(--text-muted)]" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nenhum membro</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {departments.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-[var(--surface-soft)] rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-[var(--border)]">
              <Briefcase size={40} className="text-[var(--text-muted)]" />
            </div>
            <h2 className="text-xl font-black uppercase italic text-[var(--text)]">Sem Estrutura Definida</h2>
            <p className="text-[var(--text-muted)] text-sm mt-2 max-w-sm mx-auto">Comece criando um departamento para organizar sua equipe.</p>
          </div>
        )}
      </div>

      {/* Modal Departamento */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)] overflow-hidden">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Novo Departamento</h2>
              <button onClick={() => setIsDeptModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors"><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveDept} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome do Departamento</label>
                <input required type="text" value={deptName} onChange={e => setDeptName(e.target.value)} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 placeholder-[var(--text-muted)]/50" placeholder="Ex: Médicos, Diretoria, Marketing..." />
              </div>
              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />}
                Criar Departamento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cargo */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)] overflow-hidden">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Novo Cargo</h2>
              <button onClick={() => setIsRoleModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors"><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveRole} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Departamento</label>
                <div className="px-5 py-3.5 rounded-2xl text-xs font-bold border opacity-70 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                  {departments.find(d => d.id === roleForm.departmentId)?.name}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome do Cargo</label>
                <input required type="text" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 placeholder-[var(--text-muted)]/50" placeholder="Ex: Fisioterapeuta, Presidente..." />
              </div>
              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />}
                Criar Cargo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Membro */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[40px] border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)]">
            <div className="p-8 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
              <div>
                <h2 className="text-lg font-black uppercase italic tracking-tighter text-[var(--text)]">Cadastrar Profissional</h2>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Adicione um novo membro à sua estrutura</p>
              </div>
              <button onClick={() => setIsMemberModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors"><X size={24} className="text-[var(--text-muted)]" /></button>
            </div>
            <form onSubmit={handleSaveMember} className="p-8 space-y-6">
              <div className="space-y-2 text-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-[32px] mx-auto border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden border-[var(--border)] bg-[var(--surface-soft)]"
                >
                  {isUploadingPhoto ? (
                    <Loader2 size={24} className="animate-spin text-primary" />
                  ) : memberForm.avatarUrl ? (
                    <img src={memberForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={24} className="text-[var(--text-muted)] group-hover:text-primary transition-colors" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)]">Foto</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome Completo</label>
                <input required type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 placeholder-[var(--text-muted)]/50" placeholder="Nome do profissional..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Data de Nascimento</label>
                  <input type="date" value={memberForm.birthDate} onChange={e => setMemberForm({...memberForm, birthDate: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Sexo</label>
                  <select value={memberForm.gender} onChange={e => setMemberForm({...memberForm, gender: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)]">
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">WhatsApp</label>
                  <input type="text" value={memberForm.whatsapp} onChange={e => setMemberForm({...memberForm, whatsapp: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 placeholder-[var(--text-muted)]/50" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">E-mail</label>
                  <input type="email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50 placeholder-[var(--text-muted)]/50" placeholder="exemplo@email.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Departamento</label>
                  <select required value={memberForm.departmentId} onChange={e => setMemberForm({...memberForm, departmentId: e.target.value, roleId: ''})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50">
                    <option value="">Selecione...</option>
                    {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Cargo</label>
                  <select required disabled={!memberForm.departmentId} value={memberForm.roleId} onChange={e => setMemberForm({...memberForm, roleId: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl text-xs font-bold focus:outline-none border transition-all disabled:opacity-30 bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text)] focus:border-primary/50">
                    <option value="">Selecione...</option>
                    {roles.filter(r => r.department_id === memberForm.departmentId).map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button disabled={isSaving} type="submit" className="w-full py-4 bg-primary text-black rounded-2xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={4} />}
                Salvar Membro
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Confirmar Exclusão */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 bg-[var(--surface)] border-[var(--border)] overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter text-[var(--text)] mb-2">
                {confirmModal.title}
              </h2>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest leading-relaxed mb-8">
                {confirmModal.message}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-[var(--surface-soft)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--surface-strong)] transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="py-4 bg-rose-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
