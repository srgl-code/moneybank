import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpDown,
  Coins,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Sparkles,
  ArrowLeftRight,
  RotateCcw
} from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { propertiesData } from '../data/properties.js';
import DragDropMachine from './features/DragDropMachine.jsx';

const fmt = (n) => `M$ ${Number(n || 0).toLocaleString('pt-BR')}`;

const colorMap = {
  'Verde': '#22c55e',
  'Vermelho': '#ef4444',
  'Rosa': '#ec4899',
  'Azul Escuro': '#1d4ed8',
  'Azul Claro': '#60a5fa',
  'Laranja': '#f97316',
  'Amarelo': '#eab308',
  'Roxo': '#a855f7',
  'Ações': '#64748b'
};

const filterGroups = [
  'Todas',
  'Verde',
  'Vermelho',
  'Rosa',
  'Azul Escuro',
  'Azul Claro',
  'Laranja',
  'Amarelo',
  'Roxo',
  'Ações'
];

export default function TradePanel() {
  const { 
    gameState, 
    currentPlayer, 
    activeTrade, 
    updateTradeProposal, 
    acceptTradeProposal,
    rejectTradeProposal,
    cancelTrade,
    approveTradeBank,
    rejectTradeBank,
    adjustBalance,
    addToast
  } = useGame();

  const [myOffers, setMyOffers] = useState([]);
  const [theirOffers, setTheirOffers] = useState([]);
  const [myMoney, setMyMoney] = useState(0);
  const [theirMoney, setTheirMoney] = useState(0);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // Filters & Mobile Navigation
  const [myFilterGroup, setMyFilterGroup] = useState('Todas');
  const [theirFilterGroup, setTheirFilterGroup] = useState('Todas');
  const [mobileTab, setMobileTab] = useState('proposal'); // 'my_inventory' | 'proposal' | 'their_inventory'

  const isInitiator = currentPlayer?.id === activeTrade?.initiatorId;

  useEffect(() => {
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
      setHasDraftChanges(false);
    }
  }, [activeTrade, isInitiator]);

  if (!activeTrade || !gameState || !currentPlayer) return null;

  const isBanker = currentPlayer.isBanker;
  const initiator = gameState.players.find(p => p.id === activeTrade.initiatorId);
  const receiver = gameState.players.find(p => p.id === activeTrade.receiverId);
  
  const me = isInitiator ? initiator : receiver;
  const them = isInitiator ? receiver : initiator;

  const isMyTurn = activeTrade.status === 'active' && activeTrade.currentTurnPlayerId === currentPlayer.id;
  const isEditable = isMyTurn;
  const isAwaitingApproval = activeTrade.status === 'banker_approval';
  const isInitialOfferer = activeTrade.phase === 'BUILDING_INITIAL_OFFER' && currentPlayer.id === activeTrade.initiatorId;
  const isWaitingInitialOffer = activeTrade.phase === 'BUILDING_INITIAL_OFFER' && !isInitiator;
  const isMyProposal = activeTrade.proposalById === currentPlayer.id || isInitialOfferer;
  const isProposalRecipient = isMyTurn && activeTrade.phase === 'WAITING_OFFER_RESPONSE' && activeTrade.proposalById !== currentPlayer.id;
  const hasTradeTerms = (activeTrade.proposal?.initiatorOffers?.length || 0) > 0 ||
    (activeTrade.proposal?.receiverOffers?.length || 0) > 0 ||
    (activeTrade.proposal?.initiatorMoney || 0) > 0 ||
    (activeTrade.proposal?.receiverMoney || 0) > 0;

  const saveProposal = () => {
    if (isEditable) setHasDraftChanges(true);
  };

  const submitProposal = async () => {
    if (!isEditable || !hasDraftChanges || submittingProposal) return;
    const proposal = isInitiator ? {
      initiatorOffers: myOffers,
      initiatorMoney: myMoney,
      receiverOffers: theirOffers,
      receiverMoney: theirMoney
    } : {
      initiatorOffers: theirOffers,
      initiatorMoney: theirMoney,
      receiverOffers: myOffers,
      receiverMoney: myMoney
    };
    setSubmittingProposal(true);
    try {
      await updateTradeProposal(activeTrade.id, proposal);
      setHasDraftChanges(false);
      addToast('Proposta enviada para revisão do outro jogador.', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleAddMyOffer = (propId) => {
    if (!isEditable || myOffers.includes(propId)) return;
    const next = [...myOffers, propId];
    setMyOffers(next);
    saveProposal(next, myMoney, theirOffers, theirMoney);
  };

  const handleRemoveMyOffer = (propId) => {
    if (!isEditable) return;
    const next = myOffers.filter(id => id !== propId);
    setMyOffers(next);
    saveProposal(next, myMoney, theirOffers, theirMoney);
  };

  const handleAddTheirOffer = (propId) => {
    if (!isEditable || theirOffers.includes(propId)) return;
    const next = [...theirOffers, propId];
    setTheirOffers(next);
    saveProposal(myOffers, myMoney, next, theirMoney);
  };

  const handleRemoveTheirOffer = (propId) => {
    if (!isEditable) return;
    const next = theirOffers.filter(id => id !== propId);
    setTheirOffers(next);
    saveProposal(myOffers, myMoney, next, theirMoney);
  };

  const handleQuickMyMoney = (amount) => {
    if (!isEditable) return;
    const maxVal = me?.balance || 0;
    const next = Math.max(0, Math.min(maxVal, myMoney + amount));
    setMyMoney(next);
    saveProposal(myOffers, next, theirOffers, theirMoney);
  };

  const handleQuickTheirMoney = (amount) => {
    if (!isEditable) return;
    const maxVal = them?.balance || 0;
    const next = Math.max(0, Math.min(maxVal, theirMoney + amount));
    setTheirMoney(next);
    saveProposal(myOffers, myMoney, theirOffers, next);
  };

  const getPropData = (id) => propertiesData.find(p => p.name === id);

  // Banker Approval View
  if (isBanker && isAwaitingApproval) {
    const hasMoney = activeTrade.proposal.initiatorMoney > 0 || activeTrade.proposal.receiverMoney > 0;
    
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
        <div className={`bg-surface max-h-[94dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl w-full p-4 sm:p-8 shadow-2xl border border-outline-variant ${hasMoney ? 'max-w-5xl' : 'max-w-lg'}`}>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-outline-variant/30">
            <span className="text-2xl">⚖️</span>
            <div>
              <h2 className="text-xl font-headline font-black text-on-surface">Aprovação de Negociação</h2>
              <p className="text-xs text-on-surface-variant">Confirme os termos acordados entre {initiator?.name} e {receiver?.name}</p>
            </div>
          </div>
          
          <div className={`flex flex-col ${hasMoney ? 'lg:flex-row gap-6' : ''}`}>
            {/* Resumo da Troca */}
            <div className={`bg-surface-container rounded-2xl p-5 mb-4 ${hasMoney ? 'w-full lg:w-1/3 mb-0' : ''}`}>
              <div className="mb-4">
                <p className="font-bold text-primary text-sm flex items-center gap-1.5 mb-2">
                  <ArrowUpRight className="w-4 h-4" /> {initiator?.name} oferece:
                </p>
                <div className="space-y-1.5 pl-2">
                  {activeTrade.proposal.initiatorOffers.map(p => {
                    const data = getPropData(p);
                    return (
                      <div key={p} className="flex items-center gap-2 text-xs bg-surface p-2 rounded-lg border border-outline-variant/40">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorMap[data?.group] || '#cbd5e1' }} />
                        <span className="font-bold text-on-surface">{p}</span>
                      </div>
                    );
                  })}
                  {activeTrade.proposal.initiatorMoney > 0 && (
                    <div className="font-mono font-black text-primary text-sm bg-primary/10 p-2 rounded-lg border border-primary/20">
                      + {fmt(activeTrade.proposal.initiatorMoney)}
                    </div>
                  )}
                  {activeTrade.proposal.initiatorOffers.length === 0 && activeTrade.proposal.initiatorMoney === 0 && (
                    <span className="text-xs text-on-surface-variant italic">Nada a oferecer</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-outline-variant/30">
                <p className="font-bold text-secondary text-sm flex items-center gap-1.5 mb-2">
                  <ArrowDownLeft className="w-4 h-4" /> {receiver?.name} oferece:
                </p>
                <div className="space-y-1.5 pl-2">
                  {activeTrade.proposal.receiverOffers.map(p => {
                    const data = getPropData(p);
                    return (
                      <div key={p} className="flex items-center gap-2 text-xs bg-surface p-2 rounded-lg border border-outline-variant/40">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorMap[data?.group] || '#cbd5e1' }} />
                        <span className="font-bold text-on-surface">{p}</span>
                      </div>
                    );
                  })}
                  {activeTrade.proposal.receiverMoney > 0 && (
                    <div className="font-mono font-black text-secondary text-sm bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                      + {fmt(activeTrade.proposal.receiverMoney)}
                    </div>
                  )}
                  {activeTrade.proposal.receiverOffers.length === 0 && activeTrade.proposal.receiverMoney === 0 && (
                    <span className="text-xs text-on-surface-variant italic">Nada a oferecer</span>
                  )}
                </div>
              </div>
            </div>

            {/* Maquininha (Se houver dinheiro) */}
            {hasMoney && (
              <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/50 p-5">
                <div className="mb-4 bg-amber-500/10 border-l-4 border-amber-500 text-amber-800 p-3 text-xs rounded-xl">
                  <strong>Atenção Banqueiro:</strong> Esta negociação envolve transferência de dinheiro. 
                  Utilize a maquininha abaixo para transferir os valores acordados antes de aprovar os títulos de posse.
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
            <button
              type="button"
              onClick={() => rejectTradeBank(activeTrade.id)}
              className="flex-1 py-3.5 rounded-xl border border-error/30 text-error hover:bg-error/10 font-bold text-sm transition-all"
            >
              Recusar Negociação
            </button>
            <button
              type="button"
              onClick={() => approveTradeBank(activeTrade.id)}
              className="flex-[2] py-3.5 rounded-xl bg-primary text-on-primary font-black text-sm uppercase shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              {hasMoney ? 'Aprovar Troca de Títulos' : 'Aprovar Negociação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBanker) return null;

  // Filtered properties for my inventory
  const filteredMyProps = (me?.properties || []).filter(propId => {
    if (myFilterGroup === 'Todas') return true;
    const data = getPropData(propId);
    return data?.group === myFilterGroup;
  });

  // Filtered properties for their inventory
  const filteredTheirProps = (them?.properties || []).filter(propId => {
    if (theirFilterGroup === 'Todas') return true;
    const data = getPropData(propId);
    return data?.group === theirFilterGroup;
  });

  // Render Card in negotiation proposal
  const renderProposalCard = (propId, onRemove, isMine = true) => {
    const data = getPropData(propId);
    if (!data) return null;
    const groupColor = colorMap[data.group] || '#475569';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        key={propId}
        onClick={isEditable ? onRemove : undefined}
        title={isEditable ? "Clique para remover da proposta" : data.name}
        className={`group relative flex flex-col w-32 bg-surface rounded-xl overflow-hidden shadow-sm border border-outline-variant/50 select-none ${isEditable ? 'cursor-pointer hover:shadow-md hover:border-error/50 transition-all' : ''}`}
      >
        <div className="h-4 w-full flex items-center justify-between px-1" style={{ backgroundColor: groupColor }}>
          <span className="text-[9px] text-white font-bold opacity-90 truncate">{data.group}</span>
          {isEditable && (
            <span className="w-3.5 h-3.5 rounded-full bg-black/40 text-white flex items-center justify-center text-[9px] group-hover:bg-error transition-colors">
              ✕
            </span>
          )}
        </div>
        <div className="p-2 flex flex-col justify-between flex-1">
          <span className="text-[11px] font-bold text-on-surface leading-tight truncate">{data.name}</span>
          <span className="text-[9px] font-mono text-on-surface-variant mt-1">Aluguel: $ {data.rent}</span>
        </div>
      </motion.div>
    );
  };

  // Render Card in side inventories
  const renderInventoryCard = (propId, onClick, isSelected = false, side = 'mine') => {
    const data = getPropData(propId);
    if (!data) return null;
    const groupColor = colorMap[data.group] || '#475569';

    return (
      <button
        type="button"
        key={propId}
        disabled={!isEditable || isSelected}
        onClick={onClick}
        className={`
          w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all select-none
          ${isSelected
            ? 'bg-surface-container-high/50 border-outline-variant/40 opacity-50 cursor-not-allowed'
            : isEditable
              ? 'bg-surface border-outline-variant/40 hover:border-primary/50 hover:shadow-sm active:scale-[0.98]'
              : 'bg-surface border-outline-variant/30 opacity-70'
          }
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-3 h-8 rounded-md shrink-0 shadow-xs" style={{ backgroundColor: groupColor }} />
          <div className="truncate">
            <span className="text-xs font-bold text-on-surface block truncate">{data.name}</span>
            <span className="text-[10px] text-on-surface-variant font-mono">$ {data.rent} aluguel</span>
          </div>
        </div>

        {isSelected ? (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
            <Check className="w-3 h-3" /> Adicionada
          </span>
        ) : (
          <span className="text-xs text-primary font-bold px-2 py-1 rounded-lg bg-surface-container shrink-0">
            +
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 md:p-6"
    >
      <div
        className="w-full max-w-6xl h-[100dvh] max-h-[100dvh] flex flex-col bg-surface rounded-none sm:h-full sm:max-h-[92dvh] sm:rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/30 bg-surface-container-high/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-xs border border-primary/20">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline font-black text-xl text-on-surface tracking-tight flex items-center gap-2">
                Negociação
                {isAwaitingApproval && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-700 border border-amber-500/30 rounded-full">
                    Aguardando Banco
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                {isAwaitingApproval
                  ? 'Negociação legada em revisão pelo Banco.'
                  : isWaitingInitialOffer
                    ? `Aguardando ${initiator?.name} montar a primeira proposta.`
                  : isInitialOfferer && !activeTrade.proposalById
                    ? 'Sua vez de montar e enviar a primeira proposta.'
                  : hasDraftChanges
                    ? 'Alterações ainda não enviadas.'
                    : isMyProposal
                      ? `Sua proposta está com ${them?.name}.`
                      : `Proposta recebida de ${them?.name}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => cancelTrade(activeTrade.id)}
            className="w-9 h-9 rounded-full bg-surface hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center border border-outline-variant/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-surface-container border-b border-outline-variant/30 p-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('my_inventory')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === 'my_inventory' ? 'bg-surface text-primary shadow-xs font-black' : 'text-on-surface-variant'}`}
          >
            Meu Inventário ({me?.properties?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('proposal')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === 'proposal' ? 'bg-surface text-primary shadow-xs font-black' : 'text-on-surface-variant'}`}
          >
            ⚖️ Proposta ({myOffers.length + theirOffers.length})
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('their_inventory')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${mobileTab === 'their_inventory' ? 'bg-surface text-primary shadow-xs font-black' : 'text-on-surface-variant'}`}
          >
            {them?.name} ({them?.properties?.length || 0})
          </button>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-surface-container-low/40">

          {/* Left Column: Meu Inventário */}
          <div className={`w-full md:w-[300px] lg:w-[320px] p-4 border-r border-outline-variant/30 flex flex-col bg-surface/50 overflow-hidden ${mobileTab !== 'my_inventory' ? 'hidden md:flex' : 'flex'}`}>
            <div className="pb-3 border-b border-outline-variant/30 shrink-0">
              <h3 className="font-headline font-bold text-sm text-on-surface flex items-center justify-between">
                <span>Meu Inventário</span>
                <span className="font-mono text-xs font-black text-primary">{fmt(me?.balance)}</span>
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Toque nas propriedades para oferecer</p>

              {/* Color Filter Chips */}
              <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pt-2.5 pb-0.5">
                {filterGroups.map(group => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setMyFilterGroup(group)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${myFilterGroup === group ? 'bg-primary text-white border-primary shadow-xs' : 'bg-surface text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'}`}
                  >
                    {group !== 'Todas' && (
                      <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: colorMap[group] }} />
                    )}
                    {group}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 pt-3">
              {filteredMyProps.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant/60 text-xs italic">
                  Nenhuma propriedade encontrada
                </div>
              ) : (
                filteredMyProps.map(propId => {
                  const isOffered = myOffers.includes(propId);
                  return renderInventoryCard(propId, () => handleAddMyOffer(propId), isOffered, 'mine');
                })
              )}
            </div>
          </div>

          {/* Center Column: Mesa de Negociação (A Proposta) */}
          <div className={`flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto hide-scrollbar relative bg-surface-container-lowest/60 ${mobileTab !== 'proposal' ? 'hidden md:flex' : 'flex'}`}>

            {/* Box: Eu Ofereço */}
            <div className="bg-surface rounded-2xl border border-primary/25 p-4 shadow-xs relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-headline font-bold text-sm text-primary">Eu Ofereço</h3>
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  {myOffers.length} cartas selecionadas
                </span>
              </div>

              {/* Cards oferecidos */}
              <div className="flex flex-wrap gap-2.5 min-h-[75px] p-2 bg-primary/5 rounded-xl border border-primary/10 items-center justify-center sm:justify-start">
                <AnimatePresence>
                  {myOffers.length === 0 ? (
                    <span className="text-xs text-on-surface-variant/50 italic py-3">
                      Nenhuma propriedade oferecida. Selecione no seu inventário.
                    </span>
                  ) : (
                    myOffers.map(prop => renderProposalCard(prop, () => handleRemoveMyOffer(prop), true))
                  )}
                </AnimatePresence>
              </div>

              {/* Dinheiro oferecido */}
              <div className="mt-3 pt-3 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-on-surface">Dinheiro Adicional:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-primary text-xs">M$</span>
                    <input
                      type="number"
                      min="0"
                      max={me?.balance || 0}
                      value={myMoney}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(me?.balance || 0, parseInt(e.target.value) || 0));
                        setMyMoney(val);
                        saveProposal(myOffers, val, theirOffers, theirMoney);
                      }}
                      disabled={!isEditable}
                      className="bg-surface-container rounded-lg border border-outline-variant/50 w-28 py-1 pl-8 pr-2 font-mono font-bold text-sm focus:outline-none focus:border-primary text-on-surface disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Quick money buttons */}
                {isEditable && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[50, 100, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickMyMoney(amt)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleQuickMyMoney(me?.balance || 0)}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                    >
                      Max
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMyMoney(0); saveProposal(myOffers, 0, theirOffers, theirMoney); }}
                      className="px-1.5 py-1 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-error"
                      title="Zerar"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Swap indicator */}
            <div className="flex justify-center -my-2 z-10">
              <div className="w-8 h-8 rounded-full bg-surface border border-outline-variant/40 shadow-sm flex items-center justify-center text-on-surface-variant">
                <ArrowUpDown className="w-4 h-4" />
              </div>
            </div>

            {/* Box: Eu Quero */}
            <div className="bg-surface rounded-2xl border border-secondary/25 p-4 shadow-xs relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-secondary" />
                  </div>
                  <h3 className="font-headline font-bold text-sm text-secondary">Eu Quero (de {them?.name})</h3>
                </div>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  {theirOffers.length} cartas pedidas
                </span>
              </div>

              {/* Cards pedidos */}
              <div className="flex flex-wrap gap-2.5 min-h-[75px] p-2 bg-secondary/5 rounded-xl border border-secondary/10 items-center justify-center sm:justify-start">
                <AnimatePresence>
                  {theirOffers.length === 0 ? (
                    <span className="text-xs text-on-surface-variant/50 italic py-3">
                      Nenhuma propriedade pedida. Selecione no inventário de {them?.name}.
                    </span>
                  ) : (
                    theirOffers.map(prop => renderProposalCard(prop, () => handleRemoveTheirOffer(prop), false))
                  )}
                </AnimatePresence>
              </div>

              {/* Dinheiro pedido */}
              <div className="mt-3 pt-3 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-bold text-on-surface">Dinheiro Pedido:</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-secondary text-xs">M$</span>
                    <input
                      type="number"
                      min="0"
                      max={them?.balance || 0}
                      value={theirMoney}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(them?.balance || 0, parseInt(e.target.value) || 0));
                        setTheirMoney(val);
                        saveProposal(myOffers, myMoney, theirOffers, val);
                      }}
                      disabled={!isEditable}
                      className="bg-surface-container rounded-lg border border-outline-variant/50 w-28 py-1 pl-8 pr-2 font-mono font-bold text-sm focus:outline-none focus:border-secondary text-on-surface disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Quick money buttons for their money */}
                {isEditable && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {[50, 100, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickTheirMoney(amt)}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-on-surface-variant"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleQuickTheirMoney(them?.balance || 0)}
                      className="px-2 py-1 rounded-md text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20"
                    >
                      Max
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTheirMoney(0); saveProposal(myOffers, myMoney, theirOffers, 0); }}
                      className="px-1.5 py-1 rounded-md text-[10px] font-bold text-on-surface-variant hover:text-error"
                      title="Zerar"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {mobileTab === 'proposal' && (
            <section className="md:hidden rounded-2xl border border-outline-variant/50 bg-surface p-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-2">Resumo da proposta</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0"><span className="block text-on-surface-variant">Você entrega</span><span className="block font-bold text-on-surface break-words">{myOffers.length ? myOffers.join(', ') : 'Nenhum terreno'}{myMoney ? ` + ${fmt(myMoney)}` : ''}</span></div>
                <div className="min-w-0"><span className="block text-on-surface-variant">Você recebe</span><span className="block font-bold text-on-surface break-words">{theirOffers.length ? theirOffers.join(', ') : 'Nenhum terreno'}{theirMoney ? ` + ${fmt(theirMoney)}` : ''}</span></div>
              </div>
            </section>
          )}

          {/* Right Column: Inventário de {Them} */}
          <div className={`w-full md:w-[300px] lg:w-[320px] p-4 border-l border-outline-variant/30 flex flex-col bg-surface/50 overflow-hidden ${mobileTab !== 'their_inventory' ? 'hidden md:flex' : 'flex'}`}>
            <div className="pb-3 border-b border-outline-variant/30 shrink-0">
              <h3 className="font-headline font-bold text-sm text-on-surface flex items-center justify-between">
                <span>Inventário de {them?.name}</span>
                <span className="font-mono text-xs font-black text-secondary">{fmt(them?.balance)}</span>
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Toque nas propriedades para pedir</p>

              {/* Color Filter Chips */}
              <div className="flex overflow-x-auto hide-scrollbar gap-1.5 pt-2.5 pb-0.5">
                {filterGroups.map(group => (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setTheirFilterGroup(group)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${theirFilterGroup === group ? 'bg-secondary text-white border-secondary shadow-xs' : 'bg-surface text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'}`}
                  >
                    {group !== 'Todas' && (
                      <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ backgroundColor: colorMap[group] }} />
                    )}
                    {group}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 pt-3">
              {filteredTheirProps.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant/60 text-xs italic">
                  Nenhuma propriedade encontrada
                </div>
              ) : (
                filteredTheirProps.map(propId => {
                  const isOffered = theirOffers.includes(propId);
                  return renderInventoryCard(propId, () => handleAddTheirOffer(propId), isOffered, 'theirs');
                })
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-outline-variant/30 bg-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-on-surface-variant text-center sm:text-left">
            {isAwaitingApproval
              ? <span className="font-bold text-amber-600">⏳ Negociação antiga aguardando o Banco.</span>
              : isWaitingInitialOffer
                ? <span>Aguardando {initiator?.name} montar e enviar a proposta inicial.</span>
              : isInitialOfferer && !activeTrade.proposalById
                ? <span>Monte os termos iniciais; somente você pode enviar a primeira proposta.</span>
              : hasDraftChanges
                ? <span>Revise os itens e valores e envie a proposta para o outro jogador.</span>
                : isMyProposal
                  ? <span>Aguardando resposta de {them?.name}. Você pode ajustar e enviar uma contraproposta.</span>
                  : <span>Aceite, recuse ou altere os termos para enviar uma contraproposta.</span>}
          </div>

          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:gap-3">
            <button
              type="button"
              onClick={() => cancelTrade(activeTrade.id)}
              className="py-3 px-5 rounded-xl border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container font-bold text-xs uppercase tracking-wider transition-all"
            >
              Cancelar
            </button>

            {isEditable && hasDraftChanges && (
              <button
                type="button"
                onClick={submitProposal}
                disabled={submittingProposal}
                className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-primary text-on-primary font-black text-xs uppercase tracking-wider shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingProposal ? 'Enviando...' : isMyProposal ? 'Enviar Proposta' : 'Enviar Contraproposta'}
              </button>
            )}

            {isEditable && isProposalRecipient && !hasDraftChanges && (
              <>
                <button
                  type="button"
                  onClick={() => rejectTradeProposal(activeTrade.id, activeTrade.proposalRevision).catch((error) => addToast(error.message, 'error'))}
                  className="py-3 px-4 rounded-xl border border-error/30 text-error font-bold text-xs hover:bg-error/10"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  onClick={() => acceptTradeProposal(activeTrade.id, activeTrade.proposalRevision).catch((error) => addToast(error.message, 'error'))}
                  disabled={!hasTradeTerms}
                  className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-green-600 text-white font-black text-xs uppercase tracking-wider shadow-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4 inline mr-1" /> Aceitar e concluir
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
