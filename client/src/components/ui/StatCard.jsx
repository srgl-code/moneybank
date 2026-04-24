import React from 'react';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';

export const StatCard = ({ icon, label, value, isCurrency = false, color = 'teal', className = '' }) => {
  const { displayValue, direction } = useAnimatedNumber(value);

  const colorClasses = {
    teal: 'text-primary',
    orange: 'text-secondary',
    gold: 'text-tertiary',
    coral: 'text-error',
    slate: 'text-on-surface-variant'
  };

  const glowClasses = {
    teal: 'glow-card-teal',
    orange: 'glow-card-orange',
    gold: 'glow-card-gold',
    coral: '',
    slate: ''
  };

  const valColor = direction === 'up' ? 'text-success' : direction === 'down' ? 'text-error' : 'text-on-surface';

  const formatted = isCurrency 
    ? `M$ ${Number(displayValue).toLocaleString('pt-BR')}`
    : Number(displayValue).toLocaleString('pt-BR');

  return (
    <div className={`card p-4 flex flex-col items-center justify-center gap-2 text-center shadow-sm ${className}`}>
      <div className="text-2xl">
        {icon}
      </div>
      <div className="flex flex-col items-center">
        <p className={`text-xl sm:text-2xl font-headline font-bold balance-text transition-colors duration-300 ${valColor}`}>
          {formatted}
        </p>
        <p className="text-[10px] sm:text-xs font-label text-on-surface-variant font-semibold tracking-wide uppercase">{label}</p>
      </div>
    </div>
  );
};
