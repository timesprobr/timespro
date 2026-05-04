import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2, 
  User, 
  FileText, 
  MapPin, 
  Shirt,
  FilePlus,
  Trash2,
  Phone,
  Mail,
  Zap,
  IdCard,
  Fingerprint,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useOrg } from '../../context/OrgContext';
import { cn } from '../../lib/utils';
import Toast from '../Toast';

interface NewAthleteFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  athlete?: any;
}

export default function NewAthleteForm({ onClose, onSuccess, athlete }: NewAthleteFormProps) {
  const { organization } = useOrg();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(athlete?.photo_url || null);

  // Form Data
  const [formData, setFormData] = useState({
    full_name: athlete?.full_name || '',
    nickname: athlete?.nickname || '',
    birth_date: athlete?.birth_date || '',
    gender: athlete?.gender || '',
    number: athlete?.number || '',
    email: athlete?.email || '',
    whatsapp: athlete?.whatsapp || '',
    modality_id: athlete?.modality_id || '',
    category_id: athlete?.category_id || '',
    position_id: athlete?.position_id || '',
    cpf: athlete?.document_cpf || '',
    rg: athlete?.document_rg || '',
    address: athlete?.address_json || {
      zip: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    },
    sizes: athlete?.sizes_json || {
      shirt: '',
      short: '',
      socks: '',
      boots: ''
    },
    dominant_foot: athlete?.dominant_foot || 'Destro'
  });

  const [documents, setDocuments] = useState<{ name: string; file: File; uploading?: boolean; url?: string | null; error?: string | null }[]>([]);
  const [existingDocs, setExistingDocs] = useState<any[]>(athlete?.documents_json || []);
  const [modalities, setModalities] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };
  
  useEffect(() => {
    if (organization) {
      fetchMetadata();
    }
  }, [organization]);

  const fetchMetadata = async () => {
    try {
      const [modRes, catRes, posRes] = await Promise.all([
        supabase!.from('athlete_modalities').select('*').eq('organization_id', organization?.id).order('name'),
        supabase!.from('athlete_categories').select('*').eq('organization_id', organization?.id).order('min_age'),
        supabase!.from('athlete_positions').select('*').eq('organization_id', organization?.id).order('name')
      ]);
      setModalities(modRes.data || []);
      setCategories(catRes.data || []);
      setPositions(posRes.data || []);
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      let formattedValue = value;
      
      // Address masks
      if (child === 'zip') {
        formattedValue = value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
        if (formattedValue.length === 9) handleCEPLookup(formattedValue);
      }

      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev as any)[parent],
          [child]: formattedValue
        }
      }));
      return;
    }

    let formattedValue = value;
    if (name === 'whatsapp') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 15);
    } else if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
    } else if (name === 'rg') {
      formattedValue = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 12);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));
  };

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf,
              zip: cep
            }
          }));
        }
      } catch (err) {
        console.error('Error looking up CEP:', err);
      }
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleFileUpload = async (file: File, index: number, isExisting = false) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `doc-${Date.now()}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase!.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase!.storage.from('documents').getPublicUrl(fileName);
      
      setDocuments(prev => prev.map((doc, i) => 
        i === index ? { ...doc, url: publicUrl, uploading: false, error: null } : doc
      ));
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setDocuments(prev => prev.map((doc, i) => 
        i === index ? { ...doc, uploading: false, error: err.message } : doc
      ));
    }
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newIndex = documents.length;
      setDocuments(prev => [...prev, { name: file.name, file, uploading: true, url: null, error: null }]);
      handleFileUpload(file, newIndex);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!organization) return;
    setLoading(true);
    setUploadProgress(0);

    try {
      let photoUrl = athlete?.photo_url || null;
      
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `photo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase!.storage
          .from('atletas')
          .upload(fileName, photo);
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase!.storage.from('atletas').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      const newUploadedDocs = documents
        .filter(doc => doc.url)
        .map(doc => ({ name: doc.name, url: doc.url }));

      const allDocuments = [...existingDocs, ...newUploadedDocs];

      const athleteData = {
        organization_id: organization.id,
        full_name: formData.full_name,
        nickname: formData.nickname,
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        number: parseInt(formData.number) || null,
        document_cpf: formData.cpf,
        document_rg: formData.rg,
        photo_url: photoUrl,
        email: formData.email,
        whatsapp: formData.whatsapp,
        address_json: formData.address,
        sizes_json: formData.sizes,
        documents_json: allDocuments,
        modality_id: formData.modality_id || null,
        category_id: formData.category_id || null,
        position_id: formData.position_id || null,
        dominant_foot: formData.dominant_foot,
        position: positions.find(p => p.id === formData.position_id)?.name || formData.position, // Fallback for backward compatibility
        status: athlete?.status || 'Ativo'
      };

      if (athlete?.id) {
        const { error: updateError } = await supabase!
          .from('athletes')
          .update(athleteData)
          .eq('id', athlete.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase!
          .from('athletes')
          .insert([athleteData]);
        if (insertError) throw insertError;
      }

      showToast(athlete?.id ? 'Atleta atualizado com sucesso!' : 'Atleta cadastrado com sucesso!', 'success');
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving athlete:', err);
      showToast('Erro ao salvar atleta: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden transition-all group-hover:border-primary group-hover:scale-105 duration-300 shadow-inner">
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <User size={40} className="text-[var(--text-muted)]" />
                  )}
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]">
                    <Upload size={20} className="text-white mb-1" />
                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">Alterar Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                  </label>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary text-black p-2 rounded-xl shadow-lg border-4 border-[var(--surface)]">
                  <Upload size={14} strokeWidth={3} />
                </div>
              </div>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase mt-4 tracking-[0.2em]">Foto de Identificação</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <User size={12} className="text-primary" /> Nome Completo
                </label>
                <input name="full_name" value={formData.full_name} onChange={handleInputChange} className="input-field" placeholder="Ex: Roberto Carlos da Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data de Nascimento</label>
                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sexo / Gênero</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="input-field">
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <FileText size={12} className="text-primary" /> CPF
                </label>
                <div className="relative">
                  <input name="cpf" value={formData.cpf} onChange={handleInputChange} className="input-field pl-10" placeholder="000.000.000-00" />
                  <IdCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Fingerprint size={12} className="text-primary" /> RG
                </label>
                <div className="relative">
                  <input name="rg" value={formData.rg} onChange={handleInputChange} className="input-field pl-10" placeholder="00.000.000-0" />
                  <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Smartphone size={12} className="text-primary" /> WhatsApp
                </label>
                <div className="relative">
                  <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="input-field pl-10" placeholder="(00) 00000-0000" />
                  <Smartphone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-50" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                  <Mail size={12} className="text-primary" /> Email de Contato
                </label>
                <div className="relative">
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-field pl-10" placeholder="atleta@exemplo.com" />
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-50" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <MapPin size={12} className="text-primary" /> CEP
                  </label>
                  <input name="address.zip" value={formData.address.zip} onChange={handleInputChange} className="input-field" placeholder="00000-000" />
                </div>
                <div className="md:col-span-8 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Rua / Logradouro</label>
                  <input name="address.street" value={formData.address.street} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Número</label>
                  <input name="address.number" value={formData.address.number} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="md:col-span-9 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Complemento / Ref.</label>
                  <input name="address.complement" value={formData.address.complement} onChange={handleInputChange} className="input-field" placeholder="Apto, Bloco..." />
                </div>
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Bairro</label>
                  <input name="address.neighborhood" value={formData.address.neighborhood} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="md:col-span-5 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cidade</label>
                  <input name="address.city" value={formData.address.city} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">UF</label>
                  <input name="address.state" value={formData.address.state} onChange={handleInputChange} className="input-field" maxLength={2} />
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nome de Jogador (Apelido)</label>
                <input name="nickname" value={formData.nickname} onChange={handleInputChange} className="input-field" placeholder="Como o atleta é chamado em campo" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Modalidade</label>
                <select name="modality_id" value={formData.modality_id} onChange={handleInputChange} className="input-field">
                  <option value="">Selecione</option>
                  {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Categoria</label>
                <select name="category_id" value={formData.category_id} onChange={handleInputChange} className="input-field" disabled={!formData.modality_id}>
                  <option value="">Selecione</option>
                  {categories.filter(c => c.modality_id === formData.modality_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Posição Principal</label>
                <select name="position_id" value={formData.position_id} onChange={handleInputChange} className="input-field" disabled={!formData.modality_id}>
                  <option value="">Selecione</option>
                  {positions.filter(p => p.modality_id === formData.modality_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Shirt size={12} className="text-primary" /> N° Camisa
                  </label>
                  <input type="number" name="number" value={formData.number} onChange={handleInputChange} className="input-field" placeholder="00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    <Zap size={12} className="text-primary" /> Pé Dominante
                  </label>
                  <div className="flex gap-2 p-1 bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl">
                    {['Destro', 'Canhoto', 'Ambidestro'].map((foot) => (
                      <button
                        key={foot}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, dominant_foot: foot }))}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                          formData.dominant_foot === foot 
                            ? "bg-primary text-black shadow-lg" 
                            : "text-[var(--text-muted)] hover:text-[var(--text)]"
                        )}
                      >
                        {foot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center py-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-2 shadow-inner">
                <Shirt size={32} />
              </div>
              <h3 className="text-xs font-black uppercase text-[var(--text)]">Guia de Tamanhos</h3>
              <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Confira as medidas oficiais do clube</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-3 p-4 bg-[var(--surface-soft)] rounded-3xl border border-[var(--border)] group hover:border-primary/50 transition-all">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block text-center">Camisa</label>
                <select name="sizes.shirt" value={formData.sizes.shirt} onChange={handleInputChange} className="input-field !text-center !text-base">
                  <option value="">-</option>
                  {['2', '4', '6', '8', '10', '12', '14', '16', 'PP', 'P', 'M', 'G', 'GG', 'XG'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-3 p-4 bg-[var(--surface-soft)] rounded-3xl border border-[var(--border)] group hover:border-primary/50 transition-all">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block text-center">Calção</label>
                <select name="sizes.short" value={formData.sizes.short} onChange={handleInputChange} className="input-field !text-center !text-base">
                  <option value="">-</option>
                  {['2', '4', '6', '8', '10', '12', '14', '16', 'P', 'M', 'G', 'GG'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-3 p-4 bg-[var(--surface-soft)] rounded-3xl border border-[var(--border)] group hover:border-primary/50 transition-all">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block text-center">Meião</label>
                <input name="sizes.socks" value={formData.sizes.socks} onChange={handleInputChange} className="input-field !text-center !text-base" placeholder="38-40" />
              </div>
              <div className="space-y-3 p-4 bg-[var(--surface-soft)] rounded-3xl border border-[var(--border)] group hover:border-primary/50 transition-all">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] block text-center">Chuteira</label>
                <input name="sizes.boots" value={formData.sizes.boots} onChange={handleInputChange} className="input-field !text-center !text-base" placeholder="41" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <FilePlus size={20} />
                </div>
                <div>
                  <h3 className="text-[11px] font-black uppercase text-[var(--text)]">Repositório de Documentos</h3>
                  <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Anexe PDFs de contratos, RG ou laudos</p>
                </div>
              </div>
              <label className="px-4 py-2 bg-primary text-black rounded-xl text-[10px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
                Adicionar PDF
                <input type="file" className="hidden" accept="application/pdf" onChange={handleAddDocument} />
              </label>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-[250px] overflow-y-auto pr-2 no-scrollbar">
              {/* Existing Documents */}
              {existingDocs.map((doc, i) => (
                <div key={`existing-${i}`} className="flex items-center gap-3 p-4 bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl group hover:border-primary/30 transition-all">
                  <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={doc.name} 
                      onChange={(e) => {
                        const newDocs = [...existingDocs];
                        newDocs[i].name = e.target.value;
                        setExistingDocs(newDocs);
                      }}
                      className="bg-transparent border-none p-0 text-[12px] font-bold text-[var(--text)] focus:ring-0 w-full"
                    />
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Documento salvo</p>
                  </div>
                  <button onClick={() => setExistingDocs(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {/* New Documents */}
              {documents.map((doc, i) => (
                <div key={`new-${i}`} className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl group animate-in slide-in-from-top-2">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                    <Upload size={18} />
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={doc.name} 
                      disabled={doc.uploading}
                      onChange={(e) => {
                        const newDocs = [...documents];
                        newDocs[i].name = e.target.value;
                        setDocuments(newDocs);
                      }}
                      className="bg-transparent border-none p-0 text-[12px] font-bold text-[var(--text)] focus:ring-0 w-full"
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.uploading ? (
                        <span className="text-[8px] font-bold text-primary uppercase animate-pulse flex items-center gap-1">
                          <Loader2 size={10} className="animate-spin" /> Processando...
                        </span>
                      ) : (
                        <span className="text-[8px] font-bold text-primary uppercase flex items-center gap-1">
                          <Check size={10} /> Pronto para salvar
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => removeDocument(i)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {existingDocs.length === 0 && documents.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-[var(--border)] rounded-[32px] bg-[var(--surface-soft)]/50">
                  <FileText size={32} className="text-[var(--text-muted)]/30 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhum anexo encontrado</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[var(--surface)] rounded-[40px] overflow-hidden shadow-[0_0_50px_-12px_rgba(163,230,53,0.3)] border border-white/5">
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-xl shadow-primary/20 rotate-3">
              <div className="-rotate-3">
                {step === 1 && <User size={28} className="text-black" />}
                {step === 2 && <MapPin size={28} className="text-black" />}
                {step === 3 && <User size={28} className="text-black" />}
                {step === 4 && <Shirt size={28} className="text-black" />}
                {step === 5 && <FileText size={28} className="text-black" />}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">
                  Sistema de Gestão
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-[var(--text)] leading-none">
                {step === 1 && "Dados Pessoais"}
                {step === 2 && "Contato e Endereço"}
                {step === 3 && "Dados de Jogador"}
                {step === 4 && "Tamanhos de Uniforme"}
                {step === 5 && "Documentos e Anexos"}
              </h2>
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mt-1">
                Etapa <span className="text-primary">{step}</span> de 5
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface-soft)] text-[var(--text-muted)] hover:text-white hover:bg-red-500/20 hover:scale-110 transition-all duration-300">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 flex gap-1.5 mt-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-primary shadow-[0_0_10px_rgba(163,230,53,0.5)]" : "bg-[var(--surface-soft)]"
              )} 
            />
          ))}
        </div>

        {/* Form Body */}
        <div className="p-8 pt-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 flex items-center justify-between gap-4">
          <button 
            onClick={prevStep} 
            disabled={step === 1 || loading}
            className={cn(
              "group flex items-center gap-2 px-6 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
              step === 1 ? "opacity-0 invisible pointer-events-none" : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-soft)]"
            )}
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Anterior
          </button>

          <button 
            onClick={step === 5 ? handleSubmit : nextStep} 
            disabled={loading}
            className="flex-1 max-w-[240px] flex items-center gap-3 px-8 py-4 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processando...
              </>
            ) : step === 5 ? (
              <>
                {athlete ? 'Atualizar Perfil' : 'Finalizar Cadastro'}
                <Check size={18} strokeWidth={3} />
              </>
            ) : (
              <>
                Próximo Passo
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .input-field {
          width: 100%;
          background-color: var(--surface-soft);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        .input-field::placeholder {
          color: var(--text-muted);
          opacity: 0.4;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--primary);
          background-color: var(--surface);
          box-shadow: 0 0 0 4px rgba(163, 230, 53, 0.1), inset 0 2px 4px rgba(0,0,0,0.02);
          transform: translateY(-1px);
        }
        .input-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        select.input-field {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 12px;
          padding-right: 40px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
