import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Upload, Check, Loader2, Globe, ExternalLink,
  Copy, CheckCircle2, XCircle, AlertCircle, ChevronDown,
  ArrowRight, Zap, RefreshCw, Info, Shield, Clock,
  Plus, QrCode, Moon, Sun
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';

// DNS record that users need to add
const CNAME_TARGET = 'cname.timespro.com.br';
const PLATFORM_DOMAIN = 'timespro.com.br';

const DNS_PROVIDERS = [
  {
    name: 'Registro.br', icon: '🇧🇷',
    url: 'https://registro.br/',
    steps: [
      'Acesse registro.br e clique em "Acessar Conta"',
      'Selecione seu domínio e vá em "Configurar Endereçamento"',
      'Clique em "Modificar DNS" e depois em "Nova Entrada"',
      'Adicione os registros CNAME conforme a tabela abaixo'
    ]
  },
  {
    name: 'Cloudflare', icon: '🟠',
    url: 'https://dash.cloudflare.com/',
    steps: [
      'Faça login no painel da Cloudflare',
      'Selecione seu domínio e clique na aba "DNS" > "Records"',
      'Clique em "Add record" e selecione o tipo "CNAME"',
      'Desative o "Proxy" (nuvem laranja) para que o SSL funcione corretamente'
    ]
  },
  {
    name: 'GoDaddy', icon: '🌐',
    url: 'https://dcc.godaddy.com/manage/portfolio',
    steps: [
      'Acesse seu Portfólio de Domínios na GoDaddy',
      'Selecione o domínio e clique em "DNS" > "Gerenciar Registros"',
      'Clique em "Adicionar" e escolha o tipo "CNAME"',
      'Preencha o Nome e o Valor (Target) indicados ao lado'
    ]
  },
  {
    name: 'Hostinger', icon: '⚡',
    url: 'https://hpanel.hostinger.com',
    steps: [
      'Acesse o hPanel da Hostinger e vá em "Domínios"',
      'Clique em "Gerenciar" > "DNS / Nameservers"',
      'Aba "Registros DNS" > clique em "Adicionar Registro"',
      'Tipo: CNAME, Host: www, Aponta para: cname.timespro.com.br'
    ]
  }
];

type DomainStatus = 'idle' | 'checking' | 'connected' | 'pending' | 'error';

export default function MyTeam() {
  const { organization, refreshOrg } = useOrg();
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>('idle');
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'geral' | 'dominio' | 'app' | 'site'>('geral');
  const [isPreviewDarkMode, setIsPreviewDarkMode] = useState(false);

  // App Settings States
  const [primaryColor, setPrimaryColor] = useState('#a3e635');
  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState<File | null>(null);
  const [appIconPreview, setAppIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setLogoPreview(organization.logo_url);
      setSlug(organization.slug || '');
      const savedDomain = organization.settings?.custom_domain || '';
      setCustomDomain(savedDomain);
      
      // Load app settings
      const appSettings = organization.settings?.app_settings || {};
      setPrimaryColor(appSettings.primary_color || '#a3e635');
      setAppName(appSettings.app_name || organization.name);
      setAppIconPreview(appSettings.app_icon_url || organization.logo_url);

      if (savedDomain) {
        setShowDomainSetup(true);
        setDomainStatus('pending');
      }
    }
  }, [organization]);

  const handleAppIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAppIcon(file);
      setAppIconPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const checkDomainStatus = useCallback(async () => {
    if (!customDomain) return;
    setDomainStatus('checking');
    // Simulate DNS check (in production, call a backend endpoint)
    await new Promise(r => setTimeout(r, 2000));
    // For demo: if domain contains 'timespro', treat as connected
    if (customDomain.includes('timespro') || customDomain.includes('localhost')) {
      setDomainStatus('connected');
    } else {
      setDomainStatus('pending');
    }
  }, [customDomain]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !supabase) return;

    setLoading(true);
    try {
      let logoUrl = organization.logo_url;

      if (logo) {
        const fileExt = logo.name.split('.').pop();
        const fileName = `escudos/${organization.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('escudos')
          .upload(fileName, logo);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('escudos').getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      let appIconUrl = organization.settings?.app_settings?.app_icon_url || logoUrl;
      if (appIcon) {
        const fileExt = appIcon.name.split('.').pop();
        const fileName = `app_icons/${organization.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('escudos')
          .upload(fileName, appIcon);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('escudos').getPublicUrl(fileName);
        appIconUrl = publicUrl;
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          name,
          logo_url: logoUrl,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          settings: {
            ...organization.settings,
            custom_domain: customDomain.toLowerCase().trim(),
            app_settings: {
              primary_color: primaryColor,
              app_name: appName,
              app_icon_url: appIconUrl
            }
          }
        })
        .eq('id', organization.id);

      if (updateError) throw updateError;

      await refreshOrg();
      setSaveSuccess(true);
      setLogo(null);
      if (customDomain) {
        setDomainStatus('pending');
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      alert(`Erro ao salvar: ${err.message || 'Verifique sua conexão'}`);
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    idle: { icon: Globe, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--surface-soft)]', label: 'Não configurado' },
    checking: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Verificando...' },
    connected: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Conectado ✓' },
    pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Aguardando DNS' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Erro de conexão' },
  };

  const StatusIcon = statusConfig[domainStatus].icon;
  const provider = DNS_PROVIDERS[selectedProvider];

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-[var(--text)] uppercase italic leading-none">
            Meu <span className="text-primary">Time</span>
          </h1>
          <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-2">
            Identidade, domínio e personalização do clube
          </p>
        </div>

        <div className="flex bg-[var(--surface-soft)] p-1 rounded-2xl border border-[var(--border)]">
          {[
            { id: 'geral', label: 'Geral', icon: Trophy },
            { id: 'dominio', label: 'Domínio', icon: Globe },
            { id: 'app', label: 'Aplicativo', icon: Zap },
            { id: 'site', label: 'Site', icon: Globe }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-white dark:bg-zinc-800 text-primary shadow-sm" 
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(
        "flex flex-col gap-8 transition-all duration-500",
        (activeTab === 'app' || activeTab === 'site') ? "lg:grid lg:grid-cols-12 max-w-6xl" : "max-w-3xl mx-auto"
      )}>
        <div className={cn("space-y-6", (activeTab === 'app' || activeTab === 'site') ? "lg:col-span-7" : "w-full")}>
          <form onSubmit={handleSave} className="space-y-6">
            {activeTab === 'geral' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl"><Trophy size={18} /></div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text)]">Identidade do Clube</span>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 rounded-3xl bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                        {logoPreview ? (
                          <img src={logoPreview} className="w-full h-full object-contain p-3" alt="Logo" />
                        ) : (
                          <Trophy size={32} className="text-[var(--text-muted)]" />
                        )}
                        <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-3xl">
                          <Upload size={16} className="text-white mb-1" />
                          <span className="text-[9px] font-black text-white uppercase">Trocar</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome da Organização</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="Ex: Racing Futebol Clube"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Subdomínio Gratuito</label>
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 px-5 py-4 rounded-l-2xl text-xs font-bold border-y border-l border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="meu-clube"
                          />
                          <div className="px-5 py-4 rounded-r-2xl border border-l-0 border-[var(--border)] text-[11px] font-black bg-[var(--surface-soft)] text-[var(--text-muted)] uppercase whitespace-nowrap">
                            .timespro.com.br
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dominio' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] overflow-hidden shadow-sm">
                  <div className="p-8 flex items-center justify-between border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Globe size={22} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase italic text-[var(--text)]">Estrutura de Domínios</h3>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Conecte sua marca ao mundo</p>
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest", statusConfig[domainStatus].bg, statusConfig[domainStatus].color)}>
                      <StatusIcon size={14} className={domainStatus === 'checking' ? 'animate-spin' : ''} />
                      {statusConfig[domainStatus].label}
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                      <Info className="text-primary mt-1" size={20} />
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[var(--text)] uppercase tracking-tight">Por que usar subdomínios?</p>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-medium">
                          Subdomínios organizam sua presença digital e facilitam o acesso direto a cada serviço. 
                          Os sócios acessam o <span className="text-primary font-bold">App</span>, os torcedores a <span className="text-primary font-bold">Bilheteria</span> e os doadores as <span className="text-primary font-bold">Vaquinhas</span>.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: 'Site Principal', sub: 'www', example: `${customDomain || 'seutime.com.br'}` },
                        { label: 'Aplicativo PWA', sub: 'app', example: `app.${customDomain || 'seutime.com.br'}` },
                        { label: 'Bilheteria', sub: 'ingressos', example: `ingressos.${customDomain || 'seutime.com.br'}` },
                        { label: 'Vaquinhas', sub: 'vaquinha', example: `vaquinha.${customDomain || 'seutime.com.br'}` }
                      ].map((item, idx) => (
                        <div key={idx} className="p-5 rounded-[24px] bg-[var(--surface-soft)] border border-[var(--border)] group hover:border-primary/50 transition-all">
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">{item.label}</p>
                          <p className="text-[13px] font-black text-[var(--text)] italic tracking-tight">{item.example}</p>
                          <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Apontar CNAME para</span>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] font-mono text-primary font-bold">{CNAME_TARGET}</code>
                              <button type="button" onClick={() => handleCopy(CNAME_TARGET, `cname-${idx}`)} className="text-[var(--text-muted)] hover:text-primary transition-colors">
                                {copied === `cname-${idx}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Domínio Raiz do Clube</label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={customDomain}
                            onChange={e => {
                              setCustomDomain(e.target.value);
                              setDomainStatus('idle');
                            }}
                            className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm font-bold text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="Ex: seutime.com.br"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDomainSetup(!showDomainSetup)}
                          className="px-8 py-4 bg-primary text-black rounded-2xl hover:scale-105 transition-all text-[11px] font-black uppercase italic tracking-tighter"
                        >
                          Configurar DNS
                        </button>
                      </div>
                    </div>

                    {showDomainSetup && (
                      <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 bg-[var(--surface-soft)]/30 p-6 rounded-[32px] border border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Instruções por provedor</p>
                          <a href={DNS_PROVIDERS[selectedProvider].url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary hover:underline">
                            Ir para o painel <ExternalLink size={12} />
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {DNS_PROVIDERS.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSelectedProvider(i)}
                              className={cn(
                                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                selectedProvider === i
                                  ? "bg-primary text-black border-primary"
                                  : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:border-primary/50"
                              )}
                            >
                              {p.icon} {p.name}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-4 pt-2">
                          {DNS_PROVIDERS[selectedProvider].steps.map((step, i) => (
                            <div key={i} className="flex gap-4 items-start">
                              <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-[11px] font-black shrink-0">{i + 1}</span>
                              <p className="text-xs text-[var(--text)] font-bold leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'app' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <Zap size={22} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase italic text-[var(--text)]">Personalização do Aplicativo</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Transforme o TimesPro no App do seu clube</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Cor Principal do App</label>
                        <div className="flex flex-wrap gap-3">
                          {['#a3e635', '#2563eb', '#dc2626', '#f59e0b', '#7c3aed', '#ec4899', '#06b6d4', '#111113'].map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setPrimaryColor(color)}
                              className={cn(
                                "w-10 h-10 rounded-full border-4 transition-all hover:scale-110",
                                primaryColor === color ? "border-primary" : "border-transparent"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                          <div className="relative">
                            <input 
                              type="color" 
                              value={primaryColor} 
                              onChange={e => setPrimaryColor(e.target.value)}
                              className="w-10 h-10 rounded-full border-none cursor-pointer opacity-0 absolute inset-0"
                            />
                            <div 
                              className="w-10 h-10 rounded-full border-4 border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] bg-[var(--surface-soft)]"
                              style={{ backgroundColor: !['#a3e635', '#2563eb', '#dc2626', '#f59e0b', '#7c3aed', '#ec4899', '#06b6d4', '#111113'].includes(primaryColor) ? primaryColor : undefined }}
                            >
                              <Plus size={20} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Nome do App (Instalação)</label>
                        <input
                          type="text"
                          value={appName}
                          onChange={(e) => setAppName(e.target.value)}
                          className="w-full bg-[var(--surface-soft)] border border-[var(--border)] rounded-2xl p-4 text-sm font-bold text-[var(--text)] focus:border-primary outline-none"
                          placeholder="Ex: Racing FC App"
                        />
                        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] ml-1">Sugestão: app.{customDomain || 'seudominio.com'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] ml-1">Ícone do App (Square)</label>
                      <div className="relative group w-40 h-40">
                        <div className="w-full h-full rounded-[40px] bg-[var(--surface-soft)] border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden transition-all group-hover:border-primary shadow-inner">
                          {appIconPreview ? (
                            <img src={appIconPreview} className="w-full h-full object-cover" alt="App Icon" />
                          ) : (
                            <QrCode size={48} className="text-[var(--text-muted)] opacity-30" />
                          )}
                          <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[40px]">
                            <Upload size={24} className="text-white mb-2" />
                            <span className="text-[10px] font-black text-white uppercase">Upload Ícone</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleAppIconChange} />
                          </label>
                        </div>
                        <p className="text-[8px] text-[var(--text-muted)] font-bold uppercase text-center mt-3 tracking-widest">Recomendado: 512x512px</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PWA Info Panel */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 space-y-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <Clock size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase italic text-[var(--text)] tracking-tight">O que é um App PWA?</h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tecnologia de ponta para seu clube</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <p className="text-[11px] text-[var(--text-muted)] font-medium leading-relaxed">
                        PWA (Progressive Web App) é a evolução dos aplicativos. Ele oferece a experiência de um app nativo, mas roda diretamente no navegador, sem ocupar espaço excessivo e sem depender de lojas.
                      </p>
                      <div className="space-y-2">
                        {[
                          'Funciona Offline',
                          'Notificações Push',
                          'Ícone na tela inicial',
                          'Atualização instantânea'
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-[10px] font-black text-[var(--text)] uppercase tracking-tight">
                            <Check size={14} className="text-primary" strokeWidth={4} />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 rounded-[24px] bg-[var(--surface-soft)] border border-[var(--border)] space-y-5">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">Guia de Instalação</p>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="text-2xl">🍎</div>
                          <div>
                            <p className="text-[10px] font-black text-[var(--text)] uppercase">iOS (iPhone)</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Toque no ícone de "Compartilhar" e selecione "Adicionar à Tela de Início".</p>
                          </div>
                        </div>
                        <div className="flex gap-4 border-t border-[var(--border)] pt-4">
                          <div className="text-2xl">🤖</div>
                          <div>
                            <p className="text-[10px] font-black text-[var(--text)] uppercase">Android / Chrome</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-medium">Clique nos 3 pontos do navegador e selecione "Instalar Aplicativo".</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'site' && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[32px] p-8 space-y-8 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                      <Globe size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase italic text-[var(--text)] tracking-tight">
                        <span className="font-black dark:text-primary">Timespage</span> | Portal Oficial
                      </h3>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Site de alta performance integrado</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                      O <span className="font-black dark:text-primary">Timespage</span> é a ferramenta exclusiva para criação e gestão do portal oficial do seu clube. 
                      Projetado para oferecer a melhor experiência para torcedores e patrocinadores, ele é 100% integrado ao ecossistema TimesPro.
                    </p>

                    <div className="p-6 rounded-[24px] bg-primary/5 border border-primary/10 space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Vantagens do <span className="font-black dark:text-primary">Timespage</span></h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { title: 'SEO de Elite', desc: 'Sua marca no topo do Google.' },
                          { title: 'Velocidade Máxima', desc: 'Tecnologia de carregamento ultra-rápido.' },
                          { title: 'Liberdade Visual', desc: 'Personalize banners, cores e menus.' },
                          { title: 'Sync Automático', desc: 'Dados do TimesPro atualizam o site.' }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-[10px] font-black text-[var(--text)] uppercase">{item.title}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-medium">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (organization?.id) {
                            window.open(`http://localhost:5174/admin?orgId=${organization.id}`, '_blank');
                          }
                        }}
                        className="w-full py-5 bg-primary text-black rounded-2xl text-xs font-black uppercase italic tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
                      >
                        Abrir Timespage Builder
                        <ArrowRight size={16} strokeWidth={3} />
                      </button>
                      <p className="text-center text-[9px] text-[var(--text-muted)] font-bold uppercase mt-4 tracking-widest">
                        Gerencie banners, notícias e campanhas exclusivas do seu site.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab !== 'site') && (
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-10 py-4 bg-primary text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-primary/20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Zap size={16} strokeWidth={3} />}
                  {loading ? 'Processando...' : saveSuccess ? 'Alterações Salvas!' : 'Confirmar Tudo'}
                </button>
              </div>
            )}
          </form>
        </div>

        {activeTab === 'app' && (
          <div className="lg:col-span-5 sticky top-6 self-start animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4 mb-8">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)]">Pré-visualização</p>
                <button 
                  type="button"
                  onClick={() => setIsPreviewDarkMode(!isPreviewDarkMode)}
                  className="p-2 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text)] hover:text-primary transition-colors"
                >
                  {isPreviewDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                </button>
              </div>
              
              <div className="relative group">
                <div className="scale-[0.85] origin-top">
                  {/* iPhone Mockup CSS Frame */}
                  <div className="relative w-[300px] h-[600px] bg-zinc-900 rounded-[55px] border-[12px] border-zinc-800 shadow-2xl overflow-hidden ring-4 ring-zinc-700/50">
                    {/* Screen Content */}
                    <div className={cn(
                      "absolute inset-0 overflow-hidden flex flex-col transition-colors duration-500",
                      isPreviewDarkMode ? "bg-zinc-950" : "bg-white"
                    )}>
                      {/* Status Bar */}
                      <div className="h-10 px-6 pt-2 flex justify-between items-center bg-transparent relative z-20">
                        <span className={cn("text-[11px] font-black", isPreviewDarkMode ? "text-white" : "text-black")}>9:41</span>
                        <div className="flex gap-1.5 items-center">
                          <div className={cn("w-3 h-3 rounded-full", isPreviewDarkMode ? "bg-white" : "bg-black")} />
                        </div>
                      </div>

                      {/* Dynamic App Content */}
                      <div className={cn(
                        "flex-1 overflow-hidden flex flex-col transition-colors duration-500",
                        isPreviewDarkMode ? "bg-zinc-950" : "bg-slate-50"
                      )}>
                        {/* App Header */}
                        <div className="p-6 pb-8 rounded-b-[40px] shadow-lg relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Shield size={100} className="text-white" />
                          </div>
                          <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-2 border border-white/30">
                              {appIconPreview ? (
                                <img src={appIconPreview} className="w-full h-full object-contain" alt="App Icon" />
                              ) : (
                                <div className="w-full h-full bg-white/20 rounded-lg" />
                              )}
                            </div>
                            <div>
                              <p className="text-[9px] text-white/70 font-black uppercase tracking-widest">Bem-vindo ao</p>
                              <h4 className="text-lg font-black text-white italic tracking-tighter truncate w-32">{appName || 'App do Clube'}</h4>
                            </div>
                          </div>
                        </div>

                        {/* App Body Preview */}
                        <div className="p-6 -mt-6 space-y-4 relative z-20">
                          <div className={cn(
                            "p-4 rounded-3xl shadow-md border flex items-center justify-between transition-colors",
                            isPreviewDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                                <Zap size={18} style={{ color: primaryColor }} />
                              </div>
                              <div>
                                <p className={cn("text-[10px] font-black uppercase", isPreviewDarkMode ? "text-zinc-100" : "text-slate-800")}>Próximo Jogo</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Arena Racing • 16:00</p>
                              </div>
                            </div>
                            <ChevronDown size={14} className={cn("-rotate-90", isPreviewDarkMode ? "text-zinc-700" : "text-slate-300")} />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className={cn(
                              "p-4 rounded-3xl shadow-sm border flex flex-col items-center gap-2 transition-colors",
                              isPreviewDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100"
                            )}>
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10` }}>
                                <Trophy size={18} style={{ color: primaryColor }} />
                              </div>
                              <p className={cn("text-[8px] font-black uppercase", isPreviewDarkMode ? "text-zinc-400" : "text-slate-500")}>Tabelas</p>
                            </div>
                            <div className={cn(
                              "p-4 rounded-3xl shadow-sm border flex flex-col items-center gap-2 transition-colors",
                              isPreviewDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100"
                            )}>
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}10` }}>
                                <Globe size={18} style={{ color: primaryColor }} />
                              </div>
                              <p className={cn("text-[8px] font-black uppercase", isPreviewDarkMode ? "text-zinc-400" : "text-slate-500")}>Notícias</p>
                            </div>
                          </div>

                          <div className="py-2">
                            <button className="w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-black/5 flex items-center justify-center gap-2" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                              <Check size={14} strokeWidth={4} />
                              Comprar Ingresso
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-[20px] z-30 flex items-center justify-center gap-3">
                      <div className="w-2.5 h-2.5 bg-zinc-700 rounded-full" />
                      <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'site' && (
          <div className="lg:col-span-5 sticky top-6 self-start animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center pt-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-10">Visualização do Portal</p>
              
              {/* Laptop Mockup */}
              <div className="relative group w-full max-w-[400px]">
                {/* Screen */}
                <div className="relative aspect-[16/10] bg-zinc-900 rounded-t-2xl border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white">
                    <div className="h-6 w-full bg-slate-100 border-b flex items-center px-3 gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 w-2/3 bg-slate-200 rounded-lg animate-pulse" />
                      <div className="h-32 w-full bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-200">
                        <Globe size={40} className="text-slate-300" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-2 w-full bg-slate-100 rounded" />
                        <div className="h-2 w-full bg-slate-100 rounded" />
                        <div className="h-2 w-full bg-slate-100 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Base */}
                <div className="h-3 w-[110%] -ml-[5%] bg-zinc-800 rounded-b-xl relative z-10 shadow-xl" />
                <div className="h-1 w-1/4 mx-auto bg-zinc-700 rounded-b-lg" />
              </div>

              <div className="mt-12 space-y-4 text-center">
                <div className="flex items-center gap-2 justify-center text-emerald-500">
                  <Check size={16} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Dados Sincronizados</span>
                </div>
                <p className="text-[9px] text-[var(--text-muted)] font-bold max-w-[250px] uppercase leading-relaxed">
                  As cores e o escudo definidos na aba "Geral" são aplicados automaticamente ao seu portal.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
