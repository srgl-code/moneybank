import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Sparkles, Filter, Home, CheckCircle2, Lock, Search } from 'lucide-react';
import PropertyCard from '../PropertyCard.jsx';
import { propertiesData } from '../../data/properties.js';

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

const allGroups = [
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

export default function PlayerPropertiesTab({
  properties = [],
  houses = {},
  pendingHouseRequests = [],
  onBuyPropertyClick,
  onSelectPropertyForHouse
}) {
  const [selectedGroup, setSelectedGroup] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Map owned properties to data objects
  const ownedPropsData = useMemo(() => {
    return (properties || [])
      .map(id => propertiesData.find(p => p.name === id))
      .filter(Boolean);
  }, [properties]);

  // Group statistics (count owned vs total in game)
  const groupStats = useMemo(() => {
    const stats = {};
    propertiesData.forEach(p => {
      if (!stats[p.group]) {
        stats[p.group] = { total: 0, owned: 0, isMonopoly: false };
      }
      stats[p.group].total += 1;
      if (properties.includes(p.name)) {
        stats[p.group].owned += 1;
      }
    });

    Object.keys(stats).forEach(g => {
      stats[g].isMonopoly = stats[g].owned === stats[g].total && stats[g].total > 0 && g !== 'Ações';
    });

    return stats;
  }, [properties]);

  // Overall statistics
  const totalMonopolies = useMemo(() => {
    return Object.keys(groupStats).filter(g => groupStats[g].isMonopoly).length;
  }, [groupStats]);

  const totalHousesBuilt = useMemo(() => {
    return Object.values(houses || {}).reduce((acc, count) => acc + (count || 0), 0);
  }, [houses]);

  // Filter properties
  const filteredProps = useMemo(() => {
    return ownedPropsData.filter(prop => {
      const matchesGroup = selectedGroup === 'Todas' || prop.group === selectedGroup;
      const matchesSearch = !searchQuery || prop.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [ownedPropsData, selectedGroup, searchQuery]);

  return (
    <div className="space-y-6 pb-6">

      {/* Overview Header & Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface card p-4 border border-outline-variant/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Propriedades</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black font-headline text-on-surface">{properties.length}</span>
            <span className="text-xs text-on-surface-variant">/ {propertiesData.length}</span>
          </div>
        </div>

        <div className="bg-surface card p-4 border border-outline-variant/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Monopólios</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black font-headline text-amber-500">{totalMonopolies}</span>
            <span className="text-xs text-on-surface-variant font-medium">completos</span>
          </div>
        </div>

        <div className="bg-surface card p-4 border border-outline-variant/40 flex flex-col justify-between">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Construções</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-black font-headline text-primary">{totalHousesBuilt}</span>
            <span className="text-xs text-on-surface-variant font-medium">casas/hotéis</span>
          </div>
        </div>

        <div className="bg-surface card p-4 border border-outline-variant/40 flex flex-col justify-center items-center">
          <button
            type="button"
            onClick={onBuyPropertyClick}
            className="w-full h-full py-2 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Novo Terreno
          </button>
        </div>
      </div>

      {/* Filtro de Cores (Requisito Chave) */}
      <div className="bg-surface card p-4 border border-outline-variant/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider font-headline">
              Filtrar por Cor do Grupo
            </h4>
          </div>

          {/* Quick search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              type="text"
              placeholder="Buscar pelo nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/50 focus:outline-none focus:border-primary text-on-surface"
            />
          </div>
        </div>

        {/* Color chips carousel */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 py-1 items-center">
          {allGroups.map(group => {
            const isAll = group === 'Todas';
            const stats = !isAll ? groupStats[group] : null;
            const countOwned = isAll ? properties.length : (stats?.owned || 0);
            const isMonopoly = !isAll && stats?.isMonopoly;
            const isSelected = selectedGroup === group;

            return (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className={`
                  flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none shrink-0 border
                  ${isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-md scale-[1.02]'
                    : isMonopoly
                      ? 'bg-amber-500/10 text-amber-700 border-amber-500/40 hover:bg-amber-500/20'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/40'
                  }
                `}
              >
                {!isAll && (
                  <span
                    className="w-3 h-3 rounded-full border border-black/10 shrink-0 shadow-xs"
                    style={{ backgroundColor: colorMap[group] || '#94a3b8' }}
                  />
                )}
                <span>{group}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : isMonopoly
                      ? 'bg-amber-500/20 text-amber-800'
                      : 'bg-surface text-on-surface-variant'
                }`}>
                  {isAll ? countOwned : `${countOwned}/${stats?.total || 0}`}
                </span>
                {isMonopoly && <span title="Monopólio Completo!">⭐</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Propriedades */}
      {filteredProps.length === 0 ? (
        <div className="card p-10 border-dashed border-outline-variant/60 flex flex-col items-center justify-center text-center text-on-surface-variant min-h-[220px]">
          <span className="text-4xl mb-3 opacity-60">🏠</span>
          <h4 className="font-headline font-bold text-base text-on-surface">
            {properties.length === 0
              ? 'Você ainda não possui nenhum terreno'
              : 'Nenhuma propriedade nesta categoria'
            }
          </h4>
          <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
            {properties.length === 0
              ? 'Compre terrenos para receber aluguéis dos outros jogadores e construir casas!'
              : 'Selecione outro filtro de cor ou compre os terrenos faltantes.'
            }
          </p>
          <button
            type="button"
            onClick={onBuyPropertyClick}
            className="mt-4 btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Comprar Propriedade
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-6 justify-center sm:justify-start">
          {filteredProps.map(prop => {
            const groupProps = propertiesData.filter(p => p.group === prop.group).map(p => p.name);
            const ownsFullGroup = prop.houseCost > 0 && groupProps.every(name => properties.includes(name));
            const currentHouses = houses?.[prop.name] || 0;
            const isHotel = currentHouses >= 5;
            const pendingRequest = pendingHouseRequests.find((request) => request.metadata?.propertyId === prop.name);

            return (
              <div key={prop.name} className="relative flex flex-col items-center">
                {/* Monopoly / Construction Badge */}
                {prop.houseCost > 0 && (
                  <div className="mb-2 w-full flex justify-between items-center text-[11px] px-1">
                    {ownsFullGroup ? (
                      <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        Monopólio Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-medium text-slate-500 bg-surface-container px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 opacity-60" />
                        Grupo {groupStats[prop.group]?.owned}/{groupStats[prop.group]?.total}
                      </span>
                    )}

                    {currentHouses > 0 && (
                      <span className="font-bold text-primary font-mono text-xs">
                        {isHotel ? '🏨 Hotel' : `${currentHouses} ${currentHouses === 1 ? 'casa' : 'casas'}`}
                      </span>
                    )}
                    {pendingRequest && (
                      <span className="font-bold text-amber-700 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Pendente de aprovação · M$ {Number(pendingRequest.amount).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}

                {/* Property Card */}
                <PropertyCard
                  {...prop}
                  houses={currentHouses}
                  canBuildHouse={ownsFullGroup && !isHotel}
                  buildPending={!!pendingRequest}
                  onBuyHouse={prop.houseCost > 0 && onSelectPropertyForHouse ? () => onSelectPropertyForHouse(prop) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
