import React from 'react';
import { fmtCompact } from '../../utils/format';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export const GameAnalytics = ({ players = [] }) => {
  const totalWealth = players.reduce((acc, p) => acc + (p.isBanker ? 0 : p.balance), 0);
  
  const colors = ['#14b8a6', '#f97316', '#fbbf24', '#f43f5e', '#a855f7', '#3b82f6', '#ec4899', '#84cc16'];
  
  let currentAngle = 0;
  const segments = players.filter(p => !p.isBanker).map((p, i) => {
    if (totalWealth === 0) return null;
    const percent = p.balance / totalWealth;
    const angle = percent * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    if (percent === 1) {
      return (
        <circle key={p.id} cx="50" cy="50" r="40" fill="transparent" stroke={colors[i % colors.length]} strokeWidth="16" />
      );
    }

    const start = polarToCartesian(50, 50, 40, endAngle);
    const end = polarToCartesian(50, 50, 40, startAngle);
    const largeArcFlag = angle <= 180 ? "0" : "1";

    const d = [
      "M", start.x, start.y,
      "A", 40, 40, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    return (
      <path key={p.id} d={d} fill="transparent" stroke={colors[i % colors.length]} strokeWidth="16" />
    );
  });

  return (
    <div className="card p-5 sm:p-6 shadow-sm relative overflow-hidden text-left">
      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Distribuição de Riqueza</p>
      <div className="flex flex-col sm:flex-row gap-8 items-center justify-center sm:justify-start pl-0 sm:pl-8">
        <div className="w-32 h-32 relative shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm -rotate-90">
            {segments}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="font-bold text-sm text-on-surface-variant">{players.filter(p => !p.isBanker).length}p</span>
          </div>
        </div>
        <div className="flex flex-col justify-center">
          {players.filter(p => !p.isBanker).map((p, i) => {
            const percent = totalWealth > 0 ? Math.round((p.balance / totalWealth) * 100) : 0;
            return (
              <div key={p.id} className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                <span className="text-xs font-bold text-on-surface-variant"><span className="text-on-surface">{p.name}</span> {percent}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
