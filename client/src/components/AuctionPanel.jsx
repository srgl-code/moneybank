import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Gavel, Loader2, X } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (value) => `M$ ${Number(value || 0).toLocaleString('pt-BR')}`;

export default function AuctionPanel() {
  const { gameState, currentPlayer, placeAuctionBid, passAuctionTurn, cancelAuction, addToast } = useGame();
  const auction = gameState?.auction;
  const [dismissedAuctionId, setDismissedAuctionId] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDismissedAuctionId(null);
    setBidAmount('');
  }, [auction?.id]);

  if (!auction || dismissedAuctionId === auction.id) return null;

  const participants = auction.participantIds
    .map((id) => gameState.players.find((player) => player.id === id))
    .filter(Boolean);
  const currentTurnPlayer = gameState.players.find((player) => player.id === auction.currentTurnPlayerId);
  const highestBidder = gameState.players.find((player) => player.id === auction.highestBidderId);
  const isMyTurn = auction.status === 'active' && currentPlayer?.id === auction.currentTurnPlayerId;
  const isParticipant = auction.participantIds.includes(currentPlayer?.id);
  const isBanker = currentPlayer?.isBanker;
  const minimumBid = Math.max(auction.startingBid || 0, (auction.currentBid || 0) + 1);
  const reservedBalance = auction.highestBidderId === currentPlayer?.id ? auction.currentBid : 0;
  const availableBalance = Math.max(0, (currentPlayer?.balance || 0) - reservedBalance);

  const submitBid = async (event) => {
    event.preventDefault();
    const amount = Number(bidAmount);
    if (!Number.isSafeInteger(amount) || amount < minimumBid) {
      addToast(`O lance mínimo é ${fmt(minimumBid)}.`, 'warning');
      return;
    }
    if (amount > (currentPlayer?.balance || 0)) {
      addToast('Saldo insuficiente para este lance.', 'error');
      return;
    }
    setBusy(true);
    try {
      await placeAuctionBid(auction.id, amount);
      setBidAmount('');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const passTurn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await passAuctionTurn(auction.id);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await cancelAuction(auction.id);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const isOver = auction.status !== 'active';
  const statusText = auction.status === 'completed'
    ? auction.winnerName ? `Leilão vencido por ${auction.winnerName}` : 'Leilão encerrado sem venda'
    : auction.status === 'cancelled' ? 'Leilão cancelado pelo Banco' : '';

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="auction-title" className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border border-outline-variant/50 bg-surface shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-700"><Gavel className="size-5" /></span>
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Leilão</p><h2 id="auction-title" className="truncate font-headline text-lg font-black text-on-surface">{auction.propertyId}</h2></div>
          </div>
          {isOver ? (
            <button type="button" onClick={() => setDismissedAuctionId(auction.id)} aria-label="Fechar leilão" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant"><X className="size-5" /></button>
          ) : isBanker ? (
            <button type="button" onClick={cancel} disabled={busy} className="min-h-11 rounded-xl px-3 text-xs font-bold text-error hover:bg-error/10 disabled:opacity-50">Encerrar</button>
          ) : <span className="grid size-10 shrink-0 place-items-center text-primary"><Clock3 className="size-5 animate-pulse" /></span>}
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4"><span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Lance atual</span><strong className="mt-1 block break-words font-headline text-2xl font-black text-primary sm:text-3xl">{auction.currentBid ? fmt(auction.currentBid) : 'Sem lances'}</strong></div>
            <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4"><span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Maior lance</span><span className="mt-2 flex min-w-0 items-center gap-2">{highestBidder ? <><PinDisplay avatar={highestBidder.avatar} color={highestBidder.color} photo={highestBidder.photo} size={28} /><strong className="truncate text-sm text-on-surface">{highestBidder.name}</strong></> : <strong className="text-sm text-on-surface-variant">Ninguém ainda</strong>}</span></div>
          </div>

          <div className={`rounded-2xl border p-4 ${isMyTurn ? 'border-primary/40 bg-primary/5' : 'border-outline-variant/50 bg-surface'}`}>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Agora é a vez de</span>
            <div className="mt-1 flex items-center gap-2">{currentTurnPlayer && <PinDisplay avatar={currentTurnPlayer.avatar} color={currentTurnPlayer.color} photo={currentTurnPlayer.photo} size={30} />}<strong className={`text-base ${isMyTurn ? 'text-primary' : 'text-on-surface'}`}>{isOver ? statusText : isMyTurn ? 'Você' : currentTurnPlayer?.name || 'Aguardando participante'}</strong></div>
            {!isOver && !isMyTurn && <p className="mt-1 text-sm text-on-surface-variant">Aguardando o lance de {currentTurnPlayer?.name || 'outro jogador'}...</p>}
            {isMyTurn && <p className="mt-1 text-xs text-on-surface-variant">Seu saldo disponível {fmt(availableBalance)} · lance mínimo {fmt(minimumBid)}</p>}
          </div>

          <section className="space-y-2"><h3 className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Participantes</h3><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {auction.participantIds.map((playerId) => {
              const player = gameState.players.find((item) => item.id === playerId);
              if (!player) return null;
              const passed = auction.passedPlayerIds.includes(playerId);
              const leader = auction.highestBidderId === playerId;
              const turn = auction.currentTurnPlayerId === playerId && !isOver;
              return <div key={playerId} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 ${turn ? 'border-primary bg-primary/5' : 'border-outline-variant/40 bg-surface'}`}><PinDisplay avatar={player.avatar} color={player.color} photo={player.photo} size={30} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{player.name}</span><span className="shrink-0 text-[10px] font-bold text-on-surface-variant">{passed ? 'Desistiu' : leader ? 'Maior lance' : turn ? 'Sua vez' : 'Participando'}</span></div>;
            })}
          </div></section>

          <details className="rounded-2xl border border-outline-variant/50 bg-surface p-4">
            <summary className="min-h-8 cursor-pointer text-sm font-bold text-on-surface">Histórico de lances ({auction.bids.length})</summary>
            <ol className="mt-3 space-y-2">
              {auction.bids.length ? auction.bids.slice().reverse().map((bid, index) => <li key={`${bid.playerId}-${bid.time}-${index}`} className="flex items-start justify-between gap-3 border-t border-outline-variant/30 pt-2 text-xs"><span className="min-w-0 break-words font-semibold">{bid.playerName}</span><span className="shrink-0 font-mono font-black text-primary">{fmt(bid.amount)}</span></li>) : <li className="text-xs text-on-surface-variant">Ainda não há lances.</li>}
            </ol>
          </details>
        </div>

        {!isOver && isMyTurn && isParticipant && (
          <form onSubmit={submitBid} className="shrink-0 space-y-2 border-t border-outline-variant/50 bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
            <label htmlFor="auction-bid" className="text-xs font-bold text-on-surface">Valor do lance</label>
            <div className="flex gap-2"><input id="auction-bid" type="number" min={minimumBid} step="1" inputMode="numeric" value={bidAmount} onChange={(event) => setBidAmount(event.target.value)} placeholder={String(minimumBid)} disabled={busy} className="field min-w-0 flex-1 font-mono text-lg" /><button type="submit" disabled={busy || !bidAmount} className="btn-primary min-h-12 w-auto shrink-0 whitespace-nowrap px-3 text-xs sm:px-6 sm:text-sm">{busy ? <Loader2 className="size-5 animate-spin" /> : <Gavel className="size-5" />}Dar lance</button></div>
            <div className="flex items-center justify-between gap-3"><span className="text-[10px] text-on-surface-variant">Saldo {fmt(availableBalance)}</span><button type="button" onClick={passTurn} disabled={busy} className="min-h-10 px-3 text-xs font-bold text-error hover:bg-error/5 disabled:opacity-50">Desistir do leilão</button></div>
          </form>
        )}
        {isOver && <footer className="shrink-0 border-t border-outline-variant/40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center sm:p-4"><span className="inline-flex items-center gap-2 text-sm font-bold text-primary"><CheckCircle2 className="size-5" />{auction.winnerName ? `${auction.winnerName} recebeu o título` : statusText}</span></footer>}
      </section>
    </div>
  );
}
