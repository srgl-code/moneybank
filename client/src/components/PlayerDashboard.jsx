import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import RankingList from './RankingList.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import TransferModal from './TransferModal.jsx';
import AppHeader from './ui/AppHeader.jsx';
import BottomNav from './ui/BottomNav.jsx';
import AnimatedBalance from './ui/AnimatedBalance.jsx';
import PageTransition from './ui/PageTransition.jsx';
import { PinDisplay } from './PinIcon.jsx';
import { MiniChart } from './features/MiniChart.jsx';
import { PropertyTracker } from './features/PropertyTracker.jsx';
import { NotificationCenter } from './features/NotificationCenter.jsx';
import { QuickActionButton } from './ui/QuickActionButton.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import { timeAgo } from '../utils/format.js';

export default function PlayerDashboard() {
  const { gameState, currentPlayer, leaveRoom, collectFine } = useGame();
  const [tab, setTab] = useState('ledger');
  const [openTransfer, setOpenTransfer] = useState(false);

  const all = gameState?.players ?? [];
  const bal = currentPlayer?.balance ?? 0;
  const human = all.filter((p) => !p.isBanker);
  
  // Extract sparkline data
  const historyData = currentPlayer?.balanceHistory?.map(h => h.balance) || [];
  const sparklineData = historyData.length > 0 ? historyData : [bal, bal];

  const handleTabChange = (t) => setTab(t);

  const notifications = [
    // Mock notifications based on history for now, or just empty if not fully implemented in state
  ];

  return (
    <PageTransition className="min-h-screen bg-surface flex flex-col pb-32 md:pb-0">
      <AppHeader
        rightContent={
          <div className="flex items-center gap-2">
            <NotificationCenter notifications={notifications} />
            <button
              onClick={leaveRoom}
              title="Sair da sala"
              className="text-on-surface-variant hover:bg-error/10 hover:text-error p-2 rounded-full transition-all active:scale-95"
              aria-label="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <main id="main-content" className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Section: Balance & Actions */}
        <div className="grid grid-cols-1 gap-6">
          {/* Balance Card with Sparkline */}
          <motion.section
            className="card bg-gradient-to-br from-white to-surface-container p-6 md:p-8 relative overflow-hidden shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className="mb-2">
                <h2 className="font-label text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                  Saldo Atual
                </h2>
                <AnimatedBalance value={bal} size="lg" className="text-on-surface" />
              </div>

              <div className="mt-4 w-full px-4 md:px-12">
                <MiniChart data={sparklineData} color="#14b8a6" height={40} />
              </div>
            </div>
          </motion.section>

          {/* Quick Actions */}
          <motion.section
            className="flex flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <QuickActionButton 
              icon="💸" 
              label="Transferir" 
              onClick={() => setOpenTransfer(true)} 
              color="teal" 
              className="flex-1"
            />
            <QuickActionButton 
              icon="🏡" 
              label="Propriedades" 
              onClick={() => document.getElementById('property-tracker')?.scrollIntoView({ behavior: 'smooth' })} 
              color="orange" 
              className="flex-1"
            />
          </motion.section>
        </div>

        {/* Properties Tracker */}
        <motion.section
          id="property-tracker"
          className="card p-6 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-between items-end mb-4">
            <h3 className="font-headline font-bold text-lg text-on-surface">Minhas Propriedades</h3>
            <span className="text-xs font-label text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
              {currentPlayer?.properties?.length || 0} posses
            </span>
          </div>
          <PropertyTracker properties={currentPlayer?.properties || []} />
        </motion.section>

        {/* 3-Tab Content Area */}
        <motion.section
          className="card p-6 h-[400px] flex flex-col"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="mb-4">
            <SegmentedControl 
              options={[
                { value: 'ledger', label: 'Extrato' },
                { value: 'ranking', label: 'Ranking' },
                { value: 'alerts', label: 'Alertas' }
              ]} 
              value={tab} 
              onChange={setTab} 
            />
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            <AnimatePresence mode="wait">
              {tab === 'ledger' && (
                <motion.div key="ledger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TransactionHistory
                    history={gameState?.history ?? []}
                    myId={currentPlayer?.id}
                    myName={currentPlayer?.name}
                  />
                </motion.div>
              )}
              {tab === 'ranking' && (
                <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RankingList players={all} myId={currentPlayer?.id} />
                </motion.div>
              )}
              {tab === 'alerts' && (
                <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-60">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-sm font-label">Nenhum alerta recente.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

      </main>

      <BottomNav activeTab={tab} onTabChange={handleTabChange} />

      {openTransfer && (
        <TransferModal
          onClose={() => setOpenTransfer(false)}
          players={all}
          currentPlayer={currentPlayer}
        />
      )}
    </PageTransition>
  );
}
