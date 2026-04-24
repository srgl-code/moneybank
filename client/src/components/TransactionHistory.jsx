import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, Landmark, FileText, ArrowLeftRight } from 'lucide-react';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

const TYPE_CONFIG = {
  transfer: { icon: ArrowLeftRight, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  credit:   { icon: ArrowUpRight,   color: 'text-primary',  bg: 'bg-primary/10' },
  debit:    { icon: ArrowDownLeft,  color: 'text-error',    bg: 'bg-error/10' },
  reset:    { icon: RefreshCcw,     color: 'text-tertiary', bg: 'bg-tertiary/10' },
  pass_go:  { icon: Landmark,       color: 'text-primary',  bg: 'bg-primary/10' },
  fine:     { icon: FileText,       color: 'text-error',    bg: 'bg-error/10' },
};

function time(iso) {
  try { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function TransactionHistory({ history, myId, myName }) {
  const entries = myId
    ? [...(history ?? [])].filter((e) => e.fromId === myId || e.toId === myId)
    : [...(history ?? [])];

  if (!entries.length) {
    return (
      <div className="text-center py-16 opacity-40">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Vazio</p>
        <p className="text-[10px] mt-1">Nenhuma transação registada.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {[...entries].reverse().map((e, i) => {
          let type = e.type || 'transfer';
          if (myId) {
            if (e.toId === myId && type === 'transfer') type = 'credit';
            if (e.fromId === myId && type === 'transfer') type = 'debit';
          }
          
          const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.transfer;
          const Icon = cfg.icon;
          const isCredit = type === 'credit' || type === 'pass_go';

          return (
            <motion.div
              key={e.id ?? i}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-3.5 bg-surface-container/30 border border-outline-variant/10 rounded-2xl group hover:bg-surface-container/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center ${cfg.color} shadow-inner`}>
                   <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-on-surface text-sm truncate max-w-[200px]">
                    {e.description || (type === 'transfer' ? `De ${e.fromName}` : 'Transação')}
                  </p>
                  <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase mt-0.5">
                    {time(e.time)} • {type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              {e.amount != null && (
                <div className="text-right">
                   <span className={`font-headline font-black text-sm balance-text ${isCredit ? 'text-primary' : 'text-error'}`}>
                    {isCredit ? '+' : '-'}{fmt(e.amount)}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
