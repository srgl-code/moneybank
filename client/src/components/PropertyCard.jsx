import React from 'react';
import { PinDisplay } from './PinIcon.jsx';

const colorMap = {
  'Verde': '#22c55e',       // green-500
  'Vermelho': '#ef4444',    // red-500
  'Rosa': '#ec4899',        // pink-500
  'Azul Escuro': '#1d4ed8', // blue-700
  'Azul Claro': '#60a5fa',  // blue-400
  'Laranja': '#f97316',     // orange-500
  'Amarelo': '#eab308',     // yellow-500
  'Roxo': '#a855f7'         // purple-500
};

export default function PropertyCard({ 
  group, 
  name, 
  rent, 
  rent1House, 
  rent2Houses, 
  rent3Houses, 
  rent4Houses, 
  rentHotel, 
  houseCost, 
  hotelCost, 
  mortgageValue,
  totalValue,
  owner // { name, avatar, color }
}) {
  const headerColor = colorMap[group] || '#475569'; // default slate-600

  return (
    <div className="w-[280px] bg-[#f8fafc] border-2 border-slate-300 rounded-xl overflow-hidden shadow-lg font-sans flex flex-col relative text-slate-800 shrink-0">
      {/* Header */}
      <div 
        className="h-20 flex items-center justify-center border-b-2 border-slate-300 relative px-4"
        style={{ backgroundColor: headerColor }}
      >
        <h2 className="text-white text-2xl font-bold font-headline text-center tracking-wider drop-shadow-md leading-tight">
          {name}
        </h2>
        {owner && (
          <div className="absolute -top-3 -right-3 bg-surface border-2 border-outline-variant rounded-full p-1 shadow-md flex items-center justify-center transform rotate-12 z-10" title={`Propriedade de ${owner.name}`}>
            <PinDisplay avatar={owner.avatar} color={owner.color} size={32} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]">
        
        {/* Aluguel Base */}
        <div className="text-center mb-4 w-full">
          <p className="text-lg font-semibold flex justify-between w-full px-2">
            <span>Aluguel</span>
            <span>$ {rent}</span>
          </p>
        </div>

        {/* Casas / Hotel */}
        <div className="w-full space-y-1 mb-6 text-sm">
          <div className="flex justify-between px-2">
            <span>1 casa</span>
            <span className="font-medium">$ {rent1House}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>2 casas</span>
            <span className="font-medium">$ {rent2Houses}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>3 casas</span>
            <span className="font-medium">$ {rent3Houses}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>4 casas</span>
            <span className="font-medium">$ {rent4Houses}</span>
          </div>
          <div className="flex justify-between px-2 mt-2 pt-1 border-t border-slate-300/50">
            <span className="font-semibold">Hotel</span>
            <span className="font-semibold">$ {rentHotel}</span>
          </div>
        </div>

        {/* Informações de Compra e Hipoteca */}
        <div className="w-full space-y-1 text-sm text-slate-600 mt-auto pt-4 border-t-2 border-slate-200">
          <div className="flex justify-between px-2">
            <span>Comprar Casa</span>
            <span className="font-medium">$ {houseCost}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>Comprar Hotel</span>
            <span className="font-medium">$ {hotelCost || houseCost}</span>
          </div>
          <div className="flex justify-between px-2">
            <span>Valor Hipoteca</span>
            <span className="font-medium">$ {mortgageValue}</span>
          </div>
          {totalValue && (
            <div className="flex justify-between px-2 pt-2 mt-2 border-t border-slate-300/50">
              <span className="font-bold text-slate-800">Valor do Terreno</span>
              <span className="font-bold text-slate-800">$ {totalValue}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
