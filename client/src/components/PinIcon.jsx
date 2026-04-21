import React from 'react';

export const PIN_OPTIONS = [
  { id: 'red',    color: '#ef4444', label: 'Vermelho' },
  { id: 'blue',   color: '#3b82f6', label: 'Azul'    },
  { id: 'green',  color: '#22c55e', label: 'Verde'   },
  { id: 'yellow', color: '#eab308', label: 'Amarelo' },
  { id: 'orange', color: '#f97316', label: 'Laranja' },
  { id: 'purple', color: '#a855f7', label: 'Roxo'    },
  { id: 'pink',   color: '#ec4899', label: 'Rosa'    },
  { id: 'white',  color: '#e2e8f0', label: 'Branco'  },
];

export const CUSTOM_PIN_ID = '__custom__';

export function PinSVG({ color = '#ef4444', size = 28 }) {
  const h = Math.round(size * 1.4);
  return (
    <svg width={size} height={h} viewBox="0 0 28 40" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="37.5" rx="7" ry="2.5" fill="rgba(0,0,0,0.22)" />
      <path
        d="M14 1C7.925 1 3 5.925 3 12c0 4 1.8 7.6 4.6 11L14 37l6.4-14C23.2 19.6 25 16 25 12 25 5.925 20.075 1 14 1z"
        fill={color}
      />
      <circle cx="14" cy="12" r="5.5" fill="rgba(0,0,0,0.18)" />
      <circle cx="11.5" cy="9.5" r="2.5" fill="rgba(255,255,255,0.38)" />
    </svg>
  );
}

/** Renders a pin by its id, or falls back to displaying the avatar as emoji */
export function PinDisplay({ avatar, size = 28 }) {
  const pin = PIN_OPTIONS.find(p => p.id === avatar);
  if (pin) return <PinSVG color={pin.color} size={size} />;
  const h = Math.round(size * 1.4);
  return (
    <span style={{
      fontSize: Math.round(size * 0.85) + 'px',
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: h + 'px',
      width: size + 'px',
      flexShrink: 0,
    }}>
      {avatar || '🎮'}
    </span>
  );
}
