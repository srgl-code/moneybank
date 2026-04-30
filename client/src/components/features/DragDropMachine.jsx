import React, { useState } from 'react';
import { DndContext, DragOverlay, closestCenter, useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import PlayerCreditCard from '../ui/PlayerCreditCard.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;
const QUICK = [50, 100, 200, 500, 1000, 1500];
const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫'];

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
      className={`h-40 sm:h-32 rounded-2xl border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-200 ${bg}`}
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

export default function DragDropMachine({ players, onTransaction }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Slots state
  const [leftSlotId, setLeftSlotId] = useState(null);
  const [rightSlotId, setRightSlotId] = useState(null);

  const val = parseInt(amount) || 0;

  const pressKey = (k) => {
    if (k === '⌫') setAmount((a) => a.slice(0, -1));
    else if (amount.length < 8) setAmount((a) => a + k);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActivePlayer(active.data.current.player);
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

  const handleConfirm = async () => {
    if (!val || (!leftSlotId && !rightSlotId)) return;
    
    setBusy(true);
    setIsAnimating(true);

    // Wait for the slide-down animation to finish
    await new Promise(r => setTimeout(r, 600));

    try {
      if (leftSlotId && rightSlotId) {
        // Player to Player Transfer
        await onTransaction({ playerId: leftSlotId, amount: val, type: 'debit', reason: reason.trim() || 'Transferência (Envio)' });
        await onTransaction({ playerId: rightSlotId, amount: val, type: 'credit', reason: reason.trim() || 'Transferência (Recebimento)' });
      } else if (leftSlotId) {
        // Player pays Bank
        await onTransaction({ playerId: leftSlotId, amount: val, type: 'debit', reason: reason.trim() || 'Pagamento ao Banco' });
      } else if (rightSlotId) {
        // Bank pays Player
        await onTransaction({ playerId: rightSlotId, amount: val, type: 'credit', reason: reason.trim() || 'Recebimento do Banco' });
      }

      setAmount('');
      setReason('');
      setLeftSlotId(null);
      setRightSlotId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnimating(false);
      setBusy(false);
    }
  };

  const leftPlayer = players.find(p => p.id === leftSlotId);
  const rightPlayer = players.find(p => p.id === rightSlotId);
  
  // Cards still in wallet
  const walletPlayers = players.filter(p => p.id !== leftSlotId && p.id !== rightSlotId);
  const canConfirm = val > 0 && (leftSlotId || rightSlotId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto min-h-fit">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        
        {/* Top/Left Side: The Machine */}
        <div className="w-full lg:w-[420px] flex-shrink-0 bg-surface rounded-3xl shadow-xl border border-outline-variant overflow-hidden flex flex-col z-10">
          <div className="bg-surface-container-highest p-4 border-b border-outline-variant/30 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary">point_of_sale</span>
            <span className="text-primary text-xs font-bold uppercase tracking-[0.2em] font-headline">MAQUININHA</span>
          </div>

          <div className="p-4 sm:p-5 flex-1 flex flex-col">
            {/* Screen */}
            <div className="bg-[#dcfce7] rounded-xl p-4 mb-4 border-4 border-surface-container-highest shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-20 pointer-events-none"></div>
              <div className="text-[#166534] text-[10px] font-bold tracking-widest font-mono uppercase mb-1">VALOR DA TRANSAÇÃO</div>
              <div className="font-mono text-4xl font-black text-[#15803d] tracking-wider text-right">
                {val > 0 ? fmt(val) : 'M$ 0'}
              </div>
              <input
                type="text" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo (opcional)" 
                maxLength={50}
                className="w-full bg-transparent border-none outline-none text-[#166534] font-mono text-xs mt-2 border-b border-[#166534]/30 pb-1 focus:border-[#166534] placeholder-[#166534]/50"
              />
              
              {/* Transfer visualization on screen if both slots occupied */}
              {leftPlayer && rightPlayer && (
                 <div className="flex justify-center items-center gap-2 mt-3 text-[#166534] text-[10px] font-bold uppercase tracking-wider border-t border-[#166534]/20 pt-2">
                    <span>{leftPlayer.name}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{rightPlayer.name}</span>
                 </div>
              )}
            </div>

            {/* Slots */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <SlotZone 
                id="debit-zone" 
                label="Paga" 
                isDebit={true} 
                cardPlayer={leftPlayer} 
                onRemove={() => setLeftSlotId(null)}
                isAnimating={isAnimating}
              />
              <SlotZone 
                id="credit-zone" 
                label="Recebe" 
                isDebit={false} 
                cardPlayer={rightPlayer} 
                onRemove={() => setRightSlotId(null)}
                isAnimating={isAnimating}
              />
            </div>

            {/* Numpad & Quick Amounts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK.map((v) => (
                <button
                  key={v} type="button" onClick={() => setAmount(String(v))}
                  className={`
                    py-2 rounded-lg text-xs font-bold font-headline cursor-pointer transition-all border
                    ${amount === String(v)
                      ? 'bg-primary text-on-primary border-primary shadow-md'
                      : 'bg-surface-container-high text-on-surface border-outline-variant/30 hover:bg-surface-container-highest active:scale-95'
                    }
                  `}
                >
                  {fmt(v)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {NUMPAD.map((k, i) => (
                <button
                  key={i} onClick={() => pressKey(k)} disabled={busy}
                  className={`
                    py-3 rounded-xl text-xl font-bold font-headline cursor-pointer transition-all active:scale-95 shadow-sm
                    ${k === '⌫' 
                      ? 'bg-error/10 text-error hover:bg-error/20 border border-error/20' 
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/20'}
                    ${busy ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || busy}
              className={`
                w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 mt-auto
                ${canConfirm 
                  ? 'bg-primary text-on-primary hover:shadow-lg hover:scale-[1.02] cursor-pointer' 
                  : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-70'}
              `}
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {busy ? 'Processando...' : 'Confirmar Transação'}
            </button>
          </div>
        </div>

        {/* Bottom/Right Side: Players Cards (Wallet style) */}
        <div className="flex-1 bg-surface-container-low rounded-3xl p-4 sm:p-6 border border-outline-variant/50 relative flex flex-col min-h-[400px]">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Carteira de Jogadores</h3>
              <p className="text-xs text-on-surface-variant">Arraste os cartões para a maquininha</p>
            </div>
            {walletPlayers.length > 0 && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">
                {walletPlayers.length} disponíveis
              </span>
            )}
          </div>

          <div className="flex-1 pb-10">
            {/* Wallet style stacked layout (um por cima do outro) */}
            <div className="flex flex-col items-center pt-2">
              <AnimatePresence>
                {walletPlayers.map((p, index) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: activePlayer?.id === p.id ? 0 : 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-[320px] transition-transform hover:-translate-y-4 hover:z-10 focus-within:z-10"
                    style={{
                      marginTop: index === 0 ? 0 : '-5rem', // Overlapping effect like a real wallet
                      zIndex: index,
                    }}
                  >
                    <PlayerCreditCard player={p} isDraggable={!busy} className="shadow-xl" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {players.length === 0 && (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-on-surface-variant/50">
                <span className="material-symbols-outlined text-4xl mb-2">wallet</span>
                <p>Nenhum jogador na sala</p>
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activePlayer ? (
            <PlayerCreditCard player={activePlayer} isDraggable={false} className="shadow-2xl scale-110" />
          ) : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
}
