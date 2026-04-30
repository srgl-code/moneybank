import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
import { Loader2, X, XCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import PlayerCreditCard from './ui/PlayerCreditCard.jsx';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

function SlotZone({ id, label, isDebit, cardPlayer, onRemove, isAnimating }) {
  const { isOver, setNodeRef } = useDroppable({ id, data: { isDebit } });
  
  const bg = isOver 
    ? (isDebit ? 'bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]')
    : 'bg-surface-container border-dashed border-outline-variant hover:bg-surface-container-high';

  const textColor = isDebit ? 'text-red-500' : 'text-green-500';
  const icon = isDebit ? '💸' : '💰';

  return (
    <div 
      ref={setNodeRef} 
      className={`h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-200 ${bg}`}
    >
      <AnimatePresence mode="popLayout">
        {cardPlayer ? (
          <motion.div
            key={cardPlayer.id}
            initial={{ y: -50, opacity: 0 }}
            animate={isAnimating ? { y: 150, opacity: 0, transition: { duration: 0.5, ease: "easeIn" } } : { y: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2"
          >
            <div className="transform scale-75 origin-center w-full max-w-[280px]">
              <PlayerCreditCard player={cardPlayer} isDraggable={false} />
            </div>
            {!isAnimating && (
              <button 
                onClick={onRemove}
                className="absolute -top-1 -right-1 w-6 h-6 bg-surface text-on-surface-variant rounded-full shadow-md flex items-center justify-center border border-outline-variant hover:bg-error hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center pointer-events-none"
          >
            <span className="text-3xl mb-2 drop-shadow-sm">{icon}</span>
            <span className={`font-bold font-headline text-sm uppercase tracking-widest ${textColor}`}>{label}</span>
            <span className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-wider opacity-70">Inserir Cartão</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ApprovalModal({ req, isBankTransaction, onApprove, onReject, onClose }) {
  const [busy, setBusy] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Players involved
  const payerPlayer = {
    id: req.fromId,
    name: req.fromName,
    avatar: req.fromAvatar,
    color: req.fromColor
  };

  const receiverPlayer = !isBankTransaction && req.toId ? {
    id: req.toId,
    name: req.toName,
    avatar: req.toAvatar,
    color: req.toColor
  } : null;

  // State for slots
  const [leftSlotId, setLeftSlotId] = useState(null);
  const [rightSlotId, setRightSlotId] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);

  const handleDragStart = (event) => {
    setActivePlayer(event.active.data.current.player);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActivePlayer(null);

    if (!over) return;

    const player = active.data.current.player;
    const isDebit = over.data.current.isDebit;

    if (isDebit) {
      if (rightSlotId === player.id) setRightSlotId(null);
      setLeftSlotId(player.id);
    } else {
      if (leftSlotId === player.id) setLeftSlotId(null);
      setRightSlotId(player.id);
    }
  };

  const handleApprove = async () => {
    if (busy) return;
    
    setBusy(true);
    setIsAnimating(true);
    
    // Wait for the slide-down animation
    await new Promise(r => setTimeout(r, 600));

    try {
      await onApprove(req.requestId);
    } finally {
      setIsAnimating(false);
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onReject(req.requestId);
    } finally {
      setBusy(false);
    }
  };

  const leftPlayer = leftSlotId === payerPlayer.id ? payerPlayer : (leftSlotId === receiverPlayer?.id ? receiverPlayer : null);
  const rightPlayer = rightSlotId === payerPlayer.id ? payerPlayer : (rightSlotId === receiverPlayer?.id ? receiverPlayer : null);

  const walletPlayers = [payerPlayer, receiverPlayer].filter(Boolean).filter(p => p.id !== leftSlotId && p.id !== rightSlotId);

  // Validation: Payer must be in left slot. If there is a receiver, it must be in right slot.
  const payerCorrect = leftSlotId === payerPlayer.id;
  const receiverCorrect = receiverPlayer ? rightSlotId === receiverPlayer.id : true;
  const canApprove = payerCorrect && receiverCorrect;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-surface rounded-[2rem] overflow-hidden shadow-2xl border border-outline-variant/30 flex flex-col"
      >
        {/* Header */}
        <div className="bg-surface-container-highest flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline font-black text-sm uppercase tracking-[0.15em] text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">fact_check</span> Aprovar Pedido
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto hide-scrollbar">
          {/* Display Screen */}
          <div className="bg-[#dcfce7] rounded-xl p-4 border-4 border-surface-container-highest shadow-inner relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-20 pointer-events-none"></div>
            <div className="text-[#166534] text-[10px] font-bold tracking-widest font-mono uppercase mb-2">VALOR DA TRANSAÇÃO</div>
            <div className="font-mono text-4xl font-black text-[#15803d] tracking-wider mb-2 drop-shadow-sm">
              {fmt(req.amount)}
            </div>
            {req.reason && <div className="text-[#166534] text-xs font-bold uppercase tracking-wider mb-2">"{req.reason}"</div>}
            
            <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-[#166534]/20 text-xs text-[#166534] font-bold">
              <span className="flex items-center gap-1"><PinDisplay avatar={req.fromAvatar} size={14}/> {req.fromName}</span>
              <ArrowRight className="w-3 h-3" />
              <span className="flex items-center gap-1">{receiverPlayer ? <><PinDisplay avatar={req.toAvatar} size={14}/> {req.toName}</> : 'Banco'}</span>
            </div>
          </div>

          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            {/* Slots */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              <SlotZone 
                id="zone-payer" 
                label="Paga" 
                isDebit={true} 
                cardPlayer={leftPlayer}
                onRemove={() => setLeftSlotId(null)}
                isAnimating={isAnimating}
              />
              {receiverPlayer ? (
                <SlotZone 
                  id="zone-receiver" 
                  label="Recebe" 
                  isDebit={false} 
                  cardPlayer={rightPlayer}
                  onRemove={() => setRightSlotId(null)}
                  isAnimating={isAnimating}
                />
              ) : (
                <div className="h-32 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-container-low flex flex-col items-center justify-center p-2 opacity-50">
                  <span className="text-3xl mb-2">🏦</span>
                  <span className="font-bold font-headline text-sm uppercase tracking-widest text-on-surface-variant">Banco</span>
                  <span className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-wider text-center">Pagamento direto<br/>ao banco</span>
                </div>
              )}
            </div>

            {/* Wallet for Approval Modal */}
            {walletPlayers.length > 0 && (
              <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/50">
                <p className="text-xs text-on-surface-variant text-center mb-3">Arraste os cartões para os slots corretos</p>
                <div className="flex flex-col items-center gap-2">
                  <AnimatePresence>
                    {walletPlayers.map((p, idx) => (
                      <motion.div
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: activePlayer?.id === p.id ? 0 : 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="w-full max-w-[280px] z-10"
                        style={{ marginTop: idx > 0 ? '-3rem' : 0 }}
                      >
                        <PlayerCreditCard player={p} isDraggable={!busy} className="shadow-lg" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activePlayer ? (
                <PlayerCreditCard player={activePlayer} isDraggable={false} className="shadow-2xl scale-105" />
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Validation hint */}
          <AnimatePresence>
            {(!payerCorrect || !receiverCorrect) && (leftSlotId || rightSlotId) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-error text-center font-semibold mt-1"
              >
                {!payerCorrect ? `⚠️ Quem paga é ${req.fromName}` : `⚠️ Quem recebe é ${req.toName}`}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="flex-[1] flex items-center justify-center gap-1.5 py-3.5 rounded-xl border border-error/20 bg-error/5 text-error font-bold text-sm transition-all hover:bg-error/15 disabled:opacity-50 active:scale-[0.98]"
            >
              <XCircle className="w-5 h-5" />
              Rejeitar
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove || busy}
              className={`
                flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase transition-all shadow-md active:scale-[0.98]
                ${canApprove
                  ? 'bg-primary text-on-primary hover:shadow-lg hover:bg-primary/90 cursor-pointer'
                  : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-70'
                }
              `}
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {busy ? 'Aprovando...' : 'Aprovar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
