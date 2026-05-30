import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import PropertyCard from './PropertyCard.jsx';
import { propertiesData } from '../data/properties.js';

export default function BuyPropertyModal({ onClose, onBuyProperty, ownedProperties = [] }) {
  const [selectedProp, setSelectedProp] = useState(null);
  const [filterGroup, setFilterGroup] = useState('Todos');

  // Consider ownedProperties might be strings (IDs/Names) or objects. Assuming names for simplicity.
  const availableProperties = propertiesData.filter(p => !ownedProperties.includes(p.name));
  
  const groups = ['Todos', ...new Set(propertiesData.map(p => p.group))];
  
  const filteredProperties = filterGroup === 'Todos' 
    ? availableProperties 
    : availableProperties.filter(p => p.group === filterGroup);

  const getGroupColor = (group) => {
    const colors = {
      'Verde': '#4ade80', 'Vermelho': '#f87171', 'Rosa': '#f472b6', 
      'Azul Escuro': '#1d4ed8', 'Azul Claro': '#60a5fa', 'Laranja': '#fb923c', 
      'Amarelo': '#facc15', 'Roxo': '#c084fc', 'Ações': '#9ca3af', 'Todos': '#ffffff'
    };
    return colors[group] || '#e5e7eb';
  };

  const handleBuy = () => {
    if (selectedProp) {
      onBuyProperty(selectedProp);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-elevated flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h2 className="text-xl font-bold font-headline">Comprar Propriedade</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low hide-scrollbar flex flex-col">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-6 border-b border-outline-variant/30 pb-4 shrink-0">
            {groups.map(group => (
              <button
                key={group}
                onClick={() => setFilterGroup(group)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold font-headline uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 border
                  ${filterGroup === group 
                    ? 'bg-primary text-on-primary border-primary scale-105 shadow-md' 
                    : 'bg-surface text-on-surface hover:bg-surface-container border-outline-variant/50'
                  }`}
              >
                {group !== 'Todos' && (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getGroupColor(group) }} />
                )}
                {group}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-6 justify-center">
            {filteredProperties.map(prop => {
              const isSelected = selectedProp?.name === prop.name;
              return (
                <div 
                  key={prop.name} 
                  className={`relative cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-105 z-10' : 'hover:scale-[1.02]'}`}
                  onClick={() => setSelectedProp(prop)}
                >
                  <PropertyCard {...prop} />
                  {isSelected && (
                    <div className="absolute inset-0 rounded-xl border-4 border-primary bg-primary/10 flex items-center justify-center pointer-events-none">
                      <div className="bg-primary text-white p-3 rounded-full shadow-lg">
                        <Check className="w-8 h-8" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant bg-surface flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-center sm:text-left">
            {selectedProp ? (
              <span>Selecionado: <strong className="text-lg text-primary">{selectedProp.name}</strong> por <strong>M$ {selectedProp.totalValue}</strong></span>
            ) : (
              <span className="text-on-surface-variant">Selecione uma propriedade para comprar</span>
            )}
          </div>
          <button 
            disabled={!selectedProp}
            onClick={handleBuy}
            className="btn-primary w-full sm:w-auto px-8 disabled:opacity-50"
          >
            Solicitar Compra
          </button>
        </div>
      </motion.div>
    </div>
  );
}
