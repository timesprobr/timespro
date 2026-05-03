import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrgContext';
import { Shield, MapPin, Building2, Search, ArrowRight, Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RegisterTeam() {
  const { user } = useAuth();
  const { refreshOrg } = useOrg();
  // Inicialização de estado direto do localStorage para evitar resets
  const getInitialValue = (key: string) => {
    const saved = localStorage.getItem('onboarding_data');
    if (saved) {
      const data = JSON.parse(saved);
      return data[key] || '';
    }
    return '';
  };

  const [name, setName] = useState(() => getInitialValue('name'));
  const [cnpj, setCnpj] = useState(() => getInitialValue('cnpj'));
  const [isValidCnpj, setIsValidCnpj] = useState(() => {
    const val = getInitialValue('cnpj');
    return val && val.replace(/\D/g, '').length === 14;
  });
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  
  // Endereço
  const [cep, setCep] = useState(() => getInitialValue('cep'));
  const [address, setAddress] = useState(() => getInitialValue('address'));
  const [neighborhood, setNeighborhood] = useState(() => getInitialValue('neighborhood'));
  const [city, setCity] = useState(() => getInitialValue('city'));
  const [state, setState] = useState(() => getInitialValue('state'));
  const [searchingCep, setSearchingCep] = useState(false);

  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Persistência local reativa
  React.useEffect(() => {
    const dataToSave = { name, cnpj, cep, address, neighborhood, city, state };
    localStorage.setItem('onboarding_data', JSON.stringify(dataToSave));
  }, [name, cnpj, cep, address, neighborhood, city, state]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const maskCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const maskCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCnpj(e.target.value);
    setCnpj(masked);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const masked = maskCep(e.target.value);
    setCep(masked);
    
    if (value.length === 8) {
      setSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setAddress(data.logradouro);
          setNeighborhood(data.bairro);
          setCity(data.localidade);
          setState(data.uf);
        }
      } catch (err) {
        console.error('Erro ao buscar CEP');
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const verifyCnpj = async () => {
    const pureCnpj = cnpj.replace(/\D/g, '');
    if (pureCnpj.length !== 14) return;
    
    setCheckingCnpj(true);
    setIsValidCnpj(false);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${pureCnpj}`);
      if (response.ok) {
        const data = await response.json();
        setIsValidCnpj(true);
        if (!name) setName(data.razao_social || data.nome_fantasia);
      } else {
        setError('CNPJ não encontrado ou inválido');
      }
    } catch (err) {
      setError('Erro ao validar CNPJ. Tente novamente.');
    } finally {
      setCheckingCnpj(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      let logoUrl = null;

      if (logo) {
        const fileExt = logo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase!.storage
          .from('escudos')
          .upload(filePath, logo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase!.storage
          .from('escudos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }


      // 1. Create/Update Organization
      const { data: org, error: orgError } = await supabase!
        .from('organizations')
        .upsert([{ 
          name, 
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          cnpj: cnpj.replace(/\D/g, ''),
          cep,
          address,
          neighborhood,
          city,
          state,
          logo_url: logoUrl
        }], { onConflict: 'cnpj' })
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create/Update Profile as Owner
      const { error: profileError } = await supabase!
        .from('profiles')
        .upsert([{ 
          id: user.id, 
          organization_id: org.id, 
          full_name: name.split(' ')[0], // Usar o nome do clube ou algo melhor
          role: 'owner' 
        }]);

      if (profileError) throw profileError;

      await refreshOrg();
      localStorage.removeItem('onboarding_data');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar time');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 selection:bg-primary/20">
      <div className="w-full max-w-4xl relative">
        {/* Background glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white font-display">
            Configure seu <span className="text-primary">Time</span>
          </h1>
          <p className="text-dark-text-muted text-sm font-bold uppercase tracking-[0.3em] mt-2 italic">Personalize sua experiência profissional</p>
        </div>

        <div className="bg-dark-surface border border-white/5 p-10 rounded-[40px] shadow-2xl backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <form onSubmit={handleRegister} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: Basic Info & CNPJ */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="text-primary" size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Identificação do Clube</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">CNPJ do Clube</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={cnpj}
                      onChange={handleCnpjChange}
                      onBlur={verifyCnpj}
                      placeholder="00.000.000/0000-00"
                      required
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {checkingCnpj && <Loader2 size={16} className="animate-spin text-primary" />}
                      {isValidCnpj && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">Nome do Clube</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Insira o nome do clube"
                      required
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    {name.length > 3 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-in fade-in zoom-in">
                        <CheckCircle2 size={16} className="text-primary" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload aqui no lugar do slug */}
                <div className="space-y-4 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">Logomarca do Clube</label>
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-all">
                      {logoPreview ? (
                        <>
                          <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus size={20} className="text-white" />
                          </div>
                        </>
                      ) : (
                        <Plus size={20} className="text-dark-text-muted group-hover:text-primary transition-colors" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <p className="text-[10px] text-dark-text-muted font-bold leading-relaxed">
                        PNG ou SVG transparente.<br/>Máx: 2MB.
                      </p>
                      {logo && <CheckCircle2 size={20} className="text-primary animate-in fade-in scale-in" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Address */}
            <div className="space-y-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MapPin className="text-primary" size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Localização</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">CEP</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={cep}
                      onChange={handleCepChange}
                      placeholder="00000-000"
                      maxLength={9}
                      required
                      className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      {searchingCep && <Loader2 size={16} className="animate-spin text-primary" />}
                      {address && <CheckCircle2 size={16} className="text-primary animate-in fade-in zoom-in" />}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">Rua / Logradouro</label>
                  <input 
                    type="text" 
                    value={address}
                    readOnly
                    className="w-full bg-white/[0.01] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">Bairro</label>
                  <input 
                    type="text" 
                    value={neighborhood}
                    readOnly
                    className="w-full bg-white/[0.01] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-dark-text-muted ml-1">Estado</label>
                  <input 
                    type="text" 
                    value={state}
                    readOnly
                    className="w-full bg-white/[0.01] border border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Footer: Button */}
            <div className="lg:col-span-2 pt-6 border-t border-white/5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-xs font-bold text-center mb-6 animate-shake">
                  {error}
                </div>
              )}

              <button 
                disabled={loading || !isValidCnpj || !name || !logo || !address}
                className="w-full bg-primary text-dark-bg py-5 rounded-[20px] text-sm font-black uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98] disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3 group/btn"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    Finalizar Configuração Profissional
                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

