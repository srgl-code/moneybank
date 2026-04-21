import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import socket from '../socket.js';

// ─── State Shape ──────────────────────────────────────────────────────────────
const initialState = {
  screen: 'home',         // 'home' | 'banker' | 'player'
  roomCode: null,
  mySocketId: null,       // tracks current socket.id so we can locate ourselves in gameState
  currentPlayer: null,    // own player object (kept in sync with gameState)
  gameState: null,        // { roomCode, players, history, startingBalance, status }
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
      // Keep currentPlayer fresh from the canonical server state
      const updated = gameState.players.find((p) => p.id === state.mySocketId);
      return {
        ...state,
        gameState,
        currentPlayer: updated ?? state.currentPlayer,
      };
    }

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
    };

    const onUpdateGameState = (gameState) => {
      dispatch({ type: 'UPDATE_GAME_STATE', payload: gameState });
    };

    const onReceivedPayment = ({ fromName, amount }) => {
      addToast(`💰 Recebeste M$${Number(amount).toLocaleString('pt-BR')} de ${fromName}!`, 'success');
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

    socket.on('connect',              onConnect);
    socket.on('update_game_state',    onUpdateGameState);
    socket.on('received_payment',     onReceivedPayment);
    socket.on('player_joined',        onPlayerJoined);
    socket.on('player_rejoined',      onPlayerRejoined);
    socket.on('player_disconnected',  onPlayerDisconnected);
    socket.on('balances_reset',       onBalancesReset);
    socket.on('room_closed',          onRoomClosed);
    socket.on('connect_error',        onConnectError);

    return () => {
      socket.off('connect',             onConnect);
      socket.off('update_game_state',   onUpdateGameState);
      socket.off('received_payment',    onReceivedPayment);
      socket.off('player_joined',       onPlayerJoined);
      socket.off('player_rejoined',     onPlayerRejoined);
      socket.off('player_disconnected', onPlayerDisconnected);
      socket.off('balances_reset',      onBalancesReset);
      socket.off('room_closed',         onRoomClosed);
      socket.off('connect_error',       onConnectError);
    };
  }, [addToast]);

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
          if (res.success) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const createRoom = useCallback(async (playerName, startingBalance) => {
    dispatch({ type: 'SET_CONNECTING', payload: true });
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    try {
      await ensureConnected();
      return new Promise((resolve, reject) => {
        socket.emit('create_room', { playerName, startingBalance }, (res) => {
          dispatch({ type: 'SET_CONNECTING', payload: false });
          if (res.success) {
            localStorage.setItem('moneybank_session', JSON.stringify({ roomCode: res.roomCode, sessionId: res.sessionId }));
            dispatch({ type: 'SET_MY_ID',         payload: socket.id });
            dispatch({ type: 'SET_ROOM',           payload: res.roomCode });
            dispatch({ type: 'SET_CURRENT_PLAYER', payload: res.player });
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

  const joinRoom = useCallback(async (roomCode, playerName, avatar) => {
    dispatch({ type: 'SET_CONNECTING', payload: true });
    dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
    try {
      await ensureConnected();
      return new Promise((resolve, reject) => {
        socket.emit('join_room', { roomCode, playerName, avatar }, (res) => {
          dispatch({ type: 'SET_CONNECTING', payload: false });
          if (res.success) {
            localStorage.setItem('moneybank_session', JSON.stringify({ roomCode: res.roomCode, sessionId: res.sessionId }));
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

  // ── Context Value ─────────────────────────────────────────────────────────────
  const value = {
    ...state,
    addToast,
    createRoom,
    joinRoom,
    performTransfer,
    adjustBalance,
    resetBalances,
    closeRoom,
    leaveRoom,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
