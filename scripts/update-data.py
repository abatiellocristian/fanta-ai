import json,re,unicodedata
from pathlib import Path
import pandas as pd
FCO_ASTA='https://www.fantacalcio-online.com/it/asta-fantacalcio-stima-prezzi'
FC='https://www.fantacalcio.it/quotazioni-fantacalcio/2026-27'
OUT=Path('data/players.json')
ROLES={'P':'P','D':'D','C':'C','A':'A','PORTIERE':'P','DIFENSORE':'D','CENTROCAMPISTA':'C','ATTACCANTE':'A'}
def norm(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]','',x)
def words(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower()
    return [w for w in re.findall(r'[a-z0-9]+',x) if len(w)>2]
def num(x):
    if x is None or str(x).strip() in ('','nan','None'): return None
    s=str(x).strip().replace(' ','')
    try:
        return float(s.replace('.','').replace(',','.')) if ',' in s else float(s)
    except:return None
def find_col(df,patterns):
    for c in df.columns:
        if any(p in str(c).lower() for p in patterns): return c
    return None
def role_col(df):
    best=None;bestscore=-1
    for c in df.columns:
        vals=df[c].astype(str).str.strip().str.upper(); score=vals.isin(['P','D','C','A']).sum()
        if score>bestscore:bestscore=score;best=c
    return best if bestscore>20 else None
def parse_fco():
    df=max(pd.read_html(FCO_ASTA),key=lambda d:len(d));df.columns=[str(c) for c in df.columns]
    name=find_col(df,['nome']);team=find_col(df,['squadra']);role=role_col(df);avg=None
    for c in df.columns:
        s=str(c).lower().replace(' ','')
        if '500' in s and '8' in s:avg=c;break
    if not name or not team or not role or avg is None:raise RuntimeError('FCO table structure changed')
    out=[]
    for _,r in df.iterrows():
        nm=str(r.get(name,'')).strip();tm=str(r.get(team,'')).strip();rr=ROLES.get(str(r.get(role,'')).strip().upper())
        if nm and rr:out.append({'fcoName':nm,'team':tm,'role':rr,'auctionAvg':num(r.get(avg))})
    return out
def parse_fc():
    df=max(pd.read_html(FC),key=lambda d:len(d));df.columns=[str(c) for c in df.columns]
    name=find_col(df,['calciatore']);team=find_col(df,['sq']);q=find_col(df,['qi']);fvm=find_col(df,['fvm'])
    if not name or not team or not q or not fvm:raise RuntimeError('Fantacalcio table structure changed')
    return [{'name':str(r.get(name,'')).strip(),'team':str(r.get(team,'')).strip(),'quotation':num(r.get(q)),'fvm':num(r.get(fvm))} for _,r in df.iterrows() if str(r.get(name,'')).strip()]
def match_fc(p,fc):
    cand=[x for x in fc if norm(x['team'])==norm(p['team'])] or fc; pn=norm(p['fcoName'])
    for x in cand:
        if norm(x['name'])==pn:return x
    pw=words(p['fcoName'])
    for x in cand:
        xw=words(x['name'])
        if pw and xw and (pw[0] in xw or xw[0] in pw):return x
    return None
fco=parse_fco();fc=parse_fc();players=[]
for p in fco:
    x=match_fc(p,fc) or {}
    q=x.get('quotation');f=x.get('fvm');v=p['auctionAvg']
    players.append({'name':x.get('name') or p['fcoName'],'team':p['team'],'role':p['role'],'quotation':int(round(q)) if q is not None else None,'fvm':int(round(f)) if f is not None else None,'auctionAvg8x500':round(v,2) if v is not None else None,'auctionAvg':round(v,2) if v is not None else None,'auctionAvgFormat':'8 squadre / 500 crediti','auctionSource':'Fantacalcio-Online','auctionDataType':'real' if v is not None else 'insufficient_data','auctionUpdated':'2026-08-26'})
uniq={}
for p in players:
    k=(norm(p['name']),norm(p['team']))
    if k not in uniq or (uniq[k]['auctionAvg'] is None and p['auctionAvg'] is not None):uniq[k]=p
players=list(uniq.values());players.sort(key=lambda p:({'P':0,'D':1,'C':2,'A':3}[p['role']],p['name']))
OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(players,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Wrote {len(players)} players; 8x500 real averages: {sum(p["auctionAvg8x500"] is not None for p in players)}')
