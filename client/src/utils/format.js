/**
 * Shared formatting utilities — single source of truth for M$ formatting.
 * Previously duplicated in 6+ component files.
 */

export const fmt = (n) => `M$ ${Number(n).toLocaleString('pt-BR')}`;

export const fmtCompact = (n) => {
  const num = Number(n);
  if (num >= 1_000_000) return `M$ ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `M$ ${(num / 1_000).toFixed(0)}k`;
  return fmt(num);
};

export const timeAgo = (iso) => {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins} min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  } catch {
    return '';
  }
};

export const timeShort = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};
