import React,{useState} from 'react';
import { ArrowUpRight, History, Trophy, LogOut, TrendingUp, TrendingDown } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import RankingList from './RankingList.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import TransferModal from './TransferModal.jsx';
import { PinDisplay } from './PinIcon.jsx';
const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;

export default function PlayerDashboard(){
  const {gameState,currentPlayer,leaveRoom}=useGame();
  const [tab,setTab]=useState('ranking');
  const [open,setOpen]=useState(false);

  const all=gameState?.players??[];
  const bal=currentPlayer?.balance??0;
  const human=all.filter(p=>!p.isBanker);
  const rank=human.findIndex(p=>p.id===currentPlayer?.id)+1;
  const start=gameState?.startingBalance??0;
  const diff=bal-start, up=diff>=0;

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--green-bg)'}}>
      <header style={{background:'rgba(6,18,8,0.95)',borderBottom:'1px solid var(--green-border)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:30}}>
        <div style={{maxWidth:'32rem',margin:'0 auto',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',width:'1.5rem'}}><PinDisplay avatar={currentPlayer?.avatar??'red'} size={22}/></div>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:'0.625rem',fontWeight:700,color:'#4ade80',textTransform:'uppercase',letterSpacing:'0.15em',lineHeight:1}}>Jogador</div>
            <div style={{color:'white',fontWeight:700,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'0.875rem'}}>{currentPlayer?.name??'—'}</div>
          </div>
          {rank>0&&<RB rank={rank} total={human.length}/>}
          <button onClick={leaveRoom} style={{padding:'0.375rem',borderRadius:'0.5rem',cursor:'pointer',background:'none',border:'none',color:'#16a34a'}}>
            <LogOut style={{width:'1rem',height:'1rem'}}/>
          </button>
        </div>
      </header>
      <main style={{flex:1,maxWidth:'32rem',margin:'0 auto',width:'100%',padding:'1.25rem 1rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
        <div style={{position:'relative',overflow:'hidden',borderRadius:'1.5rem',padding:'1.5rem',textAlign:'center',background:'linear-gradient(145deg,#0f2a12 0%,#0a1e0c 100%)',border:'1px solid rgba(74,222,128,0.15)',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
          <div style={{position:'absolute',right:'-2rem',top:'-2rem',width:'10rem',height:'10rem',borderRadius:'50%',pointerEvents:'none',opacity:0.05,background:'radial-gradient(circle,#f59e0b,transparent)'}}/>
          <div style={{position:'absolute',left:'-1.5rem',bottom:'-1.5rem',width:'8rem',height:'8rem',borderRadius:'50%',pointerEvents:'none',opacity:0.05,background:'radial-gradient(circle,#4ade80,transparent)'}}/>
          <div style={{color:'#4ade80',fontSize:'0.7rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:'0.5rem'}}>Teu Saldo</div>
          <div className="balance-text" style={{fontSize:'clamp(2.5rem,10vw,3.5rem)',fontWeight:900,color:'white',letterSpacing:'-0.02em',lineHeight:1,marginBottom:'0.75rem'}}>{fmt(bal)}</div>
          {start>0&&(
            <div style={{display:'inline-flex',alignItems:'center',gap:'0.375rem',padding:'0.375rem 0.75rem',borderRadius:'9999px',fontSize:'0.875rem',fontWeight:700,marginBottom:'1.25rem',...(up?{background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80'}:{background:'rgba(248,113,113,0.12)',border:'1px solid rgba(248,113,113,0.2)',color:'#f87171'})}}>
              {up?<TrendingUp style={{width:'0.875rem',height:'0.875rem'}}/>:<TrendingDown style={{width:'0.875rem',height:'0.875rem'}}/>}
              {up?'+':''}{fmt(diff)} desde o início
            </div>
          )}
          <button onClick={()=>setOpen(true)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.5rem',padding:'1rem',borderRadius:'1rem',fontSize:'1rem',fontWeight:900,cursor:'pointer',border:'1px solid rgba(251,191,36,0.3)',background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0a1a0a',boxShadow:'0 6px 24px rgba(245,158,11,0.35)'}}>
            <ArrowUpRight style={{width:'1.25rem',height:'1.25rem'}}/> Fazer Transferência
          </button>
        </div>
        <div style={{display:'flex',gap:'0.5rem'}}>
          <TB active={tab==='ranking'} onClick={()=>setTab('ranking')}><Trophy style={{width:'0.875rem',height:'0.875rem',marginRight:'0.375rem'}}/> Ranking</TB>
          <TB active={tab==='history'} onClick={()=>setTab('history')}><History style={{width:'0.875rem',height:'0.875rem',marginRight:'0.375rem'}}/> Extrato</TB>
        </div>
        {tab==='ranking'?<RankingList players={all} myId={currentPlayer?.id}/>:<TransactionHistory history={gameState?.history??[]} myId={currentPlayer?.id} myName={currentPlayer?.name}/>}
      </main>
      {open&&<TransferModal onClose={()=>setOpen(false)} players={all} currentPlayer={currentPlayer}/>}
    </div>
  );
}
function RB({rank,total}){
  const cs=[{bg:'rgba(245,158,11,0.15)',bd:'rgba(245,158,11,0.35)',c:'#f59e0b'},{bg:'rgba(156,163,175,0.15)',bd:'rgba(156,163,175,0.35)',c:'#9ca3af'},{bg:'rgba(249,115,22,0.15)',bd:'rgba(249,115,22,0.35)',c:'#f97316'}];
  const s=cs[rank-1]??{bg:'rgba(74,222,128,0.1)',bd:'rgba(74,222,128,0.2)',c:'#4ade80'};
  return <span style={{fontSize:'0.75rem',fontWeight:900,padding:'0.25rem 0.625rem',borderRadius:'0.5rem',background:s.bg,border:`1px solid ${s.bd}`,color:s.c}}>#{rank}/{total}</span>;
}
function TB({active,onClick,children}){
  return <button onClick={onClick} style={{display:'flex',alignItems:'center',padding:'0.5rem 1rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',border:'none',transition:'all 0.15s',...(active?{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0a1a0a',boxShadow:'0 4px 12px rgba(245,158,11,0.3)'}:{background:'rgba(255,255,255,0.04)',color:'#86efac',border:'1px solid var(--green-border)'})}}>{children}</button>;
}
