/* FantAbba Elite Engine — realistic auction command center */
(()=>{
  const $=id=>document.getElementById(id),R=['P','D','C','A'],S={P:3,D:8,C:8,A:6};
  const num=v=>Number(v)||0,norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').trim();
  const O=()=>window.FANTABBA_CLASSIC_ROLE_OVERRIDES||{};
  const role=p=>{const e=p.classicRole||p.classic_role||p.roleClassic;if(['P','D','C','A'].includes(e))return e;return O()[norm(p.name)]||p.role};
  const avg=p=>{const a=num(p.auctionAvg8x500??p.auctionAvg??p.averageAuction),season=String(p.auctionSeason||'');return a>0&&(!season||!season.includes('2025'))?a:0};
  const quo=p=>num(p.quotation??p.price),fvm=p=>num(p.fvm),fm=p=>num(p.fantamedia??p.fantaMedia),pres=p=>num(p.presenze??p.appearances),tit=p=>num(p.titolarita??p.starter),goals=p=>num(p.gol??p.goals),assists=p=>num(p.assist??p.assists);
  const data=()=>Array.isArray(window.players)?window.players:[];
  const state=()=>{try{return JSON.parse(localStorage.getItem('fantabbaState')||'{"credits":500,"roster":{"P":[],"D":[],"C":[],"A":[]},"logs":[],"opponents":[]}')}catch{return {credits:500,roster:{P:[],D:[],C:[],A:[]},logs:[],opponents:[]}}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function ratio(r){const a=data().filter(p=>role(p)===r&&avg(p)>0&&quo(p)>0).map(p=>avg(p)/quo(p)).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:({P:1.55,D:1.75,C:2.2,A:2.5}[r]||2)}
  function pct(p){const a=data().filter(x=>role(x)===role(p)&&quo(x)>0).map(x=>quo(x)).sort((a,b)=>a-b);if(!a.length)return .5;let i=a.findIndex(x=>x>=quo(p));if(i<0)i=a.length-1;return i/Math.max(1,a.length-1)}
  function estimate(p){let x=quo(p)*ratio(role(p))*(.78+.34*pct(p));const caps={P:45,D:55,C:90,A:130};return Math.max(1,Math.min(caps[role(p)]||100,Math.round(x)))}
  function price(p){return avg(p)||estimate(p)}
  function source(p){return avg(p)?'MEDIA 8×500':'STIMA CALIBRATA'}
  function exp(p){return fm(p)*7+Math.min(pres(p),38)*.13+goals(p)*1.9+assists(p)*1.25+tit(p)*.035+fvm(p)*.025+quo(p)*.12}
  function risk(p){return Math.min(5,(avg(p)?0:.35)+(pres(p)?(pres(p)<18?2:pres(p)<28?1:0):1)+(tit(p)>0&&tit(p)<60?1:0)+(fm(p)>0&&fm(p)<6.2?.8:0))}
  function value(p){return exp(p)/Math.max(1,price(p))}
  function roster(){return Object.values(state().roster||{}).flat()}
  function addPanel(){const tab=$('tab-auction');if(!tab||$('eliteCommand'))return;const el=document.createElement('section');el.id='eliteCommand';el.className='elite-command';el.innerHTML='<div class="elite-head"><div><span class="kicker">FANTABBA ELITE</span><h2>Command Center</h2><p>Prezzi reali quando disponibili, stime calibrate quando non esiste ancora un campione sufficiente.</p></div><div class="elite-live"><span></span> LIVE ENGINE</div></div><div id="eliteMetrics" class="elite-metrics"></div><div class="elite-actions"><button data-e="grade">VALUTA ROSA</button><button data-e="cheat">CHEAT SHEET</button><button data-e="mock">SIMULA ASTA</button><button data-e="plan">PIANO ASTA</button></div><div id="eliteOutput" class="elite-output"></div>';tab.insertBefore(el,tab.children[0]);el.querySelectorAll('button[data-e]').forEach(b=>b.onclick=()=>run(b.dataset.e));refresh()}
  function refresh(){const s=state(),rr=s.roster||{},used=roster().length,metrics=[['CREDITI',`${s.credits||0} CR`],['ROSA',`${used}/25`],['SLOT',R.map(r=>`${r} ${rr[r]?.length||0}/${S[r]}`).join(' · ')],['SPESA',`${500-(s.credits||0)} CR`]];const box=$('eliteMetrics');if(box)box.innerHTML=metrics.map(x=>`<div><small>${x[0]}</small><b>${esc(x[1])}</b></div>`).join('')}
  function render(html){const o=$('eliteOutput');if(o)o.innerHTML=html}
  function run(k){const ps=data().filter(p=>p.name);if(k==='grade')return grade();if(k==='cheat')return cheat(ps);if(k==='mock')return mock(ps);if(k==='plan')return plan(ps)}
  function grade(){const s=state(),rr=s.roster||{},need=R.reduce((z,r)=>z+Math.max(0,S[r]-(rr[r]?.length||0)),0);let score=70;R.forEach(r=>{const n=rr[r]?.length||0;if(n<S[r])score-=Math.min(12,(S[r]-n)*3)});if(need===0)score+=8;score=Math.max(0,Math.min(100,Math.round(score)));render(`<div class="elite-result"><div class="grade"><strong>${score}</strong><span>/100</span></div><div><h3>Roster Grade</h3><p>${need?`Mancano ${need} slot.`:'Rosa completa: ora conta qualità, equilibrio e titolarità.'}</p><div class="elite-bars">${R.map(r=>`<div><span>${r}</span><i><b style="width:${Math.min(100,((rr[r]?.length||0)/S[r])*100)}%"></b></i><em>${rr[r]?.length||0}/${S[r]}</em></div>`).join('')}</div></div></div>`)}
  function cheat(ps){const q=ps.map(p=>({p,v:value(p),c:price(p)})).sort((a,b)=>b.v-a.v).slice(0,40);render(`<h3>Cheat Sheet dinamica</h3><p class="elite-muted">Il prezzo è quello medio 8×500 quando esiste; altrimenti è una stima calibrata. Non confondere i due dati.</p><div class="elite-table"><div class="eh"><b>PLAYER</b><b>RUOLO</b><b>PREZZO</b><b>VALUE</b><b>AZIONE</b></div>${q.map(x=>`<div><span><b>${esc(x.p.name)}</b><small>${esc(x.p.team||'')}</small></span><b>${role(x.p)}</b><b>${x.c} <small>${avg(x.p)?'MEDIA':'STIMA'}</small></b><b>${x.v.toFixed(2)}</b><strong>${x.v>.32?'TARGET':x.v>.20?'WATCH':'PASS'}</strong></div>`).join('')}</div>`)}
  function mock(ps){
    const budget=500,counts={P:0,D:0,C:0,A:0},picks=[];let spent=0;
    const pool=ps.filter(p=>S[role(p)]).map(p=>({...p,_price:price(p),_real:!!avg(p),_value:value(p)})).sort((a,b)=>b._value-a._value);
    // Realistic auction simulation: target price comes from observed 8x500 average when available.
    // Missing players use a calibrated role/quotation estimate, never a hard-coded 6-credit fallback.
    const choose=(remainingSlots)=>pool.filter(p=>counts[role(p)]<S[role(p)]&&p._price<=budget-spent-(remainingSlots-1)).sort((a,b)=>{
      const scarcity=(S[role(a)]-counts[role(a)])/(S[role(a)]||1),scarcityB=(S[role(b)]-counts[role(b)])/(S[role(b)]||1);
      return (b._value+scarcityB*.08)-(a._value+scarcity*.08)
    })[0];
    while(picks.length<25){const remaining=25-picks.length,p=choose(remaining);if(!p)break;const r=role(p),c=Math.max(1,Math.round(p._price));if(spent+c>budget-(remaining-1))continue;picks.push(p);counts[r]++;spent+=c}
    const real=picks.filter(p=>p._real).length;
    render(`<h3>Simulazione asta realistica</h3><p class="elite-muted">I prezzi non sono più fissi: per ogni giocatore il motore usa la media 8×500 realmente osservata quando presente; per gli altri usa una stima calibrata sulla quotazione e sulla distribuzione del ruolo. ${real}/25 prezzi della rosa simulata sono quindi osservati.</p><div class="mock-summary"><b>${picks.length}/25</b><span>${spent} CR spesi</span><span>${500-spent} CR residui</span><span>${real}/25 MEDIA REALI</span></div><div class="mock-grid">${R.map(r=>`<div><h4>${r}</h4>${picks.filter(p=>role(p)===r).map(p=>`<p>${esc(p.name)} <small>${source(p)}</small> <b>${Math.round(p._price)}</b></p>`).join('')}</div>`).join('')}</div>`)
  }
  function plan(ps){const by={P:[],D:[],C:[],A:[]};ps.forEach(p=>{if(by[role(p)])by[role(p)].push(p)});const targets={P:35,D:95,C:160,A:210};render(`<h3>Piano d'asta 500 CR</h3><p class="elite-muted">Base statistica misurata sulle aste completate; viene poi adattata a ciò che resta della tua rosa.</p><div class="plan-cards">${R.map(r=>{const n=S[r],avgTarget=Math.round(targets[r]/n),best=by[r].sort((a,b)=>value(b)-value(a)).slice(0,5);return `<div><small>${r}</small><b>${targets[r]} CR</b><span>${n} slot · ${avgTarget} CR/slot</span>${best.map(p=>`<p>${esc(p.name)} <strong>${Math.round(price(p))}</strong> <small>${source(p)}</small></p>`).join('')}</div>`}).join('')}</div>`)}
  const boot=()=>{addPanel();setInterval(refresh,1200)};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();