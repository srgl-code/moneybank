import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import socket from '../socket.js';

// ─── State Shape ──────────────────────────────────────────────────────────────
const initialState = {
  screen: 'home',         // 'home' | 'banker' | 'player'
  roomCode: null,
  mySocketId: null,       // tracks current socket.id so we can locate ourselves in gameState
  currentPlayer: null,    // own player object (kept in sync with gameState)
  gameState: null,        // { roomCode, players, history, pendingTransfers, startingBalance, status, trades }
  pendingTransfers: [],   // kept in sync from gameState for easy access
  activeTrade: null,      // current trade being negotiated or requested
  tradeRequests: [],      // incoming trade requests
  toasts: [],
  isConnecting: false,
  connectionError: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.payload };

    case 'SET_ROOM':
      return { ...state, roomCode: action.payload };

    case 'SET_MY_ID':
      return { ...state, mySocketId: action.payload };

    case 'SET_CURRENT_PLAYER':
      return { ...state, currentPlayer: action.payload };

    case 'UPDATE_GAME_STATE': {
      const gameState = action.payload;
      if (!gameState) return state;
      
      // Keep currentPlayer fresh from the canonical server state
      const updated = gameState.players?.find((p) => p.id === state.mySocketId);
      const isBanker = updated?.isBanker;
      
      // Update activeTrade if it exists in gameState.trades
      let activeTrade = state.activeTrade;
      if (activeTrade) {
        const serverTrade = gameState.trades?.find(t => t.id === activeTrade.id);
        if (serverTrade) {
          activeTrade = serverTrade;
        } else if (activeTrade.status !== 'requested') {
          // If it's not in the server and not just requested, it might have been resolved/cancelled
          activeTrade = null;
        }
      } else if (gameState.trades) {
        // Auto-pick up an active trade if we don't have one set, but one exists for us
        const relevantTrade = gameState.trades.find(t => {
          if (t.initiatorId === state.mySocketId || t.receiverId === state.mySocketId) return true;
          if (isBanker && t.status === 'banker_approval') return true;
          return false;
        });
        if (relevantTrade) {
          activeTrade = relevantTrade;
        }
      }
      
      return {
        ...state,
        gameState,
        pendingTransfers: gameState.pendingTransfers ?? state.pendingTransfers ?? [],
        currentPlayer: updated ?? state.currentPlayer,
        activeTrade,
      };
    }

    case 'SET_ACTIVE_TRADE':
      return { ...state, activeTrade: action.payload, tradeRequests: [] };

    case 'SET_ACTIVE_TRADE_IF_INVOLVED': {
      const trade = action.payload;
      if (!trade) return { ...state, activeTrade: null, tradeRequests: [] };
      
      const isBanker = state.currentPlayer?.isBanker;
      const isInitiator = trade.initiatorId === state.mySocketId;
      const isReceiver = trade.receiverId === state.mySocketId;
      
      if (isBanker || isInitiator || isReceiver) {
        return { ...state, activeTrade: trade, tradeRequests: [] };
      }
      return state;
    }

    case 'ADD_TRADE_REQUEST':
      if (state.activeTrade) return state; // Ignore if already in a trade
      // Prevent duplicate requests from the same initiator
      if (state.tradeRequests.some(t => t.initiatorId === action.payload.initiatorId)) return state;
      return { ...state, tradeRequests: [...state.tradeRequests, action.payload] };

    case 'REMOVE_TRADE_REQUEST':
      return { ...state, tradeRequests: state.tradeRequests.filter((t) => t.id !== action.payload) };

    case 'ADD_PENDING_TRANSFER':
      return { ...state, pendingTransfers: [...state.pendingTransfers, action.payload] };

    case 'REMOVE_PENDING_TRANSFER':
      return { ...state, pendingTransfers: state.pendingTransfers.filter((r) => r.requestId !== action.payload) };

    case 'CANCEL_PENDING_TRANSFERS':
      return { ...state, pendingTransfers: state.pendingTransfers.filter((r) => !action.payload.includes(r.requestId)) };

    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };

    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };

    case 'SET_CONNECTION_ERROR':
      return { ...state, connectionError: action.payload };

    case 'RESET':
      return { ...initialState };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastIdRef = useRef(0);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = String(++toastIdRef.current);
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), duration);
  }, []);

  // ── Socket event listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const onConnect = () => {
      dispatch({ type: 'SET_MY_ID', payload: socket.id });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });

      // Automatically rejoin room on socket reconnect (e.g. network switch/phone lock)
      try {
        const saved = JSON.parse(localStorage.getItem('moneybank_session') || '{}');
        if (saved?.roomCode && saved?.sessionId) {
          socket.emit(
            'join_room',
            { roomCode: saved.roomCode, sessionId: saved.sessionId },
            (res) => {
              if (res && res.success) {
                dispatch({ type: 'SET_MY_ID',         payload: socket.id });
                dispatch({ type: 'SET_ROOM',           payload: res.roomCode });
                dispatch({ type: 'SET_CURRENT_PLAYER', payload: res.player });
                dispatch({ type: 'UPDATE_GAME_STATE',  payload: res.gameState });
                dispatch({ type: 'SET_SCREEN',         payload: res.player.isBanker ? 'banker' : 'player' });
              }
            }
          );
        }
      } catch (e) {}
    };

    const onUpdateGameState = (gameState) => {
      dispatch({ type: 'UPDATE_GAME_STATE', payload: gameState });
    };

    const onReceivedPayment = ({ fromName, amount }) => {
      addToast(`💰 Recebeste M$${Number(amount).toLocaleString('pt-BR')} de ${fromName}!`, 'success');
    };
    const onNewTransferRequest = (req) => {
      dispatch({ type: 'ADD_PENDING_TRANSFER', payload: req });
      addToast(`\u{1F4F3} ${req.fromName} quer pagar M$${Number(req.amount).toLocaleString('pt-BR')} a ${req.toName}`, 'info', 6000);
    };

    const onNotification = ({ type, message }) => {
      const toastType = type === 'debit' ? 'warning' : type === 'credit' ? 'success' : type === 'error' ? 'error' : 'info';
      addToast(message, toastType, 5000);
    };

    const onTransfersCancelled = ({ requestIds, playerName }) => {
      dispatch({ type: 'CANCEL_PENDING_TRANSFERS', payload: requestIds });
      addToast(`\u{1F6AB} Pedidos de ${playerName} cancelados (saiu da sala)`, 'warning');
    };
    const onPlayerJoined = ({ playerName }) => {
      addToast(`🎲 ${playerName} entrou na sala`, 'info');
    };

    const onPlayerRejoined = ({ playerName }) => {
      addToast(`🔄 ${playerName} reconectou`, 'info');
    };

    const onPlayerDisconnected = ({ playerName }) => {
      addToast(`📵 ${playerName} desconectou`, 'warning');
    };

    const onBalancesReset = ({ startingBalance }) => {
      addToast(`🔄 Saldos reiniciados para M$${Number(startingBalance).toLocaleString('pt-BR')}`, 'info');
    };

    const onRoomClosed = () => {
      addToast('🚪 A sala foi encerrada pelo bancário', 'warning', 6000);
      localStorage.removeItem('moneybank_session');
      socket.disconnect();
      dispatch({ type: 'RESET' });
    };

    const onConnectError = (err) => {
      dispatch({ type: 'SET_CONNECTING', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: 'Falha ao conectar ao servidor. Tenta novamente.' });
      console.error('[socket] connect_error', err.message);
    };

    const onTradeRequested = (trade) => {
      dispatch({ type: 'ADD_TRADE_REQUEST', payload: trade });
      addToast(`🤝 ${trade.initiatorName} quer negociar contigo!`, 'info', 8000);
    };
    const onTradeStarted = (trade) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: trade });
    };
    const onTradeProposalUpdated = (trade) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: trade });
    };
    const onTradeProposalReceived = (trade) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: trade });
      addToast('📋 Nova proposta de negociação recebida!', 'info');
    };
    const onTradeApprovalRequest = (trade) => {
      dispatch({ type: 'SET_ACTIVE_TRADE_IF_INVOLVED', payload: trade });
      if (trade.initiatorId === socket.id || trade.receiverId === socket.id) {
        addToast('⏳ Negociação enviada para aprovação do banco.', 'info');
      } else if (state.currentPlayer?.isBanker) {
        addToast('⚖️ Nova negociação aguardando sua aprovação!', 'warning', 8000);
      }
    };
    const onTradeCompleted = ({ tradeId }) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: null });
      addToast('✅ Negociação concluída com sucesso!', 'success');
    };
    const onTradeRejectedBank = ({ tradeId }) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: null });
      addToast('❌ O Banco recusou a negociação.', 'error');
    };
    const onTradeRejected = ({ tradeId }) => {
      dispatch({ type: 'REMOVE_TRADE_REQUEST', payload: tradeId });
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: null });
      addToast('❌ Negociação recusada pelo jogador.', 'warning');
    };
    const onTradeCancelled = ({ tradeId }) => {
      dispatch({ type: 'SET_ACTIVE_TRADE', payload: null });
      addToast('🛑 A negociação foi cancelada.', 'warning');
    };

    socket.on('connect',              onConnect);
    socket.on('update_game_state',    onUpdateGameState);
    socket.on('received_payment',     onReceivedPayment);
    socket.on('new_transfer_request', onNewTransferRequest);
    socket.on('notification',         onNotification);
    socket.on('transfers_cancelled',  onTransfersCancelled);
    socket.on('player_joined',        onPlayerJoined);
    socket.on('player_rejoined',      onPlayerRejoined);
    socket.on('player_disconnected',  onPlayerDisconnected);
    socket.on('balances_reset',       onBalancesReset);
    socket.on('room_closed',          onRoomClosed);
    socket.on('connect_error',        onConnectError);
    socket.on('trade_requested',      onTradeRequested);
    socket.on('trade_started',        onTradeStarted);
    socket.on('trade_proposal_updated', onTradeProposalUpdated);
    socket.on('trade_proposal_received', onTradeProposalReceived);
    socket.on('trade_approval_request', onTradeApprovalRequest);
    socket.on('trade_completed',      onTradeCompleted);
    socket.on('trade_rejected_bank',  onTradeRejectedBank);
    socket.on('trade_rejected',       onTradeRejected);
    socket.on('trade_cancelled',      onTradeCancelled);

    return () => {
      socket.off('connect',             onConnect);
      socket.off('update_game_state',   onUpdateGameState);
      socket.off('received_payment',    onReceivedPayment);
      socket.off('new_transfer_request',onNewTransferRequest);
      socket.off('notification',        onNotification);
      socket.off('transfers_cancelled', onTransfersCancelled);
      socket.off('player_joined',       onPlayerJoined);
      socket.off('player_rejoined',     onPlayerRejoined);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('balances_reset',      onBalancesReset);
      socket.off('room_closed',         onRoomClosed);
      socket.off('connect_error',       onConnectError);
      socket.off('trade_requested',     onTradeRequested);
      socket.off('trade_started',       onTradeStarted);
      socket.off('trade_proposal_updated', onTradeProposalUpdated);
      socket.off('trade_proposal_received', onTradeProposalReceived);
      socket.off('trade_approval_request', onTradeApprovalRequest);
      socket.off('trade_completed',     onTradeCompleted);
      socket.off('trade_rejected_bank', onTradeRejectedBank);
      socket.off('trade_rejected',      onTradeRejected);
      socket.off('trade_cancelled',     onTradeCancelled);
    };
  }, [addToast, state.currentPlayer?.isBanker]);

  // ── Auto-reconnect from saved session on mount ──────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('moneybank_session');
    if (!saved) return;

    let session;
    try {
      session = JSON.parse(saved);
    } catch {
      localStorage.removeItem('moneybank_session');
      return;
    }

    if (!session?.roomCode || !session?.sessionId) {
      localStorage.removeItem('moneybank_session');
      return;
    }

    dispatch({ type: 'SET_CONNECTING', payload: true });

    function doRejoin() {
      socket.emit(
        'join_room',
        { roomCode: session.roomCode, sessionId: session.sessionId },
        (res) => {
          dispatch({ type: 'SET_CONNECTING', payload: false });
          if (res && res.success) {
            dispatch({ type: 'SET_MY_ID',          payload: socket.id });
            dispatch({ type: 'SET_ROOM',            payload: res.roomCode });
            dispatch({ type: 'SET_CURRENT_PLAYER',  payload: res.player });
            dispatch({ type: 'UPDATE_GAME_STATE',   payload: res.gameState });
            dispatch({ type: 'SET_SCREEN',          payload: res.player.isBanker ? 'banker' : 'player' });
            addToast('✅ Sessão restaurada com sucesso', 'success');
          } else {
            localStorage.removeItem('moneybank_session');
            addToast('Sessão anterior expirou', 'warning');
          }
        }
      );
    }

    if (socket.connected) {
      doRejoin();
    } else {
      socket.connect();
      socket.once('connect', doRejoin);
      socket.once('connect_error', () => {
        dispatch({ type: 'SET_CONNECTING', payload: false });
        localStorage.removeItem('moneybank_session');
      });
    }
  }, [addToast]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const ensureConnected = useCallback(() =>
    new Promise((resolve, reject) => {
      if (socket.connected) { resolve(); return; }
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      socket.connect();
      socket.once('connect', resolve);
      socket.once('connect_error', (err) => reject(new Error('Falha ao conectar: ' + err.message)));
    }),
  []);

  const saveRecentRoom = (roomCode, sessionId, meta = {}) => {
    try {
      const recent = JSON.parse(localStorage.getItem('moneybank_recent_rooms') || '[]');
      const newRecent = [
        { roomCode, sessionId, time: Date.now(), ...meta },
        ...recent.filter(r => r.roomCode !== roomCode)
      ].slice(0, 5);
      localStorage.setItem('moneybank_recent_rooms', JSON.stringify(newRecent));
    } catch(e){}
  };

  const createRoom = useCallback(async (playerName, startingBalance, startingPassGo) => {
    dispatch({ type: 'SET_CONNECTING', payload: true });
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    try {
      await ensureConnected();
      return new Promise((resolve, reject) => {
        socket.emit('create_room', { playerName, startingBalance, startingPassGo }, (res) => {
          dispatch({ type: 'SET_CONNECTING', payload: false });
          if (res.success) {
            localStorage.setItem('moneybank_session', JSON.stringify({ roomCode: res.roomCode, sessionId: res.sessionId }));
            saveRecentRoom(res.roomCode, res.sessionId, {
              bankerName: playerName,
              playerCount: 1,
              myEmoji: '🏦',
            });
            dispatch({ type: 'SET_MY_ID',         payload: socket.id });
            dispatch({ type: 'SET_ROOM',           payload: res.roomCode });
            dispatch({ type: 'SET_CURRENT_PLAYER', payload: res.player });
            dispatch({ type: 'UPDATE_GAME_STATE', payload: res.gameState });
            dispatch({ type: 'SET_SCREEN',         payload: 'banker' });
            resolve(res);
          } else {
            reject(new Error(res.error));
          }
        });
      });
    } catch (err) {
      dispatch({ type: 'SET_CONNECTING', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: err.message });
      throw err;
    }
  }, [ensureConnected]);

  const joinRoom = useCallback(async (roomCode, playerName, avatar, color, sessionId) => {
    dispatch({ type: 'SET_CONNECTING', payload: true });
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    try {
      await ensureConnected();

      // Fallback: check if we have a saved session for this room if sessionId wasn't passed
      let effectiveSessionId = sessionId;
      if (!effectiveSessionId) {
        try {
          const saved = JSON.parse(localStorage.getItem('moneybank_session') || '{}');
          if (saved.roomCode?.toUpperCase() === roomCode?.toUpperCase() && saved.sessionId) {
            effectiveSessionId = saved.sessionId;
          } else {
            const recent = JSON.parse(localStorage.getItem('moneybank_recent_rooms') || '[]');
            const match = recent.find((r) => r.roomCode?.toUpperCase() === roomCode?.toUpperCase());
            if (match?.sessionId) {
              effectiveSessionId = match.sessionId;
            }
          }
        } catch (e) {}
      }

      return new Promise((resolve, reject) => {
        socket.emit('join_room', { roomCode, playerName, avatar, color, sessionId: effectiveSessionId }, (res) => {
          dispatch({ type: 'SET_CONNECTING', payload: false });
          if (res.success) {
            localStorage.setItem('moneybank_session', JSON.stringify({ roomCode: res.roomCode, sessionId: res.sessionId }));
            const banker = res.gameState?.players?.find(p => p.isBanker);
            saveRecentRoom(res.roomCode, res.sessionId, {
              bankerName: banker?.name || '?',
              playerCount: res.gameState?.players?.length ?? 1,
              myEmoji: avatar || '🎲',
            });
            dispatch({ type: 'SET_MY_ID',         payload: socket.id });
            dispatch({ type: 'SET_ROOM',           payload: res.roomCode });
            dispatch({ type: 'SET_CURRENT_PLAYER', payload: res.player });
            dispatch({ type: 'UPDATE_GAME_STATE',  payload: res.gameState });
            dispatch({ type: 'SET_SCREEN',         payload: res.player.isBanker ? 'banker' : 'player' });
            resolve(res);
          } else {
            reject(new Error(res.error));
          }
        });
      });
    } catch (err) {
      dispatch({ type: 'SET_CONNECTING', payload: false });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: err.message });
      throw err;
    }
  }, [ensureConnected]);

  const performTransfer = useCallback((toId, amount) =>
    new Promise((resolve, reject) => {
      socket.emit(
        'perform_transfer',
        { roomCode: state.roomCode, fromId: socket.id, toId, amount },
        (res) => (res.success ? resolve(res) : reject(new Error(res.error)))
      );
    }),
  [state.roomCode]);

  const requestTransfer = useCallback((toId, amount, reason, metadata = {}) =>
    new Promise((resolve, reject) => {
      socket.emit(
        'request_transfer',
        { roomCode: state.roomCode, toId, amount, reason, metadata },
        (res) => (res.success ? resolve(res) : reject(new Error(res.error)))
      );
    }),
  [state.roomCode]);

  const approveTransfer = useCallback((requestId) =>
    new Promise((resolve, reject) => {
      socket.emit(
        'approve_transfer',
        { roomCode: state.roomCode, requestId },
        (res) => (res.success ? resolve(res) : reject(new Error(res.error)))
      );
    }),
  [state.roomCode]);

  const rejectTransfer = useCallback((requestId) =>
    new Promise((resolve, reject) => {
      socket.emit(
        'reject_transfer',
        { roomCode: state.roomCode, requestId },
        (res) => (res.success ? resolve(res) : reject(new Error(res.error)))
      );
    }),
  [state.roomCode]);

  const adjustBalance = useCallback((targetId, amount, reason) =>
    new Promise((resolve, reject) => {
      socket.emit(
        'adjust_balance',
        { roomCode: state.roomCode, targetId, amount, reason },
        (res) => (res.success ? resolve(res) : reject(new Error(res.error)))
      );
    }),
  [state.roomCode]);

  const resetBalances = useCallback(() =>
    new Promise((resolve, reject) => {
      socket.emit('reset_balances', { roomCode: state.roomCode }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const closeRoom = useCallback(() =>
    new Promise((resolve, reject) => {
      socket.emit('close_room', { roomCode: state.roomCode }, (res) => {
        if (res.success) {
          localStorage.removeItem('moneybank_session');
          socket.disconnect();
          dispatch({ type: 'RESET' });
          resolve(res);
        } else {
          reject(new Error(res.error));
        }
      });
    }),
  [state.roomCode]);

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('moneybank_session');
    socket.disconnect();
    dispatch({ type: 'RESET' });
  }, []);

  const passGo = useCallback((amount = 200) =>
    new Promise((resolve, reject) => {
      socket.emit('pass_go', { roomCode: state.roomCode, amount }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const collectFine = useCallback((amount, reason) =>
    new Promise((resolve, reject) => {
      socket.emit('collect_fine', { roomCode: state.roomCode, amount, reason }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const startAuction = useCallback((propertyId, startingBid) =>
    new Promise((resolve, reject) => {
      socket.emit('start_auction', { roomCode: state.roomCode, propertyId, startingBid }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const assignProperty = useCallback((targetId, propertyId) =>
    new Promise((resolve, reject) => {
      socket.emit('assign_property', { roomCode: state.roomCode, targetId, propertyId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const removeProperty = useCallback((targetId, propertyId) =>
    new Promise((resolve, reject) => {
      socket.emit('remove_property', { roomCode: state.roomCode, targetId, propertyId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const requestTrade = useCallback((toId) =>
    new Promise((resolve, reject) => {
      socket.emit('request_trade', { roomCode: state.roomCode, toId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const respondTrade = useCallback((tradeId, accept) => {
    dispatch({ type: 'REMOVE_TRADE_REQUEST', payload: tradeId });
    return new Promise((resolve, reject) => {
      socket.emit('respond_trade', { roomCode: state.roomCode, tradeId, accept }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    });
  }, [state.roomCode]);

  const updateTradeProposal = useCallback((tradeId, proposal) =>
    new Promise((resolve, reject) => {
      socket.emit('update_trade_proposal', { roomCode: state.roomCode, tradeId, proposal }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const submitTradeProposal = useCallback((tradeId) =>
    new Promise((resolve, reject) => {
      socket.emit('submit_trade_proposal', { roomCode: state.roomCode, tradeId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const acceptTradeProposal = useCallback((tradeId) =>
    new Promise((resolve, reject) => {
      socket.emit('accept_trade_proposal', { roomCode: state.roomCode, tradeId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const cancelTrade = useCallback((tradeId) =>
    new Promise((resolve, reject) => {
      socket.emit('cancel_trade', { roomCode: state.roomCode, tradeId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);
  
  const approveTradeBank = useCallback((tradeId) =>
    new Promise((resolve, reject) => {
      socket.emit('approve_trade', { roomCode: state.roomCode, tradeId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);
  
  const rejectTradeBank = useCallback((tradeId) =>
    new Promise((resolve, reject) => {
      socket.emit('reject_trade_bank', { roomCode: state.roomCode, tradeId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  const kickPlayer = useCallback((targetId) =>
    new Promise((resolve, reject) => {
      socket.emit('kick_player', { roomCode: state.roomCode, targetId }, (res) =>
        res.success ? resolve(res) : reject(new Error(res.error))
      );
    }),
  [state.roomCode]);

  // ── Context Value ─────────────────────────────────────────────────────────────
  const value = {
    ...state,
    addToast,
    createRoom,
    joinRoom,
    performTransfer,
    requestTransfer,
    approveTransfer,
    rejectTransfer,
    adjustBalance,
    resetBalances,
    closeRoom,
    leaveRoom,
    passGo,
    collectFine,
    startAuction,
    assignProperty,
    removeProperty,
    requestTrade,
    respondTrade,
    updateTradeProposal,
    submitTradeProposal,
    acceptTradeProposal,
    cancelTrade,
    approveTradeBank,
    rejectTradeBank,
    kickPlayer,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
