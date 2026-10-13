'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { propertiesData } = require('./data/properties.js');
const { getConstructionPlan, normalizeTradeProposal, settleTrade } = require('./gameRules.js');

const app = express();
const httpServer = http.createServer(app);
const IS_PROD = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (IS_PROD ? '*' : 'http://localhost:5173');
const io = new Server(httpServer, {
  cors: { origin: IS_PROD ? true : CLIENT_URL, methods: ['GET', 'POST'] },
});

app.use(cors({ origin: IS_PROD ? true : CLIENT_URL }));
app.use(express.json());

const rooms = {};
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: Object.keys(rooms).length }));

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function sanitizeAmount(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function sanitizeString(raw, maxLen = 50) {
  if (!raw || typeof raw !== 'string') return null;
  return raw.trim().slice(0, maxLen);
}

/**
 * Returns a serializable snapshot of the room state (no sessionIds leaked).
 * Players are already sorted by descending balance for the ranking.
 */
function getRoomState(room) {
  return {
    roomCode: room.roomCode,
    players: [...room.players]
      .sort((a, b) => b.balance - a.balance)
      .map(({ sessionId: _s, ...rest }) => ({ ...rest, connected: !!io.sockets.sockets.get(rest.id) })), // strip internal sessionId from broadcast
    history: room.transactionHistory.slice(-50),
    pendingTransfers: room.pendingTransfers ?? [],
    trades: room.trades ?? [],
    auction: room.auction ?? null,
    startingBalance: room.startingBalance,
    startingPassGo: room.startingPassGo ?? 200,
    status: room.status,
  };
}

function reconnectRoomPlayer(room, code, socket, player) {
  const oldSocketId = player.id;
  player.id = socket.id;
  if (player.isBanker) room.bankerId = socket.id;
  for (const request of room.pendingTransfers) {
    if (request.fromId === oldSocketId) request.fromId = socket.id;
    if (request.toId === oldSocketId) request.toId = socket.id;
  }
  for (const trade of room.trades || []) {
    if (trade.initiatorId === oldSocketId) trade.initiatorId = socket.id;
    if (trade.recipientId === oldSocketId) trade.recipientId = socket.id;
    if (trade.receiverId === oldSocketId) trade.receiverId = socket.id;
    if (trade.proposalById === oldSocketId) trade.proposalById = socket.id;
    if (trade.currentTurnPlayerId === oldSocketId) trade.currentTurnPlayerId = socket.id;
  }
  if (room.auction) {
    room.auction.participantIds = room.auction.participantIds.map((id) => id === oldSocketId ? socket.id : id);
    room.auction.passedPlayerIds = room.auction.passedPlayerIds.map((id) => id === oldSocketId ? socket.id : id);
    room.auction.bids.forEach((bid) => { if (bid.playerId === oldSocketId) bid.playerId = socket.id; });
    if (room.auction.currentTurnPlayerId === oldSocketId) room.auction.currentTurnPlayerId = socket.id;
    if (room.auction.highestBidderId === oldSocketId) room.auction.highestBidderId = socket.id;
  }
  socket.join(code);
  socket.data.roomCode = code;
  socket.data.sessionId = player.sessionId;
  io.in(code).emit('player_rejoined', { playerName: player.name });
  io.in(code).emit('update_game_state', getRoomState(room));
  return { success: true, roomCode: code, sessionId: player.sessionId, player, gameState: getRoomState(room) };
}

function recordBalanceHistory(player) {
  if (player.isBanker) return;
  if (!Array.isArray(player.balanceHistory)) player.balanceHistory = [];
  player.balanceHistory.push(player.balance);
  if (player.balanceHistory.length > 50) player.balanceHistory.shift();
}

function availableBalance(room, player, excludeRequestId = null) {
  const reservedBid = room.auction?.status === 'active' && room.auction.highestBidderId === player.id
    ? room.auction.currentBid
    : 0;
  const reservedRequests = room.pendingTransfers
    .filter((request) => request.requestId !== excludeRequestId && request.fromId === player.id)
    .reduce((sum, request) => sum + request.amount, 0);
  return Math.max(0, player.balance - reservedBid - reservedRequests);
}

function auctionBidLimit(room, player) {
  const reservedRequests = room.pendingTransfers
    .filter((request) => request.fromId === player.id)
    .reduce((sum, request) => sum + request.amount, 0);
  return Math.max(0, player.balance - reservedRequests);
}

function recordEntry(room, entry) {
  room.transactionHistory.push(entry);
  trimHistory(room);
}

function applyTradeSettlement(room, trade) {
  const normalized = normalizeTradeProposal(room, trade, trade.proposal, propertiesData);
  if (normalized.error) return normalized;
  if (normalized.proposal.initiatorMoney > availableBalance(room, normalized.initiator) ||
      normalized.proposal.receiverMoney > availableBalance(room, normalized.receiver)) {
    return { error: 'Saldo insuficiente: parte do saldo está reservada para um leilão ou outra operação.' };
  }

  const result = settleTrade(room, trade, propertiesData, recordBalanceHistory);
  if (result.error) return result;
  const { proposal, initiator, receiver } = result;
  const receivedByInitiator = proposal.receiverOffers.join(', ') || 'nenhuma propriedade';
  const receivedByReceiver = proposal.initiatorOffers.join(', ') || 'nenhuma propriedade';
  const details = [
    `${initiator.name} entregou ${proposal.initiatorOffers.join(', ') || 'nenhuma propriedade'}${proposal.initiatorMoney ? ` + M$${proposal.initiatorMoney.toLocaleString('pt-BR')}` : ''}`,
    `${receiver.name} entregou ${proposal.receiverOffers.join(', ') || 'nenhuma propriedade'}${proposal.receiverMoney ? ` + M$${proposal.receiverMoney.toLocaleString('pt-BR')}` : ''}`,
  ].join('; ');
  recordEntry(room, {
    id: uuidv4(),
    time: new Date().toISOString(),
    fromId: initiator.id,
    toId: receiver.id,
    fromName: initiator.name,
    toName: receiver.name,
    amount: proposal.initiatorMoney + proposal.receiverMoney,
    type: 'trade',
    details: { receivedByInitiator, receivedByReceiver, ...proposal },
    description: `Negociação entre ${initiator.name} e ${receiver.name}: ${details}`,
  });
  return result;
}

function currentAuctionOwner(room, propertyId) {
  return room.players.find((player) => !player.isBanker && player.properties?.includes(propertyId));
}

function chooseAuctionLeader(room) {
  const auction = room.auction;
  const passed = new Set(auction.passedPlayerIds);
  const highest = auction.bids
    .filter((bid) => !passed.has(bid.playerId) && room.players.some((player) => player.id === bid.playerId))
    .sort((left, right) => right.amount - left.amount || Date.parse(left.time) - Date.parse(right.time))[0];
  auction.highestBidderId = highest?.playerId || null;
  auction.currentBid = highest?.amount || 0;
}

function advanceAuction(room, previousPlayerId) {
  const auction = room.auction;
  if (!auction || auction.status !== 'active') return;
  const activePlayers = auction.participantIds.filter((id) => !auction.passedPlayerIds.includes(id));
  if (activePlayers.length === 0 || (activePlayers.length === 1 && activePlayers[0] === auction.highestBidderId)) {
    finishAuction(room);
    return;
  }

  const previousIndex = auction.participantIds.indexOf(previousPlayerId);
  for (let step = 1; step <= auction.participantIds.length; step += 1) {
    const candidate = auction.participantIds[(previousIndex + step + auction.participantIds.length) % auction.participantIds.length];
    if (activePlayers.includes(candidate)) {
      auction.currentTurnPlayerId = candidate;
      return;
    }
  }
}

function finishAuction(room) {
  const auction = room.auction;
  if (!auction || auction.status !== 'active') return;
  const propertyOwner = currentAuctionOwner(room, auction.propertyId);
  let winner = room.players.find((player) => player.id === auction.highestBidderId && !player.isBanker);
  if (propertyOwner || (winner && auctionBidLimit(room, winner) < auction.currentBid)) winner = null;

  if (winner && auction.currentBid > 0) {
    if (!winner.properties) winner.properties = [];
    if (!winner.properties.includes(auction.propertyId)) winner.properties.push(auction.propertyId);
    winner.balance -= auction.currentBid;
    recordBalanceHistory(winner);
    auction.winnerId = winner.id;
    auction.winnerName = winner.name;
    auction.status = 'completed';
    recordEntry(room, {
      id: uuidv4(),
      time: new Date().toISOString(),
      fromId: winner.id,
      toId: room.bankerId,
      fromName: winner.name,
      toName: 'Banco',
      amount: auction.currentBid,
      type: 'auction',
      propertyId: auction.propertyId,
      description: `${winner.name} venceu o leilão de ${auction.propertyId} por M$${auction.currentBid.toLocaleString('pt-BR')}`,
    });
  } else {
    auction.status = 'completed';
    auction.winnerId = null;
    auction.winnerName = null;
    auction.result = propertyOwner ? 'property_unavailable' : 'no_bids';
    recordEntry(room, {
      id: uuidv4(),
      time: new Date().toISOString(),
      fromName: 'Banco',
      toName: 'Todos',
      amount: 0,
      type: 'auction',
      propertyId: auction.propertyId,
      description: `Leilão de ${auction.propertyId} encerrado sem venda`,
    });
  }
  auction.closedAt = new Date().toISOString();
}

// ─── Socket Logic ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] connect   ${socket.id}`);

  // ── create_room ─────────────────────────────────────────────────────────────
  socket.on('create_room', ({ playerName, startingBalance, startingPassGo = 200 } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const safeName = sanitizeString(playerName, 20);
      if (!safeName) return callback({ success: false, error: 'Nome inválido' });

      const balance = sanitizeAmount(startingBalance);
      if (!balance || balance < 1 || balance > 10_000_000) {
        return callback({ success: false, error: 'Saldo inicial deve ser entre 1 e 10.000.000' });
      }

      let roomCode;
      let attempts = 0;
      do {
        roomCode = generateRoomCode();
        if (++attempts > 200) return callback({ success: false, error: 'Não foi possível gerar um código único' });
      } while (rooms[roomCode]);

      const sessionId = uuidv4();

      /** @type {Player} */
      const banker = {
        id: socket.id,
        sessionId,
        name: safeName,
        balance: 0,       // Banco tem saldo infinito – não rastreado
        isBanker: true,
        avatar: '🏦',
        color: null,
        properties: [],
        houses: {},
        balanceHistory: [],
      };

      /** @type {Room} */
      rooms[roomCode] = {
        roomCode,
        bankerId: socket.id,
        players: [banker],
        transactionHistory: [],
        pendingTransfers: [],
        trades: [],
        auction: null,
        startingBalance: balance,
        startingPassGo: sanitizeAmount(startingPassGo) ?? 200,
        status: 'active',
        createdAt: new Date(),
      };

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.sessionId = sessionId;

      console.log(`[room:create] ${roomCode}  host="${safeName}"`);
      callback({ success: true, roomCode, sessionId, player: banker, gameState: getRoomState(rooms[roomCode]) });

    } catch (err) {
      console.error('[create_room]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── join_room ────────────────────────────────────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName, avatar, color, sessionId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const code = sanitizeString(roomCode, 6)?.toUpperCase();
      if (!code) return callback({ success: false, error: 'Código de sala inválido' });

      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada. Verifique o código.' });
      if (room.status === 'closed') return callback({ success: false, error: 'Esta sala foi encerrada' });

      // ── Reconnect via saved session ──────────────────────────────────────────
      if (sessionId && typeof sessionId === 'string') {
        const existing = room.players.find((p) => p.sessionId === sessionId);
        if (existing) {
          if (existing.id !== socket.id && io.sockets.sockets.has(existing.id)) {
            return callback({ success: false, error: 'Esta sessão já está conectada em outro dispositivo' });
          }
          const restored = reconnectRoomPlayer(room, code, socket, existing);
          console.log(`[room:rejoin] ${code}  "${existing.name}"`);
          return callback(restored);
        }
      }


      // ── New player ────────────────────────────────────────────────────────────
      const safeName = sanitizeString(playerName, 20);
      if (!safeName) return callback({ success: false, error: 'Nome inválido' });

      const sameNamePlayers = room.players.filter((player) => !player.isBanker && player.name.trim().toLowerCase() === safeName.toLowerCase());
      if (sameNamePlayers.length) {
        const activeDuplicate = sameNamePlayers.find((player) => io.sockets.sockets.has(player.id));
        if (activeDuplicate) return callback({ success: false, error: 'Este nome já está conectado à sala' });
        return callback(reconnectRoomPlayer(room, code, socket, sameNamePlayers[0]));
      }

      const safeAvatar = sanitizeString(avatar, 4) || '👤';
      const safeColor = sanitizeString(color, 10) || null;

      const humanPlayers = room.players.filter((p) => !p.isBanker);
      if (humanPlayers.length >= 8) {
        return callback({ success: false, error: 'Sala cheia (máximo 8 jogadores)' });
      }

      const newSessionId = uuidv4();
      /** @type {Player} */
      const newPlayer = {
        id: socket.id,
        sessionId: newSessionId,
        name: safeName,
        balance: room.startingBalance,
        isBanker: false,
        avatar: safeAvatar,
        color: safeColor,
        properties: [],
        houses: {},
        balanceHistory: [room.startingBalance],
      };

      room.players.push(newPlayer);
      socket.join(code);
      socket.data.roomCode = code;
      socket.data.sessionId = newSessionId;

      io.in(code).emit('player_joined', { playerName: safeName });
      io.in(code).emit('update_game_state', getRoomState(room));

      console.log(`[room:join]   ${code}  "${safeName}"`);
      callback({
        success: true,
        roomCode: code,
        sessionId: newSessionId,
        player: newPlayer,
        gameState: getRoomState(room),
      });

    } catch (err) {
      console.error('[join_room]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── perform_transfer ─────────────────────────────────────────────────────────
  socket.on('perform_transfer', ({ roomCode, fromId, toId, amount } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });

      // Security: the initiating socket must be the declared sender
      if (fromId !== socket.id) {
        return callback({ success: false, error: 'Operação não autorizada' });
      }

      const amt = sanitizeAmount(amount);
      if (!amt || amt <= 0) return callback({ success: false, error: 'Valor deve ser maior que zero' });
      if (amt > 1_000_000_000) return callback({ success: false, error: 'Valor excede o limite máximo' });

      const sender   = room.players.find((p) => p.id === fromId);
      const receiver = room.players.find((p) => p.id === toId);

      if (!sender)   return callback({ success: false, error: 'Remetente não encontrado' });
      if (!receiver) return callback({ success: false, error: 'Destinatário não encontrado' });
      if (!io.sockets.sockets.has(receiver.id)) return callback({ success: false, error: 'O destinatário está desconectado; aguarde a reconexão' });
      if (sender.id === receiver.id) return callback({ success: false, error: 'Não podes transferir para ti mesmo' });

      if (!sender.isBanker && availableBalance(room, sender) < amt) {
        return callback({ success: false, error: `Saldo disponível insuficiente (M$${availableBalance(room, sender).toLocaleString('pt-BR')})` });
      }

      // ── Atomic execution ───────────────────────────────────────────────────
      if (!sender.isBanker) { sender.balance -= amt; recordBalanceHistory(sender); }
      if (!receiver.isBanker) { receiver.balance += amt; recordBalanceHistory(receiver); }

      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: sender.id,
        toId: receiver.id,
        fromName: sender.name,
        toName: receiver.name,
        amount: amt,
        type: 'transfer',
        description: `${sender.name} pagou M$${amt.toLocaleString('pt-BR')} a ${receiver.name}`,
      };

      recordEntry(room, entry);

      io.in(roomCode).emit('update_game_state', getRoomState(room));

      if (!receiver.isBanker) {
        io.to(receiver.id).emit('received_payment', { fromName: sender.name, amount: amt });
      }

      callback({ success: true });

    } catch (err) {
      console.error('[perform_transfer]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── adjust_balance (Banker only) ─────────────────────────────────────────────
  socket.on('adjust_balance', ({ roomCode, targetId, amount, reason } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Apenas o bancário pode ajustar saldos' });

      const amt = sanitizeAmount(amount);
      if (amt === null || amt === 0) return callback({ success: false, error: 'Valor inválido' });
      if (Math.abs(amt) > 1_000_000_000) return callback({ success: false, error: 'Valor excede o limite máximo' });

      const target = room.players.find((p) => p.id === targetId);
      if (!target || target.isBanker) return callback({ success: false, error: 'Jogador não encontrado' });
      if (amt < 0 && Math.abs(amt) > availableBalance(room, target)) {
        return callback({ success: false, error: 'Este saldo está reservado para o lance atual do leilão' });
      }

      const safeReason = sanitizeString(reason, 50);

      target.balance = Math.max(0, target.balance + amt);
      recordBalanceHistory(target);

      const absAmt = Math.abs(amt);
      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: amt > 0 ? room.bankerId : target.id,
        toId:   amt > 0 ? target.id   : room.bankerId,
        fromName: 'Banco',
        toName: target.name,
        amount: absAmt,
        type: amt > 0 ? 'credit' : 'debit',
        description:
          amt > 0
            ? `Banco creditou M$${absAmt.toLocaleString('pt-BR')} a ${target.name}${safeReason ? ` — ${safeReason}` : ''}`
            : `Banco debitou M$${absAmt.toLocaleString('pt-BR')} de ${target.name}${safeReason ? ` — ${safeReason}` : ''}`,
      };

      recordEntry(room, entry);

      io.in(roomCode).emit('update_game_state', getRoomState(room));

      if (amt > 0) {
        io.to(target.id).emit('received_payment', { fromName: 'Banco', amount: amt });
      }

      callback({ success: true });

    } catch (err) {
      console.error('[adjust_balance]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── reset_balances (Banker only) ─────────────────────────────────────────────
  socket.on('reset_balances', ({ roomCode } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });
      if (room.auction?.status === 'active') return callback({ success: false, error: 'Encerre o leilão antes de reiniciar os saldos' });

      room.players.forEach((p) => { if (!p.isBanker) p.balance = room.startingBalance; });
      room.players.forEach(recordBalanceHistory);

      recordEntry(room, {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromName: 'Sistema',
        toName: 'Todos',
        amount: room.startingBalance,
        type: 'reset',
        description: `Saldos reiniciados · M$${room.startingBalance.toLocaleString('pt-BR')} por jogador`,
      });

      callback({ success: true });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('balances_reset', { startingBalance: room.startingBalance });

    } catch (err) {
      console.error('[reset_balances]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  socket.on('leave_room', ({ roomCode } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const playerIndex = room.players.findIndex((player) => player.id === socket.id);
      if (playerIndex === -1) return callback({ success: false, error: 'Jogador não encontrado' });
      const player = room.players[playerIndex];

      if (player.isBanker) {
        room.status = 'closed';
        if (room.auction?.status === 'active') {
          room.auction.status = 'cancelled';
          room.auction.closedAt = new Date().toISOString();
          io.in(roomCode).emit('auction_cancelled', room.auction);
        }
        io.in(roomCode).emit('room_closed');
        callback({ success: true });
        setTimeout(() => { delete rooms[roomCode]; }, 60_000);
        return;
      }

      for (const trade of room.trades) {
        if (!['requested', 'active'].includes(trade.status) || ![trade.initiatorId, trade.recipientId].includes(player.id)) continue;
        trade.status = 'cancelled';
        trade.phase = 'CANCELLED';
        trade.closedAt = new Date().toISOString();
        const otherId = trade.initiatorId === player.id ? trade.recipientId : trade.initiatorId;
        io.to(otherId).emit('trade_cancelled', { tradeId: trade.id, playerName: player.name, message: `${player.name} saiu da sala; negociação encerrada.` });
      }

      const auction = room.auction;
      if (auction?.status === 'active' && auction.participantIds.includes(player.id)) {
        if (!auction.passedPlayerIds.includes(player.id)) auction.passedPlayerIds.push(player.id);
        chooseAuctionLeader(room);
        advanceAuction(room, player.id);
      }

      const cancelledRequests = room.pendingTransfers.filter((request) => request.fromId === player.id || request.toId === player.id);
      room.pendingTransfers = room.pendingTransfers.filter((request) => request.fromId !== player.id && request.toId !== player.id);
      room.players.splice(playerIndex, 1);
      socket.leave(roomCode);
      socket.data.roomCode = null;
      if (cancelledRequests.length) {
        io.to(room.bankerId).emit('transfers_cancelled', { requestIds: cancelledRequests.map((request) => request.requestId), playerName: player.name });
      }
      recordEntry(room, {
        id: uuidv4(), time: new Date().toISOString(), fromId: player.id, fromName: player.name,
        toName: 'Banco', amount: 0, type: 'player_left',
        description: `${player.name} saiu da partida; seus títulos voltaram ao banco`,
      });
      io.in(roomCode).emit('player_left', { playerName: player.name });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      if (auction?.status === 'completed') io.in(roomCode).emit('auction_completed', auction);
      callback({ success: true });
    } catch (err) {
      console.error('[leave_room]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── close_room (Banker only) ─────────────────────────────────────────────────
  socket.on('close_room', ({ roomCode } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      room.status = 'closed';
      if (room.auction?.status === 'active') {
        room.auction.status = 'cancelled';
        room.auction.closedAt = new Date().toISOString();
        io.in(roomCode).emit('auction_cancelled', room.auction);
      }
      io.in(roomCode).emit('room_closed');
      callback({ success: true });

      // Delete from memory after a grace period
      setTimeout(() => {
        delete rooms[roomCode];
        console.log(`[room:deleted] ${roomCode}`);
      }, 60_000);

    } catch (err) {
      console.error('[close_room]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  socket.on('assign_property', ({ roomCode, targetId, propertyId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });
      const target = room.players.find((player) => player.id === targetId && !player.isBanker);
      if (!target) return callback({ success: false, error: 'Jogador não encontrado' });
      if (!propertiesData.some((property) => property.name === propertyId)) return callback({ success: false, error: 'Propriedade inválida' });
      if (room.auction?.status === 'active' && room.auction.propertyId === propertyId) return callback({ success: false, error: 'Esta propriedade está em leilão' });
      if (currentAuctionOwner(room, propertyId)) return callback({ success: false, error: 'Esta propriedade já tem proprietário' });
      if (!target.properties.includes(propertyId)) target.properties.push(propertyId);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[assign_property]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('remove_property', ({ roomCode, targetId, propertyId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });
      const target = room.players.find((player) => player.id === targetId && !player.isBanker);
      if (!target) return callback({ success: false, error: 'Jogador não encontrado' });
      target.properties = target.properties.filter((id) => id !== propertyId);
      delete target.houses[propertyId];
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[remove_property]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('kick_player', ({ roomCode, targetId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Apenas o bancário pode remover jogadores' });
      const playerIndex = room.players.findIndex((player) => player.id === targetId && !player.isBanker);
      if (playerIndex === -1) return callback({ success: false, error: 'Jogador não encontrado' });
      const player = room.players[playerIndex];

      for (const trade of room.trades) {
        if (!['requested', 'active'].includes(trade.status) || ![trade.initiatorId, trade.recipientId].includes(player.id)) continue;
        trade.status = 'cancelled';
        trade.phase = 'CANCELLED';
        trade.closedAt = new Date().toISOString();
        const otherId = trade.initiatorId === player.id ? trade.recipientId : trade.initiatorId;
        io.to(otherId).emit('trade_cancelled', { tradeId: trade.id, playerName: player.name, message: `${player.name} foi removido; negociação encerrada.` });
      }

      const auction = room.auction;
      if (auction?.status === 'active' && auction.participantIds.includes(player.id)) {
        if (!auction.passedPlayerIds.includes(player.id)) auction.passedPlayerIds.push(player.id);
        chooseAuctionLeader(room);
        if (auction.currentTurnPlayerId === player.id) advanceAuction(room, player.id);
      }

      room.pendingTransfers = room.pendingTransfers.filter((request) => request.fromId !== player.id && request.toId !== player.id);
      room.players.splice(playerIndex, 1);
      const kickedSocket = io.sockets.sockets.get(player.id);
      if (kickedSocket) {
        kickedSocket.emit('player_kicked', { playerName: player.name });
        kickedSocket.leave(roomCode);
        kickedSocket.data.roomCode = null;
      }
      recordEntry(room, {
        id: uuidv4(), time: new Date().toISOString(), fromId: player.id, fromName: player.name,
        toName: 'Banco', amount: 0, type: 'player_kicked',
        details: { properties: player.properties, houses: player.houses },
        description: `${player.name} foi removido da sala pelo bancário; títulos devolvidos ao banco`,
      });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      if (auction?.status === 'completed') io.in(roomCode).emit('auction_completed', auction);
      callback({ success: true });
    } catch (err) {
      console.error('[kick_player]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('buy_house', (_payload = {}, callback) => {
    if (typeof callback === 'function') callback({ success: false, error: 'Solicite a construção ao Banco para aprovação.' });
  });

  socket.on('request_trade', ({ roomCode, toId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const initiator = room.players.find((player) => player.id === socket.id && !player.isBanker);
      const recipient = room.players.find((player) => player.id === toId && !player.isBanker);
      if (!initiator || !recipient) return callback({ success: false, error: 'Jogador não encontrado ou desconectado' });
      if (!io.sockets.sockets.has(recipient.id)) return callback({ success: false, error: 'O destinatário está desconectado' });
      if (initiator.id === recipient.id) return callback({ success: false, error: 'Não podes negociar contigo mesmo' });
      const activeStatuses = new Set(['requested', 'active', 'banker_approval']);
      if (room.trades.some((trade) => activeStatuses.has(trade.status) && [trade.initiatorId, trade.receiverId].some((id) => id === initiator.id || id === recipient.id))) {
        return callback({ success: false, error: 'Um dos jogadores já possui uma negociação em andamento' });
      }

      const trade = {
        id: uuidv4(),
        initiatorId: initiator.id,
        recipientId: recipient.id,
        receiverId: recipient.id,
        initiatorName: initiator.name,
        recipientName: recipient.name,
        receiverName: recipient.name,
        status: 'requested',
        phase: 'WAITING_INVITE_RESPONSE',
        currentTurnPlayerId: recipient.id,
        proposalById: null,
        proposalRevision: 0,
        proposal: { initiatorOffers: [], initiatorMoney: 0, receiverOffers: [], receiverMoney: 0 },
        createdAt: new Date().toISOString(),
      };
      room.trades.push(trade);
      io.to(recipient.id).emit('trade_requested', trade);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true, tradeId: trade.id });
    } catch (err) {
      console.error('[request_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('respond_trade', ({ roomCode, tradeId, accept } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && item.status === 'requested');
      if (!trade) return callback({ success: false, error: 'Convite de negociação não encontrado' });
      if (socket.id !== trade.recipientId) return callback({ success: false, error: 'Somente o destinatário pode responder ao convite' });

      if (!accept) {
        trade.status = 'rejected';
        trade.phase = 'REJECTED';
        trade.closedAt = new Date().toISOString();
        io.to(trade.initiatorId).emit('trade_rejected', { tradeId, playerName: trade.recipientName });
      } else {
        trade.status = 'active';
        trade.phase = 'BUILDING_INITIAL_OFFER';
        trade.currentTurnPlayerId = trade.initiatorId;
        io.to(trade.initiatorId).emit('trade_started', trade);
        io.to(trade.recipientId).emit('trade_started', trade);
      }
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[respond_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('update_trade_proposal', ({ roomCode, tradeId, proposal } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && item.status === 'active');
      if (!trade) return callback({ success: false, error: 'Negociação encerrada ou inexistente' });
      if (socket.id !== trade.currentTurnPlayerId) return callback({ success: false, error: 'Aguarde sua vez para montar a proposta' });

      const normalized = normalizeTradeProposal(room, trade, proposal, propertiesData);
      if (normalized.error) return callback({ success: false, error: normalized.error });
      const { initiatorMoney, receiverMoney } = normalized.proposal;
      if (initiatorMoney > availableBalance(room, normalized.initiator) || receiverMoney > availableBalance(room, normalized.receiver)) {
        return callback({ success: false, error: 'A proposta usa saldo reservado ou indisponível' });
      }

      trade.proposal = normalized.proposal;
      trade.proposalById = socket.id;
      trade.proposalRevision += 1;
      trade.phase = 'WAITING_OFFER_RESPONSE';
      trade.currentTurnPlayerId = socket.id === trade.initiatorId ? trade.recipientId : trade.initiatorId;
      trade.updatedAt = new Date().toISOString();
      io.to(trade.initiatorId).emit('trade_proposal_updated', trade);
      io.to(trade.recipientId).emit('trade_proposal_updated', trade);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true, proposalRevision: trade.proposalRevision });
    } catch (err) {
      console.error('[update_trade_proposal]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('accept_trade_proposal', ({ roomCode, tradeId, proposalRevision } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && item.status === 'active');
      if (!trade) return callback({ success: false, error: 'Negociação encerrada ou inexistente' });
      if (socket.id !== trade.currentTurnPlayerId || socket.id === trade.proposalById) return callback({ success: false, error: 'Somente o destinatário da proposta pode aceitá-la' });
      if (!Number.isSafeInteger(proposalRevision) || proposalRevision !== trade.proposalRevision) return callback({ success: false, error: 'A proposta foi atualizada; revise a versão atual' });

      const settlement = applyTradeSettlement(room, trade);
      if (settlement.error) return callback({ success: false, error: settlement.error });
      trade.status = 'completed';
      trade.phase = 'COMPLETED';
      trade.closedAt = new Date().toISOString();
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.to(trade.initiatorId).emit('trade_completed', { tradeId });
      io.to(trade.recipientId).emit('trade_completed', { tradeId });
      callback({ success: true });
    } catch (err) {
      console.error('[accept_trade_proposal]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('reject_trade_proposal', ({ roomCode, tradeId, proposalRevision } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && item.status === 'active');
      if (!trade) return callback({ success: false, error: 'Negociação encerrada ou inexistente' });
      if (socket.id !== trade.currentTurnPlayerId || socket.id === trade.proposalById) return callback({ success: false, error: 'Somente o destinatário pode recusar a proposta' });
      if (!Number.isSafeInteger(proposalRevision) || proposalRevision !== trade.proposalRevision) return callback({ success: false, error: 'A proposta já foi atualizada' });

      trade.status = 'rejected';
      trade.phase = 'REJECTED';
      trade.closedAt = new Date().toISOString();
      const rejecterName = room.players.find((player) => player.id === socket.id)?.name || 'Jogador';
      io.to(trade.proposalById).emit('trade_rejected', { tradeId, playerName: rejecterName });
      io.to(socket.id).emit('trade_cancelled', { tradeId, message: 'Você recusou a proposta recebida.' });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[reject_trade_proposal]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('cancel_trade', ({ roomCode, tradeId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && ['requested', 'active'].includes(item.status));
      if (!trade) return callback({ success: false, error: 'Negociação não encontrada ou encerrada' });
      if (![trade.initiatorId, trade.recipientId].includes(socket.id)) return callback({ success: false, error: 'Sem permissão' });
      trade.status = 'cancelled';
      trade.phase = 'CANCELLED';
      trade.closedAt = new Date().toISOString();
      const otherId = socket.id === trade.initiatorId ? trade.recipientId : trade.initiatorId;
      io.to(otherId).emit('trade_cancelled', { tradeId, playerName: room.players.find((player) => player.id === socket.id)?.name });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[cancel_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('start_auction', ({ roomCode, propertyId, participantIds, firstPlayerId, startingBid = 0 } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Apenas o bancário pode iniciar leilões' });
      if (room.auction?.status === 'active') return callback({ success: false, error: 'Já existe um leilão em andamento' });
      if (!propertiesData.some((property) => property.name === propertyId)) return callback({ success: false, error: 'Propriedade inválida' });
      if (currentAuctionOwner(room, propertyId)) return callback({ success: false, error: 'Esta propriedade já tem proprietário' });
      if (room.pendingTransfers.some((request) => request.metadata?.type === 'buy_property' && request.metadata.propertyId === propertyId)) {
        return callback({ success: false, error: 'Esta propriedade já tem uma compra aguardando o Banco' });
      }
      if (!Array.isArray(participantIds) || participantIds.length < 1 || participantIds.length > 8 || new Set(participantIds).size !== participantIds.length) {
        return callback({ success: false, error: 'Selecione de um a oito participantes diferentes' });
      }
      const participants = participantIds.map((id) => room.players.find((player) => player.id === id && !player.isBanker));
      if (participants.some((player) => !player)) return callback({ success: false, error: 'Um participante não está mais na sala' });
      if (participants.some((player) => !io.sockets.sockets.has(player.id))) return callback({ success: false, error: 'Todos os participantes precisam estar conectados' });
      if (!participantIds.includes(firstPlayerId)) return callback({ success: false, error: 'O primeiro jogador deve participar do leilão' });
      const openingBid = Number(startingBid);
      if (!Number.isSafeInteger(openingBid) || openingBid < 0 || openingBid > 1_000_000_000) return callback({ success: false, error: 'Lance inicial inválido' });

      room.auction = {
        id: uuidv4(),
        propertyId,
        participantIds: [...participantIds],
        currentTurnPlayerId: firstPlayerId,
        startingBid: openingBid,
        currentBid: 0,
        highestBidderId: null,
        bids: [],
        passedPlayerIds: [],
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      io.in(roomCode).emit('auction_started', room.auction);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true, auction: room.auction });
    } catch (err) {
      console.error('[start_auction]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('place_auction_bid', ({ roomCode, auctionId, amount } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      const auction = room?.auction;
      if (!auction || auction.id !== auctionId || auction.status !== 'active') return callback({ success: false, error: 'Leilão não está ativo' });
      if (socket.id !== auction.currentTurnPlayerId) return callback({ success: false, error: 'Não é a sua vez de dar lance' });
      if (!auction.participantIds.includes(socket.id) || auction.passedPlayerIds.includes(socket.id)) return callback({ success: false, error: 'Você não participa mais deste leilão' });
      const player = room.players.find((candidate) => candidate.id === socket.id && !candidate.isBanker);
      if (!player) return callback({ success: false, error: 'Jogador não encontrado; reconecte à sala' });
      const bid = Number(amount);
      const minimumBid = Math.max(auction.startingBid, auction.currentBid + 1);
      if (!Number.isSafeInteger(bid) || bid < minimumBid) return callback({ success: false, error: `O lance mínimo é M$${minimumBid.toLocaleString('pt-BR')}` });
      if (bid > auctionBidLimit(room, player)) return callback({ success: false, error: 'Saldo insuficiente após reservar os pedidos pendentes' });

      const bidEvent = { playerId: player.id, playerName: player.name, amount: bid, time: new Date().toISOString() };
      auction.bids.push(bidEvent);
      auction.currentBid = bid;
      auction.highestBidderId = player.id;
      auction.lastAction = bidEvent;
      advanceAuction(room, player.id);
      io.in(roomCode).emit('auction_update', auction);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      if (auction.status === 'completed') io.in(roomCode).emit('auction_completed', auction);
      callback({ success: true, auction });
    } catch (err) {
      console.error('[place_auction_bid]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('pass_auction_turn', ({ roomCode, auctionId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      const auction = room?.auction;
      if (!auction || auction.id !== auctionId || auction.status !== 'active') return callback({ success: false, error: 'Leilão não está ativo' });
      if (socket.id !== auction.currentTurnPlayerId) return callback({ success: false, error: 'Não é a sua vez de desistir' });
      if (auction.passedPlayerIds.includes(socket.id)) return callback({ success: false, error: 'Você já desistiu deste leilão' });
      const player = room.players.find((candidate) => candidate.id === socket.id && !candidate.isBanker);
      if (!player) return callback({ success: false, error: 'Jogador não encontrado; reconecte à sala' });

      auction.passedPlayerIds.push(socket.id);
      auction.lastAction = { playerId: player.id, playerName: player.name, action: 'pass', time: new Date().toISOString() };
      chooseAuctionLeader(room);
      advanceAuction(room, player.id);
      io.in(roomCode).emit('auction_update', auction);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      if (auction.status === 'completed') io.in(roomCode).emit('auction_completed', auction);
      callback({ success: true, auction });
    } catch (err) {
      console.error('[pass_auction_turn]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('cancel_auction', ({ roomCode, auctionId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Apenas o bancário pode encerrar o leilão' });
      const auction = room.auction;
      if (!auction || auction.id !== auctionId || auction.status !== 'active') return callback({ success: false, error: 'Leilão não está ativo' });
      auction.status = 'cancelled';
      auction.closedAt = new Date().toISOString();
      io.in(roomCode).emit('auction_cancelled', auction);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[cancel_auction]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── request_transfer (Player → Banker queue) ─────────────────────────────────
  socket.on('request_transfer', ({ roomCode, toId, amount, reason, metadata } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });

      const fromId = socket.id;
      const amt = sanitizeAmount(amount);
      if (!amt || amt <= 0) return callback({ success: false, error: 'Valor inválido' });
      if (amt > 1_000_000_000) return callback({ success: false, error: 'Valor excede o limite' });

      const sender   = room.players.find((p) => p.id === fromId);
      const receiver = room.players.find((p) => p.id === toId);

      if (!sender)   return callback({ success: false, error: 'Jogador não encontrado' });
      if (!receiver) return callback({ success: false, error: 'Destinatário não encontrado' });
      if (!io.sockets.sockets.has(receiver.id)) return callback({ success: false, error: 'O destinatário está desconectado; aguarde a reconexão' });
      if (sender.id === receiver.id) return callback({ success: false, error: 'Não podes transferir para ti mesmo' });
      let requestAmount = amt;
      let requestMetadata = null;

      if (metadata?.type === 'buy_house') {
        if (sender.isBanker || !receiver.isBanker || receiver.id !== room.bankerId) return callback({ success: false, error: 'Construções precisam ser solicitadas ao Banco' });
        const plan = getConstructionPlan({ room, player: sender, propertyId: metadata.propertyId, quantity: Number(metadata.housesToAdd), propertiesData });
        if (plan.error) return callback({ success: false, error: plan.error });
        requestAmount = plan.totalCost;
        requestMetadata = {
          type: 'buy_house', propertyId: plan.property.name, propertyName: plan.property.name,
          housesToAdd: plan.housesToAdd, currentHouses: plan.currentHouses, targetHouses: plan.targetHouses,
          unitCosts: plan.unitCosts, houseCost: plan.houseCost, hotelCost: plan.hotelCost,
        };
      } else if (metadata?.propertyId) {
        if (!receiver.isBanker || receiver.id !== room.bankerId) return callback({ success: false, error: 'Compras de terreno devem ser solicitadas ao Banco' });
        const property = propertiesData.find((item) => item.name === metadata.propertyId);
        if (!property) return callback({ success: false, error: 'Propriedade inválida' });
        if (room.auction?.status === 'active' && room.auction.propertyId === property.name) return callback({ success: false, error: 'Esta propriedade está em leilão' });
        if (currentAuctionOwner(room, property.name)) return callback({ success: false, error: 'Esta propriedade já tem proprietário' });
        requestAmount = property.totalValue;
        requestMetadata = { type: 'buy_property', propertyId: property.name, propertyName: property.name };
      }

      if (!sender.isBanker && requestAmount > availableBalance(room, sender)) {
        return callback({ success: false, error: `Saldo disponível insuficiente (M$${availableBalance(room, sender).toLocaleString('pt-BR')})` });
      }

      const safeReason = sanitizeString(reason, 50);

      const request = {
        requestId: uuidv4(),
        fromId,
        fromName: sender.name,
        fromAvatar: sender.avatar,
        fromColor: sender.color || null,
        toId,
        toName: receiver.name,
        toAvatar: receiver.avatar,
        toColor: receiver.color || null,
        amount: requestAmount,
        reason: safeReason,
        metadata: requestMetadata,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      room.pendingTransfers.push(request);
      io.to(room.bankerId).emit('new_transfer_request', request);
      io.in(roomCode).emit('update_game_state', getRoomState(room));

      console.log(`[transfer:request] ${roomCode}  ${sender.name} → ${receiver.name}  M$${requestAmount}`);
      callback({ success: true, requestId: request.requestId });

    } catch (err) {
      console.error('[request_transfer]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── approve_transfer (Banker only) ───────────────────────────────────────────
  socket.on('approve_transfer', ({ roomCode, requestId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const idx = room.pendingTransfers.findIndex((r) => r.requestId === requestId);
      if (idx === -1) return callback({ success: false, error: 'Pedido não encontrado ou já processado' });

      const req = room.pendingTransfers[idx];
      const sender   = room.players.find((p) => p.id === req.fromId);
      const receiver = room.players.find((p) => p.id === req.toId);

      if (!sender || !receiver) {
        room.pendingTransfers.splice(idx, 1);
        io.in(roomCode).emit('update_game_state', getRoomState(room));
        return callback({ success: false, error: 'Jogador saiu da sala' });
      }

      let constructionPlan = null;
      if (req.metadata?.type === 'buy_house') {
        constructionPlan = getConstructionPlan({
          room,
          player: sender,
          propertyId: req.metadata.propertyId,
          quantity: Number(req.metadata.housesToAdd),
          propertiesData,
          excludeRequestId: req.requestId,
        });
        if (constructionPlan.error || !receiver.isBanker || receiver.id !== room.bankerId || req.amount !== constructionPlan.totalCost) {
          room.pendingTransfers.splice(idx, 1);
          io.in(roomCode).emit('update_game_state', getRoomState(room));
          io.to(req.fromId).emit('notification', { type: 'error', message: constructionPlan.error || 'O pedido mudou; envie uma nova solicitação.' });
          return callback({ success: false, error: constructionPlan.error || 'Solicitação desatualizada' });
        }
        if (req.amount > availableBalance(room, sender, req.requestId)) {
          room.pendingTransfers.splice(idx, 1);
          io.in(roomCode).emit('update_game_state', getRoomState(room));
          io.to(req.fromId).emit('notification', { type: 'error', message: 'Saldo disponível insuficiente após considerar o leilão ativo.' });
          return callback({ success: false, error: 'Saldo disponível insuficiente' });
        }
      } else if (req.metadata?.type === 'buy_property') {
        const property = propertiesData.find((item) => item.name === req.metadata.propertyId);
        if (!property || currentAuctionOwner(room, req.metadata.propertyId) || req.amount !== property.totalValue) {
          room.pendingTransfers.splice(idx, 1);
          io.in(roomCode).emit('update_game_state', getRoomState(room));
          io.to(req.fromId).emit('notification', { type: 'error', message: 'A propriedade não está mais disponível para compra.' });
          return callback({ success: false, error: 'Propriedade indisponível' });
        }
      }

      if (!sender.isBanker && req.amount > availableBalance(room, sender, req.requestId)) {
        room.pendingTransfers.splice(idx, 1);
        io.in(roomCode).emit('update_game_state', getRoomState(room));
        io.to(req.fromId).emit('notification', {
          type: 'error', message: `❌ Transferência cancelada: saldo insuficiente`
        });
        return callback({ success: false, error: 'Saldo insuficiente — pedido cancelado' });
      }

      if (!sender.isBanker) { sender.balance -= req.amount; recordBalanceHistory(sender); }
      if (!receiver.isBanker) receiver.balance += req.amount;

      if (req.metadata?.type === 'buy_house') sender.houses[req.metadata.propertyId] = constructionPlan.targetHouses;
      if (req.metadata?.type === 'buy_property' && !sender.properties.includes(req.metadata.propertyId)) {
        sender.properties.push(req.metadata.propertyId);
      }

      room.pendingTransfers.splice(idx, 1);

      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: req.fromId,
        toId:   req.toId,
        fromName: req.fromName,
        toName:   req.toName,
        amount: req.amount,
        type: req.metadata?.type === 'buy_house' ? 'house_purchase' : req.metadata?.type === 'buy_property' ? 'property_purchase' : 'transfer',
        propertyId: req.metadata?.propertyId,
        quantity: req.metadata?.housesToAdd,
        unitCosts: req.metadata?.unitCosts,
        description: req.reason
          ? `${req.fromName} → ${req.toName} — ${req.reason}`
          : req.metadata?.type === 'buy_house'
            ? `${req.fromName} construiu ${req.metadata.housesToAdd} nível(is) em ${req.metadata.propertyName}`
            : req.metadata?.type === 'buy_property'
              ? `${req.fromName} comprou ${req.metadata.propertyName}`
              : `${req.fromName} pagou M$${req.amount.toLocaleString('pt-BR')} a ${req.toName}`,
      };
      recordEntry(room, entry);

      io.in(roomCode).emit('update_game_state', getRoomState(room));

      // Directed notifications
      if (sender.id !== room.bankerId) {
        io.to(sender.id).emit('notification', {
          type: 'debit',
          message: `💳 Pagamento de M$${req.amount.toLocaleString('pt-BR')} aprovado → ${req.toName}`,
        });
      }
      if (receiver.id !== room.bankerId) {
        io.to(receiver.id).emit('notification', {
          type: 'credit',
          message: `💰 Recebeste M$${req.amount.toLocaleString('pt-BR')} de ${req.fromName}`,
        });
      }
      socket.emit('notification', {
        type: 'info',
        message: `✅ Transferência aprovada: ${req.fromName} → ${req.toName}`,
      });

      console.log(`[transfer:approve] ${roomCode}  ${req.fromName} → ${req.toName}  M$${req.amount}`);
      callback({ success: true });

    } catch (err) {
      console.error('[approve_transfer]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── reject_transfer (Banker only) ────────────────────────────────────────────
  socket.on('reject_transfer', ({ roomCode, requestId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const idx = room.pendingTransfers.findIndex((r) => r.requestId === requestId);
      if (idx === -1) return callback({ success: false, error: 'Pedido não encontrado' });

      const req = room.pendingTransfers[idx];
      room.pendingTransfers.splice(idx, 1);

      io.to(room.bankerId).emit('update_game_state', getRoomState(room));

      if (req.fromId !== room.bankerId) {
        io.to(req.fromId).emit('notification', {
          type: 'warning',
          message: `❌ Transferência de M$${req.amount.toLocaleString('pt-BR')} recusada pelo bancário`,
        });
      }

      console.log(`[transfer:reject] ${roomCode}  ${req.fromName} → ${req.toName}`);
      callback({ success: true });

    } catch (err) {
      console.error('[reject_transfer]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const roomCode = socket.data.roomCode;
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      const player = room.players.find((p) => p.id === socket.id);
      if (player) {
        for (const trade of room.trades) {
          if (!['requested', 'active'].includes(trade.status) || ![trade.initiatorId, trade.recipientId].includes(socket.id)) continue;
          trade.status = 'cancelled';
          trade.phase = 'CANCELLED';
          trade.closedAt = new Date().toISOString();
          const otherId = trade.initiatorId === socket.id ? trade.recipientId : trade.initiatorId;
          io.to(otherId).emit('trade_cancelled', { tradeId: trade.id, playerName: player.name, message: `${player.name} desconectou; negociação encerrada.` });
        }

        const auction = room.auction;
        if (auction?.status === 'active' && auction.currentTurnPlayerId === socket.id && !auction.passedPlayerIds.includes(socket.id)) {
          auction.passedPlayerIds.push(socket.id);
          auction.lastAction = { playerId: socket.id, playerName: player.name, action: 'disconnected', time: new Date().toISOString() };
          chooseAuctionLeader(room);
          advanceAuction(room, socket.id);
        }
        io.in(roomCode).emit('player_disconnected', { playerName: player.name });
        if (auction?.status === 'completed') io.in(roomCode).emit('auction_completed', auction);
        else if (auction?.status === 'active') io.in(roomCode).emit('auction_update', auction);
        io.in(roomCode).emit('update_game_state', getRoomState(room));
      }
    }
    console.log(`[-] disconnect ${socket.id}  (${reason})`);
  });
});

// ─── Utility ──────────────────────────────────────────────────────────────────
function trimHistory(room) {
  if (room.transactionHistory.length > 200) {
    room.transactionHistory = room.transactionHistory.slice(-200);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`\n🏦  MoneyBank Server · porta ${PORT}\n`);
});
