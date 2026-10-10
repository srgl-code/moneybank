'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { propertiesData } = require('./data/properties.js');
const { getConstructionPlan, normalizeTradeProposal, settleTrade } = require('./gameRules.js');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

const IS_PROD = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || (IS_PROD ? '*' : 'http://localhost:5173');

const io = new Server(httpServer, {
  cors: {
    origin: IS_PROD ? true : CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: IS_PROD ? true : CLIENT_URL }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: Object.keys(rooms).length }));

// ─── In-memory Store ──────────────────────────────────────────────────────────
/**
 * @typedef {{ id: string, sessionId: string, name: string, balance: number, isBanker: boolean, avatar: string, color: string|null, photo: string|null, properties: string[], houses: Record<string, number>, balanceHistory: number[] }} Player
 * @typedef {{ roomCode: string, bankerId: string, players: Player[], transactionHistory: object[], pendingTransfers: object[], startingBalance: number, status: string, createdAt: Date }} Room
 * @type {Record<string, Room>}
 */
const rooms = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateRoomCode() {
  // Excludes visually ambiguous chars (0,O,1,I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
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

function sanitizePhoto(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(raw)) return null;
  if (raw.length > 150_000) return null; // ~110KB decoded, keeps sockets/memory light
  return raw;
}

function recordBalanceHistory(player) {
  if (player.isBanker) return;
  if (!player.balanceHistory) player.balanceHistory = [];
  player.balanceHistory.push(player.balance);
  if (player.balanceHistory.length > 50) {
    player.balanceHistory.shift();
  }
}

function deduplicatePlayers(room) {
  if (!room || !Array.isArray(room.players)) return;
  const unique = [];
  const seenNames = new Map(); // normalizedName -> index in unique

  for (const player of room.players) {
    if (player.isBanker) {
      unique.push(player);
      continue;
    }
    const norm = player.name ? player.name.trim().toLowerCase() : '';
    if (!norm) continue;

    if (seenNames.has(norm)) {
      const idx = seenNames.get(norm);
      const existing = unique[idx];
      // Merge properties
      const existingProps = new Set(existing.properties || []);
      (player.properties || []).forEach((p) => existingProps.add(p));
      existing.properties = Array.from(existingProps);

      // Keep active socket if the duplicate has a valid socket
      if (player.id && player.id.length > 5 && player.id !== existing.id) {
        existing.id = player.id;
      }
      // If the duplicate had a higher balance, keep it
      if (player.balance > existing.balance) {
        existing.balance = player.balance;
      }
      if (player.balanceHistory && player.balanceHistory.length > (existing.balanceHistory?.length || 0)) {
        existing.balanceHistory = player.balanceHistory;
      }
    } else {
      seenNames.set(norm, unique.length);
      unique.push(player);
    }
  }
  room.players = unique;
}

/**
 * Returns a serializable snapshot of the room state (no sessionIds leaked).
 * Players are already sorted by descending balance for the ranking.
 */
function getRoomState(room) {
  deduplicatePlayers(room);
  return {
    roomCode: room.roomCode,
    players: [...room.players]
      .sort((a, b) => b.balance - a.balance)
      .map(({ sessionId: _s, ...rest }) => rest), // strip internal sessionId from broadcast
    history: room.transactionHistory.slice(-50),
    pendingTransfers: room.pendingTransfers ?? [],
    trades: room.trades ?? [],
    startingBalance: room.startingBalance,
    startingPassGo: room.startingPassGo ?? 200,
    status: room.status,
  };
}

function applyTradeSettlement(room, trade) {
  const result = settleTrade(room, trade, propertiesData, recordBalanceHistory);
  if (result.error) return result;

  const { proposal, initiator, receiver } = result;
  const totalCash = proposal.initiatorMoney + proposal.receiverMoney;
  const exchanged = [
    ...proposal.initiatorOffers.map((propertyId) => `${initiator.name} → ${receiver.name}: ${propertyId}`),
    ...proposal.receiverOffers.map((propertyId) => `${receiver.name} → ${initiator.name}: ${propertyId}`),
    proposal.initiatorMoney ? `${initiator.name} paga M$${proposal.initiatorMoney.toLocaleString('pt-BR')} a ${receiver.name}` : '',
    proposal.receiverMoney ? `${receiver.name} paga M$${proposal.receiverMoney.toLocaleString('pt-BR')} a ${initiator.name}` : '',
  ].filter(Boolean).join('; ');

  room.transactionHistory.push({
    id: uuidv4(),
    time: new Date().toISOString(),
    fromId: initiator.id,
    toId: receiver.id,
    fromName: initiator.name,
    toName: receiver.name,
    amount: totalCash,
    type: 'transfer',
    description: `Negociação concluída: ${exchanged}`,
  });
  trimHistory(room);
  return result;
}

// ─── Socket Logic ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] connect   ${socket.id}`);

  // ── create_room ─────────────────────────────────────────────────────────────
  socket.on('create_room', ({ playerName, startingBalance, startingPassGo, photoUrl } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const safeName = sanitizeString(playerName, 20);
      if (!safeName) return callback({ success: false, error: 'Nome inválido' });

      const balance = sanitizeAmount(startingBalance);
      if (!balance || balance < 1 || balance > 10_000_000) {
        return callback({ success: false, error: 'Saldo inicial deve ser entre 1 e 10.000.000' });
      }

      const passGoAmt = sanitizeAmount(startingPassGo) || 200;

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
        photo: sanitizePhoto(photoUrl),
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
        startingBalance: balance,
        startingPassGo: passGoAmt,
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
  socket.on('join_room', ({ roomCode, playerName, avatar, color, sessionId, photoUrl } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const code = sanitizeString(roomCode, 6)?.toUpperCase();
      if (!code) return callback({ success: false, error: 'Código de sala inválido' });

      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada. Verifique o código.' });
      if (room.status === 'closed') return callback({ success: false, error: 'Esta sala foi encerrada' });

      deduplicatePlayers(room);

      const safeName = sanitizeString(playerName, 20);
      const safeAvatar = sanitizeString(avatar, 4);
      const safeColor = sanitizeString(color, 10);
      const safePhoto = sanitizePhoto(photoUrl);

      // Helper to update socket IDs in transfers and trades
      const updateSocketReferences = (oldSocketId, newSocketId) => {
        if (!oldSocketId || oldSocketId === newSocketId) return;
        room.pendingTransfers.forEach((req) => {
          if (req.fromId === oldSocketId) req.fromId = newSocketId;
          if (req.toId === oldSocketId) req.toId = newSocketId;
        });
        if (room.trades) {
          room.trades.forEach((trade) => {
            if (trade.initiatorId === oldSocketId) trade.initiatorId = newSocketId;
            if (trade.receiverId === oldSocketId) trade.receiverId = newSocketId;
            if (trade.proposalById === oldSocketId) trade.proposalById = newSocketId;
          });
        }
      };

      // ── 1. Reconnect via saved sessionId ─────────────────────────────────────
      if (sessionId && typeof sessionId === 'string') {
        const existing = room.players.find((p) => p.sessionId === sessionId);
        if (existing) {
          const oldSocketId = existing.id;
          existing.id = socket.id;                      // update to new socket
          if (existing.isBanker) room.bankerId = socket.id;
          if (safeAvatar) existing.avatar = safeAvatar;
          if (safeColor) existing.color = safeColor;
          if (safePhoto) existing.photo = safePhoto;
          updateSocketReferences(oldSocketId, socket.id);

          socket.join(code);
          socket.data.roomCode = code;
          socket.data.sessionId = sessionId;

          io.in(code).emit('player_rejoined', { playerName: existing.name });
          io.in(code).emit('update_game_state', getRoomState(room));

          console.log(`[room:rejoin-session] ${code}  "${existing.name}"`);
          return callback({
            success: true,
            roomCode: code,
            sessionId: existing.sessionId,
            player: existing,
            gameState: getRoomState(room),
          });
        }
      }

      // ── 2. Reconnect/Resume via matching Player Name (Prevent duplication!) ───
      if (safeName) {
        const existingByName = room.players.find(
          (p) => p.name && p.name.trim().toLowerCase() === safeName.trim().toLowerCase()
        );
        if (existingByName) {
          const oldSocketId = existingByName.id;
          existingByName.id = socket.id;                // reconnect to existing player
          if (existingByName.isBanker) room.bankerId = socket.id;
          if (safeAvatar) existingByName.avatar = safeAvatar;
          if (safeColor) existingByName.color = safeColor;
          if (safePhoto) existingByName.photo = safePhoto;
          updateSocketReferences(oldSocketId, socket.id);

          socket.join(code);
          socket.data.roomCode = code;
          socket.data.sessionId = existingByName.sessionId;

          io.in(code).emit('player_rejoined', { playerName: existingByName.name });
          io.in(code).emit('update_game_state', getRoomState(room));

          console.log(`[room:rejoin-name] ${code}  "${existingByName.name}"`);
          return callback({
            success: true,
            roomCode: code,
            sessionId: existingByName.sessionId,
            player: existingByName,
            gameState: getRoomState(room),
          });
        }
      }

      // ── 3. Create New Player (only if brand new player) ───────────────────────
      if (!safeName) return callback({ success: false, error: 'Nome inválido' });

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
        avatar: safeAvatar || '👤',
        color: safeColor || null,
        photo: safePhoto,
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
      if (sender.id === receiver.id) return callback({ success: false, error: 'Não podes transferir para ti mesmo' });

      if (!sender.isBanker && sender.balance < amt) {
        return callback({ success: false, error: `Saldo insuficiente (tens ${(sender.balance).toLocaleString('pt-BR')})` });
      }

      // ── Atomic execution ───────────────────────────────────────────────────
      if (!sender.isBanker)   { sender.balance   -= amt; recordBalanceHistory(sender); }
      if (!receiver.isBanker) { receiver.balance += amt; recordBalanceHistory(receiver); }

      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: sender.id,
        toId: receiver.id,
        fromName: sender.isBanker ? 'Banco' : sender.name,
        toName: receiver.isBanker ? 'Banco' : receiver.name,
        fromAvatar: sender.isBanker ? '🏦' : sender.avatar,
        toAvatar: receiver.isBanker ? '🏦' : receiver.avatar,
        fromColor: sender.color,
        toColor: receiver.color,
        amount: amt,
        type: 'transfer',
        description: `${sender.isBanker ? 'Banco' : sender.name} pagou M$${amt.toLocaleString('pt-BR')} a ${receiver.isBanker ? 'Banco' : receiver.name}`,
      };

      room.transactionHistory.push(entry);
      trimHistory(room);

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

      room.transactionHistory.push(entry);
      trimHistory(room);

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

      room.players.forEach((p) => { 
        if (!p.isBanker) {
          p.balance = room.startingBalance;
          recordBalanceHistory(p);
        }
      });

      room.transactionHistory.push({
        id: uuidv4(),
        time: new Date().toISOString(),
        fromName: 'Sistema',
        toName: 'Todos',
        amount: room.startingBalance,
        type: 'reset',
        description: `Saldos reiniciados · M$${room.startingBalance.toLocaleString('pt-BR')} por jogador`,
      });
      trimHistory(room);

      callback({ success: true });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('balances_reset', { startingBalance: room.startingBalance });

    } catch (err) {
      console.error('[reset_balances]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
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

  // ── request_transfer (Player → Banker queue) ─────────────────────────────────
  socket.on('request_transfer', ({ roomCode, toId, amount, reason, metadata } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const code = roomCode?.toUpperCase();
      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });

      const fromId = socket.id;
      const amt = sanitizeAmount(amount);
      if (!amt || amt <= 0) return callback({ success: false, error: 'Valor inválido' });
      if (amt > 1_000_000_000) return callback({ success: false, error: 'Valor excede o limite' });

      const sender   = room.players.find((p) => p.id === fromId);
      const receiver = room.players.find((p) => p.id === toId);

      if (!sender)   return callback({ success: false, error: 'Jogador não encontrado' });
      if (!receiver) return callback({ success: false, error: 'Destinatário não encontrado' });
      if (sender.id === receiver.id) return callback({ success: false, error: 'Não podes transferir para ti mesmo' });
      let requestAmount = amt;
      let requestMetadata = metadata || null;
      let requestReason = sanitizeString(reason, 50);

      if (metadata?.type === 'buy_house') {
        if (sender.isBanker || receiver.id !== room.bankerId || !receiver.isBanker) {
          return callback({ success: false, error: 'Pedidos de construção devem ser enviados ao Banco' });
        }
        const quantity = Number(metadata.housesToAdd);
        const plan = getConstructionPlan({ room, player: sender, propertyId: metadata.propertyId, quantity, propertiesData });
        if (plan.error) return callback({ success: false, error: plan.error });

        requestAmount = plan.totalCost;
        requestMetadata = {
          type: 'buy_house',
          propertyId: metadata.propertyId,
          propertyName: plan.property.name,
          housesToAdd: plan.housesToAdd,
          currentHouses: plan.currentHouses,
          targetHouses: plan.targetHouses,
          unitCosts: plan.unitCosts,
          houseCost: plan.houseCost,
          hotelCost: plan.hotelCost,
          totalCost: plan.totalCost,
        };
        requestReason = `Construção em ${plan.property.name}`;
      } else if (!amt || amt <= 0) {
        return callback({ success: false, error: 'Valor inválido' });
      }

      if (!sender.isBanker && sender.balance < requestAmount) {
        return callback({ success: false, error: `Saldo insuficiente (tens M$${sender.balance.toLocaleString('pt-BR')})` });
      }

      const request = {
        requestId: uuidv4(),
        fromId,
        fromName: sender.isBanker ? 'Banco' : sender.name,
        fromAvatar: sender.isBanker ? '🏦' : sender.avatar,
        fromColor: sender.color || null,
        fromPhoto: sender.isBanker ? null : (sender.photo || null),
        toId,
        toName: receiver.isBanker ? 'Banco' : receiver.name,
        toAvatar: receiver.isBanker ? '🏦' : receiver.avatar,
        toColor: receiver.color || null,
        toPhoto: receiver.isBanker ? null : (receiver.photo || null),
        amount: requestAmount,
        reason: requestReason,
        metadata: requestMetadata,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      room.pendingTransfers.push(request);
      io.in(code).emit('new_transfer_request', request);
      io.in(code).emit('update_game_state', getRoomState(room));

      console.log(`[transfer:request] ${roomCode}  ${sender.name} → ${receiver.name}  M$${amt}`);
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
      const code = roomCode?.toUpperCase();
      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const idx = room.pendingTransfers.findIndex((r) => r.requestId === requestId);
      if (idx === -1) return callback({ success: false, error: 'Pedido não encontrado ou já processado' });

      const req = room.pendingTransfers[idx];
      const sender   = room.players.find((p) => p.id === req.fromId);
      const receiver = room.players.find((p) => p.id === req.toId);

      if (!sender || !receiver) {
        room.pendingTransfers.splice(idx, 1);
        io.in(code).emit('update_game_state', getRoomState(room));
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
        if (!receiver.isBanker || receiver.id !== room.bankerId || constructionPlan.error || req.amount !== constructionPlan.totalCost) {
          room.pendingTransfers.splice(idx, 1);
          io.in(code).emit('update_game_state', getRoomState(room));
          io.to(req.fromId).emit('notification', {
            type: 'error',
            message: constructionPlan.error || 'Solicitação de construção desatualizada; envie um novo pedido.',
          });
          return callback({ success: false, error: constructionPlan.error || 'Solicitação de construção desatualizada' });
        }
      }

      if (!sender.isBanker && sender.balance < req.amount) {
        room.pendingTransfers.splice(idx, 1);
        io.in(code).emit('update_game_state', getRoomState(room));
        io.to(req.fromId).emit('notification', {
          type: 'error', message: `❌ Transferência cancelada: saldo insuficiente`
        });
        return callback({ success: false, error: 'Saldo insuficiente — pedido cancelado' });
      }

      if (!sender.isBanker)   { sender.balance   -= req.amount; recordBalanceHistory(sender); }
      if (!receiver.isBanker) { receiver.balance += req.amount; recordBalanceHistory(receiver); }

      // Construction costs and quantities are derived again from canonical server state.
      if (req.metadata && req.metadata.type === 'buy_house' && req.metadata.propertyId) {
        if (!sender.houses) sender.houses = {};
        sender.houses[req.metadata.propertyId] = constructionPlan.targetHouses;

        io.in(code).emit('update_properties', { playerId: sender.id, properties: sender.properties, houses: sender.houses });

        const hotelCount = constructionPlan.unitCosts.filter((_, index) => constructionPlan.currentHouses + index + 1 === 5).length;
        const houseCount = constructionPlan.housesToAdd - hotelCount;
        const houseLabel = [houseCount ? `${houseCount} casa(s)` : '', hotelCount ? `${hotelCount} hotel(is)` : ''].filter(Boolean).join(' e ');
        io.in(code).emit('game_notification', {
          type: 'success',
          message: `🏠 ${sender.name} construiu ${houseLabel} em ${req.metadata.propertyId}!`,
        });
      } else if (req.metadata && req.metadata.propertyId) {
        // Assign property if it's a property purchase
        if (!sender.properties) sender.properties = [];
        if (!sender.properties.includes(req.metadata.propertyId)) {
          sender.properties.push(req.metadata.propertyId);
          // emit update_properties so all clients get the new possession instantly
          io.in(code).emit('update_properties', { playerId: sender.id, properties: sender.properties });
        }
      }

      room.pendingTransfers.splice(idx, 1);

      let transDesc = req.reason;
      if (!transDesc) {
        if (req.metadata && req.metadata.type === 'buy_house') {
          transDesc = `${req.fromName} construiu ${req.metadata.housesToAdd} nível(is) em ${req.metadata.propertyId}`;
        } else {
          transDesc = `${req.fromName} pagou M$${req.amount.toLocaleString('pt-BR')} a ${req.toName}`;
        }
      }

      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: req.fromId,
        toId:   req.toId,
        fromName: req.fromName,
        toName:   req.toName,
        amount: req.amount,
        type: req.metadata && req.metadata.type === 'buy_house' ? 'debit' : 'transfer',
        description: transDesc,
      };
      room.transactionHistory.push(entry);
      trimHistory(room);

      io.in(code).emit('update_game_state', getRoomState(room));

      // Directed notifications
      if (sender.id !== room.bankerId) {
        io.to(sender.id).emit('notification', {
          type: req.metadata?.type === 'buy_house' ? 'success' : 'debit',
          message: req.metadata?.type === 'buy_house'
            ? `🏠 Construção em ${req.metadata.propertyName || req.metadata.propertyId} aprovada. Total debitado: M$${req.amount.toLocaleString('pt-BR')}.`
            : `💳 Pagamento de M$${req.amount.toLocaleString('pt-BR')} aprovado → ${req.toName}`,
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
      const code = roomCode?.toUpperCase();
      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const idx = room.pendingTransfers.findIndex((r) => r.requestId === requestId);
      if (idx === -1) return callback({ success: false, error: 'Pedido não encontrado' });

      const req = room.pendingTransfers[idx];
      room.pendingTransfers.splice(idx, 1);

      io.in(code).emit('update_game_state', getRoomState(room));

      if (req.fromId !== room.bankerId) {
        io.to(req.fromId).emit('notification', {
          type: 'warning',
          message: req.metadata?.type === 'buy_house'
            ? `❌ Pedido de construção em ${req.metadata.propertyName || req.metadata.propertyId} recusado pelo Banco.`
            : `❌ Transferência de M$${req.amount.toLocaleString('pt-BR')} recusada pelo bancário`,
        });
      }

      console.log(`[transfer:reject] ${roomCode}  ${req.fromName} → ${req.toName}`);
      callback({ success: true });

    } catch (err) {
      console.error('[reject_transfer]', err);
      callback({ success: false, error: 'Erro interno do servidor' });
    }
  });

  // ── pass_go ──────────────────────────────────────────────────────────────────
  socket.on('pass_go', ({ roomCode, amount = 200 } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.isBanker) return callback({ success: false, error: 'Ação inválida para este usuário' });

      const amt = sanitizeAmount(amount) || 200;
      player.balance += amt;
      recordBalanceHistory(player);

      room.transactionHistory.push({
        id: uuidv4(),
        time: new Date().toISOString(),
        fromName: 'Banco',
        toName: player.name,
        amount: amt,
        type: 'credit',
        description: `${player.name} passou pelo Início e recebeu M$${amt.toLocaleString('pt-BR')}`
      });
      trimHistory(room);

      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('game_notification', {
        type: 'success',
        message: `${player.name} passou pelo Início (+M$${amt})`,
      });

      callback({ success: true });
    } catch (err) {
      console.error('[pass_go]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── collect_fine ─────────────────────────────────────────────────────────────
  socket.on('collect_fine', ({ roomCode, amount, reason } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });

      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.isBanker) return callback({ success: false, error: 'Ação inválida' });

      const amt = sanitizeAmount(amount);
      if (!amt || amt <= 0) return callback({ success: false, error: 'Valor inválido' });

      player.balance = Math.max(0, player.balance - amt);
      recordBalanceHistory(player);
      
      const safeReason = sanitizeString(reason, 50) || 'Multa';

      room.transactionHistory.push({
        id: uuidv4(),
        time: new Date().toISOString(),
        fromName: player.name,
        toName: 'Banco',
        amount: amt,
        type: 'debit',
        description: `${player.name} pagou M$${amt.toLocaleString('pt-BR')} — ${safeReason}`
      });
      trimHistory(room);

      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('game_notification', {
        type: 'warning',
        message: `${player.name} pagou uma multa de M$${amt}`,
      });

      callback({ success: true });
    } catch (err) {
      console.error('[collect_fine]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── start_auction (Banker only) ──────────────────────────────────────────────
  socket.on('start_auction', ({ roomCode, propertyId, startingBid } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      io.in(roomCode).emit('game_notification', {
        type: 'info',
        message: `Leilão iniciado! Preparem seus lances.`,
      });
      
      io.in(roomCode).emit('auction_started', { propertyId, startingBid: sanitizeAmount(startingBid) });

      callback({ success: true });
    } catch (err) {
      console.error('[start_auction]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── assign_property (Banker only) ────────────────────────────────────────────
  socket.on('assign_property', ({ roomCode, targetId, propertyId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const target = room.players.find(p => p.id === targetId);
      if (!target) return callback({ success: false, error: 'Jogador não encontrado' });
      if (!propertiesData.some((property) => property.name === propertyId)) return callback({ success: false, error: 'Propriedade inválida' });

      const currentOwner = room.players.find((player) => player.id !== targetId && player.properties?.includes(propertyId));
      if (currentOwner) return callback({ success: false, error: `${propertyId} já pertence a ${currentOwner.name}` });

      if (!target.properties) target.properties = [];
      if (!target.properties.includes(propertyId)) {
        target.properties.push(propertyId);
      }

      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('update_properties', { playerId: targetId, properties: target.properties });
      io.in(roomCode).emit('game_notification', {
        type: 'success',
        message: `${target.name} adquiriu uma nova propriedade!`,
      });

      callback({ success: true });
    } catch (err) {
      console.error('[assign_property]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── remove_property (Banker only) ────────────────────────────────────────────
  socket.on('remove_property', ({ roomCode, targetId, propertyId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });

      const target = room.players.find(p => p.id === targetId);
      if (!target) return callback({ success: false, error: 'Jogador não encontrado' });

      if (target.properties) {
        target.properties = target.properties.filter(id => id !== propertyId);
      }
      if (target.houses) delete target.houses[propertyId];

      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('update_properties', { playerId: targetId, properties: target.properties });

      callback({ success: true });
    } catch (err) {
      console.error('[remove_property]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('buy_house', (_payload = {}, callback) => {
    if (typeof callback === 'function') {
      callback({ success: false, error: 'Construções precisam ser enviadas ao Banco para aprovação.' });
    }
  });

  // ── request_trade ────────────────────────────────────────────────────────────
  socket.on('request_trade', ({ roomCode, toId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const fromId = socket.id;
      const sender = room.players.find(p => p.id === fromId);
      const receiver = room.players.find(p => p.id === toId);
      
      if (!sender || !receiver) return callback({ success: false, error: 'Jogador não encontrado' });
      if (sender.isBanker || receiver.isBanker) return callback({ success: false, error: 'Apenas jogadores podem negociar entre si' });
      if (sender.id === receiver.id) return callback({ success: false, error: 'Não podes negociar contigo mesmo' });
      if (room.trades.some((trade) => ['requested', 'active', 'banker_approval'].includes(trade.status) &&
        [trade.initiatorId, trade.receiverId].some((id) => id === sender.id || id === receiver.id))) {
        return callback({ success: false, error: 'Um dos jogadores já possui uma negociação em andamento' });
      }
      
      const tradeId = uuidv4();
      const newTrade = {
        id: tradeId,
        initiatorId: sender.id,
        receiverId: receiver.id,
        initiatorName: sender.name,
        receiverName: receiver.name,
        status: 'requested',
        proposalRevision: 0,
        proposalById: sender.id,
        proposal: {
          initiatorOffers: [],
          initiatorMoney: 0,
          receiverOffers: [],
          receiverMoney: 0
        }
      };
      
      room.trades.push(newTrade);
      io.to(receiver.id).emit('trade_requested', newTrade);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      
      callback({ success: true, tradeId });
    } catch (err) {
      console.error('[request_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── respond_trade ────────────────────────────────────────────────────────────
  socket.on('respond_trade', ({ roomCode, tradeId, accept } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const tradeIdx = room.trades.findIndex(t => t.id === tradeId);
      if (tradeIdx === -1) return callback({ success: false, error: 'Negociação não encontrada' });
      const trade = room.trades[tradeIdx];
      
      if (trade.status !== 'requested') return callback({ success: false, error: 'Este convite de negociação já foi respondido' });
      if (socket.id !== trade.receiverId) return callback({ success: false, error: 'Sem permissão' });
      
      if (accept) {
        trade.status = 'active';
        trade.proposalById = trade.initiatorId;
        trade.proposalRevision = Number(trade.proposalRevision) || 0;
        io.to(trade.initiatorId).emit('trade_started', trade);
        io.to(trade.receiverId).emit('trade_started', trade);
      } else {
        room.trades.splice(tradeIdx, 1);
        io.to(trade.initiatorId).emit('trade_rejected', { tradeId, playerName: trade.receiverName });
      }
      
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[respond_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── update_trade_proposal (either participant, any time — live/simultaneous) ─
  socket.on('update_trade_proposal', ({ roomCode, tradeId, proposal } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const trade = room.trades.find(t => t.id === tradeId);
      if (!trade || trade.status !== 'active') return callback({ success: false, error: 'Negociação inválida' });
      
      if (socket.id !== trade.initiatorId && socket.id !== trade.receiverId) {
        return callback({ success: false, error: 'Sem permissão' });
      }
      
      const normalized = normalizeTradeProposal(room, trade, proposal, propertiesData);
      if (normalized.error) return callback({ success: false, error: normalized.error });

      trade.proposal = normalized.proposal;
      trade.proposalById = socket.id;
      trade.proposalRevision = (Number(trade.proposalRevision) || 0) + 1;
      trade.updatedAt = new Date().toISOString();
      
      io.to(trade.initiatorId).emit('trade_proposal_updated', trade);
      io.to(trade.receiverId).emit('trade_proposal_updated', trade);
      
      callback({ success: true });
    } catch (err) {
      console.error('[update_trade_proposal]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── set_trade_ready (either participant marks their side as agreed) ─────────
  socket.on('set_trade_ready', ({ roomCode, tradeId, ready = true } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const trade = room.trades.find(t => t.id === tradeId);
      if (!trade || trade.status !== 'active') return callback({ success: false, error: 'Negociação inválida' });
      if (socket.id !== trade.initiatorId && socket.id !== trade.receiverId) {
        return callback({ success: false, error: 'Sem permissão' });
      }
      
      if (socket.id === trade.initiatorId) trade.initiatorReady = !!ready;
      else trade.receiverReady = !!ready;
      
      if (trade.initiatorReady && trade.receiverReady) {
        trade.status = 'banker_approval';
        io.to(trade.initiatorId).emit('trade_approval_request', trade);
        io.to(trade.receiverId).emit('trade_approval_request', trade);
        if (room.bankerId) {
          io.to(room.bankerId).emit('trade_approval_request', trade);
          io.to(room.bankerId).emit('game_notification', { type: 'info', message: 'Nova negociação pendente de aprovação!' });
        }
      } else {
        io.to(trade.initiatorId).emit('trade_proposal_updated', trade);
        io.to(trade.receiverId).emit('trade_proposal_updated', trade);
      }
      
      callback({ success: true });
    } catch (err) {
      console.error('[set_trade_ready]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  socket.on('accept_trade_proposal', ({ roomCode, tradeId, proposalRevision } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      const trade = room.trades.find((item) => item.id === tradeId && item.status === 'active');
      if (!trade) return callback({ success: false, error: 'Negociação não encontrada' });
      if (![trade.initiatorId, trade.receiverId].includes(socket.id)) return callback({ success: false, error: 'Sem permissão' });
      if (!trade.proposalById) return callback({ success: false, error: 'Nenhuma proposta foi enviada' });
      if (socket.id === trade.proposalById) return callback({ success: false, error: 'Somente quem recebeu a proposta pode aceitá-la' });
      if (!Number.isSafeInteger(proposalRevision) || proposalRevision !== (Number(trade.proposalRevision) || 0)) {
        return callback({ success: false, error: 'Esta proposta foi atualizada. Revise os novos termos antes de aceitar.' });
      }

      const result = applyTradeSettlement(room, trade);
      if (result.error) return callback({ success: false, error: result.error });
      room.trades = room.trades.filter((item) => item.id !== tradeId);
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.to(trade.initiatorId).emit('trade_completed', { tradeId });
      io.to(trade.receiverId).emit('trade_completed', { tradeId });
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
      const tradeIdx = room.trades.findIndex((item) => item.id === tradeId && item.status === 'active');
      if (tradeIdx === -1) return callback({ success: false, error: 'Negociação não encontrada' });
      const trade = room.trades[tradeIdx];
      if (!trade.proposalById) return callback({ success: false, error: 'Nenhuma proposta foi enviada' });
      if (socket.id === trade.proposalById || ![trade.initiatorId, trade.receiverId].includes(socket.id)) {
        return callback({ success: false, error: 'Somente o destinatário da proposta pode recusá-la' });
      }
      if (!Number.isSafeInteger(proposalRevision) || proposalRevision !== (Number(trade.proposalRevision) || 0)) {
        return callback({ success: false, error: 'A proposta já foi atualizada' });
      }

      room.trades.splice(tradeIdx, 1);
      const rejecterName = room.players.find((player) => player.id === socket.id)?.name || trade.receiverName;
      io.to(trade.proposalById).emit('trade_rejected', { tradeId, playerName: rejecterName });
      io.to(socket.id).emit('trade_cancelled', { tradeId, message: 'Você recusou a proposta recebida.' });
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[reject_trade_proposal]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── approve_trade ────────────────────────────────────────────────────────────
  socket.on('approve_trade', ({ roomCode, tradeId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });
      
      const tradeIdx = room.trades.findIndex(t => t.id === tradeId);
      if (tradeIdx === -1) return callback({ success: false, error: 'Negociação não encontrada' });
      const trade = room.trades[tradeIdx];
      
      if (trade.status !== 'banker_approval') return callback({ success: false, error: 'Negociação não está aguardando aprovação' });
      
      const initiator = room.players.find(p => p.id === trade.initiatorId);
      const receiver = room.players.find(p => p.id === trade.receiverId);
      
      if (!initiator || !receiver) {
        room.trades.splice(tradeIdx, 1);
        io.in(roomCode).emit('update_game_state', getRoomState(room));
        return callback({ success: false, error: 'Jogador saiu da sala' });
      }
      const settlement = applyTradeSettlement(room, trade);
      if (settlement.error) {
        room.trades.splice(tradeIdx, 1);
        io.in(roomCode).emit('update_game_state', getRoomState(room));
        io.to(trade.initiatorId).emit('notification', { type: 'error', message: `❌ Negociação cancelada: ${settlement.error}` });
        io.to(trade.receiverId).emit('notification', { type: 'error', message: `❌ Negociação cancelada: ${settlement.error}` });
        return callback({ success: false, error: settlement.error });
      }
      
      room.trades.splice(tradeIdx, 1);
      
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      
      io.to(initiator.id).emit('trade_completed', { tradeId });
      io.to(receiver.id).emit('trade_completed', { tradeId });
      
      callback({ success: true });
    } catch (err) {
      console.error('[approve_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── reject_trade_bank ────────────────────────────────────────────────────────
  socket.on('reject_trade_bank', ({ roomCode, tradeId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Sem permissão' });
      
      const tradeIdx = room.trades.findIndex(t => t.id === tradeId);
      if (tradeIdx === -1) return callback({ success: false, error: 'Negociação não encontrada' });
      const trade = room.trades[tradeIdx];
      
      room.trades.splice(tradeIdx, 1);
      
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.to(trade.initiatorId).emit('trade_rejected_bank', { tradeId });
      io.to(trade.receiverId).emit('trade_rejected_bank', { tradeId });
      
      callback({ success: true });
    } catch (err) {
      console.error('[reject_trade_bank]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── cancel_trade ─────────────────────────────────────────────────────────────
  socket.on('cancel_trade', ({ roomCode, tradeId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const room = rooms[roomCode];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      
      const tradeIdx = room.trades.findIndex(t => t.id === tradeId);
      if (tradeIdx === -1) return callback({ success: false, error: 'Negociação não encontrada' });
      const trade = room.trades[tradeIdx];
      
      if (socket.id !== trade.initiatorId && socket.id !== trade.receiverId) {
        return callback({ success: false, error: 'Sem permissão' });
      }
      
      room.trades.splice(tradeIdx, 1);
      
      const otherId = socket.id === trade.initiatorId ? trade.receiverId : trade.initiatorId;
      io.to(otherId).emit('trade_cancelled', { tradeId });
      
      io.in(roomCode).emit('update_game_state', getRoomState(room));
      callback({ success: true });
    } catch (err) {
      console.error('[cancel_trade]', err);
      callback({ success: false, error: 'Erro interno' });
    }
  });

  // ── kick_player (Banker only) ────────────────────────────────────────────────
  socket.on('kick_player', ({ roomCode, targetId } = {}, callback) => {
    if (typeof callback !== 'function') return;
    try {
      const code = sanitizeString(roomCode, 6)?.toUpperCase();
      const room = rooms[code];
      if (!room) return callback({ success: false, error: 'Sala não encontrada' });
      if (socket.id !== room.bankerId) return callback({ success: false, error: 'Apenas o bancário pode remover jogadores' });

      const idx = room.players.findIndex((p) => p.id === targetId);
      if (idx === -1) return callback({ success: false, error: 'Jogador não encontrado' });

      const kickedPlayer = room.players[idx];
      if (kickedPlayer.isBanker) return callback({ success: false, error: 'Não é possível remover o bancário' });

      room.players.splice(idx, 1);

      // Clean pending transfers & trades involving this player
      room.pendingTransfers = room.pendingTransfers.filter(
        (r) => r.fromId !== targetId && r.toId !== targetId
      );
      if (room.trades) {
        room.trades = room.trades.filter(
          (t) => t.initiatorId !== targetId && t.receiverId !== targetId
        );
      }

      io.in(code).emit('update_game_state', getRoomState(room));
      io.to(targetId).emit('notification', { type: 'error', message: 'Foste removido da sala pelo bancário' });
      io.in(code).emit('game_notification', {
        type: 'warning',
        message: `${kickedPlayer.name} foi removido da sala`,
      });

      console.log(`[player:kicked] ${code} "${kickedPlayer.name}"`);
      callback({ success: true });
    } catch (err) {
      console.error('[kick_player]', err);
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
        io.in(roomCode).emit('player_disconnected', { playerName: player.name });
        // Cancel pending transfers involving this player
        const cancelled = room.pendingTransfers.filter(
          (r) => r.fromId === socket.id || r.toId === socket.id
        );
        if (cancelled.length > 0) {
          room.pendingTransfers = room.pendingTransfers.filter(
            (r) => r.fromId !== socket.id && r.toId !== socket.id
          );
          io.to(room.bankerId).emit('transfers_cancelled', {
            requestIds: cancelled.map((r) => r.requestId),
            playerName: player.name,
          });
          io.to(room.bankerId).emit('update_game_state', getRoomState(room));
        }
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

// ─── Static File Serving ──────────────────────────────────────────────────────
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`\n🏦  MoneyBank Server · porta ${PORT}\n`);
});
