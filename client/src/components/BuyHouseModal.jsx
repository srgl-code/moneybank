import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Home, Plus, Minus, ArrowRight, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

const colorMap = {
  'Verde': '#22c55e',
  'Vermelho': '#ef4444',
  'Rosa': '#ec4899',
  'Azul Escuro': '#1d4ed8',
  'Azul Claro': '#60a5fa',
  'Laranja': '#f97316',
  'Amarelo': '#eab308',
  'Roxo': '#a855f7',
  'Ações': '#64748b'
};

const fmt = (n) => `M$ ${Number(n || 0).toLocaleString('pt-BR')}`;

export default function BuyHouseModal({ property, currentHouses = 0, playerBalance = 0, onConfirm, onClose }) {
  const current = Math.min(5, Math.max(0, currentHouses));
  const maxCanAdd = Math.max(0, 5 - current);

  const [quantity, setQuantity] = useState(maxCanAdd > 0 ? 1 : 0);
  const [submitting, setSubmitting] = useState(false);

  if (!property || maxCanAdd <= 0) return null;

  const houseCost = property.houseCost || 0;
  const hotelCost = property.hotelCost || property.houseCost || 0;

  // Calculate total cost for the selected quantity
  let totalCost = 0;
  for (let i = 1; i <= quantity; i++) {
    const level = current + i;
    if (level === 5) {
      totalCost += hotelCost;
    } else {
      totalCost += houseCost;
    }
  }

  const newTotalHouses = current + quantity;
  const isTargetHotel = newTotalHouses === 5;
  const hasSufficientBalance = playerBalance >= totalCost;
  const headerColor = colorMap[property.group] || '#475569';

  const handleIncrement = () => {
    if (quantity < maxCanAdd) {
      setQuantity(q => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  const handleSubmit = async () => {
    if (quantity <= 0 || !hasSufficientBalance || submitting) return;
    try {
      setSubmitting(true);
      await onConfirm(property, quantity, totalCost);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-lg bg-surface rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col"
      >
        {/* Header with Property Identity */}
        <div
          className="p-5 text-white relative flex flex-col justify-end shadow-md"
          style={{ backgroundColor: headerColor }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1 opacity-90 text-xs font-bold uppercase tracking-wider">
            <span>Grupo {property.group}</span>
            <span>•</span>
            <span>Construção de Imóveis</span>
          </div>
          <h2 className="text-2xl font-black font-headline tracking-wide drop-shadow-sm">
            {property.name}
          </h2>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh] hide-scrollbar">

          {/* Status Atual & Prévia de Evolução */}
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/40 space-y-3">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block">
              Evolução da Propriedade
            </span>

            <div className="grid grid-cols-2 gap-3 items-center">
              {/* Nível Atual */}
              <div className="bg-surface p-3 rounded-xl border border-outline-variant/30 text-center">
                <span className="text-[11px] font-semibold text-on-surface-variant block mb-1">Nível Atual</span>
                <div className="flex items-center justify-center gap-1 min-h-[28px]">
                  {current === 0 && <span className="text-xs text-on-surface-variant italic">Sem casas</span>}
                  {current > 0 && current < 5 && Array.from({ length: current }).map((_, i) => (
                    <span key={i} className="text-lg" title="Casa">🏠</span>
                  ))}
                  {current === 5 && <span className="text-2xl" title="Hotel">🏨</span>}
                </div>
                <span className="text-xs font-bold text-on-surface mt-1 block">
                  {current === 5 ? 'Hotel' : `${current} casa(s)`}
                </span>
              </div>

              {/* Novo Nível */}
              <div className="bg-primary/5 p-3 rounded-xl border-2 border-primary/40 text-center relative overflow-hidden">
                <div className="absolute top-1 right-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-primary block mb-1">Após Construção</span>
                <div className="flex items-center justify-center gap-1 min-h-[28px]">
                  {newTotalHouses > 0 && newTotalHouses < 5 && Array.from({ length: newTotalHouses }).map((_, i) => (
                    <span key={i} className="text-lg animate-pulse" title="Casa">🏠</span>
                  ))}
                  {newTotalHouses === 5 && <span className="text-2xl" title="Hotel">🏨</span>}
                </div>
                <span className="text-xs font-black text-primary mt-1 block">
                  {newTotalHouses === 5 ? '🏨 Hotel Concluído' : `${newTotalHouses} casa(s)`}
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Quantidade */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-on-surface font-headline">
                Quantas casas deseja construir?
              </label>
              <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                Máx. disponível: +{maxCanAdd}
              </span>
            </div>

            <div className="flex items-center justify-center gap-4 bg-surface-container-high/40 p-4 rounded-2xl border border-outline-variant/30">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={quantity <= 1 || submitting}
                className="w-12 h-12 rounded-xl bg-surface border border-outline-variant/60 hover:bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center justify-center min-w-[120px]">
                <span className="font-mono text-3xl font-black text-primary tracking-tight">
                  +{quantity}
                </span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  {quantity === 1 ? 'Construção' : 'Construções'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxCanAdd || submitting}
                className="w-12 h-12 rounded-xl bg-surface border border-outline-variant/60 hover:bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick buttons */}
            {maxCanAdd > 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {[1, 2, 3, 4, 5].filter(q => q <= maxCanAdd).map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      quantity === q
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                    }`}
                  >
                    {current + q === 5 ? '🏨 Até Hotel' : `+${q} ${q === 1 ? 'Casa' : 'Casas'}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de Preços e Saldo */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 space-y-2 text-sm">
            <div className="flex justify-between items-center text-on-surface-variant text-xs">
              <span>Custo por Casa:</span>
              <span className="font-mono font-semibold">{fmt(houseCost)}</span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant text-xs">
              <span>Custo para Hotel:</span>
              <span className="font-mono font-semibold">{fmt(hotelCost)}</span>
            </div>

            <div className="border-t border-outline-variant/30 pt-2 flex justify-between items-center font-bold">
              <span className="text-on-surface">Custo Total da Obra:</span>
              <span className="font-mono text-lg text-primary">{fmt(totalCost)}</span>
            </div>

            <div className="border-t border-outline-variant/30 pt-2 flex justify-between items-center text-xs">
              <span className="text-on-surface-variant">Seu Saldo Atual:</span>
              <span className="font-mono font-bold text-on-surface">{fmt(playerBalance)}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant">Saldo após Aprovação:</span>
              <span className={`font-mono font-bold ${hasSufficientBalance ? 'text-green-600' : 'text-red-500'}`}>
                {fmt(playerBalance - totalCost)}
              </span>
            </div>
          </div>

          {/* Alerta de saldo insuficiente */}
          {!hasSufficientBalance && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Saldo insuficiente! Faltam {fmt(totalCost - playerBalance)} para concluir este pedido.</span>
            </div>
          )}

          {/* Informação sobre aprovação bancária */}
          <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-xs text-on-surface-variant flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Ao enviar, o valor de <strong>{fmt(totalCost)}</strong> ficará pendente de aprovação com o <strong>Banqueiro</strong>. O débito e as casas só são aplicados após a aprovação.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3.5 rounded-xl border border-outline-variant/60 font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasSufficientBalance || quantity <= 0 || submitting}
              className="flex-[2] py-3.5 rounded-xl bg-primary text-on-primary font-black text-sm uppercase tracking-wide shadow-md hover:bg-primary/95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              {submitting ? 'Enviando ao Banco...' : `Enviar ao Banco (${fmt(totalCost)})`}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
