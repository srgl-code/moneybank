import React from 'react';

export const MiniChart = ({ data = [], color = '#14b8a6', height = 40 }) => {
  if (!data || data.length < 2) {
    return <div className="w-full opacity-30 flex items-center justify-center text-xs font-label" style={{ height }}>Sem dados</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden relative" style={{ height }}>
      {/* Glow shadow below the line */}
      <svg viewBox="0 -10 100 120" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30 blur-sm pointer-events-none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
      {/* Actual crisp line */}
      <svg viewBox="0 -10 100 120" preserveAspectRatio="none" className="relative w-full h-full overflow-visible pointer-events-none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="animate-fade-up"
        />
      </svg>
    </div>
  );
};
