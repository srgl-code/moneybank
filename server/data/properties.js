'use strict';

// Mirrors client/src/data/properties.js — kept in sync manually.
// Used by the server to validate color-group monopolies and house/hotel costs.
const propertiesData = [
  // Verde
  { group: 'Verde', name: 'Av. Beira Mar', houseCost: 500, hotelCost: 500, totalValue: 600 },
  { group: 'Verde', name: 'Av. Brasil', houseCost: 500, hotelCost: 500, totalValue: 750 },
  { group: 'Verde', name: 'Av. 9 de Julho', houseCost: 500, hotelCost: 500, totalValue: 1000 },

  // Vermelho
  { group: 'Vermelho', name: 'Av. do Estado', houseCost: 1500, hotelCost: 1500, totalValue: 2200 },
  { group: 'Vermelho', name: 'Av. Rio Branco', houseCost: 1500, hotelCost: 1500, totalValue: 2400 },
  { group: 'Vermelho', name: 'Av. do Contorno', houseCost: 1500, hotelCost: 1500, totalValue: 2200 },

  // Rosa
  { group: 'Rosa', name: 'Av. Higienópolis', houseCost: 2000, hotelCost: 2000, totalValue: 3500 },
  { group: 'Rosa', name: 'Av. Morumbi', houseCost: 2000, hotelCost: 2000, totalValue: 4000 },

  // Azul Escuro
  { group: 'Azul Escuro', name: 'Av. Recife', houseCost: 1000, hotelCost: 1000, totalValue: 1400 },
  { group: 'Azul Escuro', name: 'Rua Brig. Faria Lima', houseCost: 1000, hotelCost: 1000, totalValue: 2400 },
  { group: 'Azul Escuro', name: 'Av. Paulista', houseCost: 1000, hotelCost: 1000, totalValue: 1600 },

  // Azul Claro
  { group: 'Azul Claro', name: 'Av. Santo Amaro', houseCost: 1000, hotelCost: 1000, totalValue: 1800 },
  { group: 'Azul Claro', name: 'Rua da Consolação', houseCost: 1000, hotelCost: 1000, totalValue: 1800 },
  { group: 'Azul Claro', name: 'Av. Rebouças', houseCost: 1000, hotelCost: 1000, totalValue: 2000 },

  // Laranja
  { group: 'Laranja', name: 'Rua Oscar Freire', houseCost: 2000, hotelCost: 2000, totalValue: 3000 },
  { group: 'Laranja', name: 'Av. Ibirapuera', houseCost: 2000, hotelCost: 2000, totalValue: 3000 },
  { group: 'Laranja', name: 'Av. J. Kubitschek', houseCost: 2000, hotelCost: 2000, totalValue: 3200 },

  // Amarelo
  { group: 'Amarelo', name: 'Av. Niemeyer', houseCost: 1500, hotelCost: 1500, totalValue: 2600 },
  { group: 'Amarelo', name: 'Av. Vieira Souto', houseCost: 1500, hotelCost: 1500, totalValue: 2800 },
  { group: 'Amarelo', name: 'Av. Presidente Vargas', houseCost: 1500, hotelCost: 1500, totalValue: 2600 },

  // Roxo
  { group: 'Roxo', name: 'Av. Ipiranga', houseCost: 500, hotelCost: 500, totalValue: 1000 },
  { group: 'Roxo', name: 'Av. São João', houseCost: 500, hotelCost: 500, totalValue: 1200 },

  // Ações (não permite construção de casas)
  { group: 'Ações', name: 'Ton Viagens', houseCost: 0, hotelCost: 0, totalValue: 2000 },
  { group: 'Ações', name: 'Itol', houseCost: 0, hotelCost: 0, totalValue: 2000 },
  { group: 'Ações', name: 'Ipiranga', houseCost: 0, hotelCost: 0, totalValue: 2000 },
  { group: 'Ações', name: 'Fiet', houseCost: 0, hotelCost: 0, totalValue: 2000 },
  { group: 'Ações', name: 'Viva', houseCost: 0, hotelCost: 0, totalValue: 2000 },
  { group: 'Ações', name: 'Nevea', houseCost: 0, hotelCost: 0, totalValue: 2000 },
];

module.exports = { propertiesData };
