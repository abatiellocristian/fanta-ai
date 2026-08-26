import json,re,unicodedata
from pathlib import Path
import pandas as pd
FCO='https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi'
FC='https://www.fantacalcio.it/quotazioni-fantacalcio/2026-27'
OUT=Path('data/players.json')
def norm(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]','',x)
def pick(df, needles):
    for c in df.columns:
        s=str(c).lower()
        if any(n in s for n in needles): return c
    return None
def num(x):
    try:return float(str(x).replace('.','').replace(',','.'))
    except:return None
fco=pd.read_html(FCO)
ft=max(fco,key=lambda d: len(d)); ft.columns=[str(c) for c in ft.columns]
name=pick(ft,['nome','calciatore']); team=pick(ft,['squadra']); cols=[c for c in ft.columns if '500' in c and '8' in c]
if not name or not cols: raise RuntimeError('FCO table structure changed')
avg=cols[0]; rows={}
for _,r in ft.iterrows():
    nm=str(r.get(name,'')).strip()
    if nm:
        key=(norm(nm),norm(r.get(team,''))); rows[key]=num(r.get(avg))
fc_tables=pd.read_html(FC)
ct=max(fc_tables,key=lambda d: len(d)); ct.columns=[str(c) for c in ct.columns]
cn=pick(ct,['calciatore']); cs=pick(ct,['sq']); cq=pick(ct,['qi']); cf=pick(ct,['fvm']); cr=pick(ct,['ruolo'])
if not cn: raise RuntimeError('Fantacalcio table structure changed')
players=[]
for _,r in ct.iterrows():
    nm=str(r.get(cn,'')).strip(); tm=str(r.get(cs,'')).strip()
    if not nm: continue
    rr=str(r.get(cr,'')).strip().upper() if cr else ''
    rr={'PORTIERE':'P','DIFENSORE':'D','CENTROCAMPISTA':'C','ATTACCANTE':'A'}.get(rr,rr[:1])
    key=(norm(nm),norm(tm)); v=rows.get(key)
    if v is None:
        matches=[val for (nn,_),val in rows.items() if nn==norm(nm) and val is not None]
        v=matches[0] if len(matches)==1 else None
    p={'name':nm,'team':tm,'role':rr,'quotation':num(r.get(cq)),'fvm':num(r.get(cf)),'auctionAvg8x500':v,'auctionAvg':v,'auctionSource':'Fantacalcio-Online 8 sq / 500' if v is not None else None}
    if p['quotation'] is not None:p['quotation']=int(round(p['quotation']))
    if p['fvm'] is not None:p['fvm']=int(round(p['fvm']))
    if v is not None:p['auctionAvg8x500']=p['auctionAvg']=round(v,2)
    players.append(p)
players=[p for p in players if p['name'] and p['role'] in ['P','D','C','A']]
OUT.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Wrote {len(players)} players; with current 8x500 auction data: {sum(p["auctionAvg8x500"] is not None for p in players)}')
