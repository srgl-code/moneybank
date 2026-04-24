import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameProvider, useGame } from './context/GameContext.jsx';
import Home from './components/Home.jsx';
import BankerDashboard from './components/BankerDashboard.jsx';
import PlayerDashboard from './components/PlayerDashboard.jsx';
import Toast from './components/Toast.jsx';

function AppContent() {
  const { screen } = useGame();

  return (
    <div className="min-h-screen bg-surface">
      <Toast />
      <AnimatePresence mode="wait">
        {screen === 'home' && <Home key="home" />}
        {screen === 'banker' && <BankerDashboard key="banker" />}
        {screen === 'player' && <PlayerDashboard key="player" />}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
