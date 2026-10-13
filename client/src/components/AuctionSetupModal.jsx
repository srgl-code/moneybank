import React, { useMemo, useState } from 'react';
import { ArrowRight, Loader2, Play, Users, X } from 'lucide-react';
import { propertiesData } from '../data/properties.js';
import { PinDisplay } from './PinIcon.jsx';

const fmt = (value) => `M$ ${Number(value || 0).toLocaleString('pt-BR')}`;

export default function AuctionSetupModal({ players, ownedProperties = [], onStart, onClose }) {
  const [propertyId, setPropertyId] = useState('');
  const [participantIds, setParticipantIds] = useState([]);
  const [firstPlayerId, setFirstPlayerId] = useState('');
  const [startingBid, setStartingBid] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const availableProperties = useMemo(
    () => propertiesData.filter((property) => !ownedProperties.includes(property.name)),
    [ownedProperties]
  );
  const connectedPlayers = players.filter((player) => player.connected !== false);
  const participants = connectedPlayers.filter((player) => participantIds.includes(player.id));

  const toggleParticipant = (playerId) => {
    setParticipantIds((current) => {
      const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
      if (!next.includes(firstPlayerId)) setFirstPlayerId(next[0] || '');
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!propertyId) return setError('Escolha a propriedade que será leiloada.');
    if (participantIds.length === 0) return setError('Selecione ao menos um participante.');
    if (!participantIds.includes(firstPlayerId)) return setError('Escolha quem dará o primeiro lance.');
    const parsedBid = Number(startingBid);
    if (!Number.isSafeInteger(parsedBid) || parsedBid < 0) return setError('O lance inicial deve ser um valor válido.');

    setBusy(true);
    try {
      await onStart({ propertyId, participantIds, firstPlayerId, startingBid: parsedBid });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <form onSubmit={submit} className="flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-outline-variant/50 bg-surface shadow-2xl sm:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3 sm:px-6 sm:py-4">
          <div><p className="text-[10px] font-black uppercase tracking-wider text-primary">Banco · leilão</p><h2 className="font-headline text-lg font-black text-on-surface sm:text-xl">Preparar leilão</h2></div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant"><X className="size-5" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <label className="block space-y-2">
            <span className="text-xs font-bold text-on-surface">Propriedade</span>
            <select value={propertyId} onChange={(event) => setPropertyId(event.target.value)} className="field h-12 w-full">
              <option value="">Selecione um terreno sem dono</option>
              {availableProperties.map((property) => <option key={property.name} value={property.name}>{property.name} · {property.group} · {fmt(property.totalValue)}</option>)}
            </select>
          </label>

          <section className="space-y-2">
            <div className="flex items-center gap-2"><Users className="size-4 text-primary" /><h3 className="text-xs font-bold text-on-surface">Participantes ({participantIds.length})</h3></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {connectedPlayers.map((player) => {
                const selected = participantIds.includes(player.id);
                return (
                  <button key={player.id} type="button" onClick={() => toggleParticipant(player.id)} aria-pressed={selected} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-outline-variant/60 bg-surface'}`}>
                    <PinDisplay avatar={player.avatar} color={player.color} photo={player.photo} size={32} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-on-surface">{player.name}</span><span className="block text-xs text-on-surface-variant">Saldo {fmt(player.balance)}</span></span>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md border text-xs ${selected ? 'border-primary bg-primary text-white' : 'border-outline-variant text-transparent'}`}>✓</span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-2"><span className="text-xs font-bold text-on-surface">Primeiro a dar lance</span>
              <select value={firstPlayerId} onChange={(event) => setFirstPlayerId(event.target.value)} disabled={!participants.length} className="field h-12 w-full">
                <option value="">Selecione um participante</option>{participants.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </label>
            <label className="block space-y-2"><span className="text-xs font-bold text-on-surface">Lance inicial</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={startingBid} onChange={(event) => setStartingBid(event.target.value)} className="field h-12 w-full font-mono" />
            </label>
          </div>
          {error && <p role="alert" className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm font-semibold text-error">{error}</p>}
        </div>

        <footer className="shrink-0 border-t border-outline-variant/40 bg-surface p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
          <button type="submit" disabled={busy || !availableProperties.length} className="btn-primary min-h-12">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />}{busy ? 'Iniciando…' : 'Iniciar leilão'}<ArrowRight className="size-4" />
          </button>
          {!availableProperties.length && <p className="mt-2 text-center text-xs text-on-surface-variant">Todos os terrenos já possuem proprietário.</p>}
        </footer>
      </form>
    </div>
  );
}
