import json,re,unicodedata
from pathlib import Path
from datetime import datetime,timezone
import requests
from bs4 import BeautifulSoup

LISTONE='https://www.fantapazz.com/fantacalcio/listone-e-quotazioni'
FCO='https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi'
OUT=Path('data/players.json'); META=Path('data/meta.json')
H={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36','Accept-Language':'it-IT,it;q=0.9,en;q=0.8'}
ROLES={'P':'P','D':'D','C':'C','A':'A'}
# Classic-role corrections maintained separately from the public listone parser.
# Yildiz is intentionally A for the Classic configuration requested for FantAbba.
ROLE_OVERRIDES={'yildiz':'A','dybala':'A','soule':'A','zaniolo':'C','pulisic':'C','dimarco':'D','orsolini':'C','debruyne':'C','mctominay':'C','rabiot':'C'}

def norm(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]','',x)

def num(x):
    try:
        s=str(x).strip().replace('\xa0','')
        return float(s.replace('.','').replace(',','.'))
    except:return None

def get_html(url):
    r=requests.get(url,headers=H,timeout=45); r.raise_for_status(); return r.text

def parse_listone(html):
    soup=BeautifulSoup(html,'html.parser'); rows=[]; seen=set()
    for tr in soup.select('tr'):
        cells=[c.get_text(' ',strip=True) for c in tr.select('td')]
        if len(cells)<4: continue
        role=None; role_i=None
        for i,c in enumerate(cells[:2]):
            if c.strip().upper() in ROLES: role=c.strip().upper(); role_i=i; break
        if not role: continue
        name=cells[1] if role_i==0 else cells[0]
        q=None; team=''
        for c in cells[2:]:
            n=num(c)
            if q is None and n is not None and 1<=n<=100: q=int(round(n)); continue
            if c and c.upper() not in ROLES and len(c)<=6: team=c.strip().upper()
        if not name or q is None: continue
        role=ROLE_OVERRIDES.get(norm(name),role)
        key=(norm(name),team,role)
        if key not in seen:
            seen.add(key); rows.append({'name':name,'team':team,'role':role,'quotation':q})
    return rows

def parse_fco():
    try:
        import pandas as pd
        tables=pd.read_html(get_html(FCO))
        df=max(tables,key=len); df.columns=[str(c) for c in df.columns]
        def find(terms):
            for c in df.columns:
                if any(t in str(c).lower() for t in terms): return c
        fn=find(['nome','calciatore']); ft=find(['squadra','sq']); fr=None; fa=None
        for c in df.columns:
            vals=df[c].astype(str).str.strip().str.upper()
            if vals.isin(['P','D','C','A']).sum()>20: fr=c
            s=str(c).lower().replace(' ','')
            if '500' in s and ('8' in s or '(8)' in s or '7-8' in s) and '350' not in s: fa=c
        if not all([fn,ft,fr,fa]): return {}
        out={}
        for _,r in df.iterrows():
            nm=str(r[fn]).strip(); role=str(r[fr]).strip().upper(); team=str(r[ft]).strip(); v=num(r[fa])
            role=ROLE_OVERRIDES.get(norm(nm),role)
            if nm and role in ROLES and v is not None: out[(norm(nm),norm(team),role)]=v
        return out
    except Exception as e:
        print(f'8x500 enrichment unavailable: {e}')
        return {}

rows=parse_listone(get_html(LISTONE))
if len(rows)<600: raise RuntimeError(f'Listone parser found only {len(rows)} players; refusing overwrite')
auction=parse_fco(); players=[]
for p in rows:
    avg=auction.get((norm(p['name']),norm(p['team']),p['role']))
    players.append({'name':p['name'],'team':p['team'],'role':p['role'],'classicRole':p['role'],'quotation':p['quotation'],'fvm':None,'auctionAvg8x500':round(avg,2) if avg is not None else None,'auctionAvg':round(avg,2) if avg is not None else None,'auctionAvgFormat':'8 squadre / 500 crediti','auctionSource':'Fantacalcio-Online' if avg is not None else None,'auctionDataType':'real' if avg is not None else 'insufficient_data','auctionUpdated':datetime.now(timezone.utc).date().isoformat() if avg is not None else None})
players.sort(key=lambda p:({'P':0,'D':1,'C':2,'A':3}[p['role']],-p['quotation'],p['name']))
OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
META.write_text(json.dumps({'updatedAt':datetime.now(timezone.utc).isoformat(),'players':len(players),'realAuctionPrices':sum(p['auctionDataType']=='real' for p in players),'auctionFormat':'8 squadre / 500 crediti','listoneSource':LISTONE,'auctionSource':FCO,'rolePolicy':'FantAbba Classic overrides applied before matching prices','pricePolicy':'real observed 8x500 first; unavailable stays unavailable'},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'FantAbba refresh OK: {len(players)} players; real 8x500 prices: {sum(p["auctionDataType"]=="real" for p in players)}')
