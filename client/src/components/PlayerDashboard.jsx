import React, { lazy, Suspense, useState } from 'react';
import { LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext.jsx';
import RankingList from './RankingList.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import TransferModal from './TransferModal.jsx';
import BuyPropertyModal from './BuyPropertyModal.jsx';
import AppHeader from './ui/AppHeader.jsx';
import BottomNav from './ui/BottomNav.jsx';
import AnimatedBalance from './ui/AnimatedBalance.jsx';
import PageTransition from './ui/PageTransition.jsx';
import { PinDisplay } from './PinIcon.jsx';
import { MiniChart } from './features/MiniChart.jsx';
import { PropertyTracker } from './features/PropertyTracker.jsx';
import PlayerPropertiesTab from './features/PlayerPropertiesTab.jsx';
import BuyHouseModal from './BuyHouseModal.jsx';
import { NotificationCenter } from './features/NotificationCenter.jsx';
import { QuickActionButton } from './ui/QuickActionButton.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import TradeRequestModal from './TradeRequestModal.jsx';
import { timeAgo } from '../utils/format.js';

const TradePanel = lazy(() => import('./TradePanel.jsx'));

export default function PlayerDashboard() {
  const { gameState, currentPlayer, activeTrade, leaveRoom, collectFine, requestTransfer, addToast } = useGame();
  const [tab, setTab] = useState('ledger');
  const [openTransfer, setOpenTransfer] = useState(false);
  const [openBuy, setOpenBuy] = useState(false);
  const [selectedPropForHouse, setSelectedPropForHouse] = useState(null);

  const all = gameState?.players ?? [];
  const bal = currentPlayer?.balance ?? 0;
  const pendingHouseRequests = (gameState?.pendingTransfers ?? []).filter((request) =>
    request.fromId === currentPlayer?.id && request.metadata?.type === 'buy_house'
  );
  const human = all.filter((p) => !p.isBanker);
  
  // Extract sparkline data
  const historyData = currentPlayer?.balanceHistory?.map(h => h.balance) || [];
  const sparklineData = historyData.length > 0 ? historyData : [bal, bal];

  const handleTabChange = (t) => setTab(t);

  const notifications = [
    // Mock notifications based on history for now, or just empty if not fully implemented in state
  ];

  const handleBuyProperty = async (property) => {
    const banker = all.find(p => p.isBanker);
    if (!banker) {
      addToast('Bancário não encontrado!', 'error');
      return;
    }
    try {
      await requestTransfer(banker.id, property.totalValue, `Comprar: ${property.name}`, { propertyId: property.name });
      addToast(`Solicitação para comprar ${property.name} enviada ao bancário!`, 'success');
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleRequestHousePurchase = async (property, quantity, totalCost) => {
    const banker = all.find(p => p.isBanker);
    if (!banker) {
      addToast('Bancário não encontrado na sala!', 'error');
      return;
    }
    const currentHouses = currentPlayer?.houses?.[property.name] || 0;
    const targetHouses = currentHouses + quantity;
    const isHotel = targetHouses === 5;
    const houseLabel = isHotel
      ? (currentHouses === 4 ? '1 Hotel' : `${quantity - 1} casa(s) e 1 Hotel`)
      : `${quantity} casa(s)`;

    try {
      await requestTransfer(
        banker.id,
        totalCost,
        `Construir ${houseLabel} em ${property.name}`,
        {
          type: 'buy_house',
          propertyId: property.name,
          propertyName: property.name,
          housesToAdd: quantity,
          currentHouses,
          targetHouses
        }
      );
      addToast(`⏳ Pedido para construir ${houseLabel} enviado ao Banco!`, 'info');
    } catch (e) {
      addToast(e.message, 'error');
      throw e;
    }
  };

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
              label="Comprar Terreno"
              onClick={() => setOpenBuy(true)} 
              color="orange" 
              className="flex-1"
            />
          </motion.section>

          {/* Quick Properties shortcut bar when not in properties tab */}
          {tab !== 'properties' && (
            <motion.div
              onClick={() => setTab('properties')}
              whileTap={{ scale: 0.99 }}
              className="card p-3 px-4 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-all border border-primary/20 bg-primary/5 text-xs shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🏡</span>
                <span className="font-bold text-on-surface">Minhas Propriedades:</span>
                <span className="text-primary font-bold">
                  {currentPlayer?.properties?.length || 0} terrenos possuídos
                </span>
              </div>
              <span className="text-primary font-bold flex items-center gap-1">
                Ver e Construir Casas →
              </span>
            </motion.div>
          )}
        </div>

        {/* Dedicated 3-Tab Content Area */}
        <motion.section
          className="card p-4 sm:p-6 flex flex-col min-h-[500px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mb-6">
            <SegmentedControl 
              options={[
                { value: 'ledger', label: 'Extrato' },
                { value: 'properties', label: `Minhas Propriedades (${currentPlayer?.properties?.length || 0})` },
                { value: 'ranking', label: 'Ranking' }
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
              {tab === 'properties' && (
                <motion.div key="properties" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PlayerPropertiesTab
                    properties={currentPlayer?.properties || []}
                    houses={currentPlayer?.houses || {}}
                    pendingHouseRequests={pendingHouseRequests}
                    onBuyPropertyClick={() => setOpenBuy(true)}
                    onSelectPropertyForHouse={(prop) => setSelectedPropForHouse(prop)}
                  />
                </motion.div>
              )}
              {tab === 'ranking' && (
                <motion.div key="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RankingList players={all} myId={currentPlayer?.id} />
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

      <AnimatePresence>
        {openBuy && (
          <BuyPropertyModal
            onClose={() => setOpenBuy(false)}
            onBuyProperty={handleBuyProperty}
            ownedProperties={all.flatMap(p => p.properties || [])}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPropForHouse && (
          <BuyHouseModal
            property={selectedPropForHouse}
            currentHouses={currentPlayer?.houses?.[selectedPropForHouse.name] || 0}
            playerBalance={currentPlayer?.balance || 0}
            onConfirm={handleRequestHousePurchase}
            onClose={() => setSelectedPropForHouse(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTrade && (
          <Suspense fallback={null}>
            <TradePanel />
          </Suspense>
        )}
      </AnimatePresence>

      <TradeRequestModal />
    </PageTransition>
  );
}
