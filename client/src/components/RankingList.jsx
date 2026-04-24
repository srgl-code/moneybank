import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingList({ players, myId }) {
  // Sort: banker goes to end, rest sorted by balance
  const sorted = [...players].sort((a, b) => {
    if (a.isBanker) return 1;
    if (b.isBanker) return -1;
    return b.balance - a.balance;
  });

  if (!sorted.length) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3 opacity-60">📊</div>
        <div className="font-semibold text-on-surface-variant text-sm">Ranking aparece aqui</div>
      </div>
    );
  }

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {sorted.map((p, i) => {
            const isMe = p.id === myId;
            const isBk = p.isBanker;
            const rank = isBk ? null : i + 1;
            const isFirst = rank === 1;
            const medal = rank && rank <= 3 ? MEDALS[rank - 1] : null;

            return (
              <motion.div
                key={p.id}
                layout
                layoutId={`rank-${p.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  layout: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className={`
                  relative flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden transition-all
                  ${isFirst
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 shadow-sm'
                    : isMe
                      ? 'bg-teal-50 border border-teal-200/70 shadow-sm'
                      : 'bg-surface border border-outline-variant/60'
                  }
                `}
              >
                {/* 1st place left accent */}
                {isFirst && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-l-2xl" />
                )}
                {isMe && !isFirst && (
                  <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-teal-400 to-teal-600 rounded-l-2xl" />
                )}

                {/* Rank / Medal */}
                <div className="w-8 flex-shrink-0 flex justify-center">
                  {medal ? (
                    <span className="text-xl leading-none">{medal}</span>
                  ) : isBk ? (
                    <span className="text-base font-bold text-on-surface-variant opacity-40">—</span>
                  ) : (
                    <span className={`font-headline font-bold text-base ${isMe ? 'text-teal-600' : 'text-on-surface-variant'}`}>
                      {rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className={`
                  w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center border
                  ${isFirst
                    ? 'bg-white border-amber-200 shadow'
                    : isMe
                      ? 'bg-white border-teal-200'
                      : 'bg-surface-container border-outline-variant/50'
                  }
                `}>
                  <PinDisplay avatar={p.avatar} color={p.color} size={22} />
                </div>

                {/* Name + label */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm leading-tight truncate ${isFirst ? 'text-amber-900' : isMe ? 'text-teal-800' : 'text-on-surface'}`}>
                    {isMe ? `${p.name} (Você)` : p.name}
                  </p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${isBk ? 'text-amber-600' : isFirst ? 'text-amber-500' : isMe ? 'text-teal-500' : 'text-on-surface-variant opacity-60'}`}>
                    {isBk ? 'Bancário' : isFirst ? '1º lugar' : isMe ? 'Você' : `${rank}º lugar`}
                  </p>
                </div>

                {/* Balance */}
                <div className="flex-shrink-0 text-right">
                  {isBk ? (
                    <span className="text-xl font-bold text-amber-500 leading-none">∞</span>
                  ) : (
                    <span className={`font-headline font-black text-base tracking-tight ${isFirst ? 'text-amber-700' : isMe ? 'text-teal-700' : 'text-on-surface'}`}>
                      {fmt(p.balance)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
