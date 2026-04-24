import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const CONFIG = {
  success: { Icon: CheckCircle2, color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50/90' },
  error:   { Icon: AlertCircle,   color: 'text-rose-600',    border: 'border-rose-100',    bg: 'bg-rose-50/90'    },
  warning: { Icon: AlertTriangle, color: 'text-amber-600',   border: 'border-amber-100',   bg: 'bg-amber-50/90'   },
  info:    { Icon: Info,          color: 'text-blue-600',    border: 'border-blue-100',    bg: 'bg-blue-50/90'    },
};

export default function Toast() {
  const { toasts, removeToast } = useGame();

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-[320px] w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const c = CONFIG[t.type] ?? CONFIG.info;
          const { Icon } = c;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              className={`
                group pointer-events-auto relative flex items-start gap-3 p-4 rounded-2xl
                backdrop-blur-md shadow-lg border ${c.border} ${c.bg}
              `}
            >
              <div className={`shrink-0 mt-0.5 ${c.color}`}>
                <Icon size={18} strokeWidth={2.5} />
              </div>
              
              <div className="flex-1 pr-4">
                <p className="text-sm font-bold text-on-surface leading-snug">
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => removeToast?.(t.id)}
                className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-black/5 transition-all text-on-surface-variant"
              >
                <X size={14} />
              </button>

              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.8, ease: 'linear' }}
                className={`absolute bottom-0 left-0 h-0.5 rounded-full opacity-30 ${c.color.replace('text', 'bg')}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
