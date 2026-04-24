import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LogIn, PlusCircle, History, AlertCircle, Settings2, Wallet, Flag, User } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { PIN_OPTIONS, PinSVG, CUSTOM_PIN_ID, PinDisplay } from './PinIcon.jsx';
import SegmentedControl from './ui/SegmentedControl.jsx';
import PageTransition from './ui/PageTransition.jsx';
import { GameModeSelector } from './features/GameModeSelector.jsx';
import { RecentRooms } from './features/RecentRooms.jsx';

const PRESETS = {
  classic: 1500,
  fast: 3000,
  custom: ''
};

const tabOptions = [
  {
    value: 'join',
    label: 'Entrar',
    icon: <LogIn className="w-4 h-4" />,
  },
  {
    value: 'create',
    label: 'Criar Sala',
    icon: <PlusCircle className="w-4 h-4" />,
  },
  {
    value: 'recent',
    label: 'Recentes',
    icon: <History className="w-4 h-4" />,
  },
];

export default function Home() {
  const { createRoom, joinRoom, isConnecting, connectionError } = useGame();
  const [mode, setMode] = useState('join');
  const [err, setErr] = useState('');
  const [bankerName, setBankerName] = useState('');
  const [startBal, setStartBal] = useState('1500');
  const [customBal, setCustomBal] = useState('');
  const [passGoAmt, setPassGoAmt] = useState('200');
  const [gameMode, setGameMode] = useState('classic');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState(PIN_OPTIONS[0].id);
  const [playerColor, setPlayerColor] = useState(PIN_OPTIONS[0].color);
  const [customColor, setCustomColor] = useState('#ef4444');

  const selectPin = (pin) => { setAvatar(pin.id); setPlayerColor(pin.color); };
  const isCustom = avatar === CUSTOM_PIN_ID;

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr('');
    const name = bankerName.trim();
    if (!name) return setErr('Insere o teu nome de bancário.');
    const bal = gameMode === 'custom' ? parseInt(customBal, 10) : PRESETS[gameMode];
    if (!bal || bal < 100 || bal > 10_000_000) return setErr('Saldo entre 100 e 10.000.000.');
    const go = parseInt(passGoAmt, 10) || 200;
    try { await createRoom(name, bal, go); } catch (e) { setErr(e.message); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setErr('');
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) return setErr('O código tem 6 caracteres.');
    const name = playerName.trim();
    if (!name) return setErr('Insere o teu nome.');
    const effectiveAvatar = isCustom ? CUSTOM_PIN_ID : avatar;
    const effectiveColor = isCustom ? customColor : playerColor;
    try { await joinRoom(code, name, effectiveAvatar, effectiveColor); } catch (e) { setErr(e.message); }
  };

  const handleRejoin = async (code, sessionId) => {
    setErr('');
    try { await joinRoom(code, '', '', '', sessionId); } catch (e) { setErr(e.message); }
  };

  const sw = (m) => { setMode(m); setErr(''); };
  const error = err || connectionError;

  return (
    <PageTransition>
      <main id="main-content" className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-surface">
        {/* Dot pattern background */}
        <div className="absolute inset-0 dot-pattern pointer-events-none" />
        {/* Soft gradient accents */}
        <div className="absolute -top-60 -left-40 w-[30rem] h-[30rem] rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(0,106,70,0.08), transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute -bottom-60 -right-32 w-[25rem] h-[25rem] rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(117,87,0,0.06), transparent 70%)', filter: 'blur(60px)' }} />

        <div className="relative w-full max-w-md z-10">
          {/* Logo */}
          <div className="text-center mb-10 select-none">
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 rounded-3xl text-4xl mb-4"
              style={{
                background: 'linear-gradient(145deg, rgba(0,133,90,0.08), rgba(117,87,0,0.06))',
                border: '1.5px solid rgba(0,133,90,0.12)',
                boxShadow: '0 20px 50px rgba(0,133,90,0.06)',
              }}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              🏦
            </motion.div>
            <h1 className="font-headline text-4xl font-black tracking-tighter text-primary leading-none">
              Prestige<span className="text-tertiary">Ledger</span>
            </h1>
            <p className="text-xs text-on-surface-variant mt-2 font-bold uppercase tracking-[0.15em]">
              Banco Imobiliário Digital
            </p>
          </div>

          {/* Segmented Tabs */}
          <div className="mb-6">
            <SegmentedControl options={tabOptions} value={mode} onChange={sw} />
          </div>

          {/* Card */}
          <motion.div
            className="card-elevated p-7"
            layout
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          >
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-error/10 border border-error/20 text-error backdrop-blur-md shadow-lg shadow-error/5"
                >
                  <div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold leading-tight flex-1">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {mode === 'create' ? (
                <motion.form
                  key="create"
                  onSubmit={handleCreate}
                  className="flex flex-col gap-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <section>
                    <label className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      <User className="w-3 h-3" />
                      Identificação
                    </label>
                    <input
                      type="text" value={bankerName}
                      onChange={(e) => setBankerName(e.target.value)}
                      placeholder="Teu nome (Bancário)" maxLength={20}
                      className="field glow-input h-14 text-base" autoComplete="off" autoFocus
                    />
                  </section>

                  <section className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/10">
                    <label className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      <Settings2 className="w-3 h-3" />
                      Regras da Partida
                    </label>

                    <div className="space-y-6">
                      <div>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight mb-2 ml-1">Modo de Jogo</p>
                         <GameModeSelector selected={gameMode} onSelect={setGameMode} />
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {gameMode === 'custom' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                            <label className="field-label flex items-center gap-2">
                              <Wallet className="w-3 h-3" /> Saldo Inicial
                            </label>
                            <input
                              type="number" value={customBal}
                              onChange={(e) => setCustomBal(e.target.value)}
                              placeholder="Ex: 1500" min="100" max="10000000"
                              className="field glow-input h-12 text-sm"
                            />
                          </motion.div>
                        )}

                        <div>
                          <label className="field-label flex items-center gap-2">
                            <Flag className="w-3 h-3" /> Valor da Largada
                          </label>
                          <input
                            type="number" value={passGoAmt}
                            onChange={(e) => setPassGoAmt(e.target.value)}
                            placeholder="Ex: 200" min="0" max="1000000"
                            className="field glow-input h-12 text-sm"
                          />
                          <p className="text-[9px] text-on-surface-variant/60 mt-1.5 pl-1 italic">Prémio ao passar pelo ponto de partida.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <button type="submit" disabled={isConnecting} className="btn-primary h-14 text-base shadow-lg shadow-primary/20">
                    {isConnecting ? (
                      <><Loader2 className="animate-spin w-5 h-5" /> A criar…</>
                    ) : (
                      <>🏦 Criar Sala de Jogo</>
                    )}
                  </button>
                </motion.form>
              ) : mode === 'join' ? (
                <motion.form
                  key="join"
                  onSubmit={handleJoin}
                  className="flex flex-col gap-5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div>
                    <label className="field-label">Código da Sala</label>
                    <div className="flex gap-2 justify-between">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <input
                          key={index}
                          id={`code-input-${index}`}
                          type="text"
                          maxLength={1}
                          value={roomCode[index] || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                            let newCode = roomCode.split('');
                            newCode[index] = val.slice(-1);
                            setRoomCode(newCode.join(''));
                            if (val && index < 5) {
                              document.getElementById(`code-input-${index + 1}`)?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace') {
                              if (!roomCode[index] && index > 0) {
                                document.getElementById(`code-input-${index - 1}`)?.focus();
                                let newCode = roomCode.split('');
                                newCode[index - 1] = '';
                                setRoomCode(newCode.join(''));
                              } else {
                                let newCode = roomCode.split('');
                                newCode[index] = '';
                                setRoomCode(newCode.join(''));
                              }
                            }
                          }}
                          className="w-12 h-14 bg-surface text-center font-headline font-black text-2xl border border-outline-variant rounded-lg shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                          autoComplete="off"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="field-label">Teu nome</label>
                    <input
                      type="text" value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Ex: Maria" maxLength={20}
                      className="field glow-input" autoComplete="off"
                    />
                  </div>

                  <div>
                    <label className="field-label">Escolhe o teu pino</label>
                    <div className="grid grid-cols-4 gap-3">
                      {PIN_OPTIONS.map((p) => {
                        const on = avatar === p.id;
                        return (
                          <motion.button
                            key={p.id} type="button"
                            onClick={() => selectPin(p)} title={p.label}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                              flex items-center justify-center py-2 rounded-2xl cursor-pointer transition-all relative bg-surface-container/30
                              ${on
                                ? 'border border-primary bg-primary/5 shadow-md shadow-primary/10'
                                : 'border border-outline-variant/30 hover:border-primary/40'
                              }
                            `}
                          >
                            <PinDisplay avatar={p.id} color={p.color} size={44} />
                            {on && (
                              <motion.div 
                                layoutId="activePin"
                                className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                      <motion.button
                        type="button"
                        onClick={() => setAvatar(CUSTOM_PIN_ID)} title="Personalizado"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`
                          flex items-center justify-center py-2 rounded-2xl cursor-pointer transition-all relative bg-surface-container/30
                          ${isCustom
                            ? 'border border-primary bg-primary/5 shadow-md shadow-primary/10'
                            : 'border border-outline-variant/30 hover:border-primary/40'
                          }
                        `}
                      >
                        <PinDisplay avatar={CUSTOM_PIN_ID} color={customColor} size={44} />
                        {isCustom && (
                           <motion.div 
                            layoutId="activePin"
                            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary"
                          />
                        )}
                      </motion.button>
                    </div>

                    {isCustom && (
                       <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-5 rounded-3xl bg-surface-container/50 border border-outline-variant/20"
                       >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Cor Personalizada</span>
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 rounded-full border border-white shadow-sm" style={{ background: customColor }} />
                              <span className="text-[10px] font-mono text-on-surface-variant uppercase">{customColor}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-5">
                            <div>
                              <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 ml-1">Escolhe a cor do teu Peão</p>
                              <div className="grid grid-cols-6 gap-2 mb-4">
                                 {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#64748b'].map(c => (
                                   <button 
                                     key={c}
                                     type="button"
                                     onClick={() => setCustomColor(c)}
                                     className="w-full aspect-square rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                                     style={{ background: c, borderColor: customColor === c ? 'white' : 'transparent', boxShadow: customColor === c ? '0 0 0 1px #cbd5e1' : 'none' }}
                                   />
                                 ))}
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-surface rounded-2xl border border-outline-variant/20">
                                <input 
                                  type="color" 
                                  value={customColor} 
                                  onChange={(e) => setCustomColor(e.target.value)}
                                  className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border-none p-0"
                                />
                                <div className="min-w-0">
                                   <p className="text-[10px] font-bold text-on-surface uppercase">Seletor Livre</p>
                                   <p className="text-[9px] text-on-surface-variant leading-tight">Escolhe a tonalidade exata.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                       </motion.div>
                    )}
                  </div>

                  <div className="mt-2 text-center h-5">
                    {avatar && avatar !== CUSTOM_PIN_ID && (
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {PIN_OPTIONS.find(p => p.id === avatar)?.label} - cor: <span style={{color: playerColor}}>■</span>
                      </span>
                    )}
                    {isCustom && (
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Personalizado - cor: <span style={{color: customColor}}>■</span>
                      </span>
                    )}
                  </div>

                  <button type="submit" disabled={isConnecting} className="btn-primary">
                    {isConnecting ? (
                      <><Loader2 className="animate-spin w-4 h-4" /> A entrar…</>
                    ) : (
                      <>🎲 Entrar na Sala</>
                    )}
                  </button>

                  <RecentRooms onRejoin={handleRejoin} compact />
                </motion.form>
              ) : mode === 'recent' ? (
                <motion.div
                  key="recent"
                  className="flex flex-col gap-5"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <RecentRooms onRejoin={handleRejoin} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>

          <p className="text-center text-on-surface-variant/50 text-xs mt-6 select-none">
            Abre em vários dispositivos para jogar em tempo real
          </p>
        </div>
      </main>
    </PageTransition>
  );
}
