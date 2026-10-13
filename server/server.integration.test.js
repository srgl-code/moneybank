'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { io } = require('../client/node_modules/socket.io-client');
const { propertiesData } = require('./data/properties.js');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const { port } = listener.address();
      listener.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 3000 });
    const timer = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('connect_error', (error) => { clearTimeout(timer); reject(error); });
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), 5000);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

async function waitForHealth(url, process) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Server exited with code ${process.exitCode}`);
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Server health endpoint did not become ready');
}

async function waitUntil(predicate, message) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(message);
}

test('house approval and counterproposal trades settle through Socket.IO', { timeout: 30000 }, async (t) => {
  const port = await getFreePort();
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLogs = '';
  server.stdout?.on('data', (d) => { serverLogs += d.toString(); });
  server.stderr?.on('data', (d) => { serverLogs += d.toString(); });
  const sockets = [];
  t.after(() => {
    sockets.forEach((socket) => socket.disconnect());
    if (!server.killed) server.kill();
  });

  try {
    await waitForHealth(url, server);
  } catch (err) {
    throw new Error(`${err.message}\nServer Logs:\n${serverLogs}`);
  }
  const banker = await connect(url);
  const playerOne = await connect(url);
  const playerTwo = await connect(url);
  sockets.push(banker, playerOne, playerTwo);

  let bankerState;
  let playerOneState;
  let playerTwoState;
  let playerOneTrade;
  let playerTwoTrade;
  banker.on('update_game_state', (state) => { bankerState = state; });
  playerOne.on('update_game_state', (state) => { playerOneState = state; });
  playerTwo.on('update_game_state', (state) => { playerTwoState = state; });
  playerOne.on('trade_started', (trade) => { playerOneTrade = trade; });
  playerOne.on('trade_proposal_updated', (trade) => { playerOneTrade = trade; });
  playerTwo.on('trade_started', (trade) => { playerTwoTrade = trade; });
  playerTwo.on('trade_proposal_updated', (trade) => { playerTwoTrade = trade; });

  const room = await emitAck(banker, 'create_room', { playerName: 'Banco', startingBalance: 1500, startingPassGo: 200 });
  assert.equal(room.success, true);
  const roomCode = room.roomCode;
  const bankId = room.player.id;
  const joinedOne = await emitAck(playerOne, 'join_room', { roomCode, playerName: 'Ana', avatar: 'red', color: '#ef4444' });
  const joinedTwo = await emitAck(playerTwo, 'join_room', { roomCode, playerName: 'Bia', avatar: 'blue', color: '#3b82f6' });
  assert.equal(joinedOne.success, true);
  assert.equal(joinedTwo.success, true);
  playerOneState = joinedOne.gameState;
  playerTwoState = joinedTwo.gameState;
  bankerState = joinedTwo.gameState;

  const duplicateAttempt = await connect(url);
  sockets.push(duplicateAttempt);
  assert.equal((await emitAck(duplicateAttempt, 'join_room', { roomCode, playerName: 'Ana' })).success, false, 'a connected player name cannot be claimed');
  duplicateAttempt.disconnect();

  const legacySocket = await connect(url);
  sockets.push(legacySocket);
  const legacyPlayer = await emitAck(legacySocket, 'join_room', { roomCode, playerName: 'Carla QA', avatar: 'green', color: '#22c55e' });
  assert.equal(legacyPlayer.success, true);
  const legacyDisconnected = new Promise((resolve) => banker.once('player_disconnected', resolve));
  legacySocket.disconnect();
  await legacyDisconnected;
  const recoveredSocket = await connect(url);
  sockets.push(recoveredSocket);
  const recoveredPlayer = await emitAck(recoveredSocket, 'join_room', { roomCode, playerName: 'Carla QA' });
  assert.equal(recoveredPlayer.success, true, "a saved name recovers a disconnected player's room state");
  assert.equal(recoveredPlayer.sessionId, legacyPlayer.sessionId);
  assert.equal(recoveredPlayer.gameState.players.filter((player) => player.name === 'Carla QA').length, 1);
  await emitAck(recoveredSocket, 'leave_room', { roomCode });

  const greenProperties = propertiesData.filter((property) => property.group === 'Verde').map((property) => property.name);
  const orangeProperty = propertiesData.find((property) => property.group === 'Laranja').name;
  for (const propertyId of greenProperties) {
    assert.equal((await emitAck(banker, 'assign_property', { roomCode, targetId: joinedOne.player.id, propertyId })).success, true);
  }
  assert.equal((await emitAck(banker, 'assign_property', { roomCode, targetId: joinedTwo.player.id, propertyId: greenProperties[0] })).success, false, 'a title cannot have two owners');
  assert.equal((await emitAck(banker, 'assign_property', { roomCode, targetId: joinedTwo.player.id, propertyId: orangeProperty })).success, true);

  const houseRequest = await emitAck(playerOne, 'request_transfer', {
    roomCode,
    toId: bankId,
    amount: 1,
    reason: 'Construção',
    metadata: { type: 'buy_house', propertyId: greenProperties[0], housesToAdd: 1 },
  });
  assert.equal(houseRequest.success, true);
  let pending = playerOneState.pendingTransfers.find((request) => request.requestId === houseRequest.requestId);
  assert.equal(pending.amount, 500);
  assert.equal(pending.metadata.unitCosts[0], 500);
  assert.equal((await emitAck(playerOne, 'request_transfer', {
    roomCode, toId: bankId, amount: 500,
    metadata: { type: 'buy_house', propertyId: greenProperties[0], housesToAdd: 1 },
  })).success, false, 'duplicate pending construction is rejected');

  assert.equal((await emitAck(banker, 'approve_transfer', { roomCode, requestId: houseRequest.requestId })).success, true);
  await waitUntil(() => playerOneState.players.find((player) => player.id === joinedOne.player.id)?.balance === 1000, 'house approval state was not broadcast');
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).balance, 1000);
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).houses[greenProperties[0]], 1);
  assert.equal((await emitAck(playerOne, 'buy_house', { roomCode, propertyId: greenProperties[1] })).success, false, 'direct construction bypass is disabled');

  const rejectedHouseRequest = await emitAck(playerOne, 'request_transfer', {
    roomCode,
    toId: bankId,
    amount: 500,
    metadata: { type: 'buy_house', propertyId: greenProperties[2], housesToAdd: 1 },
  });
  assert.equal(rejectedHouseRequest.success, true);
  assert.equal((await emitAck(banker, 'reject_transfer', { roomCode, requestId: rejectedHouseRequest.requestId })).success, true);
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).houses[greenProperties[2]], undefined);
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).balance, 1000);

  const staleHouseRequest = await emitAck(playerOne, 'request_transfer', {
    roomCode,
    toId: bankId,
    amount: 500,
    metadata: { type: 'buy_house', propertyId: greenProperties[1], housesToAdd: 1 },
  });
  assert.equal(staleHouseRequest.success, true);
  const spendReservedBalance = await emitAck(banker, 'adjust_balance', { roomCode, targetId: joinedOne.player.id, amount: -700, reason: 'Teste saldo reservado' });
  assert.equal(spendReservedBalance.success, false, 'reserved construction funds cannot be spent twice');
  assert.equal((await emitAck(banker, 'reject_transfer', { roomCode, requestId: staleHouseRequest.requestId })).success, true);
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).houses[greenProperties[1]], undefined);
  assert.equal(playerOneState.players.find((player) => player.id === joinedOne.player.id).balance, 1000);

  const invitation = await emitAck(playerOne, 'request_trade', { roomCode, toId: joinedTwo.player.id });
  assert.equal(invitation.success, true);
  assert.equal((await emitAck(playerTwo, 'respond_trade', { roomCode, tradeId: invitation.tradeId, accept: true })).success, true);

  const proposal = {
    initiatorOffers: [greenProperties[0]],
    initiatorMoney: 200,
    receiverOffers: [orangeProperty],
    receiverMoney: 100,
  };
  assert.equal((await emitAck(playerOne, 'update_trade_proposal', { roomCode, tradeId: invitation.tradeId, proposal })).success, true);
  assert.equal((await emitAck(playerTwo, 'accept_trade_proposal', { roomCode, tradeId: invitation.tradeId, proposalRevision: 0 })).success, false, 'an old proposal revision cannot be accepted');

  const counterProposal = { ...proposal, initiatorMoney: 100, receiverMoney: 250 };
  assert.equal((await emitAck(playerTwo, 'update_trade_proposal', { roomCode, tradeId: invitation.tradeId, proposal: counterProposal })).success, true);
  const currentRevision = playerOneTrade.proposalRevision;
  assert.equal(currentRevision, 2);
  await emitAck(banker, 'adjust_balance', { roomCode, targetId: joinedOne.player.id, amount: -950, reason: 'Alteração durante negociação' });
  const unaffordableTrade = await emitAck(playerOne, 'accept_trade_proposal', { roomCode, tradeId: invitation.tradeId, proposalRevision: currentRevision });
  assert.equal(unaffordableTrade.success, false, 'acceptance revalidates the current balance');
  await waitUntil(() => playerOneState.players.find((player) => player.id === joinedOne.player.id)?.balance === 50, 'updated balance was not broadcast');
  assert.ok(playerOneState.players.find((player) => player.id === joinedOne.player.id).properties.includes(greenProperties[0]));
  await emitAck(banker, 'adjust_balance', { roomCode, targetId: joinedOne.player.id, amount: 950, reason: 'Restaurar saldo' });
  await waitUntil(() => playerOneState.players.find((player) => player.id === joinedOne.player.id)?.balance === 1000, 'restored balance was not broadcast');
  assert.equal((await emitAck(playerOne, 'accept_trade_proposal', { roomCode, tradeId: invitation.tradeId, proposalRevision: currentRevision })).success, true);

  await waitUntil(() => playerOneState.players.find((player) => player.id === joinedOne.player.id)?.balance === 1150, 'trade settlement state was not broadcast');
  const afterTradeOne = playerOneState.players.find((player) => player.id === joinedOne.player.id);
  const afterTradeTwo = playerOneState.players.find((player) => player.id === joinedTwo.player.id);
  assert.equal(afterTradeOne.balance, 1150);
  assert.equal(afterTradeTwo.balance, 1350);
  assert.ok(afterTradeOne.properties.includes(orangeProperty));
  assert.ok(!afterTradeOne.properties.includes(greenProperties[0]));
  assert.ok(afterTradeTwo.properties.includes(greenProperties[0]));
  assert.equal(afterTradeTwo.houses[greenProperties[0]], 1, 'buildings follow the title');

  const rejectedInvitation = await emitAck(playerTwo, 'request_trade', { roomCode, toId: joinedOne.player.id });
  assert.equal(rejectedInvitation.success, true);
  assert.equal((await emitAck(playerOne, 'respond_trade', { roomCode, tradeId: rejectedInvitation.tradeId, accept: true })).success, true);
  const rejectionProposal = {
    initiatorOffers: [greenProperties[0]],
    initiatorMoney: 50,
    receiverOffers: [orangeProperty],
    receiverMoney: 0,
  };
  assert.equal((await emitAck(playerTwo, 'update_trade_proposal', { roomCode, tradeId: rejectedInvitation.tradeId, proposal: rejectionProposal })).success, true);
  const rejectionRevision = playerOneTrade.proposalRevision;
  const rejectResult = await emitAck(playerOne, 'reject_trade_proposal', { roomCode, tradeId: rejectedInvitation.tradeId, proposalRevision: rejectionRevision });
  assert.equal(rejectResult.success, true);
  assert.ok(playerTwoState.players.find((player) => player.id === joinedTwo.player.id).properties.includes(greenProperties[0]));
  assert.equal(playerTwoState.players.find((player) => player.id === joinedTwo.player.id).balance, 1350);

  assert.equal((await emitAck(banker, 'remove_property', { roomCode, targetId: joinedTwo.player.id, propertyId: greenProperties[0] })).success, true);
  await waitUntil(() => !playerTwoState.players.find((player) => player.id === joinedTwo.player.id)?.properties.includes(greenProperties[0]), 'revoked title was not removed');
  assert.equal(playerTwoState.players.find((player) => player.id === joinedTwo.player.id).houses[greenProperties[0]], undefined);

  const auctionStarted = await emitAck(banker, 'start_auction', {
    roomCode,
    propertyId: greenProperties[0],
    participantIds: [joinedOne.player.id, joinedTwo.player.id],
    firstPlayerId: joinedOne.player.id,
    startingBid: 100,
  });
  assert.equal(auctionStarted.success, true);
  const auctionId = auctionStarted.auction.id;
  assert.equal((await emitAck(playerOne, 'place_auction_bid', { roomCode, auctionId, amount: 200 })).success, true);
  assert.equal((await emitAck(playerOne, 'place_auction_bid', { roomCode, auctionId, amount: 250 })).success, false, 'a player cannot bid twice before the next turn');
  assert.equal((await emitAck(playerTwo, 'adjust_balance', { roomCode, targetId: joinedTwo.player.id, amount: 100, reason: 'Jogador não pode ajustar saldo' })).success, false);
  assert.equal((await emitAck(playerTwo, 'place_auction_bid', { roomCode, auctionId, amount: 300 })).success, true);
  assert.equal((await emitAck(banker, 'adjust_balance', { roomCode, targetId: joinedTwo.player.id, amount: -1200, reason: 'Valor reservado' })).success, false);
  assert.equal((await emitAck(playerOne, 'pass_auction_turn', { roomCode, auctionId })).success, true);
  await waitUntil(() => playerTwoState.auction?.status === 'completed', 'auction completion was not broadcast');
  const auctionWinner = playerTwoState.players.find((player) => player.id === joinedTwo.player.id);
  assert.equal(auctionWinner.balance, 1050);
  assert.ok(auctionWinner.properties.includes(greenProperties[0]));
  assert.ok(playerTwoState.history.some((entry) => entry.type === 'auction' && entry.propertyId === greenProperties[0] && entry.amount === 300));

  const reconnectTransfer = await emitAck(playerOne, 'request_transfer', { roomCode, toId: bankId, amount: 50, reason: 'Reconnect check' });
  assert.equal(reconnectTransfer.success, true);
  const disconnected = new Promise((resolve) => banker.once('player_disconnected', resolve));
  playerOne.disconnect();
  await disconnected;
  const reconnectedPlayer = await connect(url);
  sockets.push(reconnectedPlayer);
  reconnectedPlayer.on('update_game_state', (state) => { playerOneState = state; });
  const rejoin = await emitAck(reconnectedPlayer, 'join_room', { roomCode, sessionId: joinedOne.sessionId });
  assert.equal(rejoin.success, true);
  assert.equal(rejoin.player.id, reconnectedPlayer.id);
  assert.equal((await emitAck(banker, 'approve_transfer', { roomCode, requestId: reconnectTransfer.requestId })).success, true, 'pending transfer references follow a reconnected session');
  await waitUntil(() => playerOneState.players.find((player) => player.id === reconnectedPlayer.id)?.balance === 1100, 'rejoined client did not receive the approved balance');
});
