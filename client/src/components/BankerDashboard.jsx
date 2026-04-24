import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, X, Loader2, LogOut } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import CardMachine from './CardMachine.jsx';
import ApprovalModal from './ApprovalModal.jsx';
import AppHeader from './ui/AppHeader.jsx';
import BottomNav from './ui/BottomNav.jsx';
import PageTransition from './ui/PageTransition.jsx';
import { PinDisplay } from './PinIcon.jsx';
import { GameAnalytics } from './features/GameAnalytics.jsx';
import { QuickActionButton } from './ui/QuickActionButton.jsx';
import { StatCard } from './ui/StatCard.jsx';
import { ActivityFeed } from './features/ActivityFeed.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

export default function BankerDashboard() {
  const {
    roomCode, gameState, currentPlayer, pendingTransfers,
    adjustBalance, resetBalances, closeRoom, leaveRoom, addToast,
    approveTransfer, rejectTransfer, passGo, startAuction, assignProperty
  } = useGame();

  const [tab, setTab] = useState('players');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confReset, setConfReset] = useState(false);
  const [confClose, setConfClose] = useState(false);
  const [adj, setAdj] = useState(null);
  const [adjAmt, setAdjAmt] = useState('');
  const [adjRsn, setAdjRsn] = useState('');
  const [cardPlayer, setCardPlayer] = useState(null);
  const [approvalReq, setApprovalReq] = useState(null);
  const [passGoPlayer, setPassGoPlayer] = useState(null); // null = closed, 'picking' = open picker
  const [finePlayer, setFinePlayer] = useState(null); // null = closed, 'picking' = open picker

  const pending = pendingTransfers ?? [];
  const players = (gameState?.players ?? []).filter((p) => !p.isBanker);
  const totalFines = (gameState?.history ?? []).filter(h => h.description?.toLowerCase().includes('multa')).reduce((acc, h) => acc + h.amount, 0);
  const totalWealth = players.reduce((acc, p) => acc + p.balance, 0);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { addToast('Não foi possível copiar', 'warning'); }
  };

  const openAdj = useCallback((p, mode) => {
    if (mode === 'debit') { setCardPlayer(p); return; }
    setAdj({ id: p.id, name: p.name, mode });
    setAdjAmt(''); setAdjRsn('');
  }, []);

  const cancelAdj = useCallback(() => { setAdj(null); setAdjAmt(''); setAdjRsn(''); }, []);

  const submitAdj = useCallback(async (e) => {
    e.preventDefault();
    const amt = parseInt(adjAmt, 10);
    if (!amt || amt <= 0) return addToast('Insere um valor válido', 'error');
    if (amt > 1_000_000_000) return addToast('Valor demasiado alto', 'error');
    setBusy(true);
    try {
      await adjustBalance(adj.id, adj.mode === 'debit' ? -amt : amt, adjRsn.trim() || undefined);
      addToast(adj.mode === 'credit' ? `✅ ${fmt(amt)} creditado a ${adj.name}` : `✅ ${fmt(amt)} debitado de ${adj.name}`, 'success');
      cancelAdj();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  }, [adj, adjAmt, adjRsn, adjustBalance, addToast, cancelAdj]);

  const doReset = async () => { setBusy(true); try { await resetBalances(); setConfReset(false); } catch (e) { addToast(e.message, 'error'); } finally { setBusy(false); } };
  const doClose = async () => { try { await closeRoom(); } catch (e) { addToast(e.message, 'error'); } };

  const doPassGo = async (player) => {
    setPassGoPlayer(null);
    const amount = gameState?.startingPassGo || 200;
    try {
      await adjustBalance(player.id, amount, `Largada (+M$ ${amount.toLocaleString('pt-BR')})`);
      addToast(`🏁 ${player.name} passou pela Largada! +M$ ${amount.toLocaleString('pt-BR')}`, 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const doFine = async (player) => {
    setFinePlayer(null);
    try {
      await adjustBalance(player.id, -100, 'Multa (M$ 100)');
      addToast(`⚖️ ${player.name} foi multado em M$ 100`, 'warning');
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <PageTransition className="min-h-screen bg-surface flex flex-col pb-32 md:pb-0">
      <AppHeader
        rightContent={
          <div className="flex items-center gap-2">
            <motion.button
              onClick={copyCode}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant transition-all shadow-sm"
            >
              <span className="font-headline font-black text-sm tracking-[0.25em] text-on-surface">Sala {roomCode}</span>
              {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-on-surface-variant" />}
            </motion.button>
            <button
              onClick={leaveRoom}
              title="Sair da sala"
              className="p-2 rounded-xl hover:bg-error/10 text-on-surface-variant hover:text-error transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <main id="main-content" className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6">
        
        {/* Top Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon="💰" label="Circulação" value={totalWealth} isCurrency={true} color="teal" />
          <StatCard icon="👥" label="Jogadores" value={players.length} color="slate" />
          <StatCard icon="⏳" label="Pendentes" value={pending.length} color="gold" />
        </div>

        {/* Game Analytics Overview */}
        <GameAnalytics players={players} totalFines={totalFines} />

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <QuickActionButton 
            icon="🏁" 
            label="Largada" 
            onClick={() => setPassGoPlayer('picking')} 
            color="teal" 
          />
          <QuickActionButton 
            icon="⚖️" 
            label="Multa" 
            onClick={() => setFinePlayer('picking')} 
            color="coral" 
          />
          <QuickActionButton 
            icon="🏠" 
            label="Leilão" 
            onClick={() => startAuction(1)} // Mock starting an auction for property 1
            color="orange" 
          />
        </div>

        {/* Main Content Area */}
        <section className="card flex flex-col h-[500px] p-6 mt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
              <SegmentedControl
                options={[
                  { value: 'players', label: 'Jogadores' },
                  { value: 'machine', label: `Aprovações (${pending.length})` },
                  { value: 'history', label: 'Extrato' },
                  { value: 'properties', label: 'Imóveis' }
                ]}
                value={tab}
                onChange={setTab}
              />
            </div>
            
            {/* Reset / Close controls */}
            <div className="flex items-center gap-2 shrink-0">
              {!confReset ? (
                <button onClick={() => setConfReset(true)} className="btn-secondary text-xs gap-1.5 px-3 py-1.5">
                  <RefreshCw className="w-3 h-3" /> Reiniciar
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs bg-surface-container-high px-2 py-1 rounded-xl">
                  <span className="text-tertiary font-bold">Certeza?</span>
                  <button onClick={doReset} disabled={busy} className="px-2 py-1 rounded text-on-tertiary bg-tertiary border-none">Sim</button>
                  <button onClick={() => setConfReset(false)} className="px-2 py-1 rounded bg-surface text-on-surface-variant border-none">Não</button>
                </div>
              )}
              {!confClose ? (
                <button onClick={() => setConfClose(true)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-error/10 text-error hover:bg-error/20 transition-all">
                  Encerrar
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs bg-error/10 px-2 py-1 rounded-xl">
                  <span className="text-error font-bold">Encerrar?</span>
                  <button onClick={doClose} className="px-2 py-1 rounded text-on-secondary bg-error border-none">Sim</button>
                  <button onClick={() => setConfClose(false)} className="px-2 py-1 rounded bg-surface text-on-surface-variant border-none">Não</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar relative">
            <AnimatePresence mode="wait">
              {tab === 'players' && (
                <motion.div key="players" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-4">
                  {players.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center justify-center opacity-60">
                      <span className="text-5xl mb-4">👥</span>
                      <p className="font-bold text-lg">Nenhum jogador na sala.</p>
                      <p className="text-sm">Compartilhe o código da sala acima.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {[...players].sort((a, b) => b.balance - a.balance).map((p, i) => (
                        <PlayerRow
                          key={p.id} p={p} rank={i + 1}
                          expanded={adj?.id === p.id} mode={adj?.id === p.id ? adj.mode : null}
                          amt={adjAmt} rsn={adjRsn} onAmt={setAdjAmt} onRsn={setAdjRsn}
                          onCredit={() => openAdj(p, 'credit')} onDebit={() => openAdj(p, 'debit')}
                          onCancel={cancelAdj} onSubmit={submitAdj} busy={busy}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'machine' && (
                <motion.div key="machine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {pending.length === 0 ? (
                    <div className="text-center py-20 flex flex-col items-center justify-center opacity-60">
                      <span className="text-5xl mb-4">💳</span>
                      <p className="font-bold text-lg">Nenhum pedido pendente.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {pending.map((req) => (
                        <motion.button
                          key={req.requestId}
                          onClick={() => setApprovalReq(req)}
                          whileTap={{ scale: 0.98 }}
                          className="w-full text-left card p-4 cursor-pointer transition-all hover:shadow-card-hover border border-primary/20 bg-surface-container-high/50"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1.5">
                                <PinDisplay avatar={req.fromAvatar} size={18} />
                                <span className="text-on-surface font-semibold text-sm">{req.fromName}</span>
                              </span>
                              <span className="text-primary text-xs font-bold">→</span>
                              <span className="flex items-center gap-1.5">
                                <PinDisplay avatar={req.toAvatar} size={18} />
                                <span className="text-on-surface font-semibold text-sm">{req.toName}</span>
                              </span>
                            </div>
                            <span className="font-headline font-black text-lg text-tertiary balance-text">{fmt(req.amount)}</span>
                          </div>
                          {req.reason && <div className="mt-1.5 text-xs text-on-surface-variant italic">"{req.reason}"</div>}
                          <div className="mt-3 text-xs text-primary font-bold uppercase tracking-wider">Toca para revisar ▶</div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
                  <ActivityFeed history={gameState?.history ?? []} />
                </motion.div>
              )}

              {tab === 'properties' && (
                <motion.div key="properties" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full opacity-60">
                  <span className="text-5xl mb-4">🏠</span>
                  <p className="font-bold text-lg">Gestão de Imóveis (Em Breve)</p>
                  <p className="text-sm mt-1 text-center max-w-md">O banco poderá atribuir, remover e leiloar propriedades diretamente nesta aba.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

      </main>

      {/* Keep bottom nav for mobile consistency, or could hide it. Let's hide it for banker if they prefer tabs. Actually, leave it for now. */}
      <BottomNav
        activeTab={tab === 'players' ? 'ledger' : tab === 'machine' ? 'ranking' : 'banker'}
        onTabChange={(t) => setTab(t === 'ledger' ? 'players' : t === 'ranking' ? 'machine' : 'history')}
        showBanker
      />

      {cardPlayer && (
        <CardMachine
          player={cardPlayer}
          onConfirm={async (amt, rsn) => {
            await adjustBalance(cardPlayer.id, -amt, rsn);
            addToast(`✅ ${fmt(amt)} cobrado de ${cardPlayer.name}`, 'success');
            setCardPlayer(null);
          }}
          onCancel={() => setCardPlayer(null)}
        />
      )}
      {/* Pass Go Player Picker */}
      <AnimatePresence>
        {passGoPlayer === 'picking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setPassGoPlayer(null); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-sm bg-surface rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
                <h2 className="font-headline font-black text-base text-on-surface flex items-center gap-2">
                  🏁 Largada — <span className="text-teal-600">+M$ {(gameState?.startingPassGo || 200).toLocaleString('pt-BR')}</span>
                </h2>
                <button type="button" onClick={() => setPassGoPlayer(null)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <p className="text-xs text-on-surface-variant text-center mb-1">Quem passou pela Largada?</p>
                {players.length === 0 && <p className="text-sm text-center text-on-surface-variant opacity-60 py-6">Nenhum jogador na sala.</p>}
                {players.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => doPassGo(p)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant/50 hover:bg-teal-50 hover:border-teal-200 transition-all text-left group"
                  >
                    <div className="flex items-center justify-center">
                      <PinDisplay avatar={p.avatar} color={p.color} size={36} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">{p.name}</p>
                      <p className="text-xs text-on-surface-variant">{fmt(p.balance)}</p>
                    </div>
                    <span className="text-xs font-black text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">+M$ {(gameState?.startingPassGo || 200).toLocaleString('pt-BR')}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fine Player Picker */}
      <AnimatePresence>
        {finePlayer === 'picking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setFinePlayer(null); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-sm bg-surface rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
                <h2 className="font-headline font-black text-base text-on-surface flex items-center gap-2">
                  ⚖️ Multa — <span className="text-error">M$ 100</span>
                </h2>
                <button type="button" onClick={() => setFinePlayer(null)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-2">
                <p className="text-xs text-on-surface-variant text-center mb-1">Qual jogador será multado?</p>
                {players.length === 0 && <p className="text-sm text-center text-on-surface-variant opacity-60 py-6">Nenhum jogador na sala.</p>}
                {players.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => doFine(p)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-outline-variant/50 hover:bg-error/5 hover:border-error/20 transition-all text-left group"
                  >
                    <div className="flex items-center justify-center">
                      <PinDisplay avatar={p.avatar} color={p.color} size={36} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface">{p.name}</p>
                      <p className="text-xs text-on-surface-variant">{fmt(p.balance)}</p>
                    </div>
                    <span className="text-xs font-black text-error opacity-0 group-hover:opacity-100 transition-opacity">−M$ 100</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {approvalReq && (
        <ApprovalModal
          req={approvalReq}
          onApprove={async (requestId) => { await approveTransfer(requestId); setApprovalReq(null); }}
          onReject={async (requestId) => { await rejectTransfer(requestId); setApprovalReq(null); }}
          onClose={() => setApprovalReq(null)}
        />
      )}
    </PageTransition>
  );
}

function PlayerRow({ p, rank, expanded, mode, amt, rsn, onAmt, onRsn, onCredit, onDebit, onCancel, onSubmit, busy }) {
  return (
    <motion.div
      layout
      className={`
        card rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 md:gap-6 transition-all shadow-sm
        ${expanded ? 'border-primary bg-surface' : 'hover:shadow-md border-outline-variant bg-surface'}
      `}
    >
      <div className="flex items-center gap-4 w-full md:w-1/3">
        <div className="flex items-center justify-center">
          <PinDisplay avatar={p.avatar} color={p.color} size={40} />
        </div>
        <div>
          <h4 className="font-headline text-base font-bold text-on-surface leading-tight">{p.name}</h4>
          <p className="font-label text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">Player {rank}</p>
        </div>
      </div>

      <div className="w-full md:w-1/4 flex flex-col items-start md:items-center">
        <span className="font-headline text-2xl font-bold text-on-surface balance-text">
          {fmt(p.balance)}
        </span>
      </div>

      {expanded ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-2 w-full md:flex-grow">
          <div className={`text-xs font-bold mb-1 uppercase tracking-wider ${mode === 'credit' ? 'text-success' : 'text-error'}`}>
            {mode === 'credit' ? '↗ Pagar a ' : '↘ Cobrar de '}{p.name}
          </div>
          <input type="number" value={amt} onChange={(e) => onAmt(e.target.value)} placeholder="Valor (M$)" min="1" max="1000000000" autoFocus required className="field text-sm py-2" />
          <input type="text" value={rsn} onChange={(e) => onRsn(e.target.value)} placeholder="Motivo (Opcional)" maxLength={50} className="field text-sm py-2" />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className={`flex-1 py-2 rounded-lg text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all ${mode === 'credit' ? 'bg-success text-white' : 'bg-error text-white'}`} style={{ opacity: busy ? 0.5 : 1 }}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Confirmar'}
            </button>
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm border border-outline-variant bg-surface text-on-surface-variant cursor-pointer hover:bg-surface-container transition-all">✕</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2 w-full md:flex-grow md:justify-end">
          <button onClick={onDebit} className="flex-1 md:flex-none md:w-28 py-2 rounded-lg bg-error/10 text-error hover:bg-error/20 font-bold text-sm transition-all border border-transparent flex items-center justify-center gap-1">
            <span className="text-lg leading-none">−</span> Cobrar
          </button>
          <button onClick={onCredit} className="flex-1 md:flex-none md:w-28 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 font-bold text-sm transition-all border border-transparent flex items-center justify-center gap-1">
            <span className="text-lg leading-none">+</span> Pagar
          </button>
        </div>
      )}
    </motion.div>
  );
}
