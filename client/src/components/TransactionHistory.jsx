import React from 'react';
import { ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;
const TY = {
  transfer:{ Icon:ArrowLeftRight, color:'#60a5fa', bg:'rgba(96,165,250,0.08)',  bd:'rgba(96,165,250,0.15)' },
  credit:  { Icon:ArrowUpCircle,  color:'#4ade80', bg:'rgba(74,222,128,0.08)',  bd:'rgba(74,222,128,0.15)' },
  debit:   { Icon:ArrowDownCircle,color:'#f87171', bg:'rgba(248,113,113,0.08)',bd:'rgba(248,113,113,0.15)' },
  reset:   { Icon:RefreshCw,      color:'#fbbf24', bg:'rgba(251,191,36,0.08)', bd:'rgba(251,191,36,0.15)' },
};
function time(iso){ try{return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}catch{return''} }
export default function TransactionHistory({history,myName}){
  if(!history?.length) return (
    <div style={{textAlign:'center',padding:'2.5rem 0'}}>
      <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>📋</div>
      <div style={{color:'#2d5231',fontWeight:600,fontSize:'0.875rem'}}>Nenhuma transação ainda</div>
    </div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
      {[...history].reverse().map((e,i)=>{
        const c=TY[e.type]??TY.transfer, {Icon}=c;
        const me=myName&&(e.fromName===myName||e.toName===myName);
        return (
          <div key={e.id??i} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.75rem 1rem',borderRadius:'0.75rem',background:me?'linear-gradient(135deg,rgba(16,42,18,0.9),rgba(10,28,12,0.9))':'rgba(13,31,16,0.6)',border:`1px solid ${me?'rgba(74,222,128,0.2)':'var(--green-border)'}`}}>
            <div style={{width:'2rem',height:'2rem',borderRadius:'0.5rem',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,background:c.bg,border:`1px solid ${c.bd}`}}>
              <Icon style={{width:'0.875rem',height:'0.875rem',color:c.color}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:'white',fontSize:'0.875rem',lineHeight:1.3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description}</div>
              <div style={{color:'#2d5231',fontSize:'0.6875rem',marginTop:'0.125rem'}}>{time(e.time)}</div>
            </div>
            {e.amount!=null&&<span className="balance-text" style={{fontWeight:900,fontSize:'0.875rem',fontFamily:'monospace',flexShrink:0,color:c.color}}>{fmt(e.amount)}</span>}
          </div>
        );
      })}
    </div>
  );
}
