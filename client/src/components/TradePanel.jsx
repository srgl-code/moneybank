import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import { propertiesData } from '../data/properties.js';
import DragDropMachine from './features/DragDropMachine.jsx';

const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

export default function TradePanel() {
  const { 
    gameState, 
    currentPlayer, 
    activeTrade, 
    updateTradeProposal, 
    submitTradeProposal, 
    acceptTradeProposal, 
    cancelTrade,
    approveTradeBank,
    rejectTradeBank,
    adjustBalance,
    dispatch
  } = useGame();

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = String(Date.now() + Math.random());
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  };

  const [myOffers, setMyOffers] = useState([]);
  const [theirOffers, setTheirOffers] = useState([]);
  const [myMoney, setMyMoney] = useState(0);
  const [theirMoney, setTheirMoney] = useState(0);
  const [hasModified, setHasModified] = useState(false);

  const isInitiator = currentPlayer?.id === activeTrade?.initiatorId;

  useEffect(() => {
    // Sync local state when the proposal updates from server
    if (activeTrade && activeTrade.proposal) {
      if (isInitiator) {
        setMyOffers(activeTrade.proposal.initiatorOffers || []);
        setMyMoney(activeTrade.proposal.initiatorMoney || 0);
        setTheirOffers(activeTrade.proposal.receiverOffers || []);
        setTheirMoney(activeTrade.proposal.receiverMoney || 0);
      } else {
        setMyOffers(activeTrade.proposal.receiverOffers || []);
        setMyMoney(activeTrade.proposal.receiverMoney || 0);
        setTheirOffers(activeTrade.proposal.initiatorOffers || []);
        setTheirMoney(activeTrade.proposal.initiatorMoney || 0);
      }
      setHasModified(false);
    }
  }, [activeTrade, isInitiator]);

  if (!activeTrade || !gameState || !currentPlayer) return null;

  const isBanker = currentPlayer.isBanker;
  const myId = currentPlayer.id;
  
  const initiator = gameState.players.find(p => p.id === activeTrade.initiatorId);
  const receiver = gameState.players.find(p => p.id === activeTrade.receiverId);
  
  const me = isInitiator ? initiator : receiver;
  const them = isInitiator ? receiver : initiator;

  const isMyTurn = activeTrade.currentTurn === myId && activeTrade.status === 'active';
  const isAwaitingApproval = activeTrade.status === 'banker_approval';

  const saveProposal = (newMyOffers, newMyMoney, newTheirOffers, newTheirMoney) => {
    if (!isMyTurn) return;
    const proposal = isInitiator ? {
      initiatorOffers: newMyOffers,
      initiatorMoney: newMyMoney,
      receiverOffers: newTheirOffers,
      receiverMoney: newTheirMoney
    } : {
      initiatorOffers: newTheirOffers,
      initiatorMoney: newTheirMoney,
      receiverOffers: newMyOffers,
      receiverMoney: newMyMoney
    };
    setHasModified(true);
    updateTradeProposal(activeTrade.id, proposal);
  };

  const handleAddMyOffer = (propId) => {
    if (!isMyTurn || myOffers.includes(propId)) return;
    const next = [...myOffers, propId];
    setMyOffers(next);
    saveProposal(next, myMoney, theirOffers, theirMoney);
  };

  const handleRemoveMyOffer = (propId) => {
    if (!isMyTurn) return;
    const next = myOffers.filter(id => id !== propId);
    setMyOffers(next);
    saveProposal(next, myMoney, theirOffers, theirMoney);
  };

  const handleAddTheirOffer = (propId) => {
    if (!isMyTurn || theirOffers.includes(propId)) return;
    const next = [...theirOffers, propId];
    setTheirOffers(next);
    saveProposal(myOffers, myMoney, next, theirMoney);
  };

  const handleRemoveTheirOffer = (propId) => {
    if (!isMyTurn) return;
    const next = theirOffers.filter(id => id !== propId);
    setTheirOffers(next);
    saveProposal(myOffers, myMoney, next, theirMoney);
  };

  const getPropData = (id) => propertiesData.find(p => p.name === id);

  const renderPropertyCard = (propId, onClick, highlight = false) => {
    const data = getPropData(propId);
    if (!data) return null;
    return (
      <motion.div 
        layoutId={`prop-${propId}`}
        key={propId}
        onClick={() => onClick && onClick(propId)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-28 flex flex-col items-center justify-start rounded-xl overflow-hidden cursor-pointer select-none transition-all duration-200 border-2
          ${highlight 
            ? 'border-primary bg-primary/10 shadow-[0_4px_12px_rgba(var(--color-primary),0.3)]' 
            : 'border-outline-variant/30 bg-surface shadow-sm hover:shadow-md hover:border-primary/50'}`}
      >
        <div className="w-full h-4" style={{ backgroundColor: getGroupColor(data.group) }} />
        <div className="flex-1 p-2 flex items-center justify-center text-center">
          <span className={`text-[10px] font-bold leading-tight ${highlight ? 'text-primary' : 'text-on-surface'}`}>
            {data.name}
          </span>
        </div>
      </motion.div>
    );
  };

  const getGroupColor = (group) => {
    const colors = {
      'Verde': '#4ade80', 'Vermelho': '#f87171', 'Rosa': '#f472b6', 
      'Azul Escuro': '#1d4ed8', 'Azul Claro': '#60a5fa', 'Laranja': '#fb923c', 
      'Amarelo': '#facc15', 'Roxo': '#c084fc', 'Ações': '#9ca3af'
    };
    return colors[group] || '#e5e7eb';
  };

  if (isBanker && isAwaitingApproval) {
    const hasMoney = activeTrade.proposal.initiatorMoney > 0 || activeTrade.proposal.receiverMoney > 0;
    
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className={`bg-surface rounded-2xl w-full p-6 shadow-2xl border border-outline-variant my-8 ${hasMoney ? 'max-w-5xl' : 'max-w-lg'}`}>
          <h2 className="text-xl font-headline font-bold text-on-surface mb-4">Aprovar Negociação</h2>
          
          <div className={`flex flex-col ${hasMoney ? 'lg:flex-row gap-6' : ''}`}>
            {/* Resumo da Troca */}
            <div className={`bg-surface-container rounded-xl p-4 mb-4 ${hasMoney ? 'w-full lg:w-1/3 mb-0' : ''}`}>
              <p className="font-bold text-primary mb-2">{initiator?.name} dá:</p>
              <ul className="text-sm text-on-surface mb-4 list-disc pl-5">
                {activeTrade.proposal.initiatorOffers.map(p => <li key={p}>{p}</li>)}
                {activeTrade.proposal.initiatorMoney > 0 && <li>{fmt(activeTrade.proposal.initiatorMoney)}</li>}
                {activeTrade.proposal.initiatorOffers.length === 0 && activeTrade.proposal.initiatorMoney === 0 && <li>Nada</li>}
              </ul>

              <p className="font-bold text-secondary mb-2">Para {receiver?.name}, em troca de:</p>
              <ul className="text-sm text-on-surface list-disc pl-5">
                {activeTrade.proposal.receiverOffers.map(p => <li key={p}>{p}</li>)}
                {activeTrade.proposal.receiverMoney > 0 && <li>{fmt(activeTrade.proposal.receiverMoney)}</li>}
                {activeTrade.proposal.receiverOffers.length === 0 && activeTrade.proposal.receiverMoney === 0 && <li>Nada</li>}
              </ul>
            </div>

            {/* Maquininha (Se houver dinheiro) */}
            {hasMoney && (
              <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-4">
                <div className="mb-4 bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-3 text-sm rounded">
                  <strong>Atenção Banqueiro:</strong> Esta negociação envolve transferência de dinheiro. 
                  Utilize a maquininha abaixo para cobrar/pagar os valores acordados antes de aprovar os títulos de posse.
                </div>
                <div className="scale-90 origin-top">
                  <DragDropMachine 
                    players={gameState?.players?.filter(p => !p.isBanker) || []} 
                    onTransaction={async ({ playerId, amount, type, reason }) => {
                       const target = gameState?.players?.find(p => p.id === playerId);
                       await adjustBalance(playerId, type === 'debit' ? -amount : amount, reason);
                       addToast(`✅ ${fmt(amount)} ${type === 'debit' ? 'cobrado de' : 'creditado a'} ${target?.name || 'jogador'}`, 'success');
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-outline-variant/30">
            <button onClick={() => approveTradeBank(activeTrade.id)} className="flex-1 btn-primary bg-primary text-on-primary py-3">
              {hasMoney ? 'Títulos de Posse Trocados (Aprovar)' : 'Aprovar Troca'}
            </button>
            <button onClick={() => rejectTradeBank(activeTrade.id)} className="flex-1 btn-secondary bg-error text-on-error py-3">Recusar</button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isBanker) return null; // Banker doesn't see active trades unless approving

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md p-2 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-6xl h-full max-h-[85vh] flex flex-col bg-surface/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20"
      >
        {/* Header */}
      <div className="flex justify-between items-center p-5 border-b border-white/10 bg-gradient-to-r from-surface-container-high/50 to-surface/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl shadow-inner border border-primary/20">🤝</div>
          <h2 className="font-headline font-black text-2xl text-on-surface tracking-tight">Negociação</h2>
          {isAwaitingApproval && <span className="ml-3 px-3 py-1.5 text-xs font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30 rounded-full shadow-sm">Aguardando Banco</span>}
          {!isAwaitingApproval && (
            <span className={`ml-3 px-3 py-1.5 text-xs font-bold rounded-full shadow-sm border ${
              isMyTurn 
                ? 'bg-primary/20 text-primary border-primary/30' 
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
            }`}>
              {isMyTurn ? 'Seu Turno' : `Turno de ${them?.name}`}
            </span>
          )}
        </div>
        <button onClick={() => cancelTrade(activeTrade.id)} className="p-2 hover:bg-error/10 hover:text-error text-on-surface-variant rounded-full transition-all">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Main Content: 3 Columns */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto overflow-x-hidden md:overflow-hidden bg-surface-container-lowest/50">
        
        {/* Center Column: The Proposal */}
        <div className="order-1 md:order-2 flex-1 p-5 flex flex-col gap-5 md:overflow-y-auto border-x border-white/10 relative">
          {/* Subtle gradient background for the center area */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>

          {/* I am offering */}
          <div className="bg-surface/80 backdrop-blur-sm rounded-2xl border border-primary/20 p-5 shadow-sm relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">upload</span>
              <h3 className="font-bold font-headline text-lg text-primary text-center">Eu Ofereço</h3>
            </div>
            <p className="text-[10px] text-center text-primary/60 mb-4 uppercase tracking-[0.2em] font-bold">Toque na carta para remover</p>
            <div className="flex flex-wrap gap-3 justify-center mb-5 min-h-[80px] p-2 bg-primary/5 rounded-xl border border-primary/10">
              <AnimatePresence>
                {myOffers.length === 0 && <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-sm text-on-surface-variant/50 italic self-center">Nenhuma propriedade selecionada</motion.span>}
                {myOffers.map(prop => renderPropertyCard(prop, () => handleRemoveMyOffer(prop)))}
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-inner">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Dinheiro:</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold">M$</span>
                <input 
                  type="number" 
                  min="0"
                  max={me?.balance || 0}
                  value={myMoney}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMyMoney(val);
                    saveProposal(myOffers, val, theirOffers, theirMoney);
                  }}
                  disabled={!isMyTurn}
                  className="bg-transparent border-b-2 border-primary/30 w-32 px-2 py-1 pl-9 font-mono font-bold text-lg focus:outline-none focus:border-primary text-on-surface disabled:opacity-50 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center z-10 my-[-10px]">
            <div className="bg-surface shadow-md p-2 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-on-surface-variant animate-pulse">swap_vert</span>
            </div>
          </div>

          {/* I want */}
          <div className="bg-secondary/5 backdrop-blur-sm rounded-2xl border border-secondary/20 p-5 shadow-sm relative z-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary text-xl">download</span>
              <h3 className="font-bold font-headline text-lg text-secondary text-center">Eu Quero</h3>
            </div>
            <p className="text-[10px] text-center text-secondary/60 mb-4 uppercase tracking-[0.2em] font-bold">Toque na carta para remover</p>
            <div className="flex flex-wrap gap-3 justify-center mb-5 min-h-[80px] p-2 bg-secondary/5 rounded-xl border border-secondary/10">
              <AnimatePresence>
                {theirOffers.length === 0 && <motion.span initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-sm text-on-surface-variant/50 italic self-center">Nenhuma propriedade selecionada</motion.span>}
                {theirOffers.map(prop => renderPropertyCard(prop, () => handleRemoveTheirOffer(prop)))}
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/50 shadow-inner">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Dinheiro:</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-bold">M$</span>
                <input 
                  type="number" 
                  min="0"
                  max={them?.balance || 0}
                  value={theirMoney}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setTheirMoney(val);
                    saveProposal(myOffers, myMoney, theirOffers, val);
                  }}
                  disabled={!isMyTurn}
                  className="bg-transparent border-b-2 border-secondary/30 w-32 px-2 py-1 pl-9 font-mono font-bold text-lg focus:outline-none focus:border-secondary text-on-surface disabled:opacity-50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Left Column: My Inventory */}
        <div className="order-2 md:order-1 w-full md:w-[280px] lg:w-[320px] p-5 border-r border-white/10 bg-surface/40 flex flex-col md:overflow-y-auto">
          <div className="sticky top-0 bg-surface/80 backdrop-blur-md pb-3 mb-4 border-b border-outline-variant/30 z-10 rounded-b-xl">
            <h3 className="font-headline font-bold text-lg text-on-surface">Meu Inventário</h3>
            <p className="text-xs text-on-surface-variant font-medium">Saldo: <span className="font-mono text-primary font-bold">{fmt(me?.balance)}</span></p>
            {isMyTurn && <p className="text-[10px] text-primary/80 mt-1 uppercase tracking-wider font-bold">↑ Toque nas cartas para oferecer</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {(me?.properties || []).map(prop => {
                const isOffered = myOffers.includes(prop);
                return renderPropertyCard(prop, isOffered ? null : () => handleAddMyOffer(prop), isOffered);
              })}
            </AnimatePresence>
            {(me?.properties || []).length === 0 && <p className="text-sm text-on-surface-variant italic opacity-70">Nenhuma propriedade</p>}
          </div>
        </div>

        {/* Right Column: Their Inventory */}
        <div className="order-3 md:order-3 w-full md:w-[280px] lg:w-[320px] p-5 border-l border-white/10 bg-surface/40 flex flex-col md:overflow-y-auto">
          <div className="sticky top-0 bg-surface/80 backdrop-blur-md pb-3 mb-4 border-b border-outline-variant/30 z-10 rounded-b-xl">
            <h3 className="font-headline font-bold text-lg text-on-surface">Inventário de {them?.name}</h3>
            <p className="text-xs text-on-surface-variant font-medium">Saldo: <span className="font-mono text-secondary font-bold">{fmt(them?.balance)}</span></p>
            {isMyTurn && <p className="text-[10px] text-secondary/80 mt-1 uppercase tracking-wider font-bold">↑ Toque nas cartas para pedir</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {(them?.properties || []).map(prop => {
                const isOffered = theirOffers.includes(prop);
                return renderPropertyCard(prop, isOffered ? null : () => handleAddTheirOffer(prop), isOffered);
              })}
            </AnimatePresence>
            {(them?.properties || []).length === 0 && <p className="text-sm text-on-surface-variant italic opacity-70">Nenhuma propriedade</p>}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-white/10 bg-surface/80 backdrop-blur-md flex flex-col sm:flex-row justify-end gap-3 shrink-0">
        {isAwaitingApproval ? (
          <p className="text-sm font-bold text-amber-600 m-auto">Aguardando aprovação do banco...</p>
        ) : isMyTurn ? (
          <>
            <button 
              onClick={() => submitTradeProposal(activeTrade.id)} 
              className="btn-secondary px-6"
            >
              Contra Proposta
            </button>
            {!hasModified && (
              <button 
                onClick={() => acceptTradeProposal(activeTrade.id)} 
                className="btn-primary px-6 bg-green-600 hover:bg-green-700 text-white"
              >
                Aceitar Proposta Atual
              </button>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-on-surface-variant m-auto">Aguardando {them?.name}...</p>
        )}
      </div>
      </motion.div>
    </motion.div>
  );
}
