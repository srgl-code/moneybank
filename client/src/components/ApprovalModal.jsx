import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, X, XCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

function PlayerCard({ id, name, avatar, color, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 shadow-sm select-none transition-shadow"
      style={{
        ...style,
        background: `${color}10`,
        borderColor: `${color}50`,
      }}
    >
      <PinDisplay avatar={avatar} color={color} size={22} />
      <span className="text-on-surface font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis">{name}</span>
    </div>
  );
}

function TrayZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'zone-tray' });
  return (
    <div
      ref={setNodeRef}
      className={`flex gap-2 justify-center min-h-[3.5rem] p-2 rounded-xl border border-dashed transition-colors ${isOver ? 'bg-surface-container border-outline' : 'bg-surface-container-low border-outline-variant/30'}`}
    >
      {children}
    </div>
  );
}

function DropZone({ id, label, icon, filled, isCorrect, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  let borderClass = 'border-outline-variant/40';
  let bgClass = 'bg-surface-container-low';
  let labelClass = 'text-on-surface-variant';

  if (filled && isCorrect) { borderClass = 'border-success/60'; bgClass = 'bg-success/5'; labelClass = 'text-success'; }
  else if (filled && isCorrect === false) { borderClass = 'border-error/60'; bgClass = 'bg-error/5'; labelClass = 'text-error'; }
  else if (filled) { borderClass = 'border-primary/40'; bgClass = 'bg-primary/5'; }
  else if (isOver) { borderClass = 'border-primary/50'; bgClass = 'bg-primary/5'; }

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[6rem] rounded-2xl border-2 border-dashed ${borderClass} ${bgClass} flex flex-col items-center justify-center gap-1.5 transition-all p-3`}
    >
      <span className={`text-[10px] font-extrabold tracking-widest uppercase flex items-center gap-1 ${labelClass}`}>
        {icon} {label}
      </span>
      {children || (
        <span className="text-xs text-on-surface-variant/50">
          {isOver ? '✓ Largar aqui' : 'Arrastar aqui'}
        </span>
      )}
    </div>
  );
}

export default function ApprovalModal({ req, onApprove, onReject, onClose }) {
  const [payerZone, setPayerZone] = useState(null);
  const [receiverZone, setReceiverZone] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const payerCorrect = payerZone === null ? null : payerZone === req.fromId;
  const receiverCorrect = receiverZone === null ? null : receiverZone === req.toId;
  const canApprove = payerCorrect === true && receiverCorrect === true;

  const inTray = [req.fromId, req.toId].filter((id) => id !== payerZone && id !== receiverZone);

  const cardData = {
    [req.fromId]: { name: req.fromName, avatar: req.fromAvatar, color: req.fromColor ?? '#ef4444' },
    [req.toId]: { name: req.toName, avatar: req.toAvatar, color: req.toColor ?? '#3b82f6' },
  };

  const handleDragStart = ({ active }) => setDraggingId(active.id);
  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null);
    if (!over) return;
    const cardId = active.id;
    const zone = over.id;
    if (zone === 'zone-payer') { setPayerZone(cardId); if (receiverZone === cardId) setReceiverZone(null); }
    else if (zone === 'zone-receiver') { setReceiverZone(cardId); if (payerZone === cardId) setPayerZone(null); }
    else if (zone === 'zone-tray') { if (payerZone === cardId) setPayerZone(null); if (receiverZone === cardId) setReceiverZone(null); }
  };

  const handleApprove = async () => { if (!canApprove || busy) return; setBusy(true); try { await onApprove(req.requestId); } finally { setBusy(false); } };
  const handleReject = async () => { if (busy) return; setBusy(true); try { await onReject(req.requestId); } finally { setBusy(false); } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-md bg-surface rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-outline-variant/15">
          <h2 className="font-headline font-black text-base text-on-surface flex items-center gap-2">
            <span className="text-xl">💳</span> Aprovar Pedido
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Amount + flow */}
          <div className="text-center py-4 rounded-2xl bg-amber-50 border border-amber-200/60">
            <span className="font-headline font-black text-3xl text-amber-700 balance-text">{fmt(req.amount)}</span>
            {req.reason && <div className="text-amber-600/80 text-xs mt-1 italic">"{req.reason}"</div>}
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-amber-600 font-semibold">
              <span>{req.fromName}</span>
              <ArrowRight className="w-3 h-3" />
              <span>{req.toName}</span>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-xs text-on-surface-variant text-center leading-relaxed">
            Confirma quem <strong className="text-on-surface">paga</strong> e quem <strong className="text-on-surface">recebe</strong> arrastando os jogadores.
          </p>

          {/* DnD area */}
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <TrayZone>
              {inTray.map((id) => <PlayerCard key={id} id={id} isDragging={draggingId === id} {...cardData[id]} />)}
              {inTray.length === 0 && <span className="text-on-surface-variant/40 text-xs self-center">Todos colocados</span>}
            </TrayZone>

            <div className="flex gap-3">
              <DropZone id="zone-payer" label="Paga" icon="💸" filled={payerZone !== null} isCorrect={payerCorrect}>
                {payerZone && <PlayerCard key={payerZone} id={payerZone} isDragging={draggingId === payerZone} {...cardData[payerZone]} />}
              </DropZone>
              <DropZone id="zone-receiver" label="Recebe" icon="🏦" filled={receiverZone !== null} isCorrect={receiverCorrect}>
                {receiverZone && <PlayerCard key={receiverZone} id={receiverZone} isDragging={draggingId === receiverZone} {...cardData[receiverZone]} />}
              </DropZone>
            </div>

            <DragOverlay>
              {draggingId && (() => {
                const d = cardData[draggingId];
                return (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl pointer-events-none shadow-lg"
                    style={{ background: `${d.color}15`, border: `2px solid ${d.color}`, boxShadow: `0 16px 40px ${d.color}30` }}>
                    <PinDisplay avatar={d.avatar} color={d.color} size={22} />
                    <span className="text-on-surface font-bold text-sm">{d.name}</span>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>

          {/* Validation hint */}
          <AnimatePresence>
            {(payerCorrect === false || receiverCorrect === false) && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-error text-center font-semibold"
              >
                {payerCorrect === false ? `⚠️ Quem paga é ${req.fromName}` : `⚠️ Quem recebe é ${req.toName}`}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-error/20 bg-error/5 text-error font-bold text-sm transition-all hover:bg-error/15 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Rejeitar
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={!canApprove || busy}
              className={`
                flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all
                ${canApprove
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md hover:shadow-lg cursor-pointer'
                  : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                }
                ${busy ? 'opacity-60' : ''}
              `}
            >
              {busy
                ? <><Loader2 className="w-4 h-4 animate-spin" /> A aprovar…</>
                : <><CheckCircle className="w-4 h-4" /> APROVAR</>
              }
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
