import React, { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { PinDisplay } from './PinIcon.jsx';

const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;
const QUICK = [50, 100, 200, 500, 1000, 1500];
const NUMPAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function CardMachine({ player, onConfirm, onCancel }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const val = parseInt(amount) || 0;

  const pressKey = (k) => {
    if (k === '⌫') setAmount(a => a.slice(0, -1));
    else if (k === '') return;
    else if (amount.length < 8) setAmount(a => a + k);
  };

  const handleConfirm = async () => {
    if (!val || val <= 0) return;
    setBusy(true);
    try { await onConfirm(val, reason.trim() || undefined); }
    catch { setBusy(false); }
  };

  return (
    <div
      style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0.5rem',background:'rgba(0,0,0,0.85)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)'}}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{width:'100%',maxWidth:'22rem',borderRadius:'1.5rem',overflow:'hidden',animation:'scaleIn 0.28s cubic-bezier(.22,1,.36,1) both',background:'#131316',border:'1px solid rgba(255,255,255,0.07)',boxShadow:'0 32px 80px rgba(0,0,0,0.8)'}}>

        {/* Screen area */}
        <div style={{background:'linear-gradient(145deg,#0a170b,#071008)',padding:'1.125rem 1.25rem 1rem',borderBottom:'1px solid rgba(74,222,128,0.08)'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.875rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <CreditCard style={{width:'0.9375rem',height:'0.9375rem',color:'#4ade80'}}/>
              <span style={{color:'#4ade80',fontSize:'0.625rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',fontFamily:'monospace'}}>MAQUINETA</span>
            </div>
            <button onClick={onCancel} style={{width:'1.625rem',height:'1.625rem',borderRadius:'0.375rem',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'rgba(255,255,255,0.06)',border:'none',color:'#6b7280'}}>
              <X style={{width:'0.875rem',height:'0.875rem'}}/>
            </button>
          </div>

          {/* Player info */}
          <div style={{display:'flex',alignItems:'center',gap:'0.625rem',marginBottom:'0.875rem',padding:'0.5rem 0.75rem',borderRadius:'0.75rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)'}}>
            <PinDisplay avatar={player.avatar} size={20}/>
            <div style={{minWidth:0}}>
              <div style={{color:'white',fontWeight:700,fontSize:'0.8125rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{player.name}</div>
              <div style={{color:'#4ade80',fontSize:'0.625rem',fontFamily:'monospace'}}>Saldo: {fmt(player.balance)}</div>
            </div>
          </div>

          {/* Amount display */}
          <div style={{background:'#030a03',borderRadius:'0.75rem',padding:'0.75rem 1rem',border:'1px solid rgba(74,222,128,0.12)',marginBottom:'0.625rem'}}>
            <div style={{color:'rgba(74,222,128,0.5)',fontSize:'0.5625rem',fontWeight:700,letterSpacing:'0.12em',fontFamily:'monospace',marginBottom:'0.25rem'}}>VALOR A COBRAR</div>
            <div className="balance-text" style={{fontSize:'1.875rem',fontWeight:900,fontFamily:'monospace',letterSpacing:'0.04em',color:val>0?'#f87171':'rgba(255,255,255,0.15)',minHeight:'2.25rem',transition:'color 0.15s'}}>
              {val > 0 ? `M$ ${val.toLocaleString('pt-BR')}` : 'M$ 0'}
            </div>
          </div>

          {/* Quick amounts */}
          <div style={{display:'flex',gap:'0.3rem',flexWrap:'wrap'}}>
            {QUICK.map(v => (
              <button key={v} type="button" onClick={() => setAmount(String(v))}
                style={{padding:'0.1875rem 0.5rem',borderRadius:'0.4375rem',fontSize:'0.625rem',fontWeight:700,cursor:'pointer',border:'none',transition:'all 0.1s',background:amount===String(v)?'rgba(248,113,113,0.2)':'rgba(255,255,255,0.05)',color:amount===String(v)?'#f87171':'rgba(255,255,255,0.4)',outline:amount===String(v)?'1px solid rgba(248,113,113,0.35)':'none'}}>
                {fmt(v)}
              </button>
            ))}
          </div>
        </div>

        {/* Numpad body */}
        <div style={{padding:'0.75rem',background:'#0f0f12'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.3rem',marginBottom:'0.5rem'}}>
            {NUMPAD.map((k, i) => (
              <button key={i} onClick={() => pressKey(k)} disabled={!k}
                style={{padding:'0.75rem',borderRadius:'0.625rem',fontSize:'1.125rem',fontWeight:700,cursor:k?'pointer':'default',border:'none',transition:'background 0.1s',background:k==='⌫'?'rgba(248,113,113,0.12)':k?'rgba(255,255,255,0.06)':'transparent',color:k==='⌫'?'#f87171':k?'rgba(255,255,255,0.85)':'transparent',fontFamily:'monospace'}}>
                {k}
              </button>
            ))}
          </div>

          <input
            type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Motivo — ex: Aluguel (opcional)" maxLength={50}
            style={{display:'block',width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'0.625rem',padding:'0.5rem 0.75rem',color:'rgba(255,255,255,0.7)',fontSize:'0.75rem',marginBottom:'0.5rem',fontFamily:'inherit',boxSizing:'border-box'}}
          />

          <button onClick={handleConfirm} disabled={!val || busy}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',padding:'0.875rem',borderRadius:'0.875rem',fontSize:'0.9375rem',fontWeight:900,cursor:val&&!busy?'pointer':'not-allowed',border:'none',transition:'all 0.15s',opacity:val&&!busy?1:0.4,background:val?'linear-gradient(135deg,#dc2626,#b91c1c)':'rgba(255,255,255,0.04)',color:'white',boxShadow:val?'0 4px 20px rgba(220,38,38,0.35)':'none'}}>
            {busy
              ? <><Loader2 style={{width:'1rem',height:'1rem',animation:'spin 0.7s linear infinite'}}/> A cobrar…</>
              : <>💳 Cobrar {val > 0 ? fmt(val) : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
