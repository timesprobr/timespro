import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';

export default function Login() {
  const { organization } = useOrg();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!supabase) {
        throw new Error('Supabase não configurado. Verifique as variáveis de ambiente.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      
      setMessage('Link de acesso enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar link de acesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4 selection:bg-primary selection:text-dark-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-6 shadow-[0_0_30px_rgba(204,255,0,0.3)] transform -rotate-6 overflow-hidden">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck size={36} className="text-dark-bg" strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white font-display">
            {organization?.name || 'Times'}<span className="text-primary">{organization?.name ? '' : 'Pro'}</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] mt-2">Acesso Seguro</p>
        </div>

        <div className="bg-dark-surface border border-white/5 p-8 rounded-[32px] shadow-2xl backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          {message ? (
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-2">
                <CheckCircle2 size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black uppercase italic text-white">Verifique seu E-mail</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  Enviamos um link mágico de acesso para <br/>
                  <span className="text-primary font-bold">{email}</span>.
                </p>
              </div>
              <button 
                onClick={() => setMessage(null)}
                className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                Tentar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">E-mail de Acesso</label>
                  <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-tighter">Sem Senha</span>
                </div>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-primary transition-colors" size={18} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="insira seu e-mail"
                    required
                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-xs font-bold text-center animate-shake">
                  {error}
                </div>
              )}

              <button 
                disabled={loading}
                className="w-full bg-primary text-dark-bg py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(204,255,0,0.2)] hover:shadow-[0_15px_40px_rgba(204,255,0,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
              >
                {loading ? 'Enviando...' : (
                  <>
                    Entrar
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              Ambiente Seguro • Magic Link Auth
            </p>
          </div>
        </div>

        <p className="text-center mt-8 text-slate-600 text-xs font-medium leading-relaxed">
          O Magic Link é mais seguro. Você receberá um acesso temporário <br/>
          diretamente no seu e-mail, sem precisar de senha.
        </p>
      </div>
    </div>
  );
}
