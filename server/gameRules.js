'use strict';

function getConstructionPlan({ room, player, propertyId, quantity, propertiesData, excludeRequestId = null }) {
  const property = propertiesData.find((item) => item.name === propertyId);
  if (!property || !property.houseCost) return { error: 'Este imóvel não permite construção' };
  if (!player.properties?.includes(propertyId)) return { error: 'Você não possui este imóvel' };

  const groupProperties = propertiesData.filter((item) => item.group === property.group);
  if (!groupProperties.every((item) => player.properties?.includes(item.name))) {
    return { error: 'É preciso possuir o conjunto completo desta cor para construir' };
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return { error: 'Quantidade de construções inválida' };
  }

  const hasPendingConstruction = (room.pendingTransfers || []).some((request) =>
    request.requestId !== excludeRequestId &&
    request.fromId === player.id &&
    request.metadata?.type === 'buy_house' &&
    request.metadata?.propertyId === propertyId
  );
  if (hasPendingConstruction) return { error: 'Já existe uma construção deste imóvel pendente de aprovação' };

  const currentHouses = player.houses?.[propertyId] || 0;
  if (!Number.isSafeInteger(currentHouses) || currentHouses < 0 || currentHouses >= 5) {
    return { error: 'Este imóvel já atingiu o limite de construções' };
  }

  const available = 5 - currentHouses;
  if (quantity > available) return { error: `É possível solicitar no máximo ${available} construção(ões)` };

  const unitCosts = [];
  for (let level = currentHouses + 1; level <= currentHouses + quantity; level += 1) {
    unitCosts.push(level === 5 ? (property.hotelCost || property.houseCost) : property.houseCost);
  }
  const totalCost = unitCosts.reduce((total, cost) => total + cost, 0);
  if (player.balance < totalCost) return { error: `Saldo insuficiente. A construção custa M$${totalCost.toLocaleString('pt-BR')}` };

  return {
    property,
    currentHouses,
    targetHouses: currentHouses + quantity,
    housesToAdd: quantity,
    unitCosts,
    houseCost: property.houseCost,
    hotelCost: property.hotelCost || property.houseCost,
    totalCost,
  };
}

function normalizeTradeProposal(room, trade, rawProposal, propertiesData) {
  if (!rawProposal || typeof rawProposal !== 'object') return { error: 'Proposta inválida' };

  const parseOffers = (value) => {
    if (!Array.isArray(value) || value.length > propertiesData.length) return null;
    if (value.some((id) => typeof id !== 'string') || new Set(value).size !== value.length) return null;
    return value;
  };
  const parseMoney = (value) => {
    const amount = Number(value ?? 0);
    return Number.isSafeInteger(amount) && amount >= 0 && amount <= 1_000_000_000 ? amount : null;
  };

  const proposal = {
    initiatorOffers: parseOffers(rawProposal.initiatorOffers),
    initiatorMoney: parseMoney(rawProposal.initiatorMoney),
    receiverOffers: parseOffers(rawProposal.receiverOffers),
    receiverMoney: parseMoney(rawProposal.receiverMoney),
  };
  if (!proposal.initiatorOffers || !proposal.receiverOffers || proposal.initiatorMoney === null || proposal.receiverMoney === null) {
    return { error: 'A proposta contém itens ou valores inválidos' };
  }

  const initiator = room.players.find((player) => player.id === trade.initiatorId);
  const receiver = room.players.find((player) => player.id === trade.receiverId);
  if (!initiator || !receiver || initiator.isBanker || receiver.isBanker) return { error: 'Jogador da negociação não encontrado' };

  if (proposal.initiatorMoney > initiator.balance || proposal.receiverMoney > receiver.balance) {
    return { error: 'A proposta excede o saldo disponível de um jogador' };
  }

  const allOfferedProperties = [...proposal.initiatorOffers, ...proposal.receiverOffers];
  if (new Set(allOfferedProperties).size !== allOfferedProperties.length) {
    return { error: 'Uma propriedade não pode ser oferecida pelos dois jogadores' };
  }

  const pendingHouseProperties = new Set((room.pendingTransfers || [])
    .filter((request) => request.metadata?.type === 'buy_house')
    .map((request) => request.metadata.propertyId));

  const validateOwnedProperties = (owner, offers) => offers.every((propertyId) =>
    propertiesData.some((property) => property.name === propertyId) &&
    owner.properties?.includes(propertyId) &&
    room.players.filter((player) => !player.isBanker && player.properties?.includes(propertyId)).length === 1 &&
    !pendingHouseProperties.has(propertyId)
  );
  if (!validateOwnedProperties(initiator, proposal.initiatorOffers) || !validateOwnedProperties(receiver, proposal.receiverOffers)) {
    return { error: 'Uma propriedade não pertence ao jogador que a oferece ou está em construção pendente' };
  }

  return { proposal, initiator, receiver };
}

function settleTrade(room, trade, propertiesData, recordBalanceHistory) {
  const normalized = normalizeTradeProposal(room, trade, trade.proposal, propertiesData);
  if (normalized.error) return normalized;

  const { proposal, initiator, receiver } = normalized;
  const hasItems = proposal.initiatorOffers.length || proposal.receiverOffers.length || proposal.initiatorMoney || proposal.receiverMoney;
  if (!hasItems) return { error: 'A proposta não contém valores ou propriedades para trocar' };

  const nextInitiatorBalance = initiator.balance - proposal.initiatorMoney + proposal.receiverMoney;
  const nextReceiverBalance = receiver.balance - proposal.receiverMoney + proposal.initiatorMoney;
  if (nextInitiatorBalance < 0 || nextReceiverBalance < 0) return { error: 'Saldo insuficiente para concluir a negociação' };

  const nextInitiatorProperties = [...(initiator.properties || [])];
  const nextReceiverProperties = [...(receiver.properties || [])];
  const nextInitiatorHouses = { ...(initiator.houses || {}) };
  const nextReceiverHouses = { ...(receiver.houses || {}) };

  for (const propertyId of proposal.initiatorOffers) {
    nextInitiatorProperties.splice(nextInitiatorProperties.indexOf(propertyId), 1);
    nextReceiverProperties.push(propertyId);
    if (nextInitiatorHouses[propertyId] !== undefined) {
      nextReceiverHouses[propertyId] = nextInitiatorHouses[propertyId];
      delete nextInitiatorHouses[propertyId];
    }
  }
  for (const propertyId of proposal.receiverOffers) {
    nextReceiverProperties.splice(nextReceiverProperties.indexOf(propertyId), 1);
    nextInitiatorProperties.push(propertyId);
    if (nextReceiverHouses[propertyId] !== undefined) {
      nextInitiatorHouses[propertyId] = nextReceiverHouses[propertyId];
      delete nextReceiverHouses[propertyId];
    }
  }

  initiator.balance = nextInitiatorBalance;
  receiver.balance = nextReceiverBalance;
  initiator.properties = nextInitiatorProperties;
  receiver.properties = nextReceiverProperties;
  initiator.houses = nextInitiatorHouses;
  receiver.houses = nextReceiverHouses;
  recordBalanceHistory(initiator);
  recordBalanceHistory(receiver);

  return { proposal, initiator, receiver };
}

module.exports = { getConstructionPlan, normalizeTradeProposal, settleTrade };
