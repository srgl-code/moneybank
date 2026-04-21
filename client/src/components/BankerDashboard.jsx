import React,{useState,useCallback} from 'react';
import { Copy, Check, RefreshCw, X, History, Users, TrendingUp, LogOut, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import CardMachine from './CardMachine.jsx';
import { PinDisplay } from './PinIcon.jsx';
const fmt = n => `M$${Number(n).toLocaleString('pt-BR')}`;
const RC=['#f59e0b','#9ca3af','#f97316'];

export default function BankerDashboard(){
  const {roomCode,gameState,currentPlayer,adjustBalance,resetBalances,closeRoom,leaveRoom,addToast}=useGame();
  const [tab,setTab]=useState('players');
  const [copied,setCopied]=useState(false);
  const [busy,setBusy]=useState(false);
  const [confReset,setConfReset]=useState(false);
  const [confClose,setConfClose]=useState(false);
  const [adj,setAdj]=useState(null);
  const [adjAmt,setAdjAmt]=useState('');
  const [adjRsn,setAdjRsn]=useState('');
  const [cardPlayer,setCardPlayer]=useState(null);

  const players=(gameState?.players??[]).filter(p=>!p.isBanker);
  const total=players.reduce((s,p)=>s+p.balance,0);
  const leader=players.length?[...players].sort((a,b)=>b.balance-a.balance)[0]:null;

  const copyCode=async()=>{
    try{await navigator.clipboard.writeText(roomCode);setCopied(true);setTimeout(()=>setCopied(false),2000);}
    catch{addToast('Não foi possível copiar','warning');}
  };
  const openAdj=useCallback((p,mode)=>{
    if(mode==='debit'){setCardPlayer(p);return;}
    setAdj({id:p.id,name:p.name,mode});setAdjAmt('');setAdjRsn('');
  },[]);
  const cancelAdj=useCallback(()=>{setAdj(null);setAdjAmt('');setAdjRsn('');},[]);
  const submitAdj=useCallback(async e=>{
    e.preventDefault();
    const amt=parseInt(adjAmt,10);
    if(!amt||amt<=0) return addToast('Insere um valor válido','error');
    if(amt>1_000_000_000) return addToast('Valor demasiado alto','error');
    setBusy(true);
    try{
      await adjustBalance(adj.id,adj.mode==='debit'?-amt:amt,adjRsn.trim()||undefined);
      addToast(adj.mode==='credit'?`✅ ${fmt(amt)} creditado a ${adj.name}`:`✅ ${fmt(amt)} debitado de ${adj.name}`,'success');
      cancelAdj();
    }catch(e){addToast(e.message,'error');}
    finally{setBusy(false);}
  },[adj,adjAmt,adjRsn,adjustBalance,addToast,cancelAdj]);

  const doReset=async()=>{setBusy(true);try{await resetBalances();setConfReset(false);}catch(e){addToast(e.message,'error');}finally{setBusy(false);} };
  const doClose=async()=>{try{await closeRoom();}catch(e){addToast(e.message,'error');}};

  const hdr={background:'rgba(6,18,8,0.95)',borderBottom:'1px solid var(--green-border)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',position:'sticky',top:0,zIndex:30};
  const hdrIn={maxWidth:'72rem',margin:'0 auto',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem'};
  const main={flex:1,maxWidth:'72rem',margin:'0 auto',width:'100%',padding:'1.25rem 1rem'};

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'var(--green-bg)'}}>
      <header style={hdr}>
        <div style={hdrIn}>
          <div style={{display:'flex',alignItems:'center',gap:'0.625rem',minWidth:0}}>
            <div style={{width:'2.25rem',height:'2.25rem',borderRadius:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.25rem',flexShrink:0,background:'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(217,119,6,0.08))',border:'1px solid rgba(245,158,11,0.2)'}}>🏦</div>
            <div style={{minWidth:0}}>
              <div style={{fontSize:'0.625rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',lineHeight:1,color:'var(--gold)'}}>Bancário</div>
              <div style={{color:'white',fontWeight:700,fontSize:'0.875rem',lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentPlayer?.name??'Banco'}</div>
            </div>
          </div>
          <button onClick={copyCode} style={{display:'flex',alignItems:'center',gap:'0.5rem',marginLeft:'0.25rem',padding:'0.375rem 0.75rem',borderRadius:'0.75rem',cursor:'pointer',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)'}}>
            <span style={{fontFamily:'monospace',fontWeight:900,fontSize:'1rem',letterSpacing:'0.25em',color:'var(--gold)'}}>{roomCode}</span>
            {copied?<Check style={{width:'0.875rem',height:'0.875rem',color:'#4ade80'}}/>:<Copy style={{width:'0.875rem',height:'0.875rem',color:'var(--gold-dark)'}}/>}
          </button>
          <div style={{flex:1}}/>
          {!confClose?(
            <button onClick={()=>setConfClose(true)} style={{display:'flex',alignItems:'center',gap:'0.375rem',padding:'0.375rem 0.75rem',borderRadius:'0.75rem',fontSize:'0.8125rem',fontWeight:600,cursor:'pointer',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.25)',color:'#fca5a5'}}>
              <X style={{width:'0.875rem',height:'0.875rem'}}/> Encerrar
            </button>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:'0.375rem',fontSize:'0.8125rem'}}>
              <span style={{color:'#fca5a5'}}>Encerrar?</span>
              <button onClick={doClose} style={{padding:'0.25rem 0.625rem',borderRadius:'0.5rem',fontWeight:700,color:'white',cursor:'pointer',border:'none',background:'#dc2626'}}>Sim</button>
              <button onClick={()=>setConfClose(false)} style={{padding:'0.25rem 0.625rem',borderRadius:'0.5rem',color:'white',cursor:'pointer',border:'none',background:'rgba(255,255,255,0.1)'}}>Não</button>
            </div>
          )}
          <button onClick={leaveRoom} style={{padding:'0.375rem',borderRadius:'0.5rem',cursor:'pointer',background:'none',border:'none',color:'#16a34a'}}>
            <LogOut style={{width:'1rem',height:'1rem'}}/>
          </button>
        </div>
      </header>
      <main style={main}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1.25rem'}}>
          <SC icon={<Users style={{width:'1rem',height:'1rem'}}/>} label="Jogadores" value={players.length}/>
          <SC icon={<TrendingUp style={{width:'1rem',height:'1rem'}}/>} label="Em Jogo" value={fmt(total)} sm/>
          <SC icon="🏆" label="Líder" value={leader?leader.name:'—'} sm/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',gap:'0.75rem',flexWrap:'wrap'}}>
          <div style={{display:'flex',gap:'0.375rem'}}>
            <TB active={tab==='players'} onClick={()=>setTab('players')}><Users style={{width:'0.875rem',height:'0.875rem',marginRight:'0.375rem'}}/> Jogadores</TB>
            <TB active={tab==='history'} onClick={()=>setTab('history')}>
              <History style={{width:'0.875rem',height:'0.875rem',marginRight:'0.375rem'}}/> Extrato
              {!!gameState?.history?.length&&<span style={{marginLeft:'0.375rem',padding:'0.0625rem 0.375rem',fontSize:'0.625rem',fontWeight:900,borderRadius:'9999px',background:'var(--gold)',color:'#0a1a0a'}}>{Math.min(gameState.history.length,50)}</span>}
            </TB>
          </div>
          {!confReset?(
            <button onClick={()=>setConfReset(true)} style={{display:'flex',alignItems:'center',gap:'0.375rem',padding:'0.5rem 0.875rem',borderRadius:'0.75rem',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',color:'#fbbf24'}}>
              <RefreshCw style={{width:'0.75rem',height:'0.75rem'}}/> Reiniciar Saldos
            </button>
          ):(
            <div style={{display:'flex',alignItems:'center',gap:'0.375rem',fontSize:'0.75rem'}}>
              <span style={{color:'#fbbf24'}}>Reiniciar tudo?</span>
              <button onClick={doReset} disabled={busy} style={{padding:'0.375rem 0.625rem',borderRadius:'0.5rem',fontWeight:700,color:'white',cursor:'pointer',border:'none',background:'var(--gold-dark)',opacity:busy?0.5:1}}>
                {busy?<Loader2 style={{width:'0.75rem',height:'0.75rem',animation:'spin 0.7s linear infinite'}}/>:'Sim'}
              </button>
              <button onClick={()=>setConfReset(false)} style={{padding:'0.375rem 0.625rem',borderRadius:'0.5rem',color:'white',cursor:'pointer',border:'none',background:'rgba(255,255,255,0.08)'}}>Não</button>
            </div>
          )}
        </div>
        {tab==='players'&&(
          players.length===0?(
            <div style={{textAlign:'center',padding:'6rem 0'}}>
              <div style={{fontSize:'4rem',marginBottom:'1rem'}}>👥</div>
              <div style={{color:'white',fontWeight:700,fontSize:'1.25rem',marginBottom:'0.5rem'}}>Aguardando jogadores…</div>
              <div style={{color:'#16a34a',fontSize:'0.875rem'}}>Partilha o código <span style={{fontFamily:'monospace',fontWeight:900,letterSpacing:'0.25em',color:'var(--gold)'}}>{roomCode}</span></div>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'0.75rem'}}>
              {[...players].sort((a,b)=>b.balance-a.balance).map((p,i)=>(
                <PC key={p.id} p={p} rank={i+1} expanded={adj?.id===p.id} mode={adj?.id===p.id?adj.mode:null}
                  amt={adjAmt} rsn={adjRsn} onAmt={setAdjAmt} onRsn={setAdjRsn}
                  onCredit={()=>openAdj(p,'credit')} onDebit={()=>openAdj(p,'debit')}
                  onCancel={cancelAdj} onSubmit={submitAdj} busy={busy}/>
              ))}
            </div>
          )
        )}
        {tab==='history'&&<TransactionHistory history={gameState?.history??[]}/>}
      </main>
      {cardPlayer&&(
        <CardMachine
          player={cardPlayer}
          onConfirm={async(amt,rsn)=>{
            await adjustBalance(cardPlayer.id,-amt,rsn);
            addToast(`✅ ${fmt(amt)} cobrado de ${cardPlayer.name}`,'success');
            setCardPlayer(null);
          }}
          onCancel={()=>setCardPlayer(null)}
        />
      )}
    </div>
  );
}

function PC({p,rank,expanded,mode,amt,rsn,onAmt,onRsn,onCredit,onDebit,onCancel,onSubmit,busy}){
  const rc=RC[rank-1]??'#4ade80';
  return (
    <div style={{borderRadius:'1rem',padding:'1rem',transition:'all 0.2s',background:expanded?'linear-gradient(135deg,rgba(20,42,22,0.98),rgba(13,25,14,0.98))':'linear-gradient(135deg,rgba(13,31,16,0.9),rgba(9,20,11,0.9))',border:`1px solid ${expanded?'rgba(245,158,11,0.4)':'var(--green-border)'}`,boxShadow:expanded?'0 8px 32px rgba(0,0,0,0.3)':'none'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.625rem'}}>
          <span style={{fontSize:'0.75rem',fontWeight:900,width:'1.25rem',textAlign:'right',color:rc}}>#{rank}</span>
          <div style={{flexShrink:0,width:'1.625rem',display:'flex',alignItems:'center',justifyContent:'center'}}><PinDisplay avatar={p.avatar} size={22}/></div>
          <span style={{color:'white',fontWeight:600,fontSize:'0.875rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'7rem'}}>{p.name}</span>
        </div>
        <span className="balance-text" style={{fontWeight:900,fontSize:'1.1rem',fontFamily:'monospace',color:'var(--gold)'}}>{fmt(p.balance)}</span>
      </div>
      {expanded?(
        <form onSubmit={onSubmit} style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
          <div style={{fontSize:'0.75rem',fontWeight:700,marginBottom:'0.25rem',color:mode==='credit'?'#4ade80':'#f87171'}}>{mode==='credit'?'+ Pagar a ':'− Cobrar de '}{p.name}</div>
          <input type="number" value={amt} onChange={e=>onAmt(e.target.value)} placeholder="Valor (M$)" min="1" max="1000000000" autoFocus required className="field" style={{fontSize:'0.875rem'}}/>
          <input type="text" value={rsn} onChange={e=>onRsn(e.target.value)} placeholder="Motivo — ex: Passou na Largada" maxLength={50} className="field" style={{fontSize:'0.875rem'}}/>
          <div style={{display:'flex',gap:'0.5rem',paddingTop:'0.25rem'}}>
            <button type="submit" disabled={busy} style={{flex:1,padding:'0.625rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',border:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'0.375rem',opacity:busy?0.5:1,...(mode==='credit'?{background:'linear-gradient(135deg,#16a34a,#15803d)',color:'white'}:{background:'linear-gradient(135deg,#dc2626,#b91c1c)',color:'white'})}}>
              {busy?<Loader2 style={{width:'0.875rem',height:'0.875rem',animation:'spin 0.7s linear infinite'}}/>:'✓ Confirmar'}
            </button>
            <button type="button" onClick={onCancel} style={{padding:'0.625rem 1rem',borderRadius:'0.75rem',fontSize:'0.875rem',cursor:'pointer',border:'none',background:'rgba(255,255,255,0.06)',color:'#86efac'}}>✕</button>
          </div>
        </form>
      ):(
        <div style={{display:'flex',gap:'0.5rem'}}>
          <button onClick={onCredit} style={{flex:1,padding:'0.5rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',background:'rgba(22,163,74,0.12)',border:'1px solid rgba(74,222,128,0.15)',color:'#4ade80'}}>+ Pagar</button>
          <button onClick={onDebit} style={{flex:1,padding:'0.5rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',background:'rgba(220,38,38,0.1)',border:'1px solid rgba(248,113,113,0.15)',color:'#f87171'}}>− Cobrar</button>
        </div>
      )}
    </div>
  );
}
function SC({icon,label,value,sm}){
  return (
    <div style={{borderRadius:'1rem',padding:'0.875rem',textAlign:'center',background:'rgba(13,31,16,0.8)',border:'1px solid var(--green-border)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.375rem',color:'#4ade80',fontSize:'0.6875rem',fontWeight:600,marginBottom:'0.375rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{icon} {label}</div>
      <div className="balance-text" style={{color:'white',fontWeight:900,fontSize:sm?'0.875rem':'1.5rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</div>
    </div>
  );
}
function TB({active,onClick,children}){
  return <button onClick={onClick} style={{display:'flex',alignItems:'center',padding:'0.5rem 1rem',borderRadius:'0.75rem',fontSize:'0.875rem',fontWeight:700,cursor:'pointer',transition:'all 0.15s',border:'none',...(active?{background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#0a1a0a',boxShadow:'0 4px 12px rgba(245,158,11,0.3)'}:{background:'rgba(255,255,255,0.04)',color:'#86efac',border:'1px solid var(--green-border)'})}}>{children}</button>;
}
