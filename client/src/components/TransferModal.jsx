import React,{useState,useEffect,useRef} from 'react';
import { X, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import { PinDisplay } from './PinIcon.jsx';
const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;
const QUICK = [50,100,200,500,1000];

export default function TransferModal({onClose,players,currentPlayer}){
  const {performTransfer,addToast}=useGame();
  const [toId,setToId]=useState('');
  const [amount,setAmount]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const ref=useRef(null);

  useEffect(()=>{if(toId)ref.current?.focus();},[toId]);
  useEffect(()=>{const h=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);},[onClose]);

  const recipients=players.filter(p=>p.id!==currentPlayer?.id);
  const sel=recipients.find(p=>p.id===toId);
  const parsed=parseInt(amount,10)||0;
  const canSubmit=!busy&&toId&&amount;

  const submit=async e=>{
    e.preventDefault(); setError('');
    if(!toId) return setError('Seleciona um destinatário.');
    const amt=parseInt(amount,10);
    if(!amt||amt<=0) return setError('Insere um valor válido.');
    if(amt>1_000_000_000) return setError('Valor demasiado alto.');
    const bal=currentPlayer?.balance??0;
    if(!currentPlayer?.isBanker&&amt>bal) return setError(`Saldo insuficiente. Tens ${fmt(bal)}.`);
    setBusy(true);
    try{ await performTransfer(toId,amt); addToast(`✅ ${fmt(amt)} enviado a ${sel?.name??'destinatário'}`,'success'); onClose(); }
    catch(e){ setError(e.message); }
    finally{ setBusy(false); }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0.75rem',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)'}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:'100%',maxWidth:'28rem',borderRadius:'1.5rem',overflow:'hidden',animation:'scaleIn 0.28s cubic-bezier(.22,1,.36,1) both',background:'linear-gradient(145deg,#0d1f10 0%,#091409 100%)',border:'1px solid var(--green-border)',boxShadow:'0 32px 80px rgba(0,0,0,0.6)'}}>
        {/* header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem 1.5rem',borderBottom:'1px solid var(--green-border)'}}>
          <h2 style={{color:'white',fontWeight:900,fontSize:'1.0625rem',display:'flex',alignItems:'center',gap:'0.5rem',margin:0}}>
            <span style={{width:'2rem',height:'2rem',borderRadius:'0.625rem',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.25)'}}>
              <ArrowUpRight style={{width:'1rem',height:'1rem',color:'var(--gold)'}}/>
            </span>
            Transferência
          </h2>
          <button onClick={onClose} style={{width:'2rem',height:'2rem',borderRadius:'0.625rem',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:'rgba(255,255,255,0.05)',border:'none',color:'#16a34a'}}>
            <X style={{width:'1rem',height:'1rem'}}/>
          </button>
        </div>
        <form onSubmit={submit} style={{padding:'1.25rem 1.5rem 1.5rem',display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          {!currentPlayer?.isBanker&&(
            <div style={{textAlign:'center',padding:'0.625rem',borderRadius:'0.75rem',background:'rgba(255,255,255,0.03)',border:'1px solid var(--green-border)'}}>
              <span style={{color:'#4ade80',fontSize:'0.75rem'}}>Teu saldo: </span>
              <span className="balance-text" style={{fontWeight:900,fontFamily:'monospace',fontSize:'1.1rem',color:'var(--gold)'}}>{fmt(currentPlayer?.balance??0)}</span>
            </div>
          )}
          {error&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:'0.5rem',padding:'0.75rem',borderRadius:'0.75rem',fontSize:'0.875rem',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.25)',color:'#fca5a5'}}>
              <AlertCircle style={{width:'1rem',height:'1rem',flexShrink:0,marginTop:'0.125rem'}}/><span>{error}</span>
            </div>
          )}
          <div>
            <label className="field-label">Para quem?</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'0.5rem'}}>
              {recipients.map(p=>{
                const on=toId===p.id;
                return (
                  <button key={p.id} type="button" onClick={()=>setToId(p.id)}
                    style={{display:'flex',alignItems:'center',gap:'0.625rem',padding:'0.75rem',borderRadius:'0.75rem',cursor:'pointer',textAlign:'left',transition:'all 0.15s',border:'none',...(on?{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.4)'}:{background:'rgba(255,255,255,0.03)',border:'1px solid var(--green-border)'})}}>
                    <div style={{flexShrink:0,width:'1.5rem',display:'flex',alignItems:'center',justifyContent:'center'}}><PinDisplay avatar={p.avatar} size={20}/></div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:'0.875rem',fontWeight:600,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                      {p.isBanker&&<div style={{fontSize:'0.625rem',color:'var(--gold)'}}>Banco</div>}
                    </div>
                    {on&&<span style={{marginLeft:'auto',color:'#4ade80'}}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="field-label">Valor (M$)</label>
            <input ref={ref} type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" min="1" max="1000000000" inputMode="numeric"
              className="field balance-text" style={{textAlign:'center',fontWeight:900,fontSize:'2rem',letterSpacing:'0.05em'}}/>
            <div style={{display:'flex',gap:'0.375rem',marginTop:'0.5rem',flexWrap:'wrap'}}>
              {QUICK.map(v=>{
                const on=amount===String(v);
                return <button key={v} type="button" onClick={()=>setAmount(String(v))}
                  style={{padding:'0.375rem 0.625rem',borderRadius:'0.5rem',fontSize:'0.75rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s',border:'none',...(on?{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0a1a0a'}:{background:'rgba(255,255,255,0.05)',color:'#86efac',border:'1px solid var(--green-border)'})}}>{fmt(v)}</button>;
              })}
            </div>
          </div>
          <button type="submit" disabled={!canSubmit}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',padding:'1rem',borderRadius:'1rem',fontSize:'1rem',fontWeight:900,cursor:canSubmit?'pointer':'not-allowed',border:'none',transition:'all 0.15s',opacity:canSubmit?1:0.4,background:canSubmit?'linear-gradient(135deg,#f59e0b,#d97706)':'rgba(255,255,255,0.08)',color:canSubmit?'#0a1a0a':'#4ade80',boxShadow:canSubmit?'0 6px 20px rgba(245,158,11,0.3)':'none'}}>
            {busy?<><Loader2 style={{width:'1rem',height:'1rem',animation:'spin 0.7s linear infinite'}}/> A transferir…</>:toId&&parsed>0?`${fmt(parsed)} → ${sel?.name}`:'Confirmar Transferência'}
          </button>
        </form>
      </div>
    </div>
  );
}
