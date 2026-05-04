import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpRight, History, ShieldCheck, AlertCircle, CheckCircle2, Clock, Loader2, X, Info, QrCode, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../context/OrgContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const detectPixType = (key: string): string => {
  const clean = key.replace(/\D/g, '');
  if (key.includes('@')) return 'EMAIL';
  if (clean.length === 11) return 'CPF';
  if (clean.length === 14) return 'CNPJ';
  if (clean.length >= 10 && clean.length <= 11) return 'PHONE';
  return 'RANDOM';
};

interface WalletData {
  id: string; balance: number; pending_balance: number;
  bank_name: string | null; bank_agency: string | null;
  bank_account: string | null; bank_pix_key: string | null; tax_id: string | null;
  bank_owner_name: string | null;
}
interface Withdrawal {
  id: string; amount: number; fee_amount: number; status: string; created_at: string;
}

type PixType = 'cnpj' | 'email' | 'telefone' | 'aleatoria';
type VerifyStep = 'form' | 'verifying' | 'confirm' | 'verified' | 'error';

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
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<{
    ownerName: string;
    bankName: string;
    taxId?: string;
    isReal?: boolean;
  } | null>(null);

  useEffect(() => { if (organization) fetchWalletData(); }, [organization]);

  const fetchWalletData = async () => {
    if (!organization) return;
    try {
      const { data } = await supabase!.from('wallets').select('*').eq('organization_id', organization.id).single();
      if (data) {
        setWallet(data);
        if (data.bank_pix_key) setPixKey(data.bank_pix_key);
      }
      const { data: wd } = await supabase!.from('wallet_withdrawals').select('*').eq('wallet_id', data?.id).order('created_at', { ascending: false });
      setWithdrawals(wd || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Cálculo do saldo efetivamente disponível (subtraindo saques pendentes)
  const pendingWithdrawalsAmount = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const effectiveBalance = Math.max(0, (wallet?.balance || 0) - pendingWithdrawalsAmount);
  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setVerifyStep('verifying');
    
    const cleanPixKey = pixKey.trim();
    const pureKey = pixKey.replace(/\D/g, '');
    
    // 1. Validação de Formato Real (Regex)
    const pixRegex = {
      cnpj: /^\d{14}$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      telefone: /^\+?\d{10,15}$/,
      aleatoria: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    };

    const isValidFormat = pixType === 'email' ? pixRegex.email.test(cleanPixKey) : 
                        pixType === 'cnpj' ? pixRegex.cnpj.test(pureKey) :
                        pixType === 'telefone' ? pixRegex.telefone.test(pureKey) :
                        pixRegex.aleatoria.test(cleanPixKey);

    if (!isValidFormat) {
      toast.error(`Formato de chave ${pixType.toUpperCase()} inválido.`);
      setVerifyStep('form');
      return;
    }

    try {
      // 1. Salvar diretamente no banco de dados para o MVP
      const keyToSend = (pixType === 'cnpj' || pixType === 'telefone') ? pureKey : cleanPixKey;
      const orgCnpj = (organization?.cnpj || organization?.settings?.cnpj || organization?.settings?.tax_id)?.replace(/\D/g, '') || '';
      
      const { error } = await supabase!.from('wallets').update({ 
        bank_pix_key: keyToSend,
        bank_owner_name: organization?.name || 'Clube',
        bank_name: 'Instituição PIX',
        tax_id: orgCnpj || null
      }).eq('id', wallet.id);
      
      if (error) throw error;

      setVerifiedData({
        ownerName: organization?.name || 'Clube',
        bankName: 'Instituição PIX',
        taxId: orgCnpj || '',
        isReal: false
      });
      
      setVerifyStep('verified');
      toast.success('Chave PIX registrada com sucesso!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao salvar a chave PIX.');
      setVerifyStep('error');
    }
  };

  const handleConfirmSave = async () => {
    if (!wallet || !verifiedData) return;
    setVerifyStep('verifying');

    const orgCnpj = (organization?.cnpj || organization?.settings?.cnpj || organization?.settings?.tax_id)?.replace(/\D/g, '') || '';

    try {
      const { error } = await supabase!.from('wallets').update({ 
        bank_pix_key: pixKey, 
        bank_name: verifiedData.bankName,
        bank_owner_name: verifiedData.ownerName,
        tax_id: orgCnpj || verifiedData.taxId || null
      }).eq('id', wallet.id);
      
      if (error) throw error;

      setVerifyStep('verified');
      toast.success('Dados da carteira atualizados!');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao salvar os dados da carteira.');
      setVerifyStep('error');
    }
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    if (!wallet.bank_pix_key) { 
      toast.error('Cadastre uma chave PIX primeiro'); 
      return; 
    }
    
    const cleanAmount = parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.'));
    
    if (cleanAmount < 5) {
      toast.error('O valor mínimo para saque é de R$ 5,00.');
      return;
    }

    if (cleanAmount > effectiveBalance) {
      toast.error('Saldo insuficiente para realizar este saque (considere saques pendentes).');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Processando seu saque automático...');

    try {
      const fee = 0.00; // Taxa zerada para testes
      const totalAmount = cleanAmount;

      // 1. Criar registro de saque pendente
      const { data: wd, error: wdError } = await supabase!
        .from('wallet_withdrawals')
        .insert({ 
          wallet_id: wallet.id, 
          amount: totalAmount, 
          fee_amount: fee, 
          bank_details: { pix_key: wallet.bank_pix_key, tax_id: wallet.tax_id },
          status: 'pending'
        })
        .select()
        .single();

      if (wdError) throw wdError;

      // 2. Chamar a Edge Function para processar o payout automático no AbacatePay
      const { data: payoutResponse, error: payoutError } = await supabase!.functions.invoke('process-payout', {
        body: {
          walletId: wallet.id,
          withdrawalId: wd.id,
          amount: totalAmount,
          pixKey: wallet.bank_pix_key,
          pixKeyType: detectPixType(wallet.bank_pix_key)
        }
      });

      if (payoutError || (payoutResponse && !payoutResponse.success)) {
        throw new Error(payoutResponse?.error || payoutError?.message || 'Erro ao processar pagamento automático');
      }

      // 3. Registrar no Fluxo de Caixa como Despesa (Saída)
      await supabase!
        .from('financial_transactions')
        .insert({
          organization_id: organization!.id,
          title: `Saque Automático (Chave: ${wallet.bank_pix_key})`,
          amount: totalAmount,
          type: 'expense',
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          responsible_name: organization!.name
        });

      setWithdrawAmount('');
      setIsWithdrawModalOpen(false); 
      fetchWalletData();
      toast.success('Saque realizado com sucesso! O dinheiro já foi enviado via PIX.', { id: toastId });
    } catch (err: any) { 
      console.error(err);
      toast.error(err.message || 'Erro ao processar saque. Tente novamente mais tarde.', { id: toastId }); 
    } finally { 
      setIsSaving(false); 
    }
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
          <div className="bg-[var(--surface)] p-8 rounded-[32px] border border-[var(--border)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-[var(--text-muted)]">
              <Wallet size={120} />
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Total Balance */}
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Lock size={10} className="text-[var(--text-muted)]" /> Saldo Bruto Total
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text)]">R$ {fmt((wallet?.balance || 0) + (wallet?.pending_balance || 0))}</span>
                </div>
                <p className="text-[7px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Soma de todos os recebíveis</p>
              </div>

              {/* Available Balance */}
              <div className="space-y-1 p-5 bg-primary/5 rounded-[24px] border border-primary/10 relative group/card overflow-hidden">
                <div className="absolute -right-2 -bottom-2 opacity-5 group-hover/card:scale-110 transition-all duration-500 text-primary">
                  <CheckCircle2 size={60} />
                </div>
                <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-2 flex items-center gap-2">
                  <CheckCircle2 size={10} /> Saldo Disponível
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text)]">R$ {fmt(effectiveBalance)}</span>
                  <div className="px-2 py-0.5 bg-primary text-black rounded-full text-[7px] font-black uppercase tracking-widest">
                    Livre
                  </div>
                </div>
                <p className="text-[7px] font-bold text-primary/70 uppercase tracking-wider">Pronto para saque</p>
                {pendingWithdrawalsAmount > 0 && (
                  <p className="text-[7px] font-bold text-amber-500 uppercase tracking-wider mt-1">
                    (- R$ {fmt(pendingWithdrawalsAmount)} pendentes)
                  </p>
                )}
              </div>

              {/* Pending Balance */}
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Clock size={10} /> Saldo a Liberar
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black italic tracking-tighter text-[var(--text-muted)]">R$ {fmt(wallet?.pending_balance || 0)}</span>
                </div>
                <p className="text-[7px] font-bold text-amber-500/70 uppercase tracking-wider">Liberação prevista: D+1 (Pix)</p>
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
                  
                  <div className="pt-2 border-t border-primary/10 space-y-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Titular</span>
                      <span className="text-[10px] font-bold text-[var(--text)] uppercase italic leading-tight">
                        {wallet?.bank_owner_name || 'NÃO IDENTIFICADO'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Instituição</span>
                      <span className="text-[10px] font-bold text-[var(--text)] uppercase italic leading-tight">
                        {wallet?.bank_name || 'NÃO IDENTIFICADO'}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-[var(--text-muted)] uppercase">Documento do Titular</span>
                      <span className="text-[10px] font-bold text-[var(--text)]">{wallet?.tax_id || 'NÃO INFORMADO'}</span>
                    </div>
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
          
          {/* Help/Info Box */}
          <div className="bg-primary/5 rounded-[24px] border border-primary/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Info size={16} strokeWidth={3} />
              <h4 className="text-[10px] font-black uppercase tracking-widest italic">Como funciona?</h4>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-[var(--text)]">1. Recebimento</p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] leading-relaxed">
                  Os pagamentos via Pix (AbacatePay) caem no Saldo a Liberar e são liquidados em sua conta em D+1.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-[var(--text)]">2. Solicitação</p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] leading-relaxed">
                  Ao solicitar um saque, nosso sistema valida sua chave Pix vinculada ao CNPJ do clube por segurança.
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-[var(--text)]">3. Payout</p>
                <p className="text-[8px] font-bold text-[var(--text-muted)] leading-relaxed">
                  O valor líquido (descontada a taxa de R$ 0,80) é enviado para sua conta. Valor mínimo de R$ 5,00.
                </p>
              </div>
            </div>
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

            {verifyStep === 'verified' && verifiedData && (
              <div className="p-6 space-y-5">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-full">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-[11px] font-black uppercase tracking-widest text-primary">CHAVE PIX REGISTRADA!</h2>
                  <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest text-center">Sua chave foi salva com sucesso e já está pronta para uso</p>
                </div>

                <div className="bg-[var(--surface-soft)]/30 rounded-2xl p-5 border border-[var(--border)]">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Titular</p>
                      <p className="text-xs font-black text-[var(--text)] italic uppercase leading-tight">{verifiedData.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Instituição</p>
                      <p className="text-xs font-black text-[var(--text)] italic uppercase leading-tight">{verifiedData.bankName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Documento do Titular</p>
                      <p className="text-xs font-bold text-[var(--text)]">{verifiedData.taxId || 'NÃO IDENTIFICADO'}</p>
                    </div>
                    <div className="pt-3 border-t border-[var(--border)]">
                      <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Chave PIX</p>
                      <p className="text-[10px] font-bold text-primary break-all">{pixKey}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsPixModalOpen(false);
                    fetchWalletData();
                    setVerifyStep('form');
                    setVerifiedData(null);
                  }} 
                  className="w-full py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
                >
                  Confirmar
                </button>
              </div>
            )}

            {verifyStep === 'confirm' && verifiedData && (
              <div className="p-6 space-y-5">
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary text-black rounded-xl">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary italic">Dados Identificados</p>
                      <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Confirme se as informações estão corretas</p>
                    </div>
                  </div>
                  <div className="bg-[var(--surface-soft)]/30 rounded-2xl p-5 border border-[var(--border)]">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Titular</p>
                        <p className="text-xs font-black text-[var(--text)] italic uppercase leading-tight">{verifiedData.ownerName}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Instituição</p>
                        <p className="text-xs font-black text-[var(--text)] italic uppercase leading-tight">{verifiedData.bankName}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Documento do Titular</p>
                        <p className="text-xs font-bold text-[var(--text)]">{verifiedData.taxId || 'NÃO IDENTIFICADO'}</p>
                      </div>
                      <div className="pt-3 border-t border-[var(--border)]">
                        <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Chave PIX</p>
                        <p className="text-[10px] font-bold text-primary break-all">{pixKey}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {!verifiedData.isReal && (
                  <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                      <strong>Aviso:</strong> Verificação em modo de compatibilidade. Certifique-se de que os dados acima pertencem ao clube.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setVerifyStep('form')} className="flex-1 py-3.5 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-[var(--surface-soft)]/80 transition-all">
                    Corrigir
                  </button>
                  <button onClick={handleConfirmSave} className="flex-1 py-3.5 bg-primary text-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
                    Confirmar
                  </button>
                </div>
              </div>
            )}

            {verifyStep === 'error' && (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <AlertCircle size={20} className="text-red-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-red-500 uppercase">Falha na Verificação</p>
                    <p className="text-[9px] text-[var(--text-muted)] font-medium mt-1">
                      {errorMessage || 'Não foi possível validar esta chave PIX. Verifique se os dados estão corretos e tente novamente.'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setVerifyStep('form')} className="w-full py-3 bg-[var(--surface-soft)] text-[var(--text)] rounded-2xl text-[9px] font-black uppercase">
                  Voltar ao Início
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
                  {pixType === 'cnpj' && (
                    <p className="text-[8px] text-[var(--text-muted)] font-medium">
                      A chave será validada automaticamente com o CNPJ do clube: <span className="text-primary font-bold">{organization?.cnpj || organization?.settings?.cnpj || 'Não cadastrado'}</span>
                    </p>
                  )}
                </div>

                <button type="submit" className="w-full py-3.5 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                  <ShieldCheck size={14} /> Salvar Chave PIX
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
                    type="text"
                    value={withdrawAmount}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      const amount = parseFloat(val) / 100;
                      if (isNaN(amount)) {
                        setWithdrawAmount('0,00');
                      } else {
                        setWithdrawAmount(amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                      }
                    }}
                    required
                    className="bg-transparent border-b-2 border-primary text-4xl font-black text-[var(--text)] italic outline-none w-56 text-center placeholder-[var(--text-subtle)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0,00"
                  />
                </div>

                {/* Available balance bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[8px] font-black uppercase text-[var(--text-muted)]">
                    <span>Disponível para saque</span>
                    <span className="text-primary">R$ {fmt(effectiveBalance)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: effectiveBalance ? `${Math.min(100, (parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.') || '0') / effectiveBalance) * 100)}%` : '0%' }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-medium text-[var(--text-muted)]">
                    <span>R$ 0,00</span>
                    <span>R$ {fmt(effectiveBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                <div className="px-4 py-3 flex justify-between items-center border-b border-[var(--border)]">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Valor solicitado</span>
                  <span className="text-[11px] font-black text-[var(--text)]">
                    R$ {withdrawAmount || '0,00'}
                  </span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center border-b border-[var(--border)]">
                  <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">Taxa de serviço</span>
                  <span className="text-[11px] font-black text-red-400">- R$ 0,00</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center bg-primary/5">
                  <span className="text-[9px] font-black uppercase text-primary">Você receberá</span>
                  <span className="text-base font-black text-primary italic">
                    R$ {withdrawAmount || '0,00'}
                  </span>
                </div>
              </div>

              {/* Insufficient Balance Alert */}
              {parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.') || '0') > (wallet?.balance || 0) && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest">Saldo insuficiente para saque</p>
                </div>
              )}

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

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsWithdrawModalOpen(false)} className="flex-1 py-4 bg-[var(--surface-soft)] text-[var(--text-muted)] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--surface-soft)]/80 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving || !isConfigured || !withdrawAmount || parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.')) < 5 || parseFloat(withdrawAmount.replace(/\./g, '').replace(',', '.')) > effectiveBalance}
                  className="flex-1 py-4 bg-primary text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] disabled:opacity-50 disabled:grayscale disabled:scale-100 transition-all flex items-center justify-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <><ArrowUpRight size={16} /> Confirmar Saque</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
