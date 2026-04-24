'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

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
 * @typedef {{ id: string, sessionId: string, name: string, balance: number, isBanker: boolean, avatar: string, color: string|null, properties: string[], balanceHistory: number[] }} Player
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

function recordBalanceHistory(player) {
  if (player.isBanker) return;
  if (!player.balanceHistory) player.balanceHistory = [];
  player.balanceHistory.push(player.balance);
  if (player.balanceHistory.length > 50) {
    player.balanceHistory.shift();
  }
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
      .map(({ sessionId: _s, ...rest }) => rest), // strip internal sessionId from broadcast
    history: room.transactionHistory.slice(-50),
    pendingTransfers: room.pendingTransfers ?? [],
    startingBalance: room.startingBalance,
    startingPassGo: room.startingPassGo ?? 200,
    status: room.status,
  };
}

// ─── Socket Logic ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] connect   ${socket.id}`);

  // ── create_room ─────────────────────────────────────────────────────────────
  socket.on('create_room', ({ playerName, startingBalance, startingPassGo } = {}, callback) => {
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
        properties: [],
        balanceHistory: [],
      };

      /** @type {Room} */
      rooms[roomCode] = {
        roomCode,
        bankerId: socket.id,
        players: [banker],
        transactionHistory: [],
        pendingTransfers: [],
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
          existing.id = socket.id;                      // update to new socket
          if (existing.isBanker) room.bankerId = socket.id;

          socket.join(code);
          socket.data.roomCode = code;
          socket.data.sessionId = sessionId;

          io.in(code).emit('player_rejoined', { playerName: existing.name });
          io.in(code).emit('update_game_state', getRoomState(room));

          console.log(`[room:rejoin] ${code}  "${existing.name}"`);
          return callback({
            success: true,
            roomCode: code,
            sessionId: existing.sessionId,
            player: existing,
            gameState: getRoomState(room),
          });
        }
      }


      // ── New player ────────────────────────────────────────────────────────────
      const safeName = sanitizeString(playerName, 20);
      if (!safeName) return callback({ success: false, error: 'Nome inválido' });

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
        fromName: sender.name,
        toName: receiver.name,
        amount: amt,
        type: 'transfer',
        description: `${sender.name} pagou M$${amt.toLocaleString('pt-BR')} a ${receiver.name}`,
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
  socket.on('request_transfer', ({ roomCode, toId, amount, reason } = {}, callback) => {
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
      if (!sender.isBanker && sender.balance < amt) {
        return callback({ success: false, error: `Saldo insuficiente (tens M$${sender.balance.toLocaleString('pt-BR')})` });
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
        amount: amt,
        reason: safeReason,
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

      room.pendingTransfers.splice(idx, 1);

      const entry = {
        id: uuidv4(),
        time: new Date().toISOString(),
        fromId: req.fromId,
        toId:   req.toId,
        fromName: req.fromName,
        toName:   req.toName,
        amount: req.amount,
        type: 'transfer',
        description: req.reason
          ? `${req.fromName} → ${req.toName} — ${req.reason}`
          : `${req.fromName} pagou M$${req.amount.toLocaleString('pt-BR')} a ${req.toName}`,
      };
      room.transactionHistory.push(entry);
      trimHistory(room);

      io.in(code).emit('update_game_state', getRoomState(room));

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

      io.in(roomCode).emit('update_game_state', getRoomState(room));
      io.in(roomCode).emit('update_properties', { playerId: targetId, properties: target.properties });

      callback({ success: true });
    } catch (err) {
      console.error('[remove_property]', err);
      callback({ success: false, error: 'Erro interno' });
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

// ─── Start ────────────────────────────────────────────────────────────────────

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, () => {
  console.log(`\n🏦  MoneyBank Server · porta ${PORT}\n`);
});
