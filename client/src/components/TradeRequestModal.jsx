import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { ArrowRightLeft } from 'lucide-react';

export default function TradeRequestModal() {
  const { tradeRequests, respondTrade, addToast } = useGame();
  const [responding, setResponding] = useState(false);

  if (!tradeRequests || tradeRequests.length === 0) return null;

  const request = tradeRequests[0];

  const handleRespond = async (accept) => {
    if (responding) return;
    setResponding(true);
    try {
      await respondTrade(request.id, accept);
      if (accept) addToast(`Negociação com ${request.initiatorName} iniciada.`, 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setResponding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        className="max-h-[92dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-t-3xl border border-outline-variant bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRightLeft size={32} />
        </div>
        
        <h2 className="text-xl font-headline font-bold text-on-surface mb-2">Pedido de Negociação</h2>
        <p className="text-on-surface-variant text-sm mb-6">
          <span className="font-bold text-primary">{request.initiatorName}</span> quer iniciar uma negociação com você.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => handleRespond(true)}
            disabled={responding}
            className="w-full btn-primary bg-primary text-on-primary py-3 rounded-xl font-bold transition-transform active:scale-95 disabled:opacity-50"
          >
            Aceitar Negociação
          </button>
          <button 
            onClick={() => handleRespond(false)}
            disabled={responding}
            className="w-full bg-error/10 text-error hover:bg-error/20 py-3 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      </div>
    </div>
  );
}
