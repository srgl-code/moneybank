import React from 'react';
import { ArrowLeftRight, Building2, CircleEllipsis, Home as HomeIcon, ScrollText, Shield, Trophy, Wallet, ClipboardCheck, CreditCard } from 'lucide-react';

const playerTabs = [
  { id: 'home', Icon: HomeIcon, label: 'Início' },
  { id: 'properties', Icon: Building2, label: 'Imóveis' },
  { id: 'ledger', Icon: Wallet, label: 'Extrato' },
  { id: 'trade', Icon: ArrowLeftRight, label: 'Negociar' },
  { id: 'more', Icon: CircleEllipsis, label: 'Mais' },
];

const bankerTabs = [
  { id: 'ranking', Icon: Trophy, label: 'Ranking' },
  { id: 'approvals', Icon: ClipboardCheck, label: 'Pedidos' },
  { id: 'properties', Icon: Building2, label: 'Imóveis' },
  { id: 'history', Icon: ScrollText, label: 'Extrato' },
  { id: 'machine', Icon: CreditCard, label: 'Banco' },
];

export default function BottomNav({ activeTab, onTabChange, showBanker = false }) {
  const visibleTabs = showBanker ? bankerTabs : playerTabs;

  return (
    <nav aria-label="Navegação principal" className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/60 bg-surface/95 shadow-nav backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-stretch px-1 pt-1.5">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              type="button"
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`min-w-0 min-h-14 flex flex-col items-center justify-center gap-0.5 px-0.5 pb-1 text-center transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              <span className={`flex items-center justify-center w-8 h-7 rounded-xl ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
              </span>
              <span className="font-label text-[9px] font-bold leading-tight truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
