import React from 'react';

export const PropertyCard = ({ id, color = '#3b82f6', name, price }) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface flex flex-col h-20 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group text-left">
      <div className="mx-3 mt-3 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="px-3 pb-3 pt-1 flex-1 flex flex-col justify-center">
        <span className="text-[12px] font-bold text-on-surface line-clamp-1 leading-tight">{name || `Propriedade ${id}`}</span>
        {price && <span className="text-[11px] text-on-surface-variant font-medium mt-0.5">M$ {price}</span>}
      </div>
    </div>
  );
};
