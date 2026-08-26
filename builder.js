/* FantAbba — Realistic Squad Builder 8x500
   Exact 3P/8D/8C/6A, total cost <= selected budget.
   Uses real auction averages when available; otherwise a clearly marked market estimate
   derived from quotation/FVM so the squad can still be completed with the current dataset.
*/
(function(){
  const limits={P:3,D:8,C:8,A:6};
  const roles=['P','D','C','A'];
  const el=id=>document.getElementById(id);
  const num=v=>Math.round(Number(v)||0);
  const esc2=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function avgPrice(p){
    const real=num(p.auctionAvg8x500)||num(p.auctionAvg)||num(p.averageAuction);
    if(real>0)return {price:real,source:'MEDIA 8×500'};
    const q=num(p.quotation), f=num(p.fvm);
    const estimate=Math.max(1, q || Math.round(f/10) || 1);
    return {price:estimate,source:'STIMA'};
  }
  function score(p,style){
    const fm=Number(p.fantamedia)||0, mv=Number(p.media)||0, g=Number(p.gol??p.goals)||0, a=Number(p.assist??p.assists)||0;
    const exp=(typeof expected==='function'?expected(p):(fm*6+mv*2+g*1.8+a*1.2));
    const ap=avgPrice(p).price;
    const value=exp/Math.max(ap,1);
    const fixture=Number(p.fixtureScore)||0;
    const tit=Number(p.titolarita??p.starter)||0;
    let s=exp + value*3 + fixture*1.5 + tit*.03;
    if(style==='value')s += value*8;
    if(style==='stars')s += exp*.08;
    if(style==='safe')s += mv*.8 + tit*.04;
    return s;
  }
  function eligible(r){
    const used=typeof myNames==='function'?myNames():[];
    return (players||[]).filter(p=>p.role===r && p.name && !used.includes(p.name.toLowerCase()) && !(typeof sold==='function'&&sold(p.name))).map(p=>{const a=avgPrice(p);return {...p,_cost:a.price,_source:a.source,_score:score(p,el('buildStyle')?.value||'balanced')};});
  }
  // Exact-count knapsack for each role. State[b] = best combination using exactly k slots.
  function solveRole(items,count,budget){
    const dp=Array.from({length:count+1},()=>Array(budget+1).fill(null));
    dp[0][0]={score:0,items:[]};
    for(const p of items){
      for(let k=count;k>=1;k--){
        for(let b=budget;b>=p._cost;b--){
          const prev=dp[k-1][b-p._cost];
          if(!prev)continue;
          const cand={score:prev.score+p._score,items:prev.items.concat(p)};
          if(!dp[k][b]||cand.score>dp[k][b].score)dp[k][b]=cand;
        }
      }
    }
    return dp[count];
  }
  function buildRealistic(){
    const budget=Math.max(1,num(el('buildBudget')?.value)||500);
    const style=el('buildStyle')?.value||'balanced';
    const weights={P:.08,D:.20,C:.32,A:.40};
    const minRole={P:3,D:8,C:8,A:6};
    // Allocate a flexible budget: no role is forced to spend its percentage; exact total is the priority.
    const roleCaps={P:Math.min(budget,Math.round(budget*.18)),D:Math.min(budget,Math.round(budget*.32)),C:Math.min(budget,Math.round(budget*.55)),A:Math.min(budget,Math.round(budget*.65))};
    const roleOptions={};
    for(const r of roles){
      const items=eligible(r).sort((a,b)=>b._score-a._score);
      roleOptions[r]=solveRole(items,minRole[r],budget);
      if(!roleOptions[r].some(Boolean)){
        el('builderResult').className='builder-result empty';
        el('builderResult').innerHTML='<b>Impossibile generare una rosa completa.</b><p>Non ci sono abbastanza giocatori con un costo valido nel database.</p>';
        return;
      }
    }
    // Combine role solutions. Search all reachable budget totals and maximize score.
    let combos=[{cost:0,score:0,groups:{}}];
    for(const r of roles){
      const opts=[];
      for(let b=0;b<=budget;b++){if(roleOptions[r][b])opts.push({cost:b,...roleOptions[r][b]});}
      const next=[];
      for(const c of combos)for(const o of opts){
        const cost=c.cost+o.cost;if(cost>budget)continue;
        next.push({cost,score:c.score+o.score,groups:{...c.groups,[r]:o}});
      }
      // Keep only the strongest state per exact cost.
      const best=new Map();
      for(const x of next){const old=best.get(x.cost);if(!old||x.score>old.score)best.set(x.cost,x);}
      combos=[...best.values()];
    }
    combos.sort((a,b)=>b.score-a.score || b.cost-a.cost);
    const best=combos[0];
    if(!best||!best.groups.A||!best.groups.C||!best.groups.D||!best.groups.P){
      el('builderResult').className='builder-result empty';el('builderResult').innerHTML='<b>Nessuna rosa realizzabile entro '+budget+' crediti.</b>';return;
    }
    const roster={};roles.forEach(r=>roster[r]=best.groups[r].items);
    const real=Object.values(roster).flat().filter(p=>p._source==='MEDIA 8×500').length;
    const estimated=25-real;
    let html='<div class="build-total"><div><b>ROSA REALIZZABILE</b><small>3 P · 8 D · 8 C · 6 A</small></div><strong>'+best.cost+' / '+budget+' crediti</strong></div>';
    html+='<div class="builder-note"><b>Prezzi usati:</b> '+real+' medie d\'asta 8×500 reali · '+estimated+' stime. Le stime sono necessarie solo perché il database attuale non ha ancora una media reale per tutti i giocatori; non vengono spacciate per prezzi medi.</div>';
    html+='<div class="build-grid">';
    for(const r of roles){
      html+='<div class="build-card"><h3>'+r+' '+roster[r].length+'/'+limits[r]+'</h3>';
      for(const p of roster[r].slice().sort((a,b)=>b._score-a._score)){
        html+='<div class="plan-item"><span><b>'+esc2(p.name)+'</b> · '+esc2(p.team)+' <small class="price-source">'+p._source+'</small></span><b>'+p._cost+'</b></div>';
      }
      html+='</div>';
    }
    html+='</div><div class="builder-footer"><span>Spesa totale <b>'+best.cost+'</b></span><span>Avanzo <b>'+(budget-best.cost)+'</b></span><span>Giocatori <b>25/25</b></span></div>';
    el('builderResult').className='builder-result';el('builderResult').innerHTML=html;
  }
  window.fantabbaBuildRealistic=buildRealistic;
  document.addEventListener('DOMContentLoaded',()=>{const b=el('buildBtn');if(b)b.onclick=buildRealistic;});
})();
