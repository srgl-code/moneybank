import React from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import Home from './components/Home.jsx';
import BankerDashboard from './components/BankerDashboard.jsx';
import PlayerDashboard from './components/PlayerDashboard.jsx';
import Toast from './components/Toast.jsx';

function AppContent() {
  const { screen } = useGame();

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body antialiased">
      <Toast />
      {screen === 'home' && <Home />}
      {screen === 'banker' && <BankerDashboard />}
      {screen === 'player' && <PlayerDashboard />}
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
