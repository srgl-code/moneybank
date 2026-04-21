import React from 'react';
import { PinDisplay } from './PinIcon.jsx';
const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;
const MEDALS = ['🥇','🥈','🥉'];
const MEDAL_COLORS = ['#f59e0b','#9ca3af','#f97316'];

export default function RankingList({players,myId}){
  const sorted=[...players].sort((a,b)=>b.balance-a.balance);
  if(!sorted.length) return (
    <div style={{textAlign:'center',padding:'3rem 0',color:'#2d5231'}}>
      <div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>📊</div>
      <div style={{fontWeight:600}}>Ranking aparece aqui</div>
    </div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
      {sorted.map((p,i)=>{
        const isMe=p.id===myId, isBk=p.isBanker, rank=i+1;
        return (
          <div key={p.id} style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.875rem 1rem',borderRadius:'1rem',background:isMe?'linear-gradient(135deg,rgba(16,42,18,0.95),rgba(10,28,12,0.95))':isBk?'rgba(245,158,11,0.05)':'rgba(13,31,16,0.7)',border:`1px solid ${isMe?'rgba(74,222,128,0.25)':isBk?'rgba(245,158,11,0.15)':'var(--green-border)'}`,boxShadow:isMe?'0 4px 20px rgba(0,0,0,0.3)':'none'}}>
            <div style={{width:'2rem',textAlign:'center',flexShrink:0}}>
              {MEDALS[rank-1]
                ? <span style={{fontSize:'1.25rem'}}>{MEDALS[rank-1]}</span>
                : <span style={{fontSize:'0.75rem',fontWeight:900,color:'#4ade80',opacity:0.5}}>#{rank}</span>}
            </div>
            <div style={{flexShrink:0,width:'1.75rem',display:'flex',alignItems:'center',justifyContent:'center'}}><PinDisplay avatar={p.avatar} size={22}/></div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:'0.875rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:isMe?'white':'#d1fae5'}}>{p.name}</div>
              {isMe&&<div style={{fontSize:'0.625rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em',color:'#4ade80'}}>Tu</div>}
            </div>
            {isBk
              ? <span style={{fontWeight:900,fontSize:'1.25rem',fontFamily:'monospace',color:'var(--gold)'}}>∞</span>
              : <div style={{textAlign:'right'}}>
                  <div className="balance-text" style={{fontWeight:900,fontSize:'0.9375rem',fontFamily:'monospace',color:isMe?'var(--gold)':'#86efac'}}>{fmt(p.balance)}</div>
                  {MEDAL_COLORS[rank-1]&&<div style={{height:'0.125rem',marginTop:'0.25rem',borderRadius:'9999px',opacity:0.6,background:`linear-gradient(to right,${MEDAL_COLORS[rank-1]},transparent)`}}/>}
                </div>}
          </div>
        );
      })}
    </div>
  );
}
