import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PinDisplay } from '../PinIcon.jsx';
import { timeShort } from '../../utils/format';

const TYPE_CONFIG = {
  credit:   { icon: '📈', label: 'Crédito',     color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', sign: '+' },
  debit:    { icon: '📉', label: 'Débito',      color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-100',       sign: '-' },
  transfer: { icon: '💸', label: 'Transferência', color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-100',       sign: ''  },
  reset:    { icon: '🔄', label: 'Reinício',    color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-100',     sign: ''  },
  fine:     { icon: '⚖️', label: 'Multa',       color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-100',   sign: '-' },
  pass_go:  { icon: '🏁', label: 'Largada',     color: 'text-teal-600',    bg: 'bg-teal-50 border-teal-100',       sign: '+' },
};

function fmtAmt(n) {
  return `M$ ${Number(n).toLocaleString('pt-BR')}`;
}

export const ActivityFeed = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-on-surface-variant opacity-70 min-h-[200px]">
        <span className="text-4xl mb-3 opacity-40">📜</span>
        <p className="text-sm font-bold">Nenhuma atividade</p>
        <p className="text-xs mt-1">Transferências e eventos aparecerão aqui.</p>
      </div>
    );
  }

  const reversed = [...history].reverse().slice(0, 50);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-extrabold text-on-surface-variant uppercase tracking-widest flex items-center gap-1.5">
          <span>⚡</span> Atividade Recente
        </span>
        <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant border border-outline-variant/30">
          {reversed.length} eventos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar space-y-1.5 pr-1">
        <AnimatePresence initial={false}>
          {reversed.map((entry, idx) => {
            const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.transfer;
            const isBank = entry.fromName === 'Banco' || entry.fromName === 'Sistema';
            const showSign = cfg.sign !== '';

            return (
              <motion.div
                key={entry.id || idx}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-container/60 transition-colors"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${cfg.bg}`}>
                  <PinDisplay avatar={isBank ? '🏦' : entry.fromAvatar} color={entry.fromColor} size={28} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface leading-tight">
                    <span className="truncate max-w-[80px]">{entry.fromName}</span>
                    <span className="text-on-surface-variant text-xs shrink-0">→</span>
                    <span className="truncate max-w-[80px]">{entry.toName}</span>
                  </div>
                  {entry.description && (
                    <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{entry.description}</p>
                  )}
                </div>

                {/* Amount + time */}
                <div className="text-right shrink-0">
                  <span className={`text-sm font-black block ${cfg.color}`}>
                    {showSign && cfg.sign}{fmtAmt(entry.amount)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant/60 font-mono">
                    {timeShort(entry.time)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
