import React from 'react';

export const QuickActionButton = ({ icon, label, onClick, color = 'teal', disabled = false, className = '' }) => {
  const colorMap = {
    teal: 'text-primary hover:bg-primary/10 hover:border-primary/30',
    orange: 'text-secondary hover:bg-secondary/10 hover:border-secondary/30',
    gold: 'text-tertiary hover:bg-tertiary/10 hover:border-tertiary/30',
    coral: 'text-error hover:bg-error/10 hover:border-error/30',
    slate: 'text-on-surface-variant hover:bg-surface-container-high hover:border-outline'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-2xl border border-outline-variant/30 bg-surface-container transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${colorMap[color]} ${className}`}
    >
      <div className="text-2xl sm:text-3xl">
        {icon}
      </div>
      <span className="text-xs font-label font-bold text-on-surface group-hover:text-inherit text-center">
        {label}
      </span>
    </button>
  );
};
