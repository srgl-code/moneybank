import React, { useState } from 'react';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { PinDisplay } from './PinIcon.jsx';

const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;

/** Small draggable player card */
function PlayerCard({ id, name, avatar, color, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none',
    cursor: isDragging ? 'grabbing' : 'grab',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 0.875rem',
    borderRadius: '0.875rem',
    background: `linear-gradient(135deg, ${color}22, ${color}11)`,
    border: `2px solid ${color}88`,
    boxShadow: isDragging ? `0 12px 32px ${color}44` : `0 2px 8px rgba(0,0,0,0.3)`,
    opacity: isDragging ? 0.4 : 1,
    transition: 'box-shadow 0.15s, opacity 0.15s',
    userSelect: 'none',
    minWidth: 0,
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <PinDisplay avatar={avatar} size={22} />
      <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </span>
    </div>
  );
}

/** Tray holding area (droppable) */
function TrayZone({ children }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'zone-tray' });
  return (
    <div ref={setNodeRef} style={{
      display: 'flex', gap: '0.5rem', justifyContent: 'center',
      minHeight: '3.5rem', padding: '0.5rem', borderRadius: '0.75rem',
      background: isOver ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
      border: '1px dashed rgba(255,255,255,0.06)', transition: 'background 0.15s',
    }}>
      {children}
    </div>
  );
}

/** Drop zone (left = payer, right = receiver) */
function DropZone({ id, label, color, filled, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const correct = filled;
  const borderColor = correct ? '#4ade80' : isOver ? color : 'rgba(255,255,255,0.12)';
  const bg = correct ? 'rgba(74,222,128,0.08)' : isOver ? `${color}11` : 'rgba(255,255,255,0.02)';
  return (
    <div ref={setNodeRef} style={{
      flex: 1,
      minHeight: '6rem',
      borderRadius: '1rem',
      border: `2px dashed ${borderColor}`,
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.375rem',
      transition: 'border-color 0.15s, background 0.15s',
      padding: '0.75rem',
    }}>
      <span style={{ fontSize: '0.625rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: correct ? '#4ade80' : color, marginBottom: '0.25rem' }}>
        {label}
      </span>
      {children || (
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
          {isOver ? 'Largar aqui ✓' : 'Arrastar aqui'}
        </span>
      )}
    </div>
  );
}

/**
 * Drag-and-drop approval modal for the banker.
 * req = { requestId, fromId, fromName, fromAvatar, fromColor, toId, toName, toAvatar, toColor, amount, reason }
 */
export default function ApprovalModal({ req, onApprove, onReject, onClose }) {
  // Which card is placed in which zone  null | 'payer' | 'receiver'
  const [payerZone, setPayerZone]     = useState(null); // which card id is in zone-payer
  const [receiverZone, setReceiverZone] = useState(null); // which card id is in zone-receiver
  const [draggingId, setDraggingId]   = useState(null);
  const [busy, setBusy]               = useState(false);

  const payerCorrect    = payerZone    === req.fromId;
  const receiverCorrect = receiverZone === req.toId;
  const canApprove      = payerCorrect && receiverCorrect;

  // Cards currently in the holding tray (not placed in any zone)
  const inTray = [req.fromId, req.toId].filter(
    id => id !== payerZone && id !== receiverZone
  );

  const cardData = {
    [req.fromId]: { name: req.fromName, avatar: req.fromAvatar, color: req.fromColor ?? '#ef4444' },
    [req.toId]:   { name: req.toName,   avatar: req.toAvatar,   color: req.toColor   ?? '#3b82f6' },
  };

  const handleDragStart = ({ active }) => setDraggingId(active.id);

  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null);
    if (!over) return;
    const cardId = active.id;
    const zone   = over.id; // 'zone-payer' | 'zone-receiver' | 'zone-tray'

    if (zone === 'zone-payer') {
      // Evict whatever was there before back to tray
      if (payerZone && payerZone !== cardId) {
        // already evicted by removing from payerZone
      }
      setPayerZone(cardId);
      if (receiverZone === cardId) setReceiverZone(null);
    } else if (zone === 'zone-receiver') {
      setReceiverZone(cardId);
      if (payerZone === cardId) setPayerZone(null);
    } else if (zone === 'zone-tray') {
      if (payerZone === cardId)    setPayerZone(null);
      if (receiverZone === cardId) setReceiverZone(null);
    }
  };

  const handleApprove = async () => {
    if (!canApprove || busy) return;
    setBusy(true);
    try { await onApprove(req.requestId); } finally { setBusy(false); }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy(true);
    try { await onReject(req.requestId); } finally { setBusy(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0.75rem',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: '28rem',
        borderRadius: '1.5rem', overflow: 'hidden',
        animation: 'scaleIn 0.28s cubic-bezier(.22,1,.36,1) both',
        background: 'linear-gradient(145deg,#0d1f10 0%,#091409 100%)',
        border: '1px solid var(--green-border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--green-border)' }}>
          <h2 style={{ color: 'white', fontWeight: 900, fontSize: '1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💳</span> Aprovar Pedido
          </h2>
          <button onClick={onClose} style={{ width: '2rem', height: '2rem', borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#16a34a' }}>
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Amount pill */}
          <div style={{ textAlign: 'center', padding: '0.75rem', borderRadius: '0.875rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <span className="balance-text" style={{ fontWeight: 900, fontFamily: 'monospace', fontSize: '1.75rem', color: 'var(--gold)' }}>{fmt(req.amount)}</span>
            {req.reason && <div style={{ color: '#86efac', fontSize: '0.75rem', marginTop: '0.25rem' }}>"{req.reason}"</div>}
          </div>

          {/* Instructions */}
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#86efac', textAlign: 'center', lineHeight: 1.5 }}>
            Arrasta <strong style={{ color: 'white' }}>quem paga</strong> para a esquerda e <strong style={{ color: 'white' }}>quem recebe</strong> para a direita.
          </p>

          {/* DnD area */}
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Tray (holding area) */}
            <TrayZone>
              {inTray.map(id => (
                <PlayerCard key={id} id={id} isDragging={draggingId === id} {...cardData[id]} />
              ))}
              {inTray.length === 0 && (
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', alignSelf: 'center' }}>Tabuleiro</span>
              )}
            </TrayZone>

            {/* Drop zones */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <DropZone id="zone-payer" label="💸 Paga" color="#f87171" filled={payerZone !== null}>
                {payerZone && <PlayerCard key={payerZone} id={payerZone} isDragging={draggingId === payerZone} {...cardData[payerZone]} />}
              </DropZone>
              <DropZone id="zone-receiver" label="🏦 Recebe" color="#4ade80" filled={receiverZone !== null}>
                {receiverZone && <PlayerCard key={receiverZone} id={receiverZone} isDragging={draggingId === receiverZone} {...cardData[receiverZone]} />}
              </DropZone>
            </div>

            {/* Drag overlay for smooth visual */}
            <DragOverlay>
              {draggingId && (() => {
                const d = cardData[draggingId];
                return (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.625rem 0.875rem', borderRadius: '0.875rem',
                    background: `linear-gradient(135deg, ${d.color}33, ${d.color}22)`,
                    border: `2px solid ${d.color}`,
                    boxShadow: `0 16px 40px ${d.color}55`,
                    cursor: 'grabbing',
                    pointerEvents: 'none',
                  }}>
                    <PinDisplay avatar={d.avatar} size={22} />
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>{d.name}</span>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>

          {/* Validation hint */}
          {(!payerCorrect || !receiverCorrect) && (payerZone !== null || receiverZone !== null) && (
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#f87171', textAlign: 'center' }}>
              {!payerCorrect && payerZone !== null ? `⚠️ Quem paga é ${req.fromName}, não ${cardData[payerZone]?.name}` :
               !receiverCorrect && receiverZone !== null ? `⚠️ Quem recebe é ${req.toName}, não ${cardData[receiverZone]?.name}` : ''}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleReject} disabled={busy}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderRadius: '0.875rem', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontWeight: 700, fontSize: '0.875rem', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
              <XCircle style={{ width: '1rem', height: '1rem' }} /> Rejeitar
            </button>
            <button onClick={handleApprove} disabled={!canApprove || busy}
              style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.75rem', borderRadius: '0.875rem', border: 'none', background: canApprove ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.06)', color: canApprove ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 900, fontSize: '0.9375rem', cursor: canApprove && !busy ? 'pointer' : 'not-allowed', opacity: busy ? 0.5 : 1, boxShadow: canApprove ? '0 6px 20px rgba(34,197,94,0.35)' : 'none', transition: 'all 0.2s' }}>
              <CheckCircle style={{ width: '1rem', height: '1rem' }} /> {busy ? 'A aprovar…' : 'APROVAR TRANSAÇÃO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
