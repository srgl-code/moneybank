import React from 'react';
import { motion } from 'framer-motion';
import { Landmark, Settings } from 'lucide-react';

export default function AppHeader({ rightContent, onLogoClick }) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-outline-variant/15 shadow-header transition-all duration-300">
      <div className="flex items-center justify-between gap-2 w-full px-3 py-3 sm:px-6 sm:py-4 max-w-screen-xl mx-auto">
        <button
          onClick={onLogoClick}
          aria-label="Menu"
          className="shrink-0 text-primary hover:bg-primary/5 p-2 rounded-full transition-all duration-300 active:scale-95"
        >
          <Landmark className="w-6 h-6" />
        </button>

        <motion.h1
          className="min-w-0 flex-1 truncate text-center font-headline font-black text-lg sm:text-2xl text-primary uppercase tracking-tighter select-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <span className="sm:hidden">Prestige</span>
          <span className="hidden sm:inline">Prestige Ledger</span>
        </motion.h1>

        <div className="shrink-0">
        {rightContent || (
          <button
            aria-label="Settings"
            className="text-primary hover:bg-primary/5 p-2 rounded-full transition-all duration-300 active:scale-95"
          >
            <Settings className="w-6 h-6" />
          </button>
        )}
        </div>
      </div>
    </header>
  );
}
