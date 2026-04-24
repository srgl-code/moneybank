import React from 'react';
import { PropertyCard } from './PropertyCard';

const PROP_META = {
  1: { name: 'Av. Beira-Mar', color: '#3b82f6', price: 400 },
  2: { name: 'Interlagos', color: '#ef4444', price: 350 },
  3: { name: 'Morumbi', color: '#10b981', price: 300 },
  4: { name: 'Ipanema', color: '#f59e0b', price: 320 },
  5: { name: 'Copacabana', color: '#f59e0b', price: 280 },
  6: { name: 'Leblon', color: '#8b5cf6', price: 400 },
};

const getPropMeta = (id) => PROP_META[id] || { name: `Lote ${id}`, color: `hsl(${(id * 40) % 360}, 70%, 50%)`, price: 200 };

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
    <div className="grid grid-cols-2 gap-3 animate-fade-up">
      {properties.map(id => {
        const meta = getPropMeta(id);
        return <PropertyCard key={id} id={id} {...meta} />;
      })}
    </div>
  );
};
