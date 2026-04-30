import React from 'react';
import PropertyCard from '../PropertyCard.jsx';
import { propertiesData } from '../../data/properties.js';

export const PropertyTracker = ({ properties = [] }) => {
  if (!properties || properties.length === 0) {
    return (
      <div className="card p-6 border-dashed border-outline-variant/50 flex flex-col items-center justify-center text-on-surface-variant opacity-80 min-h-[160px]">
        <span className="text-3xl mb-2 opacity-50">🏠</span>
        <p className="text-sm font-label font-bold">Nenhuma propriedade.</p>
        <p className="text-xs text-center mt-1">Compre terrenos para dominar o tabuleiro!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4 animate-fade-up justify-center sm:justify-start">
      {properties.map(id => {
        const propData = propertiesData.find(p => p.name === id);
        if (!propData) return null;
        return (
          <div key={id} className="scale-75 origin-top-left -mb-[120px] -mr-[70px]">
            <PropertyCard {...propData} />
          </div>
        );
      })}
    </div>
  );
};
