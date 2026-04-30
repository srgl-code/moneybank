import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { PIN_OPTIONS } from '../PinIcon.jsx';

export default function PlayerCreditCard({ player, isDraggable = false, className = '' }) {
  const pin = PIN_OPTIONS.find(p => p.id === player?.avatar);
  const color = player?.color || (pin ? pin.color : '#3b82f6'); // fallback blue

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player?.id || 'card',
    data: { player },
    disabled: !isDraggable
  });

  const style = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : {}),
    backgroundColor: color,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      className={`w-52 h-32 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-end p-3 text-white border border-white/20 select-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] transition-transform duration-200 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'shadow-2xl scale-110 opacity-90' : 'hover:shadow-xl hover:-translate-y-1'} ${className}`}
    >
      {/* Background City SVG */}
      <div className="absolute top-1 inset-x-0 h-16 pointer-events-none opacity-90 flex items-end justify-center">
        <svg viewBox="0 0 100 40" className="w-[85%] h-full" preserveAspectRatio="none">
          <rect x="5" y="15" width="14" height="25" fill="#ef4444" rx="1" /> {/* Red */}
          <rect x="22" y="5" width="16" height="35" fill="#f97316" rx="1" /> {/* Orange */}
          <rect x="41" y="10" width="15" height="30" fill="#22c55e" rx="1" /> {/* Green */}
          <rect x="58" y="18" width="12" height="22" fill="#3b82f6" rx="1" /> {/* Blue */}
          <rect x="73" y="2" width="16" height="38" fill="#ef4444" rx="1" /> {/* Red */}
          <rect x="91" y="22" width="8" height="18" fill="#eab308" rx="1" /> {/* Yellow */}
        </svg>
      </div>

      {/* Main Banner */}
      <div className="relative bg-[#1e3a8a] border-y border-white py-1 mb-3 shadow-md">
        <div className="text-center text-[10px] font-bold tracking-widest leading-none" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
          SUPER BANCO IMOBILIÁRIO
        </div>
      </div>

      {/* Card Details */}
      <div className="relative flex-1 flex flex-col justify-end z-10 pl-1">
        <div className="font-mono text-[13px] tracking-widest text-white/95 drop-shadow-md mb-1.5" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.3)' }}>
          0001 1944 2010 7373
        </div>
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <div className="text-[8px] font-mono text-white/80">01/44 <span className="mx-0.5">▶</span> 12/10</div>
            <div className="text-xs font-bold truncate max-w-[100px] uppercase tracking-wide drop-shadow-md">{player?.name || 'JOGADOR'}</div>
          </div>
          {/* GoldCard Logo */}
          <div className="flex flex-col items-center justify-center relative mt-1">
            <div className="flex -space-x-3">
              <div className="w-6 h-6 rounded-full bg-red-600 mix-blend-multiply opacity-95"></div>
              <div className="w-6 h-6 rounded-full bg-yellow-500 mix-blend-multiply opacity-95"></div>
            </div>
            <div className="text-[7px] font-extrabold absolute -bottom-2.5 tracking-widest text-white drop-shadow-md">GOLDCARD</div>
          </div>
        </div>
      </div>
    </div>
  );
}
