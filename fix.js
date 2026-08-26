(()=>{
const $=id=>document.getElementById(id);
const n=v=>Number(v)||0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let DATA=[];
const state=()=>JSON.parse(localStorage.getItem('fantabbaState')||'{"credits":500,"roster":{"P":[],"D":[],"C":[],"A":[]},"logs":[],"opponents":[]}');
const avg=p=>n(p.auctionAvg8x500??p.auctionAvg??p.averageAuction);
const price=p=>avg(p)||n(p.quotation??p.price)||Math.max(1,Math.round(n(p.fvm)/10));
const exp=p=>n(p.fantamedia)*6+n(p.media)*2+Math.min(n(p.presenze),38)*.12+n(p.gol??p.goals)*1.8+n(p.assist??p.assists)*1.2+n(p.titolarita??p.starter)*.04+n(p.fixtureScore)*1.5;
const val=p=>exp(p)/Math.max(price(p),1);
const available=p=>{const s=state(),owned=Object.values(s.roster||{}).flat().some(x=>String(x.name).toLowerCase()===String(p.name).toLowerCase()),sold=(s.logs||[]).some(x=>!x.mine&&String(x.player||'').toLowerCase()===String(p.name).toLowerCase());return !owned&&!sold};
const out=$('toolOutput');
function render(title,sub,arr){if(!out)return;out.className='panel tool-output';out.innerHTML=`<div class="tool-result-head"><span class="kicker">FANTABBA LAB</span><h2>${title}</h2><p>${sub}</p></div><div class="tool-results">${arr.map(x=>`<div class="plan-item"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')||'<div class="empty">Dati insufficienti.</div>'}</div>`;out.scrollIntoView({behavior:'smooth',block:'center'});}
function tools(k){
 const a=DATA.filter(available);
 if(k==='value') return render('Value Finder','Miglior rapporto tra rendimento atteso e costo.',a.sort((x,y)=>val(y)-val(x)).slice(0,30).map(p=>[`${esc(p.name)} · ${p.role} · ${esc(p.team)}`,`value ${val(p).toFixed(2)} · base ${price(p)} cr`]));
 if(k==='risk') return render('Risk Radar','Rischio basato esclusivamente sui dati presenti.',a.map(p=>{let r=(!avg(p)?2:0)+(n(p.presenze)<20?2:0)+(n(p.titolarita)>0&&n(p.titolarita)<60?1:0);return [p,r]}).sort((x,y)=>y[1]-x[1]).slice(0,25).map(x=>[`${esc(x[0].name)} · ${x[0].role}`,`rischio ${x[1]}/5`]));
 if(k==='fixture') return render('Fixture Optimizer','Usa fixtureScore solo quando il dato è realmente presente.',a.filter(p=>n(p.fixtureScore)>0).sort((x,y)=>n(y.fixtureScore)-n(x.fixtureScore)).slice(0,25).map(p=>[`${esc(p.name)} · ${esc(p.team)}`,`fixture ${n(p.fixtureScore).toFixed(1)}`]));
 if(k==='pairing') {let z=[];['D','C','A'].forEach(r=>{const x=a.filter(p=>p.role===r).sort((u,v)=>val(v)-val(u)).slice(0,8);if(x.length>=2)for(let i=0;i<Math.min(3,x.length-1);i++)z.push([`${esc(x[i].name)} + ${esc(x[i+1].name)}`,`value ${(val(x[i])+val(x[i+1])).toFixed(2)}`]);});return render('Pairing','Coppie di reparto basate sul valore disponibile.',z.slice(0,12));}
 if(k==='keepers'){const x=a.filter(p=>p.role==='P').sort((u,v)=>val(v)-val(u)).slice(0,12),z=[];for(let i=0;i<x.length;i++)for(let j=i+1;j<x.length;j++)z.push([`${esc(x[i].name)} + ${esc(x[j].name)}`,`${Math.round(price(x[i])+price(x[j]))} cr · value ${(val(x[i])+val(x[j])).toFixed(2)}`]);return render('Coppia portieri','Combinazioni ordinate per valore complessivo.',z.slice(0,20));}
 return render('Scenario Engine','Alternative da usare se perdi un obiettivo.',a.sort((x,y)=>val(y)-val(x)).slice(0,25).map(p=>[`${esc(p.name)} · ${esc(p.team)}`,`budget indicativo ${Math.round(price(p)*1.05)} cr`]));
}
async function load(){try{const r=await fetch('data/players.json?ts='+Date.now(),{cache:'no-store'});const x=await r.json();if(Array.isArray(x))DATA=x}catch(e){DATA=[]}}
function bind(){document.querySelectorAll('.tool[data-tool]').forEach(b=>{b.type='button';b.disabled=false;b.style.pointerEvents='auto';b.style.cursor='pointer';b.onclick=e=>{e.preventDefault();e.stopPropagation();tools(b.dataset.tool)}})}
load().finally(bind);
})();