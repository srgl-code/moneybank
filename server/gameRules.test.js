'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { propertiesData } = require('./data/properties.js');
const { getConstructionPlan, normalizeTradeProposal, settleTrade } = require('./gameRules.js');

const greenProperties = propertiesData.filter((property) => property.group === 'Verde').map((property) => property.name);

function makePlayer(id, properties = [], balance = 10000, houses = {}) {
  return { id, name: id, isBanker: false, balance, properties: [...properties], houses: { ...houses }, balanceHistory: [balance] };
}

function makeRoom(players, pendingTransfers = []) {
  return { players, pendingTransfers, transactionHistory: [] };
}

function recordBalanceHistory(player) {
  player.balanceHistory.push(player.balance);
}

test('construction requires the full color group and uses hotel price on level five', () => {
  const player = makePlayer('p1', greenProperties, 10000, { [greenProperties[0]]: 4 });
  const plan = getConstructionPlan({ room: makeRoom([player]), player, propertyId: greenProperties[0], quantity: 1, propertiesData });
  assert.equal(plan.totalCost, 500);
  assert.equal(plan.targetHouses, 5);

  player.properties.pop();
  assert.match(getConstructionPlan({ room: makeRoom([player]), player, propertyId: greenProperties[0], quantity: 1, propertiesData }).error, /conjunto completo/);
});

test('construction rejects unaffordable, over-limit, and duplicate pending requests', () => {
  const propertyId = greenProperties[0];
  const player = makePlayer('p1', greenProperties, 500, { [propertyId]: 4 });
  const room = makeRoom([player]);
  assert.match(getConstructionPlan({ room, player, propertyId, quantity: 2, propertiesData }).error, /no máximo/);

  player.houses[propertyId] = 0;
  assert.match(getConstructionPlan({ room, player, propertyId, quantity: 2, propertiesData }).error, /Saldo insuficiente/);

  player.balance = 10000;
  room.pendingTransfers.push({ requestId: 'pending-1', fromId: player.id, metadata: { type: 'buy_house', propertyId } });
  assert.match(getConstructionPlan({ room, player, propertyId, quantity: 1, propertiesData }).error, /pendente/);
  assert.equal(getConstructionPlan({ room, player, propertyId, quantity: 1, propertiesData, excludeRequestId: 'pending-1' }).totalCost, 500);
});

test('trade proposal validates property ownership and available balances', () => {
  const initiator = makePlayer('p1', [greenProperties[0]], 100);
  const receiver = makePlayer('p2', [greenProperties[1]], 200);
  const room = makeRoom([initiator, receiver]);
  const trade = { initiatorId: initiator.id, receiverId: receiver.id };

  assert.match(normalizeTradeProposal(room, trade, {
    initiatorOffers: [greenProperties[1]], initiatorMoney: 0,
    receiverOffers: [], receiverMoney: 0,
  }, propertiesData).error, /não pertence/);

  assert.match(normalizeTradeProposal(room, trade, {
    initiatorOffers: [], initiatorMoney: 101,
    receiverOffers: [], receiverMoney: 0,
  }, propertiesData).error, /excede o saldo/);
});

test('settlement atomically swaps cash, titles, and buildings after validation', () => {
  const initiator = makePlayer('p1', [greenProperties[0]], 1000, { [greenProperties[0]]: 2 });
  const receiver = makePlayer('p2', [greenProperties[1]], 2000, {});
  const room = makeRoom([initiator, receiver]);
  const trade = {
    initiatorId: initiator.id,
    receiverId: receiver.id,
    proposal: {
      initiatorOffers: [greenProperties[0]], initiatorMoney: 300,
      receiverOffers: [greenProperties[1]], receiverMoney: 100,
    },
  };

  const result = settleTrade(room, trade, propertiesData, recordBalanceHistory);
  assert.equal(result.error, undefined);
  assert.equal(initiator.balance, 800);
  assert.equal(receiver.balance, 2200);
  assert.deepEqual(initiator.properties, [greenProperties[1]]);
  assert.deepEqual(receiver.properties, [greenProperties[0]]);
  assert.equal(initiator.houses[greenProperties[1]], undefined);
  assert.equal(receiver.houses[greenProperties[0]], 2);
});

test('invalid trade settlement leaves all game values unchanged', () => {
  const initiator = makePlayer('p1', [greenProperties[0]], 100);
  const receiver = makePlayer('p2', [], 200);
  const room = makeRoom([initiator, receiver]);
  const trade = {
    initiatorId: initiator.id,
    receiverId: receiver.id,
    proposal: {
      initiatorOffers: [greenProperties[0]], initiatorMoney: 101,
      receiverOffers: [], receiverMoney: 0,
    },
  };

  const result = settleTrade(room, trade, propertiesData, recordBalanceHistory);
  assert.match(result.error, /excede o saldo/);
  assert.equal(initiator.balance, 100);
  assert.deepEqual(initiator.properties, [greenProperties[0]]);
  assert.equal(receiver.balance, 200);
});
