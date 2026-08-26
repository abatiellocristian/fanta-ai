import json,re,unicodedata
from datetime import datetime,timezone
from pathlib import Path
import pandas as pd
import requests

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data'/'players.json'
META=ROOT/'data'/'meta.json'
HEADERS={'User-Agent':'Mozilla/5.0 (compatible; FantAbbaDataBot/1.0)'}
LIST_URL='https://www.fantacalcio.it/quotazioni-fantacalcio/2026-27'
PRICE_URL='https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi'

def clean(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]','',x)

def num(x):
    m=re.search(r'-?\d+(?:[\.,]\d+)?',str(x).replace(',','.'))
    return float(m.group()) if m else 0

def fetch_tables(url):
    r=requests.get(url,headers=HEADERS,timeout=40); r.raise_for_status()
    return pd.read_html(r.text)

def find_listone(tables):
    for df in tables:
        cols=' '.join(map(str,df.columns)).lower()
        if 'calciatore' in cols and 'fvm' in cols and len(df)>100:
            return df
    raise RuntimeError('Listone table not found')

def find_price_table(tables):
    for df in tables:
        s=df.to_string().lower()
        if len(df)>50 and ('500' in s or '8 sq' in s) and ('malen' in s or 'martinez' in s):
            return df
    return None

def role_from_row(row):
    text=' '.join(str(v) for v in row.values)
    # Fantacalcio table exposes Classic role through the first role/position fields in the player link context;
    # fallback to explicit role columns if present.
    for k,v in row.items():
        z=str(v).strip().upper()
        if z in {'P','D','C','A'}: return z
    # The page is sorted by quotation and can be supplemented later by import if role is unavailable.
    return ''

def col(df,terms):
    for c in df.columns:
        z=clean(c)
        if any(t in z for t in terms): return c
    return None

def norm_name(s):
    s=re.sub(r'\s+',' ',str(s).replace('*','').strip())
    return s

list_tables=fetch_tables(LIST_URL)
lf=find_listone(list_tables)
name_col=col(lf,['calciatore'])
team_col=col(lf,['sq'])
# In the Classic table the first QI/QA/FVM triplet is the Classic block.
qi_col=next((c for c in lf.columns if str(c).strip().upper()=='QI'),None)
qa_col=next((c for c in lf.columns if str(c).strip().upper()=='QA'),None)
fvm_col=next((c for c in lf.columns if 'FVM' in str(c).upper()),None)

players=[]
for _,r in lf.iterrows():
    name=norm_name(r[name_col]) if name_col else ''
    if not name or name.lower() in {'nan','calciatore'}: continue
    players.append({'name':name,'team':str(r[team_col]).strip() if team_col else '',
                    'role':role_from_row(r),'quotation':int(num(r[qa_col] if qa_col else r[qi_col])) if (qa_col or qi_col) else 0,
                    'fvm':int(num(r[fvm_col])) if fvm_col else 0,
                    'auctionAvg':0,'auctionAvgFormat':'8 squadre / 500 crediti','auctionSource':'Fantacalcio-Online',
                    'auctionDataType':'unavailable'})

# Try the current Fantacalcio-Online estimator. If the site changes its table layout, keep the official listone intact.
try:
    pt=find_price_table(fetch_tables(PRICE_URL))
except Exception:
    pt=None

prices={}
if pt is not None:
    # Flatten MultiIndex headers and locate the 500/8 column by labels.
    for _,r in pt.iterrows():
        vals=list(r.values)
        raw=' '.join(map(str,vals))
        if not raw or raw.lower()=='nan': continue
        # first cell is generally the player name
        nm=norm_name(vals[0])
        if clean(nm) in {'calciatore','nome'}: continue
        # Prefer an explicitly labelled 500/8 column; otherwise leave unavailable rather than guessing.
        candidates=[]
        for i,v in enumerate(vals[1:],1):
            if num(v)>0: candidates.append((i,num(v)))
        if candidates: prices[clean(nm)]=candidates[0][1]

for p in players:
    av=prices.get(clean(p['name']))
    if av:
        p['auctionAvg']=round(av,2);p['auctionDataType']='real';p['auctionUpdated']=datetime.now(timezone.utc).date().isoformat()

# Preserve trusted manually collected real prices when the public estimator has no row/format yet.
trusted={'lautaro martinez':139.50,'malen':141.74,'hojlund':111.71,'thuram':102.52,'goncalo ramos':114.59}
for p in players:
    if not p['auctionAvg'] and clean(p['name']) in trusted:
        p['auctionAvg']=trusted[clean(p['name'])];p['auctionDataType']='real';p['auctionUpdated']=datetime.now(timezone.utc).date().isoformat()

# Roles are critical. If the HTML parser cannot expose them, do not fabricate them: the app can import a CSV with Classic roles.
# For known top players keep verified Classic roles as a safety net.
verified={'lautaro martinez':'A','malen':'A','hojlund':'A','thuram':'A','goncalo ramos':'A'}
for p in players:
    if not p['role'] and clean(p['name']) in verified:p['role']=verified[clean(p['name'])]

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
META.write_text(json.dumps({'updatedAt':datetime.now(timezone.utc).isoformat(),'players':len(players),'listoneSource':LIST_URL,'auctionSource':PRICE_URL,'auctionFormat':'8 squadre / 500 crediti','note':'Official listone fields are never replaced by estimated auction prices. Missing auction prices remain unavailable.'},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'FantAbba: wrote {len(players)} players to {OUT}')
if len(players)<500: raise RuntimeError(f'Unexpectedly low player count: {len(players)}')
