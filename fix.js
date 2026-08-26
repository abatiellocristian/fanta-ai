/* FantAbba — Operational Tools Engine
   Principles: real auction data first; transparent estimates; no invented fixtures.
*/
(()=>{
const $=id=>document.getElementById(id),n=v=>Number(v)||0,esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let DATA=[];
const ROLE_BUDGET={P:35,D:95,C:160,A:210},LIMITS={P:3,D:8,C:8,A:6};
const state=()=>JSON.parse(localStorage.getItem('fantabbaState')||'{"credits":500,"roster":{"P":[],"D":[],"C":[],"A":[]},"logs":[],"opponents":[]}');
const avg=p=>n(p.auctionAvg8x500??p.auctionAvg??p.averageAuction);
const roleBudget=r=>ROLE_BUDGET[r]||0;
function estimate(p){const a=avg(p);if(a>0)return a;const r=p.role||'C',f=n(p.fvm),q=n(p.quotation??p.price);if(f<=0)return Math.max(1,q);const same=DATA.filter(x=>x.role===r);const total=same.reduce((s,x)=>s+n(x.fvm),0);if(!total)return Math.max(1,q);return Math.max(1,Math.round(roleBudget(r)*f/total));}
const price=p=>avg(p)||estimate(p), real=p=>avg(p)>0;
const exp=p=>n(p.fantamedia)*6+n(p.media)*2+Math.min(n(p.presenze),38)*.12+n(p.gol??p.goals)*1.8+n(p.assist??p.assists)*1.2+n(p.titolarita??p.starter)*.04+n(p.fixtureScore)*1.5;
const val=p=>exp(p)/Math.max(price(p),1);
const owned=p=>{const s=state();return Object.values(s.roster||{}).flat().some(x=>String(x.name).toLowerCase()===String(p.name).toLowerCase())};
const sold=p=>{const s=state();return (s.logs||[]).some(x=>!x.mine&&String(x.player||'').toLowerCase()===String(p.name).toLowerCase())};
const available=p=>!owned(p)&&!sold(p);
const out=$('toolOutput');
function render(title,sub,arr,meta=''){if(!out)return;out.className='panel tool-output';out.innerHTML=`<div class="tool-result-head"><span class="kicker">FANTABBA LAB</span><h2>${title}</h2><p>${sub}</p>${meta?`<div class="tool-meta">${meta}</div>`:''}</div><div class="tool-results">${arr.map(x=>`<div class="plan-item"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')||'<div class="empty">Dati insufficienti.</div>'}</div>`;out.scrollIntoView({behavior:'smooth',block:'center'});}
function tools(k){
 const a=DATA.filter(available);
 if(k==='value')return render('Value Finder','Il valore non è il giocatore più forte: è quello che produce di più rispetto a ciò che l’asta ti chiede.',a.sort((x,y)=>(val(y)-val(x))).slice(0,30).map(p=>[`${esc(p.name)} · ${p.role} · ${esc(p.team)}`,`${real(p)?'media':'stima'} ${price(p)} cr · value ${val(p).toFixed(2)}`]));
 if(k==='risk')return render('Risk Radar','Punteggio trasparente: pochi dati, poche presenze o titolarità incerta aumentano il rischio.',a.map(p=>{let r=0;if(!real(p))r+=1;if(n(p.presenze)<20)r+=2;else if(n(p.presenze)<28)r+=1;if(n(p.titolarita)>0&&n(p.titolarita)<60)r+=1;if(!n(p.fantamedia)&&!n(p.media))r+=1;return [p,r]}).sort((x,y)=>y[1]-x[1]).slice(0,25).map(x=>[`${esc(x[0].name)} · ${x[0].role}`,`rischio ${x[1]}/5 · ${real(x[0])?'prezzo reale':'prezzo stimato'}`]));
 if(k==='fixture'){const z=a.filter(p=>n(p.fixtureScore)>0).sort((x,y)=>n(y.fixtureScore)-n(x.fixtureScore));return render('Fixture Optimizer','Solo dati calendario realmente presenti nel database. Se non ci sono, FantAbba non inventa un calendario.',z.slice(0,30).map(p=>[`${esc(p.name)} · ${esc(p.team)}`,`fixture ${n(p.fixtureScore).toFixed(1)}`]),z.length?'Indice calendario disponibile.':'Nessun indice calendario disponibile: usa Value/Risk fino all’aggiornamento del calendario.');}
 if(k==='pairing'){
   const z=[];
   ['D','C','A'].forEach(r=>{const x=a.filter(p=>p.role===r).sort((u,v)=>val(v)-val(u));for(let i=0;i<Math.min(10,x.length);i++)for(let j=i+1;j<Math.min(18,x.length);j++){if(x[i].team===x[j].team)continue;const fixture=(n(x[i].fixtureScore)+n(x[j].fixtureScore))/2;z.push({label:`${esc(x[i].name)} + ${esc(x[j].name)}`,score:val(x[i])+val(x[j])+fixture*.08,cost:price(x[i])+price(x[j])});}});z.sort((u,v)=>v.score-u.score);return render('Pairing','Coperture di reparto: giocatori diversi per squadra, costo compatibile e valore complementare.',z.slice(0,20).map(x=>[x.label,`${Math.round(x.cost)} cr · score ${x.score.toFixed(2)}`]));
 }
 if(k==='keepers'){
   const g=a.filter(p=>p.role==='P');const z=[];
   // In Classic, the most coherent goalkeeper pair is starter + reserve from the same club.
   const teams=[...new Set(g.map(p=>p.team))];
   teams.forEach(t=>{const x=g.filter(p=>p.team===t).sort((u,v)=>val(v)-val(u));if(x.length>=2)z.push({label:`${esc(x[0].name)} + ${esc(x[1].name)} · ${esc(t)}`,score:val(x[0])+val(x[1]),cost:price(x[0])+price(x[1]),real:real(x[0])&&real(x[1])});});
   g.sort((u,v)=>val(v)-val(u));for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++)if(g[i].team!==g[j].team)z.push({label:`${esc(g[i].name)} + ${esc(g[j].name)} · incrocio squadre`,score:val(g[i])+val(g[j])*.85,cost:price(g[i])+price(g[j]),real:real(g[i])&&real(g[j])});
   z.sort((u,v)=>v.score-u.score);return render('Griglia Portieri','Prima scelta: titolare + riserva dello stesso club. Le coppie di club diversi sono mostrate solo come alternativa.',z.slice(0,20).map(x=>[x.label,`${Math.round(x.cost)} cr · ${x.real?'media reale':'stima'} · score ${x.score.toFixed(2)}`]));
 }
 if(k==='budget'){
   const s=state(),remaining=s.credits,rows=['P','D','C','A'].map(r=>{const need=Math.max(0,LIMITS[r]-(s.roster[r]||[]).length),min=need,base=Math.round(remaining*roleBudget(r)/500),max=Math.max(0,remaining-(25-(Object.values(s.roster).flat().length+need)));return [`${r} · ${need} slot`,`${Math.min(base,remaining)} cr target · max teorico ${Math.max(min,max)} cr`];});return render('Budget Guard','La mediana delle aste 2026/27 è circa 35/95/160/210 su 500. Il tetto vero dipende dagli slot che devi ancora riempire.',rows,`Crediti residui: <b>${remaining}</b> · rosa: <b>${Object.values(s.roster).flat().length}/25</b>`);
 }
 if(k==='priceguard'){
   const s=state(),logs=(s.logs||[]).filter(x=>!x.mine&&x.price>0);const by={};logs.forEach(x=>{const key=String(x.player).toLowerCase();(by[key]??=[]).push(n(x.price));});const rows=a.map(p=>{const observed=by[p.name.toLowerCase()]||[];const live=observed.length?Math.round(observed.reduce((s,x)=>s+x,0)/observed.length):0;const market=avg(p);const ref=live||market||estimate(p);return {p,live,ref,delta:live&&market?live-market:0};}).filter(x=>x.live||real(x.p)).sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta));return render('Price Guard','Confronta il prezzo della tua asta con la media reale 8×500 e con gli acquisti registrati live.',rows.slice(0,30).map(x=>[`${esc(x.p.name)} · ${x.p.role}`,`${x.live?'live '+x.live+' cr · ':''}${x.market?'media '+x.market+' cr':'stima '+x.ref+' cr'}${x.delta?` · ${x.delta>0?'+':''}${x.delta}`:''}`]));
 }
 if(k==='sleepers'){
   const z=a.filter(p=>price(p)<=18&&n(p.presenze)>=15).sort((x,y)=>val(y)-val(x)).slice(0,30);return render('Sleeper Radar','Scommesse con costo contenuto e almeno un segnale statistico: non semplici nomi “a caso”.',z.map(p=>[`${esc(p.name)} · ${p.role} · ${esc(p.team)}`,`${price(p)} cr · exp ${exp(p).toFixed(1)} · ${real(p)?'media reale':'stima'}`]));
 }
 return render('Scenario Engine','Piano B automatico: alternative nello stesso ruolo e fascia di prezzo, evitando giocatori già assegnati.',a.sort((x,y)=>val(y)-val(x)).slice(0,30).map(p=>[`${esc(p.name)} · ${p.role} · ${esc(p.team)}`,`max indicativo ${Math.round(price(p)*1.03)} cr · ${real(p)?'media reale':'stima'}`]));
}
async function load(){try{const r=await fetch('data/players.json?ts='+Date.now(),{cache:'no-store'});const x=await r.json();if(Array.isArray(x))DATA=x}catch(e){DATA=[]}}
function bind(){document.querySelectorAll('.tool[data-tool]').forEach(b=>{b.type='button';b.disabled=false;b.style.pointerEvents='auto';b.style.cursor='pointer';b.onclick=e=>{e.preventDefault();e.stopPropagation();tools(b.dataset.tool)}})}
load().finally(bind);
})();
