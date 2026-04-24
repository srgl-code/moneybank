import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;
const QUICK = [50, 100, 200, 500, 1000, 1500];
const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function CardMachine({ player, onConfirm, onCancel }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const val = parseInt(amount) || 0;

  const pressKey = (k) => {
    if (k === '⌫') setAmount((a) => a.slice(0, -1));
    else if (k === '') return;
    else if (amount.length < 8) setAmount((a) => a + k);
  };

  const handleConfirm = async () => {
    if (!val || val <= 0) return;
    setBusy(true);
    try { await onConfirm(val, reason.trim() || undefined); }
    catch { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center p-2"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-xl bg-surface border border-outline-variant"
      >
        {/* Screen area */}
        <div className="bg-surface p-5 border-b border-outline-variant/30">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">credit_card</span>
              <span className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] font-headline">MAQUINETA</span>
            </div>
            <button onClick={onCancel} className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-container-highest hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer border-none">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Player info */}
          <div className="flex items-center gap-2.5 mb-4 p-2.5 rounded-xl bg-surface-container border border-outline-variant/15">
            <PinDisplay avatar={player.avatar} size={20} />
            <div className="min-w-0">
              <div className="text-on-surface font-bold text-sm truncate">{player.name}</div>
              <div className="text-primary text-[10px] font-headline font-semibold">Saldo: {fmt(player.balance)}</div>
            </div>
          </div>

          {/* Amount display */}
          <div className="bg-surface-container-highest rounded-xl p-4 border border-outline-variant/15 mb-3">
            <div className="text-on-surface-variant text-[9px] font-bold tracking-widest font-headline uppercase mb-1">VALOR A COBRAR</div>
            <div className={`font-headline text-3xl font-black balance-text tracking-wider transition-colors ${val > 0 ? 'text-secondary' : 'text-on-surface/10'}`}>
              {val > 0 ? fmt(val) : 'M$ 0'}
            </div>
          </div>

          {/* Quick amounts */}
          <div className="flex gap-1.5 flex-wrap">
            {QUICK.map((v) => (
              <button
                key={v} type="button" onClick={() => setAmount(String(v))}
                className={`
                  px-2.5 py-1 rounded-lg text-[10px] font-bold font-headline cursor-pointer transition-all border
                  ${amount === String(v)
                    ? 'bg-secondary/10 text-secondary border-secondary/20'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/15 hover:border-secondary/20'
                  }
                `}
              >
                {fmt(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Numpad */}
        <div className="p-3 bg-surface-container">
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {NUMPAD.map((k, i) => (
              <button
                key={i} onClick={() => pressKey(k)} disabled={!k}
                className={`
                  py-3.5 rounded-xl text-lg font-bold font-headline cursor-pointer border-none transition-all active:scale-95
                  ${k === '⌫' ? 'bg-secondary/8 text-secondary' : k ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest' : 'bg-transparent'}
                `}
                style={{ cursor: k ? 'pointer' : 'default' }}
              >
                {k}
              </button>
            ))}
          </div>

          <input
            type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo — ex: Aluguel (opcional)" maxLength={50}
            className="field glow-input text-xs mb-3 py-2.5 px-3"
          />

          <button
            onClick={handleConfirm} disabled={!val || busy}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-black font-headline
              border-none cursor-pointer transition-all
              ${val ? 'bg-gradient-to-r from-secondary-container to-secondary text-on-secondary shadow-sm' : 'bg-surface-container-highest text-on-surface-variant'}
            `}
            style={{ opacity: val && !busy ? 1 : 0.35, cursor: val && !busy ? 'pointer' : 'not-allowed' }}
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> A cobrar…</>
            ) : (
              <>💳 Cobrar {val > 0 ? fmt(val) : ''}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
