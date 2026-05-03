import React from 'react';
import { Trophy, Calendar, Users, Target, Shield, ArrowRight, Instagram, Facebook, Twitter } from 'lucide-react';
import { motion } from 'motion/react';
import { mockAthletes, mockMatches } from '../mockData';

const NavLink = ({ children, href }: { children: React.ReactNode, href: string }) => (
  <a href={href} className="text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">{children}</a>
);

export default function PublicSite() {
  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans selection:bg-primary/30 scroll-smooth">
      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Trophy size={20} className="text-dark-bg" />
          </div>
          <span className="text-xl font-black uppercase tracking-tight">TimesPro</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="#" className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Funcionalidades</a>
          <a href="/" className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Painel ADM</a>
          <a href="#" className="text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">Planos</a>
        </div>

        <button className="px-6 py-2.5 bg-primary text-dark-bg rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
          Começar Agora
        </button>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-12 pb-24">
        {/* Background Decorative */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] opacity-20" />
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] opacity-10" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            <span className="text-primary">📱 MOBILE & WEB</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8"
          >
            Deixe que <span className="text-primary italic">nosso time</span> <br />
            <span className="text-accent underline decoration-primary/30">cuide do seu.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto font-medium leading-relaxed mb-12"
          >
            Do site ao sistema completo de gestão. Profissionalize seu clube amador com site moderno, portal de transparência e controle de elenco integrado.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="px-10 py-5 bg-primary text-dark-bg rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-primary/20">
              Criar nosso site grátis
            </button>
            <button className="px-10 py-5 bg-slate-900/50 rounded-full font-black text-sm uppercase tracking-widest border border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group">
              Ver demonstração
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="bg-dark-surface border-y border-dark-border py-12 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:justify-between items-center whitespace-nowrap">
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black italic text-white">12</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">Troféus</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black italic text-primary">150+</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">Gols na Temporada</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black italic text-white">1.2k</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">Sócios Ativos</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-4xl font-black italic text-accent">1998</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none">Ano de Fundação</span>
          </div>
        </div>
      </section>

      {/* Matches Section */}
      <section id="jogos" className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">Calendário</span>
            <h2 className="text-5xl font-black uppercase tracking-tighter mt-2">Próximos Desafios</h2>
          </div>
          <button className="text-slate-500 hover:text-primary transition-colors flex items-center gap-2 font-black uppercase text-[10px] tracking-widest pb-2 border-b border-white/5">
            Tabela Completa <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {mockMatches.map((match) => (
            <div key={match.id} className="bg-dark-surface border border-dark-border rounded-[2rem] p-8 flex items-center justify-between relative overflow-hidden group hover:border-primary/30 transition-all">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 text-slate-400">
                    {match.type}
                  </span>
                  <span className="text-primary text-[10px] font-black uppercase tracking-widest">
                    {new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-2xl font-black group-hover:text-primary transition-colors uppercase tracking-tight">TimesPro FC</span>
                  <span className="text-slate-700 font-black text-lg italic leading-none">VERSUS</span>
                  <span className="text-2xl font-black uppercase tracking-tight text-white">{match.opponent}</span>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Target size={14} className="text-accent" /> {match.location}
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black opacity-5 group-hover:opacity-10 transition-opacity text-white">
                  {match.status === 'Finalizado' ? `${match.home_score} - ${match.away_score}` : '00:00'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Squad Section */}
      <section id="elenco" className="py-24 bg-dark-bg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-black uppercase tracking-[0.3em]">O Elenco</span>
            <h2 className="text-6xl font-black uppercase tracking-tighter mt-2">Nossos Profissionais</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mockAthletes.map(athlete => (
              <div key={athlete.id} className="group">
                <div className="relative aspect-[3/4] bg-dark-surface rounded-[2.5rem] overflow-hidden mb-4 border border-dark-border group-hover:border-primary/50 transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/5">
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/40 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <span className="text-5xl font-black opacity-10 text-white leading-none block mb-2">#{athlete.number || '0'}</span>
                    <h3 className="text-2xl font-black uppercase italic leading-[1] mb-1">{athlete.name}</h3>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest">{athlete.position}</p>
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-slate-900 text-9xl font-black opacity-5 transition-opacity group-hover:opacity-10">
                    {athlete.name.charAt(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sócio Torcedor CTA */}
      <section id="socios" className="py-24 max-w-7xl mx-auto px-6">
        <div className="bg-primary rounded-[4rem] p-12 lg:p-24 relative overflow-hidden flex flex-col lg:flex-row items-center gap-12 group">
          <div className="absolute inset-0 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-[2s]">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,white_0,transparent_100%)]" />
          </div>
          <div className="flex-1 relative z-10 space-y-8 text-center lg:text-left">
            <h2 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-none text-dark-bg">FAÇA PARTE <br /> DA ELITE.</h2>
            <p className="text-dark-bg/70 text-lg max-w-sm font-bold uppercase tracking-tight">Ganhe benefícios exclusivos, acesso prioritário e ajude o seu time a crescer no cenário profissional.</p>
            <button className="px-10 py-5 bg-dark-bg text-white rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
              SEJA SÓCIO AGORA
            </button>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            <div className="p-8 bg-dark-bg/10 backdrop-blur-md rounded-3xl border border-dark-bg/10 space-y-4">
              <Shield className="text-dark-bg" size={40} />
              <h4 className="font-black uppercase italic text-dark-bg">Vantagem 01</h4>
              <p className="text-xs text-dark-bg/60 font-bold uppercase">Descontos em lojas parceiras</p>
            </div>
            <div className="p-8 bg-dark-bg/10 backdrop-blur-md rounded-3xl border border-dark-bg/10 space-y-4 sm:mt-12">
              <Users className="text-dark-bg" size={40} />
              <h4 className="font-black uppercase italic text-dark-bg">Vantagem 02</h4>
              <p className="text-xs text-dark-bg/60 font-bold uppercase">Participação em sorteios mensais</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-bg border-t border-dark-border py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Trophy size={20} className="text-dark-bg" />
              </div>
              <span className="text-2xl font-black uppercase tracking-tight">TimesPro</span>
            </div>
            <p className="text-slate-500 text-base max-w-sm font-medium">Onde o futebol encontra sua verdadeira gestão. Elevando o nível do esporte amador com tecnologia.</p>
            <div className="flex gap-4">
                <button className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center hover:bg-primary hover:text-dark-bg transition-all">
                  <Instagram size={20} />
                </button>
                <button className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center hover:bg-primary hover:text-dark-bg transition-all">
                  <Facebook size={20} />
                </button>
                <button className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border flex items-center justify-center hover:bg-primary hover:text-dark-bg transition-all">
                  <Twitter size={20} />
                </button>
             </div>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Plataforma</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-primary transition-colors">Início</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Notícias</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Galeria</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Loja</a></li>
            </ul>
          </div>
          
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Suporte</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Parceiros</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-24 mt-24 border-t border-dark-border text-center">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
            © 2026 TimesPro Management. Profissionalize sua paixão.
          </p>
        </div>
      </footer>
    </div>
  );
}
