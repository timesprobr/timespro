import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Trophy, 
  Target, 
  Activity, 
  Zap, 
  Share2, 
  ShieldAlert, 
  Dumbbell,
  Shield,
  Star,
  Download,
  Instagram,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { toPng } from 'html-to-image';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface Athlete {
  id: string;
  full_name: string;
  nickname: string;
  position: string;
  number: number;
  photo_url: string | null;
  organization_id: string;
  modality?: { name: string };
  category?: { name: string };
}

interface Organization {
  name: string;
  logo_url: string | null;
}

export default function PublicPerformance() {
  const { id } = useParams();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [shareImage, setShareImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [athletePhotoBase64, setAthletePhotoBase64] = useState<string | null>(null);
  const [clubLogoBase64, setClubLogoBase64] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAthlete = async () => {
      try {
        const { data, error } = await supabase!
          .from('athletes')
          .select('*, modality:athlete_modalities(name), category:athlete_categories(name)')
          .eq('id', id)
          .single();

        if (data) {
          setAthlete(data);
          
          // Pre-fetch images and convert to Base64 to bypass CORS
          if (data.photo_url) {
            try {
              const res = await fetch(data.photo_url);
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onloadend = () => setAthletePhotoBase64(reader.result as string);
              reader.readAsDataURL(blob);
            } catch (e) { console.error("Error pre-fetching photo", e); }
          }

          const { data: orgData } = await supabase!
            .from('organizations')
            .select('name, logo_url')
            .eq('id', data.organization_id)
            .single();
          
          if (orgData) {
            setOrg(orgData);
            if (orgData.logo_url) {
              try {
                const res = await fetch(orgData.logo_url);
                const blob = await res.blob();
                const reader = new FileReader();
                reader.onloadend = () => setClubLogoBase64(reader.result as string);
                reader.readAsDataURL(blob);
              } catch (e) { console.error("Error pre-fetching logo", e); }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching athlete:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAthlete();
  }, [id]);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      // Pequeno delay para garantir renderização final
      await new Promise(resolve => setTimeout(resolve, 300));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2, // 2x para bom equilíbrio entre qualidade e tamanho de arquivo no share
      });

      setShareImage(dataUrl);
      setShowPreview(true);
    } catch (err) {
      console.error('Error generating image:', err);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setDownloading(false);
    }
  };

  const executeNativeShare = async () => {
    if (!shareImage) return;

    try {
      const response = await fetch(shareImage);
      const blob = await response.blob();
      const file = new File([blob], `performance-${athlete?.nickname || 'atleta'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'TimesPro Performance',
          text: `Confira a performance de ${athlete?.full_name} no TimesPro!`,
          files: [file],
        });
      } else {
        // Fallback para download se não puder compartilhar arquivos
        const link = document.createElement('a');
        link.download = `performance-${athlete?.nickname || 'atleta'}.png`;
        link.href = shareImage;
        link.click();
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback final
      const link = document.createElement('a');
      link.download = `performance-${athlete?.nickname || 'atleta'}.png`;
      link.href = shareImage;
      link.click();
    }
  };

  const handleDownload = async () => {
    if (!shareImage) return;
    const link = document.createElement('a');
    link.download = `performance-${athlete?.nickname || 'atleta'}.png`;
    link.href = shareImage;
    link.click();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] gap-4">
      <div className="w-12 h-12 border-4 border-[#ADFF00] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Carregando Relatório...</p>
    </div>
  );

  if (!athlete) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] p-6 text-center">
      <ShieldAlert size={48} className="text-rose-500 mb-4" />
      <h1 className="text-xl font-black text-white uppercase italic">Relatório não encontrado</h1>
      <p className="text-zinc-500 text-sm mt-2">O link pode ter expirado ou o atleta não está mais ativo.</p>
    </div>
  );

  const initials = athlete.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-20 font-sans selection:bg-[#ADFF00] selection:text-black">
      {/* Top Bar Branding */}
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ADFF00] rounded-lg flex items-center justify-center">
            <Trophy size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-[10px] font-black uppercase tracking-widest leading-none">TimesPro</h1>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Performance Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all disabled:opacity-50"
            title="Baixar Imagem"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-[#ADFF00] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={18} />
            )}
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* FIFA Style Card Section */}
        <div className="relative group perspective-1000" ref={cardRef}>
          <div className="absolute -inset-4 bg-[#ADFF00]/5 rounded-[40px] blur-3xl opacity-30" />
          
          <div className="relative bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
            {/* Gradiente Superior para Legibilidade */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-10" />

            <div className="absolute top-6 left-6 z-20">
              <div className="relative">
                <span className="text-7xl font-black italic text-transparent select-none tracking-tighter" style={{ WebkitTextStroke: '2px #ADFF00' }}>
                  #{athlete.number || '00'}
                </span>
                <div className="absolute top-0 left-0">
                  <span className="text-7xl font-black italic text-[#ADFF00]/20 select-none tracking-tighter">
                    #{athlete.number || '00'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="absolute top-6 right-6 z-20">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-[#ADFF00] uppercase tracking-[0.2em] mb-1">Overall</span>
                <span className="text-4xl font-black italic text-white leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">84</span>
              </div>
            </div>

            {/* Photo Area */}
            <div className="aspect-[9/16] relative">
              {athletePhotoBase64 ? (
                <img 
                  src={athletePhotoBase64} 
                  className="w-full h-full object-cover" 
                  alt={athlete.full_name} 
                />
              ) : athlete.photo_url ? (
                 <img src={athlete.photo_url} className="w-full h-full object-cover opacity-50 blur-sm" alt="Loading..." />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-6xl font-black text-zinc-800">{initials}</div>
              )}
              
              {/* Overlay Gradiente Profissional */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/20 to-transparent" />
              
              {/* Info Inferior no Card */}
              <div className="absolute bottom-6 left-0 right-0 text-center px-6">
                {/* Escudo acima da posição - Sem fundo quadrado */}
                <div className="mb-4 flex justify-center">
                  <div className="w-14 h-14 flex items-center justify-center drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {clubLogoBase64 ? (
                      <img 
                        src={clubLogoBase64} 
                        className="w-full h-full object-contain" 
                        alt="Escudo" 
                      />
                    ) : org?.logo_url ? (
                      <img src={org.logo_url} className="w-full h-full object-contain opacity-50" alt="Escudo" />
                    ) : (
                      <Shield size={32} className="text-[#ADFF00]/60" />
                    )}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#ADFF00] text-black rounded-full mb-4 transform -skew-x-12 shadow-xl shadow-[#ADFF00]/30">
                   <Star size={12} fill="currentColor" />
                   <span className="text-[10px] font-black uppercase tracking-widest italic">{athlete.position || 'Player'}</span>
                </div>
                
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white leading-none drop-shadow-2xl mb-2">
                  {athlete.nickname || athlete.full_name.split(' ')[0]}
                </h2>
                
                <p className="text-[10px] font-black text-[#ADFF00] uppercase tracking-[0.4em] drop-shadow-lg mb-6">
                  {org?.name || 'Clube'}
                </p>

                {/* Notas abaixo do nome do clube - Aumentadas */}
                <div className="grid grid-cols-6 gap-2 py-4 border-t border-white/10 backdrop-blur-md bg-black/40 rounded-2xl mx-2">
                  {[
                    { l: 'RIT', v: 85 },
                    { l: 'FIN', v: 78 },
                    { l: 'PAS', v: 82 },
                    { l: 'DRI', v: 88 },
                    { l: 'DEF', v: 45 },
                    { l: 'FIS', v: 72 }
                  ].map(s => (
                    <div key={s.l} className="text-center">
                      <p className="text-[9px] font-black text-zinc-500 mb-1">{s.l}</p>
                      <p className="text-sm font-black text-[#ADFF00] italic">{s.v}</p>
                    </div>
                  ))}
                </div>

                {/* Rodapé Publicitário do Card */}
                <div className="mt-4 pt-3 border-t border-white/5 flex flex-col items-center gap-1">
                   <div className="flex items-center gap-1.5 opacity-80">
                      <div className="w-3.5 h-3.5 bg-[#ADFF00] rounded flex items-center justify-center">
                         <Trophy size={8} className="text-black" />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white">Times Pro</span>
                      <span className="text-zinc-700 text-[8px]">|</span>
                      <span className="text-[8px] font-bold text-zinc-400">www.timespro.com.br</span>
                   </div>
                   <p className="text-[6px] font-black uppercase tracking-[0.2em] text-[#ADFF00]">
                     Gestão Profissional & Performance de Elite
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chamada para Compartilhamento Estilo Spotify - Movida para baixo do card */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white italic">Compartilhe sua Evolução</h2>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Gere o card oficial para seus Stories</p>
          </div>
          
          <div className="flex items-center gap-3 w-full">
            <button 
              onClick={handleShare}
              disabled={downloading}
              className="flex-1 bg-gradient-to-r from-[#ADFF00] to-[#8ed300] text-black h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-[0_10px_30px_rgba(173,255,0,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  GERANDO ARTE...
                </>
              ) : (
                <>
                  <Instagram size={20} />
                  Postar nos Stories
                </>
              )}
            </button>
            
            <button 
              onClick={handleShare}
              disabled={downloading}
              className="w-14 h-14 bg-white/5 border border-white/10 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all hover:bg-white/10"
              title="Compartilhar"
            >
              <Share2 size={24} />
            </button>
          </div>
        </div>

        {/* Radar de Atributos */}
        <div className="bg-[#111] border border-white/5 rounded-[32px] p-6 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 italic flex items-center gap-2">
            <Activity size={14} className="text-[#ADFF00]" />
            Análise de Atributos
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                { subject: 'RIT', A: 85 },
                { subject: 'FIN', A: 78 },
                { subject: 'PAS', A: 82 },
                { subject: 'DRI', A: 88 },
                { subject: 'DEF', A: 45 },
                { subject: 'FIS', A: 72 },
              ]}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: '900' }} />
                <Radar name="Habilidades" dataKey="A" stroke="#ADFF00" fill="#ADFF00" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <div className="bg-[#111] border border-white/5 rounded-[32px] p-6 shadow-xl">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6 italic flex items-center gap-2">
            <Activity size={14} className="text-[#ADFF00]" />
            Evolução Mensal
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { name: 'Jan', val: 78 },
                { name: 'Fev', val: 80 },
                { name: 'Mar', val: 81 },
                { name: 'Abr', val: 82 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontWeight: '900' }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="val" 
                  stroke="#ADFF00" 
                  strokeWidth={4} 
                  dot={{ fill: '#ADFF00', strokeWidth: 2, r: 4 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Relatório em Texto para Pais/Atletas */}
        <div className="bg-[#111] border border-white/5 rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#ADFF00]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#ADFF00]/10 transition-colors" />
           
           <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#ADFF00]/10 rounded-xl flex items-center justify-center">
                  <Star size={20} className="text-[#ADFF00]" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Parecer Técnico</h3>
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">Análise do Desempenho</p>
                </div>
              </div>

              <div className="space-y-4 text-zinc-400 text-sm leading-relaxed font-medium">
                <p>
                  O atleta <span className="text-white font-bold">{athlete.nickname || athlete.full_name.split(' ')[0]}</span> tem demonstrado uma evolução técnica notável nos últimos ciclos de treinamento. Sua capacidade de drible (DRI) e visão de jogo têm sido diferenciais competitivos fundamentais para a equipe.
                </p>
                <p>
                  Identificamos um salto significativo na <span className="text-[#ADFF00]">intensidade física (FIS)</span>, fruto da dedicação extra nas sessões de condicionamento. Para os próximos meses, o foco será o refinamento da finalização sob pressão e o posicionamento defensivo.
                </p>
                <div className="pt-4 border-t border-white/5">
                   <p className="text-[10px] italic text-zinc-500">
                     "Atleta com perfil de liderança técnica. Demonstra disciplina tática e excelente recepção aos feedbacks dos treinadores."
                   </p>
                </div>
              </div>
           </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4 pt-4">
          <p className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em]">
            Gerado por TimesPro • Gestão de Elite
          </p>
          <div className="w-12 h-1 bg-white/10 mx-auto rounded-full" />
        </div>
      </div>
      {/* Modal de Preview de Compartilhamento */}
      {showPreview && shareImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#111] rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Preview do Card</h3>
              <button onClick={() => setShowPreview(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
              <img src={shareImage} className="max-w-full rounded-2xl shadow-2xl border border-white/5" alt="Preview" />
            </div>

            <div className="p-6 bg-black/60 border-t border-white/10 space-y-3">
              <button 
                onClick={executeNativeShare}
                className="w-full bg-[#ADFF00] text-black h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(173,255,0,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Share2 size={18} />
                Compartilhar Agora
              </button>
              
              <button 
                onClick={handleDownload}
                className="w-full bg-white/5 text-white h-12 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Download size={14} />
                Apenas Baixar Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
