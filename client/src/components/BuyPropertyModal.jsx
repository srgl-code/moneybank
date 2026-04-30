import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import PropertyCard from './PropertyCard.jsx';
import { propertiesData } from '../data/properties.js';

export default function BuyPropertyModal({ onClose, onBuyProperty, ownedProperties = [] }) {
  const [selectedProp, setSelectedProp] = useState(null);

  // Consider ownedProperties might be strings (IDs/Names) or objects. Assuming names for simplicity.
  const availableProperties = propertiesData.filter(p => !ownedProperties.includes(p.name));

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

        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low hide-scrollbar">
          <div className="flex flex-wrap gap-6 justify-center">
            {availableProperties.map(prop => {
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
