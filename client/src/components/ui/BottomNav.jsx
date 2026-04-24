import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Trophy, Shield } from 'lucide-react';

const tabs = [
  { id: 'ledger',  Icon: Wallet,  label: 'Ledger'  },
  { id: 'ranking', Icon: Trophy,  label: 'Ranking' },
  { id: 'banker',  Icon: Shield,  label: 'Banker'  },
];

export default function BottomNav({ activeTab, onTabChange, showBanker = false }) {
  const visibleTabs = showBanker ? tabs : tabs.filter(t => t.id !== 'banker');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 rounded-t-4xl border-t border-outline-variant/15 shadow-nav glass">
      <div className="flex justify-around items-end px-4 pb-6 pt-4">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const { Icon } = tab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={`
                relative flex flex-col items-center justify-center transition-all duration-300
                ${isActive ? '' : 'text-on-surface opacity-40 p-2 hover:opacity-100'}
              `}
            >
              {isActive ? (
                <motion.div
                  layoutId="bottomNavPill"
                  className="flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary-container text-white rounded-full p-3 mb-2 shadow-lg"
                  style={{ width: 72, height: 72, transform: 'scale(1.1)' }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <Icon className="w-7 h-7 mb-1" />
                  <span className="font-label text-[9px] font-bold uppercase tracking-widest mt-0.5">
                    {tab.label}
                  </span>
                </motion.div>
              ) : (
                <>
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="font-label text-[10px] font-bold uppercase tracking-widest">
                    {tab.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
