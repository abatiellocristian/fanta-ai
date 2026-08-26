/* FantAbba — Classic role normalization
   Priority: explicit classicRole/classic_role > verified 2026/27 overrides > imported role.
   The overrides below are verified against the 2026/27 Fantacalcio.it Classic list. */
(function(){
  const O={
    'yildiz':'A','kenan yildiz':'A',
    'dybala':'A','paulo dybala':'A',
    'soulè':'A','soule':'A','matias soulè':'A','matias soule':'A',
    'zaniolo':'C','nicolò zaniolo':'C','nicolo zaniolo':'C',
    'dimarco':'D','federico dimarco':'D',
    'orsolini':'C','riccardo orsolini':'C',
    'pulisic':'C','christian pulisic':'C',
    'de bruyne':'C','kevin de bruyne':'C',
    'paz n.':'C','nico paz':'C','nico paz.':'C',
    'mctominay':'C','scott mctominay':'C',
    'rabiot':'C','adrien rabiot':'C',
    'barella':'C','nicolo barella':'C','niccolò barella':'C',
    'calhanoglu':'C','hakan calhanoglu':'C',
    'thuram k.':'C','khéphren thuram':'C','khephren thuram':'C',
    'mckennie':'C','weston mckennie':'C',
    'lautaro martinez':'A','martinez l.':'A','lautaro':'A',
    'malen':'A','donyell malen':'A',
    'thura m.':'A','thuram':'A','marcus thuram':'A',
    'hojlund':'A','rasmus hojlund':'A',
    'ramos g.':'A','goncalo ramos':'A','gonçalo ramos':'A',
    'kean':'A','moise kean':'A','kolo muani':'A','r. kolo muani':'A'
  };
  window.FANTABBA_CLASSIC_ROLE_OVERRIDES=O;
  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/\s+/g,' ').trim();}
  function apply(){
    if(typeof players==='undefined'||!Array.isArray(players))return false;
    let changed=0;
    players.forEach(p=>{
      const explicit=p.classicRole||p.classic_role||p.roleClassic;
      const key=norm(p.name);
      const wanted=explicit?String(explicit).charAt(0).toUpperCase():O[key]||O[norm(p.name).replace(/^.*\s/,'')];
      if(['P','D','C','A'].includes(wanted)&&p.role!==wanted){p.role=wanted;changed++;}
      p.classicRole=p.role;
    });
    if(changed&&typeof renderAll==='function')renderAll();
    return true;
  }
  const start=Date.now();
  const timer=setInterval(()=>{if(apply()||Date.now()-start>8000)clearInterval(timer)},100);
})();
