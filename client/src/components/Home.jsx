import React, { useState } from 'react';
import { LogIn, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { PIN_OPTIONS, PinSVG, CUSTOM_PIN_ID } from './PinIcon.jsx';
const PRESETS = [
  { label: 'M$1.500', value: 1500, note: 'Padrão' },
  { label: 'M$2.000', value: 2000, note: 'Luxo' },
  { label: 'M$3.000', value: 3000, note: 'Longa' },
];

export default function Home() {
  const { createRoom, joinRoom, isConnecting, connectionError } = useGame();
  const [mode, setMode] = useState('join');
  const [err, setErr] = useState('');
  const [bankerName, setBankerName] = useState('');
  const [startBal, setStartBal] = useState('1500');
  const [customBal, setCustomBal] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState(PIN_OPTIONS[0].id);
  const [playerColor, setPlayerColor] = useState(PIN_OPTIONS[0].color);
  const [customEmoji, setCustomEmoji] = useState('');
  const [customColor, setCustomColor] = useState('#ef4444');

  const selectPin = (pin) => { setAvatar(pin.id); setPlayerColor(pin.color); };
  const isCustom = avatar === CUSTOM_PIN_ID;

  const handleCreate = async e => {
    e.preventDefault(); setErr('');
    const name = bankerName.trim();
    if (!name) return setErr('Insere o teu nome de bancário.');
    const bal = parseInt(useCustom ? customBal : startBal, 10);
    if (!bal || bal < 100 || bal > 10_000_000) return setErr('Saldo entre 100 e 10.000.000.');
    try { await createRoom(name, bal); } catch(e) { setErr(e.message); }
  };

  const handleJoin = async e => {
    e.preventDefault(); setErr('');
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) return setErr('O código tem 6 caracteres.');
    const name = playerName.trim();
    if (!name) return setErr('Insere o teu nome.');
    const effectiveAvatar = isCustom ? (customEmoji.trim().slice(0,2) || '\u{1F3AE}') : avatar;
    const effectiveColor  = isCustom ? customColor : playerColor;
    try { await joinRoom(code, name, effectiveAvatar, effectiveColor); } catch(e) { setErr(e.message); }
  };

  const sw = m => { setMode(m); setErr(''); };
  const error = err || connectionError;

  const page = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', position:'relative', overflow:'hidden' };
  const card = { borderRadius:'1.5rem', padding:'1.5rem', background:'linear-gradient(145deg,rgba(13,31,16,0.98) 0%,rgba(9,20,11,0.98) 100%)', border:'1px solid var(--green-border)', boxShadow:'0 24px 64px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.05)' };

  return (
    <div style={page}>
      {/* bg blobs */}
      <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'-10rem',left:'-10rem',width:'24rem',height:'24rem',borderRadius:'50%',background:'rgba(22,101,52,0.12)',filter:'blur(80px)'}}/>
        <div style={{position:'absolute',bottom:'-10rem',right:'-10rem',width:'24rem',height:'24rem',borderRadius:'50%',background:'rgba(120,53,15,0.1)',filter:'blur(80px)'}}/>
      </div>

      <div style={{position:'relative',width:'100%',maxWidth:'22rem',animation:'fadeUp 0.4s cubic-bezier(.22,1,.36,1) both'}}>

        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:'2rem',userSelect:'none'}}>
          <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'5rem',height:'5rem',borderRadius:'1.5rem',fontSize:'2.8rem',background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.08))',border:'1px solid rgba(245,158,11,0.2)',marginBottom:'1rem',boxShadow:'0 16px 40px rgba(245,158,11,0.1)'}}>🏦</div>
          <h1 style={{fontSize:'2.25rem',fontWeight:900,letterSpacing:'-0.03em',color:'white',lineHeight:1,margin:0}}>
            Money<span style={{color:'var(--gold)'}}>Bank</span>
          </h1>
          <p style={{fontSize:'0.7rem',color:'#4ade80',marginTop:'0.5rem',fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase'}}>
            Banco Imobiliário Digital
          </p>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',padding:'0.25rem',marginBottom:'1.25rem',borderRadius:'1rem',background:'rgba(255,255,255,0.04)',border:'1px solid var(--green-border)'}}>
          <TBtn active={mode==='join'} onClick={()=>sw('join')}>
            <LogIn style={{width:'1rem',height:'1rem',marginRight:'0.375rem',flexShrink:0}}/> Entrar
          </TBtn>
          <TBtn active={mode==='create'} onClick={()=>sw('create')}>
            <Plus style={{width:'1rem',height:'1rem',marginRight:'0.375rem',flexShrink:0}}/> Criar Sala
          </TBtn>
        </div>

        {/* Card */}
        <div style={card}>
          {error && (
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.625rem',marginBottom:'1.25rem',padding:'0.875rem',borderRadius:'0.75rem',background:'rgba(220,38,38,0.12)',border:'1px solid rgba(220,38,38,0.3)',color:'#fca5a5',fontSize:'0.875rem'}}>
              <AlertCircle style={{width:'1rem',height:'1rem',flexShrink:0,marginTop:'0.125rem'}}/>
              <span>{error}</span>
            </div>
          )}

          {mode==='create' ? (
            <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
              <div>
                <label className="field-label">Teu nome (Bancário)</label>
                <input type="text" value={bankerName} onChange={e=>setBankerName(e.target.value)} placeholder="Ex: Pedro" maxLength={20} className="field" autoComplete="off" autoFocus/>
              </div>
              <div>
                <label className="field-label">Saldo inicial por jogador</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'0.75rem'}}>
                  {PRESETS.map(p=>{
                    const on = !useCustom && startBal===String(p.value);
                    return (
                      <button key={p.value} type="button" onClick={()=>{setStartBal(String(p.value));setUseCustom(false);}}
                        style={{padding:'0.75rem 0',borderRadius:'0.75rem',fontSize:'0.8rem',fontWeight:900,cursor:'pointer',transition:'all 0.15s',border:'none',...(on?{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0a1a0a',boxShadow:'0 4px 16px rgba(245,158,11,0.3)'}:{background:'rgba(255,255,255,0.04)',border:'1px solid var(--green-border)',color:'#86efac'})}}>
                        <div>{p.label}</div>
                        <div style={{fontSize:'0.65rem',opacity:0.7,fontWeight:400,marginTop:'0.125rem'}}>{p.note}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                  <button type="button" onClick={()=>setUseCustom(!useCustom)}
                    style={{display:'flex',alignItems:'center',gap:'0.375rem',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',background:'none',border:'none',color:useCustom?'var(--gold)':'#4ade80',padding:0}}>
                    <span style={{width:'1rem',height:'1rem',borderRadius:'0.25rem',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.625rem',fontWeight:900,border:`1.5px solid ${useCustom?'#f59e0b':'#2d5231'}`,background:useCustom?'#f59e0b':'transparent',color:useCustom?'#0a1a0a':'transparent',transition:'all 0.15s'}}>✓</span>
                    Outro valor
                  </button>
                  {useCustom && <input type="number" value={customBal} onChange={e=>setCustomBal(e.target.value)} placeholder="Ex: 2500" min="100" max="10000000" autoFocus className="field" style={{flex:1,fontSize:'0.875rem'}}/>}
                </div>
              </div>
              <button type="submit" disabled={isConnecting} className="btn-gold">
                {isConnecting?<><Loader2 className="animate-spin" style={{width:'1rem',height:'1rem'}}/> A criar…</>:'🏦 Criar Sala'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
              <div>
                <label className="field-label">Código da Sala</label>
                <input type="text" value={roomCode}
                  onChange={e=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
                  placeholder="ABC123" maxLength={6} autoComplete="off" inputMode="text"
                  className="field balance-text"
                  style={{textAlign:'center',fontWeight:900,fontSize:'2rem',letterSpacing:'0.4em'}}/>
              </div>
              <div>
                <label className="field-label">Teu nome</label>
                <input type="text" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="Ex: Maria" maxLength={20} className="field" autoComplete="off"/>
              </div>
              <div>
                <label className="field-label">Escolhe o teu pino</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.5rem'}}>
                  {PIN_OPTIONS.map(p=>{
                    const on=avatar===p.id;
                    return (
                      <button key={p.id} type="button" onClick={()=>selectPin(p)} title={p.label}
                        style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'0.625rem 0',borderRadius:'0.75rem',cursor:'pointer',transition:'all 0.15s',border:'none',...(on?{background:p.color+'22',border:`2px solid ${p.color}`,transform:'scale(1.08)'}:{background:'rgba(255,255,255,0.03)',border:'2px solid transparent'})}}>
                        <PinSVG color={p.color} size={28}/>
                      </button>
                    );
                  })}
                  <button type="button" onClick={()=>setAvatar(CUSTOM_PIN_ID)} title="Personalizado"
                    style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'0.625rem 0',borderRadius:'0.75rem',cursor:'pointer',transition:'all 0.15s',border:'none',fontSize:'1.5rem',...(isCustom?{background:'rgba(245,158,11,0.15)',border:'2px solid var(--gold)',transform:'scale(1.08)'}:{background:'rgba(255,255,255,0.03)',border:'2px solid transparent'})}}>
                    ✏️
                  </button>
                </div>
                {isCustom&&(
                  <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem',alignItems:'center'}}>
                    <input type="text" value={customEmoji} onChange={e=>setCustomEmoji(e.target.value.slice(0,2))} placeholder="Emoji..." maxLength={2} autoFocus
                      className="field" style={{flex:1,textAlign:'center',fontSize:'2rem',letterSpacing:'0.25em',padding:'0.5rem'}}/>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.25rem'}}>
                      <label style={{fontSize:'0.5625rem',fontWeight:700,color:'#4ade80',textTransform:'uppercase',letterSpacing:'0.08em'}}>Cor</label>
                      <input type="color" value={customColor} onChange={e=>setCustomColor(e.target.value)}
                        style={{width:'3rem',height:'3rem',border:'2px solid rgba(255,255,255,0.15)',borderRadius:'0.5rem',cursor:'pointer',background:'none',padding:'2px'}}/>
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" disabled={isConnecting} className="btn-green">
                {isConnecting?<><Loader2 className="animate-spin" style={{width:'1rem',height:'1rem'}}/> A entrar…</>:'🎲 Entrar na Sala'}
              </button>
            </form>
          )}
        </div>

        <p style={{textAlign:'center',color:'#2d5231',fontSize:'0.7rem',marginTop:'1.25rem',userSelect:'none'}}>
          Abre em vários dispositivos para jogar em tempo real
        </p>
      </div>
    </div>
  );
}

function TBtn({active,onClick,children}){
  return (
    <button type="button" onClick={onClick}
      style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'0.625rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:600,cursor:'pointer',border:'none',transition:'all 0.15s',...(active?{background:'white',color:'#0a1a0a',boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}:{background:'transparent',color:'#4ade80'})}}>
      {children}
    </button>
  );
}
