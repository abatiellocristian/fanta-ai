import json,re,unicodedata
from pathlib import Path
from datetime import datetime,timezone
import requests,pandas as pd

FC='https://www.fantacalcio.it/quotazioni-fantacalcio/2026-27'
FCO='https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi'
OUT=Path('data/players.json');META=Path('data/meta.json')
H={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36','Accept-Language':'it-IT,it;q=0.9,en;q=0.8'}
ROLES={'P':'P','D':'D','C':'C','A':'A','PORTIERE':'P','DIFENSORE':'D','CENTROCAMPISTA':'C','ATTACCANTE':'A'}
TRUSTED={'lautaro martinez':139.50,'malen':141.74,'hojlund':111.71,'thuram':102.52,'goncalo ramos':114.59}

def get_tables(url):
 r=requests.get(url,headers=H,timeout=45);r.raise_for_status();return pd.read_html(r.text)
def norm(x):
 x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower();return re.sub(r'[^a-z0-9]','',x)
def words(x):
 x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower();return [w for w in re.findall(r'[a-z0-9]+',x) if len(w)>2]
def num(x):
 try:return float(str(x).replace('.','').replace(',','.'))
 except:return None
def find(df,terms):
 for c in df.columns:
  if any(t in str(c).lower() for t in terms):return c
 return None
def role_col(df):
 best=None;score=0
 for c in df.columns:
  n=df[c].astype(str).str.strip().str.upper().isin(['P','D','C','A']).sum()
  if n>score:score=n;best=c
 return best if score>20 else None

# Fantacalcio-Online supplies the Classic role and the actual auction price column.
fco=max(get_tables(FCO),key=len);fco.columns=[str(c) for c in fco.columns]
fn=find(fco,['nome','calciatore']);ft=find(fco,['squadra','sq']);fr=role_col(fco);fa=None
for c in fco.columns:
 s=str(c).lower().replace(' ','')
 if '500' in s and ('8' in s or '(8)' in s or '7-8' in s) and '350' not in s:fa=c;break
if not all([fn,ft,fr,fa]):raise RuntimeError(f'FCO columns changed: {fn=} {ft=} {fr=} {fa=}')
fco_rows=[]
for _,r in fco.iterrows():
 nm=str(r[fn]).strip();role=ROLES.get(str(r[fr]).strip().upper());team=str(r[ft]).strip()
 if nm and role:fco_rows.append((nm,team,role,num(r[fa])))

# Official Fantacalcio supplies current quotation and FVM.
fc=max(get_tables(FC),key=len);fc.columns=[str(c) for c in fc.columns]
fn2=find(fc,['calciatore']);ft2=find(fc,['sq']);fq=find(fc,['qi']);ff=find(fc,['fvm'])
if not all([fn2,ft2,fq,ff]):raise RuntimeError('Fantacalcio table changed')
fc_rows=[]
for _,r in fc.iterrows():
 nm=str(r[fn2]).strip()
 if nm:fc_rows.append({'name':nm,'team':str(r[ft2]).strip(),'quotation':num(r[fq]),'fvm':num(r[ff])})

def match(nm,team):
 exact=[x for x in fc_rows if norm(x['team'])==norm(team)] or fc_rows
 n=norm(nm)
 for x in exact:
  if norm(x['name'])==n:return x
 w=words(nm)
 for x in exact:
  xw=words(x['name'])
  if w and xw and (w[0] in xw or xw[0] in w):return x
 return {}

players=[]
for nm,team,role,avg in fco_rows:
 x=match(nm,team);key=norm(x.get('name') or nm)
 # Temporary verified fallback only for five manually checked 8x500 rows.
 if avg is None and key in TRUSTED:avg=TRUSTED[key]
 players.append({'name':x.get('name') or nm,'team':team,'role':role,'quotation':int(round(x['quotation'])) if x.get('quotation') is not None else None,'fvm':int(round(x['fvm'])) if x.get('fvm') is not None else None,'auctionAvg8x500':round(avg,2) if avg is not None else None,'auctionAvg':round(avg,2) if avg is not None else None,'auctionAvgFormat':'8 squadre / 500 crediti','auctionSource':'Fantacalcio-Online','auctionDataType':'real' if avg is not None else 'insufficient_data','auctionUpdated':datetime.now(timezone.utc).date().isoformat()})
uniq={(norm(p['name']),norm(p['team'])):p for p in players};players=list(uniq.values());players.sort(key=lambda p:({'P':0,'D':1,'C':2,'A':3}[p['role']],p['name']))
if len(players)<500:raise RuntimeError(f'Only {len(players)} players parsed; refusing to overwrite database')
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
META.write_text(json.dumps({'updatedAt':datetime.now(timezone.utc).isoformat(),'players':len(players),'realAuctionPrices':sum(p['auctionDataType']=='real' for p in players),'auctionFormat':'8 squadre / 500 crediti','listoneSource':FC,'auctionSource':FCO,'policy':'real auction prices only; missing 8x500 stays unavailable'},ensure_ascii=False,indent=2),encoding='utf-8')
print('FantAbba full refresh:',len(players),'players; real 8x500:',sum(p['auctionDataType']=='real' for p in players))
