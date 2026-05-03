import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';
import { cn } from '../lib/utils';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="text-primary" size={18} />,
    error: <AlertCircle className="text-rose-500" size={18} />,
    info: <Info className="text-blue-400" size={18} />
  };

  const backgrounds = {
    success: 'border-primary/20 bg-primary/5',
    error: 'border-rose-500/20 bg-rose-500/5',
    info: 'border-blue-500/20 bg-blue-500/5'
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 duration-300">
      <div className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-2xl border backdrop-blur-md shadow-2xl min-w-[300px]",
        backgrounds[type]
      )}>
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white flex-1 italic">
          {message}
        </p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          <X size={14} className="text-zinc-400" />
        </button>
      </div>
    </div>
  );
}
