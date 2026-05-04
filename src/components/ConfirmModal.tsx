import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
    info: 'bg-primary hover:bg-primary/90 text-black shadow-primary/20'
  };

  const iconColors = {
    danger: 'bg-rose-500/10 text-rose-500',
    warning: 'bg-amber-500/10 text-amber-500',
    info: 'bg-primary/10 text-primary'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-[var(--border)] animate-in zoom-in-95 duration-300">
        <div className="p-6 text-center">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4", iconColors[type])}>
            <AlertCircle size={24} />
          </div>
          
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text)] italic mb-2">{title}</h3>
          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase leading-relaxed px-4">{message}</p>
        </div>
        
        <div className="p-5 bg-[var(--surface-soft)]/50 border-t border-[var(--border)] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-[var(--border)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:bg-[var(--surface)] transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]",
              colors[type],
              type === 'info' && "text-black"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
