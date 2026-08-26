/* FantAbba — Definitive realistic Squad Builder 2026/27
   Classic: exactly 3 P / 8 D / 8 C / 6 A.
   Objective: maximize expected fantasy output subject to the real 500-credit constraint.
   Real 8x500 auction averages are always preferred. Missing averages are transparent estimates
   based on FVM/quotation and are never labelled as real auction data.
*/
(function(){
  const LIMITS={P:3,D:8,C:8,A:6}, ROLES=['P','D','C','A'];
  const ROLE_TARGET={P:35,D:95,C:160,A:210};
  const el=id=>document.getElementById(id), num=v=>Math.round(Number(v)||0);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const overrides=window.FANTABBA_CLASSIC_ROLE_OVERRIDES||{};
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();
  function roleOf(p){const explicit=p.classicRole||p.classic_role||p.roleClassic;if(['P','D','C','A'].includes(explicit))return explicit;const k=norm(p.name);return overrides[k]||p.role;}
  function realAvg(p){return num(p.auctionAvg8x500??p.auctionAvg??p.averageAuction);}
  function estimate(p){const f=num(p.fvm),q=num(p.quotation??p.price);if(f>0)return Math.max(1,Math.min(180,Math.round(f*.40)));return Math.max(1,q||1);}
  function cost(p){const a=realAvg(p);return {value:a||estimate(p),real:a>0};}
  function expected(p){
    const fm=Number(p.fantamedia)||0,mv=Number(p.media)||0,apps=Number(p.presenze)||0,g=Number(p.gol??p.goals)||0,a=Number(p.assist??p.assists)||0,t=Number(p.titolarita??p.starter)||0;
    let x=fm*6+mv*2+Math.min(apps,38)*.12+g*1.8+a*1.2+t*.04+Number(p.fixtureScore||0)*1.5;
    if(!x)x=(Number(p.fvm)||0)*.025+(Number(p.quotation||0)||0)*.4;
    return x;
  }
  function risk(p){let r=0;if(!realAvg(p))r+=.5;if(num(p.presenze)<20)r+=1.5;else if(num(p.presenze)<28)r+=.7;if(num(p.titolarita)>0&&num(p.titolarita)<60)r+=1;return r;}
  function score(p,style){
    const c=cost(p).value,e=expected(p),v=e/Math.max(c,1),r=risk(p);
    let s=e+v*7;
    if(style==='value')s+=v*12;
    if(style==='stars')s+=e*.10+(p.role==='A'?2:0);
    if(style==='safe')s+=e-r*3;
    if(style==='calendar')s+=Number(p.fixtureScore||0)*2-v*.2;
    return s;
  }
  function available(r){
    const used=typeof myNames==='function'?myNames():[];
    return (players||[]).filter(p=>roleOf(p)===r&&p.name&&!used.includes(String(p.name).toLowerCase())&&!(typeof sold==='function'&&sold(p.name))).map(p=>{const c=cost(p);return {...p,role:r,_cost:c.value,_real:c.real,_score:score(p,el('buildStyle')?.value||'balanced')};});
  }
  // Exact-count knapsack: dp[k][budget] = best score for exactly k players at exactly that cost.
  function solve(items,count,budget){
    const dp=Array.from({length:count+1},()=>Array(budget+1).fill(null));dp[0][0]={score:0,items:[]};
    for(const p of items){
      for(let k=count;k>=1;k--){
        for(let b=budget;b>=p._cost;b--){
          const prev=dp[k-1][b-p._cost];if(!prev)continue;
          const candidate={score:prev.score+p._score,items:prev.items.concat(p)};
          if(!dp[k][b]||candidate.score>dp[k][b].score)dp[k][b]=candidate;
        }
      }
    }
    return dp[count];
  }
  function build(){
    const budget=Math.max(25,Math.min(500,num(el('buildBudget')?.value)||500)),style=el('buildStyle')?.value||'balanced';
    const options={};
    for(const r of ROLES){
      const items=available(r).sort((a,b)=>b._score-a._score);
      options[r]=solve(items,LIMITS[r],budget);
      if(!options[r].some(Boolean)){el('builderResult').className='builder-result empty';el('builderResult').innerHTML='<b>Impossibile completare la rosa.</b><p>Il database non contiene abbastanza giocatori acquistabili per il ruolo '+r+'.</p>';return;}
    }
    let states=[{cost:0,score:0,groups:{}}];
    for(const r of ROLES){
      const next=[];
      for(let b=0;b<=budget;b++){const o=options[r][b];if(!o)continue;for(const s of states){const total=s.cost+b;if(total<=budget)next.push({cost:total,score:s.score+o.score,groups:{...s.groups,[r]:o}});}}
      const best=new Map();for(const s of next){const old=best.get(s.cost);if(!old||s.score>old.score)best.set(s.cost,s);}states=[...best.values()];
    }
    states.sort((a,b)=>b.score-a.score||b.cost-a.cost);const best=states[0];
    if(!best||ROLES.some(r=>!best.groups[r]||best.groups[r].items.length!==LIMITS[r])){el('builderResult').className='builder-result empty';el('builderResult').innerHTML='<b>Nessuna rosa completa entro '+budget+' crediti.</b>';return;}
    const roster=Object.fromEntries(ROLES.map(r=>[r,best.groups[r].items]));
    const flat=ROLES.flatMap(r=>roster[r]),real=flat.filter(p=>p._real).length,est=25-real;
    const spend=flat.reduce((s,p)=>s+p._cost,0),remain=budget-spend;
    const roleSpend=ROLES.map(r=>`${r} ${roster[r].reduce((s,p)=>s+p._cost,0)}`).join(' · ');
    let html=`<div class="build-total"><div><b>ROSA COMPLETA E ACQUISTABILE</b><small>3 P · 8 D · 8 C · 6 A · ${roleSpend}</small></div><strong>${spend} / ${budget} crediti</strong></div>`;
    html+=`<div class="builder-note"><b>Metodo:</b> ottimizzazione a budget con 25 slot obbligatori. ${real} prezzi sono medie d'asta 8×500 disponibili; ${est} sono stime trasparenti basate su FVM/quotazione. <b>Non sono prezzi reali.</b></div>`;
    html+='<div class="build-grid">';
    for(const r of ROLES){html+=`<div class="build-card"><h3>${r} ${roster[r].length}/${LIMITS[r]}</h3>`;for(const p of roster[r].slice().sort((a,b)=>b._score-a._score)){html+=`<div class="plan-item"><span><b>${esc(p.name)}</b> · ${esc(p.team)} <small class="price-source ${p._real?'real':'estimate'}">${p._real?'MEDIA 8×500':'STIMA'}</small></span><b>${p._cost}</b></div>`;}html+='</div>';}
    html+=`</div><div class="builder-footer"><span>Spesa <b>${spend}</b></span><span>Avanzo <b>${remain}</b></span><span>Slot <b>25/25</b></span></div>`;
    el('builderResult').className='builder-result';el('builderResult').innerHTML=html;
  }
  window.fantabbaBuildRealistic=build;document.addEventListener('DOMContentLoaded',()=>{const b=el('buildBtn');if(b)b.onclick=build;});
})();
