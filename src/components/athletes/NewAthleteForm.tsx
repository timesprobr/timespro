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
  Trash2
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
    }
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
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                  {photoPreview ? (
                    <img src={photoPreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <User size={32} className="text-[var(--text-muted)]" />
                  )}
                  <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Upload size={16} className="text-white mb-1" />
                    <span className="text-[8px] font-black text-white uppercase">Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                  </label>
                </div>
              </div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-2">Foto do Atleta</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nome Completo</label>
                <input name="full_name" value={formData.full_name} onChange={handleInputChange} className="input-field" placeholder="Ex: Roberto Silva" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Nome de Jogador (Apelido)</label>
                <input name="nickname" value={formData.nickname} onChange={handleInputChange} className="input-field" placeholder="Ex: Betinho" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Data de Nascimento</label>
                <input type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="input-field" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Modalidade</label>
                  <select 
                    name="modality_id" 
                    value={formData.modality_id} 
                    onChange={handleInputChange} 
                    className="input-field"
                    required
                  >
                    <option value="">Selecione</option>
                    {modalities.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Categoria</label>
                  <select 
                    name="category_id" 
                    value={formData.category_id} 
                    onChange={handleInputChange} 
                    className="input-field"
                    disabled={!formData.modality_id}
                    required
                  >
                    <option value="">Selecione</option>
                    {categories
                      .filter(c => c.modality_id === formData.modality_id)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Posição</label>
                  <select 
                    name="position_id" 
                    value={formData.position_id} 
                    onChange={handleInputChange} 
                    className="input-field"
                    disabled={!formData.modality_id}
                    required
                  >
                    <option value="">Selecione</option>
                    {positions
                      .filter(p => p.modality_id === formData.modality_id)
                      .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">N° Camisa</label>
                  <input type="number" name="number" value={formData.number} onChange={handleInputChange} className="input-field" placeholder="00" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Sexo</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="input-field" required>
                    <option value="">Selecione</option>
                    <option value="Homem">Homem</option>
                    <option value="Mulher">Mulher</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">WhatsApp</label>
                  <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="input-field" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">E-mail de Contato</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="input-field" placeholder="exemplo@email.com" />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">CPF</label>
                <input name="cpf" value={formData.cpf} onChange={handleInputChange} className="input-field" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">RG</label>
                <input name="rg" value={formData.rg} onChange={handleInputChange} className="input-field" placeholder="00.000.000-0" />
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-[10px] font-medium text-primary leading-relaxed uppercase tracking-tight">
                Certifique-se de que os dados de documentação estão corretos para fins de registro oficial em federações.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">CEP</label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Complemento</label>
                <input name="address.complement" value={formData.address.complement} onChange={handleInputChange} className="input-field" />
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
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estado</label>
                <input name="address.state" value={formData.address.state} onChange={handleInputChange} className="input-field" />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Camisa</label>
                <select name="sizes.shirt" value={formData.sizes.shirt} onChange={handleInputChange} className="input-field">
                  <option value="">Sel.</option>
                  {['PP', 'P', 'M', 'G', 'GG', 'XG'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Short</label>
                <select name="sizes.short" value={formData.sizes.short} onChange={handleInputChange} className="input-field">
                  <option value="">Sel.</option>
                  {['P', 'M', 'G', 'GG'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Meião</label>
                <input name="sizes.socks" value={formData.sizes.socks} onChange={handleInputChange} className="input-field" placeholder="Ex: 38-40" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Chuteira</label>
                <input name="sizes.boots" value={formData.sizes.boots} onChange={handleInputChange} className="input-field" placeholder="Ex: 41" />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Documentos do Atleta</label>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase mt-0.5">Gerencie os arquivos PDF anexados</p>
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase cursor-pointer hover:bg-primary/20 transition-all border border-primary/20">
                  <FilePlus size={16} />
                  Anexar Novo PDF
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleAddDocument} />
                </label>
              </div>
              
              <div className="space-y-3">
                {/* Existing Documents */}
                {existingDocs.map((doc, i) => (
                  <div key={`existing-${i}`} className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-white/5 rounded-2xl group">
                    <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] font-black uppercase text-zinc-400 tracking-widest ml-1">Título do Arquivo</label>
                      <input 
                        type="text" 
                        value={doc.name} 
                        onChange={(e) => {
                          const newDocs = [...existingDocs];
                          newDocs[i].name = e.target.value;
                          setExistingDocs(newDocs);
                        }}
                        className="bg-white dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-2 text-[12px] font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary w-full transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => setExistingDocs(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                      title="Remover documento"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {/* New Documents */}
                {documents.map((doc, i) => (
                  <div key={`new-${i}`} className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl group animate-in slide-in-from-top-2">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <Upload size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center pr-2">
                        <label className="text-[8px] font-black uppercase text-primary tracking-widest ml-1">Novo Arquivo</label>
                        {doc.uploading ? (
                          <span className="text-[8px] font-bold text-primary uppercase animate-pulse flex items-center gap-1">
                            <Loader2 size={10} className="animate-spin" />
                            Enviando para o servidor...
                          </span>
                        ) : doc.error ? (
                          <span className="text-[8px] font-bold text-red-500 uppercase flex items-center gap-1">
                            Erro no upload
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-primary uppercase flex items-center gap-1">
                            <Check size={10} />
                            Arquivo pronto
                          </span>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={doc.name} 
                        disabled={doc.uploading}
                        onChange={(e) => {
                          const newDocs = [...documents];
                          newDocs[i].name = e.target.value;
                          setDocuments(newDocs);
                        }}
                        className="bg-white dark:bg-black/20 border border-primary/20 rounded-xl px-4 py-2 text-[12px] font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary w-full transition-all disabled:opacity-50"
                        placeholder="Dê um nome para este documento..."
                      />
                    </div>
                    <button 
                      onClick={() => removeDocument(i)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {existingDocs.length === 0 && documents.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-[var(--border)] rounded-[32px] bg-[var(--surface-soft)]/20">
                    <div className="w-12 h-12 bg-[var(--surface-soft)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Nenhum documento anexado</p>
                    <p className="text-[8px] font-bold text-[var(--text-muted)]/60 uppercase mt-1">Adicione contratos, RG ou laudos médicos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[var(--surface)] rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              {step === 1 && <User size={20} className="text-black" />}
              {step === 2 && <FileText size={20} className="text-black" />}
              {step === 3 && <MapPin size={20} className="text-black" />}
              {step === 4 && <Shirt size={20} className="text-black" />}
              {step === 5 && <FilePlus size={20} className="text-black" />}
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-[var(--text)]">
                {step === 1 && "Dados do Atleta"}
                {step === 2 && "Documentação"}
                {step === 3 && "Endereço"}
                {step === 4 && "Uniformes e Tamanhos"}
                {step === 5 && "Anexos"}
              </h2>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Passo {step} de 5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/50">
          <button 
            onClick={prevStep} 
            disabled={step === 1 || loading}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              step === 1 ? "opacity-0 invisible" : "text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
            )}
          >
            <ChevronLeft size={16} />
            Voltar
          </button>

          <div className="flex gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 1 ? "bg-primary w-4" : "bg-[var(--border)]")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 2 ? "bg-primary w-4" : "bg-[var(--border)]")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 3 ? "bg-primary w-4" : "bg-[var(--border)]")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 4 ? "bg-primary w-4" : "bg-[var(--border)]")} />
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", step === 5 ? "bg-primary w-4" : "bg-[var(--border)]")} />
          </div>

          <button 
            onClick={step === 5 ? handleSubmit : nextStep} 
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 min-w-[140px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {uploadProgress > 0 ? `Enviando ${uploadProgress}%` : 'Salvando...'}
              </>
            ) : step === 5 ? (
              <>
                {athlete ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                <Check size={16} strokeWidth={3} />
              </>
            ) : (
              <>
                Próximo
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .input-field {
          width: 100%;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          transition: all 0.2s;
        }
        .input-field option {
          background-color: var(--surface);
          color: var(--text);
        }
        .input-field:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(163, 230, 53, 0.1);
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
