import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RefreshCw, X, Loader2, LogOut } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import DragDropMachine from './features/DragDropMachine.jsx';
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
import PropertyCard from './PropertyCard.jsx';
import { propertiesData } from '../data/properties.js';
import RankingList from './RankingList.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

export default function BankerDashboard() {
  const {
    roomCode, gameState, currentPlayer, pendingTransfers,
    adjustBalance, resetBalances, closeRoom, leaveRoom, addToast,
    approveTransfer, rejectTransfer, passGo, startAuction, assignProperty
  } = useGame();

  const [tab, setTab] = useState('ranking');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confReset, setConfReset] = useState(false);
  const [confClose, setConfClose] = useState(false);
  const [cardPlayer, setCardPlayer] = useState(null);
  const [approvalReq, setApprovalReq] = useState(null);
  const [passGoPlayer, setPassGoPlayer] = useState(null); // null = closed, 'picking' = open picker
  const [finePlayer, setFinePlayer] = useState(null); // null = closed, 'picking' = open picker
  const [filterGroup, setFilterGroup] = useState('Todos');

  const pending = pendingTransfers ?? [];
  const players = (gameState?.players ?? []).filter((p) => !p.isBanker);
  const totalFines = (gameState?.history ?? []).filter(h => h.description?.toLowerCase().includes('multa')).reduce((acc, h) => acc + h.amount, 0);
  const totalWealth = players.reduce((acc, p) => acc + p.balance, 0);

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { addToast('Não foi possível copiar', 'warning'); }
  };

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
        <section className="card flex flex-col flex-1 min-h-[600px] p-4 sm:p-6 mt-2 mb-16 md:mb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="w-full sm:w-auto overflow-x-auto hide-scrollbar">
              <SegmentedControl
                options={[
                  { value: 'ranking', label: 'Ranking' },
                  { value: 'machine', label: 'Maquininha' },
                  { value: 'approvals', label: `Aprovações (${pending.length})` },
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
              {tab === 'ranking' && (
                <motion.div key="ranking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-4">
                  <RankingList players={gameState?.players || []} myId={currentPlayer?.id} />
                </motion.div>
              )}

              {tab === 'machine' && (
                <motion.div key="machine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="h-full">
                  <DragDropMachine 
                    players={players} 
                    onTransaction={async ({ playerId, amount, type, reason }) => {
                       const target = players.find(p => p.id === playerId);
                       await adjustBalance(playerId, type === 'debit' ? -amount : amount, reason);
                       addToast(`✅ ${fmt(amount)} ${type === 'debit' ? 'cobrado de' : 'creditado a'} ${target?.name || 'jogador'}`, 'success');
                    }}
                  />
                </motion.div>
              )}

              {tab === 'approvals' && (
                <motion.div key="approvals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
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
                <motion.div key="properties" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-4 h-full flex flex-col">
                  {/* Filtro de Cores */}
                  <div className="flex overflow-x-auto hide-scrollbar gap-2 px-2 py-4 mb-2">
                    <button 
                      onClick={() => setFilterGroup('Todos')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterGroup === 'Todos' ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant text-on-surface-variant'}`}
                    >
                      Todos
                    </button>
                    {[...new Set(propertiesData.map(p => p.group))].map(group => (
                      <button 
                        key={group}
                        onClick={() => setFilterGroup(group)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${filterGroup === group ? 'bg-primary text-on-primary' : 'bg-surface-container border border-outline-variant text-on-surface-variant'}`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-6 justify-center items-start p-2 pb-10 flex-1 overflow-y-auto">
                    {propertiesData
                      .filter(prop => filterGroup === 'Todos' || prop.group === filterGroup)
                      .map((prop) => {
                        // Find if any player owns this property
                        const ownerPlayer = (gameState?.players || []).find(p => p.properties && p.properties.includes(prop.name));
                        return (
                          <PropertyCard 
                            key={prop.name} 
                            {...prop} 
                            owner={ownerPlayer ? { name: ownerPlayer.name, avatar: ownerPlayer.avatar, color: ownerPlayer.color } : null}
                          />
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

      </main>

      {/* Keep bottom nav for mobile consistency, or could hide it. Let's hide it for banker if they prefer tabs. Actually, leave it for now. */}
      <BottomNav
        activeTab={tab === 'players' ? 'ledger' : tab === 'approvals' ? 'ranking' : 'banker'}
        onTabChange={(t) => setTab(t === 'ledger' ? 'players' : t === 'ranking' ? 'approvals' : 'history')}
        showBanker
      />


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
          isBankTransaction={
            !approvalReq.toId || 
            approvalReq.toId === 'bank' || 
            gameState?.players?.find(p => p.id === approvalReq.toId)?.isBanker === true
          }
          onApprove={async (requestId) => { await approveTransfer(requestId); setApprovalReq(null); }}
          onReject={async (requestId) => { await rejectTransfer(requestId); setApprovalReq(null); }}
          onClose={() => setApprovalReq(null)}
        />
      )}
    </PageTransition>
  );
}


