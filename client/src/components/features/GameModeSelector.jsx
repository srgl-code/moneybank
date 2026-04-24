import React from 'react';

const modes = [
  { id: 'classic', label: 'Clássico', icon: '🎯' },
  { id: 'fast', label: 'Rápido', icon: '⚡' },
  { id: 'custom', label: 'Personalizado', icon: '⚙️' }
];

export const GameModeSelector = ({ selected, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {modes.map(mode => {
        const isSelected = selected === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-bold ${
              isSelected 
                ? 'bg-surface-container-high border-surface-container-high text-white shadow-md' 
                : 'bg-surface border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            <span>{mode.icon}</span>
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
