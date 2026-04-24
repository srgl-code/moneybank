import React from 'react';

export const PIN_OPTIONS = [
  { id: 'red',    color: '#ef4444', label: 'Peão Vermelho' },
  { id: 'blue',   color: '#3b82f6', label: 'Peão Azul' },
  { id: 'green',  color: '#22c55e', label: 'Peão Verde' },
  { id: 'yellow', color: '#eab308', label: 'Peão Amarelo' },
  { id: 'cyan',   color: '#06b6d4', label: 'Peão Ciano' },
  { id: 'orange', color: '#f97316', label: 'Peão Laranja' },
  { id: 'pink',   color: '#ec4899', label: 'Peão Rosa' },
  { id: 'slate',  color: '#94a3b8', label: 'Peão Cinza' },
];

export const CUSTOM_PIN_ID = '__custom__';

/** 
 * Renders a premium 3D-styled game pin (Monopoly Pawn shape) 
 */
export function GamePin({ color = '#3b82f6', size = 40 }) {
  const shadowColor = color + '44';
  
  return (
    <div 
      className="relative flex items-center justify-center flex-shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 100 120" 
        className="w-full h-full drop-shadow-lg"
        style={{ filter: `drop-shadow(0 6px 8px ${shadowColor})` }}
      >
        <defs>
          <radialGradient id={`grad-${color.replace('#','')}`} cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Base shadow on floor */}
        <ellipse cx="50" cy="112" rx="38" ry="8" fill="black" fillOpacity="0.1" />
        
        {/* The Piece (Monopoly Pawn Shape) */}
        <path 
          d="
            M 20,105 
            C 20,115 80,115 80,105 
            C 80,100 70,95 58,92 
            L 62,70 
            C 78,65 82,50 82,40 
            C 82,18 68,4 50,4 
            C 32,4 18,18 18,40 
            C 18,50 22,65 38,70 
            L 42,92 
            C 30,95 20,100 20,105 
            Z
          " 
          fill={color} 
        />
        
        {/* Lighting Overlay */}
        <path 
          d="
            M 20,105 
            C 20,115 80,115 80,105 
            C 80,100 70,95 58,92 
            L 62,70 
            C 78,65 82,50 82,40 
            C 82,18 68,4 50,4 
            C 32,4 18,18 18,40 
            C 18,50 22,65 38,70 
            L 42,92 
            C 30,95 20,100 20,105 
            Z
          " 
          fill={`url(#grad-${color.replace('#','')})`}
        />

        {/* Top Shine */}
        <circle cx="38" cy="22" r="10" fill="white" fillOpacity="0.3" />
        
        {/* Rim Light */}
        <path 
          d="M25,40 C25,25 35,12 50,12" 
          fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.2" 
        />
      </svg>
    </div>
  );
}

/** 
 * Legacy-compatible PinSVG - just redirects to GamePin 
 */
export function PinSVG({ size = 28, color }) {
  return <GamePin size={size} color={color} />;
}

/** 
 * The main component to display a player's avatar.
 * Handles IDs from PIN_OPTIONS, custom colors, or bank icon.
 */
export function PinDisplay({ avatar, color, size = 32 }) {
  // Handle Banker
  if (avatar === '🏦' || avatar === 'bank') {
    return <GamePin color="#006a46" size={size} />;
  }

  const pin = PIN_OPTIONS.find(p => p.id === avatar);
  if (pin) {
    return <GamePin color={color || pin.color} size={size} />;
  }

  // Fallback to custom color
  return <GamePin color={color || '#3b82f6'} size={size} />;
}
