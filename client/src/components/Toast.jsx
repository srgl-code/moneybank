import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
const C={
  success:{Icon:CheckCircle2,border:'rgba(74,222,128,0.35)', bg:'rgba(13,31,16,0.97)', accent:'#4ade80', sh:'0 8px 32px rgba(74,222,128,0.12)'},
  error:  {Icon:XCircle,      border:'rgba(248,113,113,0.4)',bg:'rgba(24,8,8,0.97)',    accent:'#f87171', sh:'0 8px 32px rgba(248,113,113,0.12)'},
  warning:{Icon:AlertTriangle,border:'rgba(251,191,36,0.4)', bg:'rgba(24,18,4,0.97)',   accent:'#fbbf24', sh:'0 8px 32px rgba(251,191,36,0.12)'},
  info:   {Icon:Info,          border:'rgba(96,165,250,0.35)',bg:'rgba(6,12,24,0.97)',   accent:'#60a5fa', sh:'0 8px 32px rgba(96,165,250,0.1)'},
};
export default function Toast(){
  const {toasts}=useGame();
  if(!toasts.length) return null;
  return (
    <div aria-live="polite" style={{position:'fixed',top:'1rem',right:'1rem',zIndex:100,display:'flex',flexDirection:'column',gap:'0.5rem',maxWidth:'22rem',width:'100%',pointerEvents:'none'}}>
      {toasts.map(t=>{
        const c=C[t.type]??C.info,{Icon}=c;
        return (
          <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',padding:'0.875rem 1rem',borderRadius:'1rem',fontSize:'0.875rem',fontWeight:500,pointerEvents:'auto',animation:'slideInRight 0.32s cubic-bezier(.22,1,.36,1) both',background:c.bg,border:`1px solid ${c.border}`,boxShadow:`${c.sh},inset 0 1px 0 rgba(255,255,255,0.04)`,backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)'}}>
            <Icon style={{width:'1rem',height:'1rem',flexShrink:0,marginTop:'0.0625rem',color:c.accent}}/>
            <span style={{lineHeight:1.4,color:'white'}}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
