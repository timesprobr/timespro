import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, History, ShieldCheck, AlertCircle, CheckCircle2, Clock, Loader2, X, Info, QrCode, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';

interface WalletData {
  id: string; balance: number; pending_balance: number;
  bank_name: string | null; bank_agency: string | null;
  bank_account: string | null; bank_pix_key: string | null; tax_id: string | null;
}
interface Withdrawal {
  id: string; amount: number; fee_amount: number; status: string; created_at: string;
}

type PixType = 'cnpj' | 'email' | 'telefone' | 'aleatoria';
type VerifyStep = 'form' | 'verifying' | 'verified' | 'error';

const PIX_TYPES: { value: PixType; label: string; mask?: string; placeholder: string }[] = [
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'email', label: 'E-mail', placeholder: 'financeiro@clube.com.br' },
  { value: 'telefone', label: 'Telefone', placeholder: '+55 (11) 99999-9999' },
  { value: 'aleatoria', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
];

function formatCNPJ(v: string) {
  return v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2').slice(0, 18);
}

export default function Carteira() {
  const { organization } = useOrg();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // PIX form
  const [pixType, setPixType] = useState<PixType>('cnpj');
  const [pixKey, setPixKey] = useState('');
  const [pixCnpj, setPixCnpj] = useState('');
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('form');

  useEffect(() => { if (organization) fetchWalletData(); }, [organization]);

  const fetchWalletData = async () => {
    if (!organization) return;
    try {
      const { data } = await supabase!.from('wallets').select('*').eq('organization_id', organization.id).single();
      if (data) {
        setWallet(data);
        if (data.bank_pix_key) setPixKey(data.bank_pix_key);
        if (data.tax_id) setPixCnpj(data.tax_id);
      }
      const { data: wd } = await supabase!.from('wallet_withdrawals').select('*').eq('wallet_id', data?.id).order('created_at', { ascending: false });
      setWithdrawals(wd || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setVerifyStep('verifying');
    // Simulated validation: CNPJ must match the club's registered CNPJ
    await new Promise(r => setTimeout(r, 2000));
    const orgCnpj = organization?.settings?.cnpj?.replace(/\D/g, '') || '';
    const inputCnpj = pixCnpj.replace(/\D/g, '');
    if (pixType === 'cnpj' && orgCnpj && inputCnpj !== orgCnpj) {
      setVerifyStep('error'); return;
    }
    try {
      await supabase!.from('wallets').update({ bank_pix_key: pixKey, tax_id: pixCnpj }).eq('id', wallet.id);
      setVerifyStep('verified');
      setTimeout(() => { setIsPixModalOpen(false); fetchWalletData(); setVerifyStep('form'); }, 1500);
    } catch { setVerifyStep('error'); }
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    const amount = parseFloat(withdrawAmount);
    if (amount > wallet.balance) { alert('Saldo insuficiente'); return; }
    if (!wallet.bank_pix_key) { alert('Cadastre uma chave PIX primeiro'); return; }
    setIsSaving(true);
    try {
      await supabase!.from('wallet_withdrawals').insert({ wallet_id: wallet.id, amount, fee_amount: 1.50, bank_details: { pix_key: wallet.bank_pix_key, tax_id: wallet.tax_id } });
      setIsWithdrawModalOpen(false); fetchWalletData();
    } catch { alert('Erro ao solicitar saque'); } finally { setIsSaving(false); }
  };

  const fmt = (v: number) => v?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00';
  const isConfigured = !!wallet?.bank_pix_key;

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tighter text-[var(--text)] leading-none">Minha Carteira</h1>
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1.5">Gerencie seus créditos e histórico financeiro</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsPixModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] text-[var(--text-muted)] rounded-xl text-[9px] font-black uppercase tracking-widest border border-[var(--border)] hover:bg-[var(--surface-soft)] transition-all">
            <QrCode size={14} /> Chave PIX
          </button>
          <button onClick={() => setIsWithdrawModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-primary/20 hover:scale-[1.02] transition-all">
            <ArrowUpRight size={14} strokeWidth={3} /> Solicitar Saque
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Balance Card */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[var(--surface)] p-6 rounded-[32px] border border-[var(--border)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700 text-[var(--text-muted)]">
              <Wallet size={80} />
            </div>
            
            <div className="relative z-10">
              <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] mb-2">Saldo Disponível</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black italic tracking-tighter text-[var(--text)]">R$ {fmt(wallet?.balance || 0)}</span>
                <div className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/20">
                  Créditos Ativos
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-[var(--surface)] rounded-[40px] border border-[var(--border)] overflow-hidden">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-soft)]/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <History size={20} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text)] italic">Histórico de Transações</h3>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {withdrawals.map(w => (
                <div key={w.id} className="px-6 py-3 flex items-center justify-between hover:bg-[var(--surface-soft)]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", w.status === 'completed' ? "bg-primary/10 text-primary" : "bg-[var(--surface-soft)] text-[var(--text-muted)]")}>
                      {w.status === 'completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase text-[var(--text)] italic">Saque via PIX</span>
                        <span className={cn("px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border", w.status === 'completed' ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                          {w.status === 'completed' ? 'Concluído' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">{new Date(w.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--text)] italic">- R$ {fmt(w.amount)}</p>
                    <p className="text-[8px] text-[var(--text-muted)] uppercase">Taxa: R$ {w.fee_amount?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && (
                <div className="py-10 text-center text-[9px] font-bold text-[var(--text-muted)] uppercase italic">Nenhum saque realizado ainda.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - PIX Key */}
        <div className="lg:col-span-4">
          <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--border)] p-5 space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Chave PIX de Recebimento</h3>
            {isConfigured ? (
              <div className="space-y-3">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary text-black rounded-lg"><QrCode size={14} /></div>
                    <p className="text-[10px] font-black uppercase text-primary italic">PIX Verificado</p>
                  </div>
                  <p className="text-[10px] font-bold text-[var(--text)] break-all">{wallet?.bank_pix_key}</p>
                  <div className="pt-1 border-t border-primary/10">
                    <p className="text-[8px] font-black text-[var(--text-muted)] uppercase">CNPJ do Titular</p>
                    <p className="text-[10px] font-bold text-[var(--text)]">{wallet?.tax_id}</p>
                  </div>
                </div>
                <button onClick={() => setIsPixModalOpen(true)} className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-xl transition-all">
                  Alterar Chave PIX
                </button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <AlertCircle size={22} />
                </div>
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase leading-relaxed">Nenhuma chave PIX cadastrada para receber saques.</p>
                <button onClick={() => setIsPixModalOpen(true)} className="w-full py-2.5 bg-primary text-black rounded-xl text-[9px] font-black uppercase tracking-widest">
                  Cadastrar Chave PIX
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {isPixModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><QrCode size={16} /></div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-[var(--text)] italic">Chave PIX</h2>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Configurar recebimento</p>
                </div>
              </div>
              <button onClick={() => { setIsPixModalOpen(false); setVerifyStep('form'); }} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {verifyStep === 'verifying' && (
              <div className="p-10 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-primary" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Verificando chave PIX...</p>
              </div>
            )}

            {verifyStep === 'verified' && (
              <div className="p-10 flex flex-col items-center gap-4">
                <CheckCircle2 className="text-primary" size={48} />
                <p className="text-[11px] font-black uppercase tracking-widest text-primary">Chave PIX verificada!</p>
              </div>
            )}

            {verifyStep === 'error' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <AlertCircle size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase">CNPJ não corresponde</p>
                    <p className="text-[9px] text-[var(--text-muted)] font-medium mt-1">O CNPJ da chave PIX deve ser o mesmo cadastrado no clube.</p>
                  </div>
                </div>
                <button onClick={() => setVerifyStep('form')} className="w-full py-3 bg-[var(--surface-soft)] text-[var(--text)] rounded-2xl text-[9px] font-black uppercase">
                  Tentar Novamente
                </button>
              </div>
            )}

            {verifyStep === 'form' && (
              <form onSubmit={handleVerifyAndSave} className="p-5 space-y-4">
                {/* Alert */}
                <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                    <strong>Atenção:</strong> A chave PIX de recebimento deve estar cadastrada no mesmo <strong>CNPJ do clube</strong>. Chaves de pessoas físicas ou de outro CNPJ serão recusadas.
                  </p>
                </div>

                {/* PIX Type */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tipo de Chave</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PIX_TYPES.map(t => (
                      <button key={t.value} type="button" onClick={() => { setPixType(t.value); setPixKey(''); }}
                        className={cn("py-2 rounded-xl text-[8px] font-black uppercase border transition-all",
                          pixType === t.value ? "bg-primary text-black border-primary" : "bg-[var(--surface-soft)] border-[var(--border)] text-[var(--text-muted)] hover:border-primary/50"
                        )}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PIX Key Input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    Chave {PIX_TYPES.find(t => t.value === pixType)?.label}
                  </label>
                  <input required type="text"
                    value={pixType === 'cnpj' ? formatCNPJ(pixKey) : pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    placeholder={PIX_TYPES.find(t => t.value === pixType)?.placeholder}
                    className="w-full bg-[var(--surface-soft)]/50 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text)] focus:border-primary outline-none transition-all"
                  />
                </div>

                {/* CNPJ Confirmation */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                    <Lock size={10} className="text-primary" /> CNPJ do Clube (Titular da Conta)
                  </label>
                  <input required type="text"
                    value={formatCNPJ(pixCnpj)}
                    onChange={e => setPixCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full bg-[var(--surface-soft)]/50 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-bold text-[var(--text)] focus:border-primary outline-none transition-all"
                  />
                  <p className="text-[8px] text-[var(--text-muted)] font-medium">Deve ser o mesmo CNPJ registrado no clube.</p>
                </div>

                <button type="submit" className="w-full py-3.5 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  <ShieldCheck size={14} /> Verificar e Salvar
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl"><ArrowUpRight size={18} /></div>
                <div>
                  <h2 className="text-sm font-black uppercase italic text-[var(--text)]">Solicitar Saque</h2>
                  <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Via PIX • Processado em até 24h</p>
                </div>
              </div>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            <form onSubmit={handleRequestWithdraw} className="p-6 space-y-5">
              {/* Amount input */}
              <div className="bg-[var(--surface-soft)]/50 rounded-2xl p-5 space-y-3">
                <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest text-center">Valor do Saque</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black text-primary italic">R$</span>
                  <input
                    type="number" step="0.01" min="0.01"
                    max={wallet?.balance || 0}
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    required
                    className="bg-transparent border-b-2 border-primary text-4xl font-black text-[var(--text)] italic outline-none w-44 text-center placeholder-[var(--text-subtle)]"
                    placeholder="0,00"
                  />
                </div>

                {/* Available balance bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[8px] font-black uppercase text-[var(--text-muted)]">
                    <span>Disponível para saque</span>
                    <span className="text-primary">R$ {fmt(wallet?.balance || 0)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: wallet?.balance ? `${Math.min(100, (parseFloat(withdrawAmount || '0') / wallet.balance) * 100)}%` : '0%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-medium text-[var(--text-muted)]">
                    <span>R$ 0,00</span>
                    <span>R$ {fmt(wallet?.balance || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-3 flex justify-between items-center border-b border-[var(--border)]">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Valor solicitado</span>
                  <span className="text-[11px] font-black text-[var(--text)]">
                    R$ {fmt(parseFloat(withdrawAmount || '0'))}
                  </span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center border-b border-[var(--border)]">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Taxa de serviço</span>
                  <span className="text-[11px] font-black text-red-400">- R$ 1,50</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center bg-primary/5">
                  <span className="text-[9px] font-black uppercase text-primary">Você receberá</span>
                  <span className="text-base font-black text-primary italic">
                    R$ {fmt(Math.max(0, parseFloat(withdrawAmount || '0') - 1.50))}
                  </span>
                </div>
              </div>

              {/* PIX destination */}
              {isConfigured && (
                <div className="p-3.5 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                  <QrCode size={16} className="text-primary shrink-0" />
                  <div>
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest">Destino PIX</p>
                    <p className="text-[10px] font-bold text-[var(--text)] break-all mt-0.5">{wallet?.bank_pix_key}</p>
                  </div>
                </div>
              )}

              {!isConfigured && (
                <div className="flex items-center gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <AlertCircle size={16} className="text-amber-500 shrink-0" />
                  <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-relaxed">Cadastre uma chave PIX antes de solicitar saque.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3.5 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-[var(--surface-soft)]/80 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || !isConfigured || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
                  className="flex-1 py-3.5 bg-primary text-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={14} /> : <><ArrowUpRight size={14} strokeWidth={3} /> Confirmar Saque</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
