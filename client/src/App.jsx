import React, { lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GameProvider, useGame } from './context/GameContext.jsx';
import Toast from './components/Toast.jsx';

const Home = lazy(() => import('./components/Home.jsx'));
const BankerDashboard = lazy(() => import('./components/BankerDashboard.jsx'));
const PlayerDashboard = lazy(() => import('./components/PlayerDashboard.jsx'));

function AppContent() {
  const { screen } = useGame();

  return (
    <div className="min-h-screen bg-surface">
      <Toast />
      <Suspense fallback={<div className="min-h-screen bg-surface" />}>
        <AnimatePresence mode="wait">
          {screen === 'home' && <Home key="home" />}
          {screen === 'banker' && <BankerDashboard key="banker" />}
          {screen === 'player' && <PlayerDashboard key="player" />}
        </AnimatePresence>
      </Suspense>
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
