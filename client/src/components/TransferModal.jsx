import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;
const QUICK = [50, 100, 200, 500, 1000];

export default function TransferModal({ onClose, players, currentPlayer }) {
  const { requestTransfer, addToast } = useGame();
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);

  useEffect(() => { if (toId) ref.current?.focus(); }, [toId]);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const recipients = players.filter((p) => p.id !== currentPlayer?.id);
  const sel = recipients.find((p) => p.id === toId);
  const parsed = parseInt(amount, 10) || 0;
  const canSubmit = !busy && toId && amount;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!toId) return setError('Seleciona um destinatário.');
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return setError('Insere um valor válido.');
    if (amt > 1_000_000_000) return setError('Valor demasiado alto.');
    const bal = currentPlayer?.balance ?? 0;
    if (!currentPlayer?.isBanker && amt > bal) return setError(`Saldo insuficiente. Tens ${fmt(bal)}.`);
    setBusy(true);
    try {
      await requestTransfer(toId, amt, reason.trim() || undefined);
      addToast('📤 Pedido enviado! Aguarda aprovação do bancário.', 'info', 5000);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(27,28,28,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md card-elevated overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 className="font-headline font-black text-lg text-on-surface flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/10">
              <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                send_money
              </span>
            </span>
            Transferência
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface-container-highest hover:bg-surface-container-high transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-5">
          {/* Balance pill */}
          {!currentPlayer?.isBanker && (
            <div className="text-center py-3 rounded-xl bg-surface-container-low border border-outline-variant/15">
              <span className="text-on-surface-variant text-xs">Teu saldo: </span>
              <span className="font-headline font-bold text-primary balance-text">
                {fmt(currentPlayer?.balance ?? 0)}
              </span>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-xl bg-error-container/30 border border-error/20 text-error text-sm overflow-hidden"
              >
                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recipients */}
          <div>
            <label className="field-label">Para quem?</label>
            <div className="grid grid-cols-2 gap-2">
              {recipients.map((p) => {
                const on = toId === p.id;
                return (
                  <motion.button
                    key={p.id} type="button"
                    onClick={() => setToId(p.id)}
                    whileTap={{ scale: 0.96 }}
                    className={`
                      flex items-center gap-2.5 p-3 rounded-xl cursor-pointer text-left transition-all
                      ${on
                        ? 'bg-primary/8 border-2 border-primary/30 shadow-sm'
                        : 'bg-surface-container-low border-2 border-transparent hover:border-outline-variant/30'
                      }
                    `}
                  >
                    <div className="flex-shrink-0 w-6 flex items-center justify-center">
                      <PinDisplay avatar={p.avatar} size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-on-surface truncate">{p.name}</div>
                      {p.isBanker && <div className="text-[10px] text-tertiary font-semibold">Banco</div>}
                    </div>
                    {on && <span className="text-primary font-black text-sm">✓</span>}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="field-label">Valor (M$)</label>
            <input
              ref={ref} type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0" min="1" max="1000000000" inputMode="numeric"
              className="field glow-input text-center font-headline font-black text-3xl tracking-wider"
            />
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {QUICK.map((v) => {
                const on = amount === String(v);
                return (
                  <motion.button
                    key={v} type="button"
                    onClick={() => setAmount(String(v))}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-bold font-headline cursor-pointer transition-all
                      ${on
                        ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-sm'
                        : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 hover:border-primary/30'
                      }
                    `}
                  >
                    M${v.toLocaleString('pt-BR')}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="field-label">Motivo (opcional)</label>
            <input
              type="text" value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: compra de propriedade..."
              maxLength={60} className="field glow-input text-sm"
            />
          </div>

          {/* Submit */}
          <button
            type="submit" disabled={!canSubmit}
            className="btn-primary"
            style={{ opacity: canSubmit ? 1 : 0.35 }}
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> A enviar pedido…</>
            ) : toId && parsed > 0 ? (
              `📤 Pedir ${fmt(parsed)} → ${sel?.name}`
            ) : (
              'Enviar Pedido'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
