import React from 'react';
import { motion } from 'framer-motion';
import { Clock, ChevronRight, Users, User, Trash2 } from 'lucide-react';
import { PinDisplay } from '../PinIcon.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export const RecentRooms = ({ onRejoin, compact = false }) => {
  const [recentRooms, setRecentRooms] = useLocalStorage('moneybank_recent_rooms', []);

  const clearHistory = (e) => {
    e.stopPropagation();
    if (confirm('Limpar histórico de salas?')) setRecentRooms([]);
  };

  if (!recentRooms || recentRooms.length === 0) {
    if (compact) return null;
    return (
      <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-outline-variant/50">
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 text-2xl opacity-40">
          🕰️
        </div>
        <p className="text-sm font-black text-on-surface uppercase tracking-tight">Sem histórico</p>
        <p className="text-xs text-on-surface-variant mt-2 max-w-[200px] mx-auto leading-relaxed">
          As salas em que participares aparecerão aqui para reconexão rápida.
        </p>
      </div>
    );
  }

  return (
    <div className="text-left">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <h3 className={`font-headline font-black text-on-surface flex items-center gap-2 ${compact ? 'text-xs uppercase tracking-wider' : 'text-base'}`}>
            <Clock className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
            Salas Recentes
          </h3>
          {!compact && <p className="text-xs text-on-surface-variant mt-0.5">Teu histórico de jogo local</p>}
        </div>
        {!compact && (
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg hover:bg-error-container/20 text-on-surface-variant hover:text-error transition-all group"
            title="Limpar Histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {recentRooms.map((room, idx) => (
          <motion.button
            key={room.roomCode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            type="button"
            onClick={() => onRejoin(room.roomCode, room.sessionId)}
            className="group flex items-center justify-between p-3.5 rounded-2xl border border-outline-variant/30 bg-surface/50 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-primary/20 hover:bg-surface transition-all text-left w-full"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <PinDisplay avatar={room.myEmoji} color={room.myColor} size={40} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-on-surface leading-tight flex items-center gap-1.5">
                  Sala {room.roomCode}
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <span className="text-[10px] text-primary uppercase tracking-widest">{timeAgo(room.time)}</span>
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                   <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container/50 px-2 py-0.5 rounded-full">
                      <User className="w-2.5 h-2.5" />
                      {room.bankerName || 'Desconhecido'}
                   </div>
                   {room.playerCount > 0 && (
                     <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container/50 px-2 py-0.5 rounded-full">
                        <Users className="w-2.5 h-2.5" />
                        {room.playerCount}
                     </div>
                   )}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-all shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
