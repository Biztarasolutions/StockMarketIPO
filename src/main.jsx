import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import './style.css';

const seed=[
['SRIT India','Mainboard','28–30 Sep',30,130,160,23.07,0,.84,.22,1.03,'—','—'],
['Shah Investor\'s Home','Mainboard','28–30 Sep',12,167,179,7.19,.50,.22,.05,.15,'—','—'],
['Acevector','Mainboard','25–29 Sep',2,32,34,6.25,.45,1.22,.57,1.14,'—','—'],
['German Green Steel','Mainboard','25–29 Sep',29,139,168,20.86,1.39,7,4.68,4.45,'—'],
['Runwal Enterprises','Mainboard','25–29 Sep',10,305,315,3.28,1.01,.40,.53,.35,.33,'—'],
['Orient Cables','Mainboard','25–29 Sep',80,272,352,29.41,.04,17.73,10.70,7.42,'—','—'],
['Moneyview','Mainboard','24–28 Sep',14,34,48,41.18,30.77,63.87,94.31,14.78,'—','—'],
['A-One Steels','Mainboard','24–28 Sep',40,405,445,9.88,7.69,24.77,26.18,8.65,5.02,'—'],
['Adroit Industries','Mainboard','23–25 Sep',58,134,192,43.28,'—','—','—','—','—','—'],
['Swastika Infra','Mainboard','23–25 Sep',5,185,190,2.43,'—','—','—','—','—','—'],
['Elevate Campuses','Mainboard','23–25 Sep',10,362,372,2.76,'—','—','—','—','—','—'],
['ArMee Infotech','Mainboard','23–25 Sep',5,375,380,1.33,'—','—','—','—','—','—'],
['Varmora Granito','Mainboard','22–24 Sep',0,148,148,0,'—','—','—','—','—','—'],

['Shree TNB Polymers','SME','28 Sep–5 Oct',0,53,53,0,'—','—','—','—','—','—'],
['Acme Universal Safezone 9','SME','28–30 Sep',0,71,71,0,'—','—','—','—','—','—'],
['Shivchem Agro','SME','28–30 Sep',0,62,62,0,'—','—','—','—','—','—'],
['Pind Hospitality','SME','28–30 Sep',0,99,99,0,'—','—','—','—','—','—'],
['Dudani Retail','SME','25–29 Sep',0,70,70,0,'—','—','—','—','—','—'],
['Bench Mark Infotech','SME','25–29 Sep',12,110,122,10.91,'—','—','—','—','—','—'],
['Himalayan Solar','SME','25–29 Sep',0,103,103,0,'—','—','—','—','—','—'],
['Sai Urja Indo Ventures','SME','25–29 Sep',0,113,113,0,'—','—','—','—','—','—'],
['Green Asia Impex','SME','24–28 Sep',0,90,90,0,'—','—','—','—','—','—'],
['Peshwa Wheat','SME','24–28 Sep',0,101,101,0,'—','—','—','—','—','—'],
['Roopa Screen','SME','24–28 Sep',44.81,64,108.81,70.02,'—','—','—','—','—','—'],
['S.K.Offset','SME','23–25 Sep',0,125,125,0,'—','—','—','—','—','—'],
['Liqvd Digital','SME','23–25 Sep',0,54,54,0,'—','—','—','—','—','—'],
['Pooja Logistics','SME','23–25 Sep',0,115,115,0,'—','—','—','—','—','—'],
['Coreintegra Consulting','SME','23–25 Sep',0,78,78,0,'—','—','—','—','—','—'],
['Unitec Fibres','SME','23–25 Sep',0,78,78,0,'—','—','—','—','—','—'],
['Anand Seamless','SME','22–24 Sep',0,190,190,0,'—','—','—','—','—','—'],
['Himalaya Nutravedics','SME','22–24 Sep',0,100,100,0,'—','—','—','—','—','—'],
['Vivekanand Cotspin','SME','21–23 Sep',0,32,32,0,'—','—','—','—','—','—'],
['FX Multitech','SME','21–23 Sep',0,116,116,0,'—','—','—','—','—','—'],
['Robokidz Eduventures','SME','21–23 Sep',0,106,106,0,'—','—','—','—','—','—']
]

const map=r=>{const end=r[2].split(/[–-]/).pop().trim();return {ipo:r[0],type:r[1],date:r[2],lastDate:end,gmp:r[3],price:r[4],listing:r[5],gain:r[6],qib:null,nii:null,snii:null,bnii:null,retail:null,employee:null,shareholder:null,total:null,subscription_data:null,listed:r[12]}};

function App(){
 const [rows,setRows]=useState(seed.map(map)),[q,setQ]=useState(''),[sort,setSort]=useState('lastDate'),[today,setToday]=useState(false),[type,setType]=useState('All'),[liveUpdatedAt,setLiveUpdatedAt]=useState(null),[liveError,setLiveError]=useState(false),[liveSource,setLiveSource]=useState(null);
 const todayLabel=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 useEffect(()=>{refresh();const id=setInterval(refresh,60000);return()=>clearInterval(id)},[]);
 const filtered=useMemo(()=>{
   let data=rows.filter(x=>x.ipo.toLowerCase().includes(q.toLowerCase())&&(type==='All'||x.type===type));
   if(today)data=data.filter(x=>x.subscription_data?.subscription_date===todayLabel);
   return [...data].sort((a,b)=>sort==='lastDate'?dateValue(b.lastDate)-dateValue(a.lastDate):sort==='gmp'?b.gmp-a.gmp:sort==='gain'?b.gain-a.gain:a.ipo.localeCompare(b.ipo));
 },[rows,q,sort,today,type,todayLabel]);
 const refresh=async()=>{
  try{
   const response=await fetch('/.netlify/functions/ipo-data?ts='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const result=await response.json();
   if(result.error)throw new Error(result.error);
   const liveRows=Array.isArray(result.data)?result.data:[];
  liveRows.forEach(live=>{
   if(live.closing_date&&live.closing_date>=todayLabel&&live.subscription_date!==todayLabel){
    console.warn(`STALE IPO DATA DETECTED: expected latest date ${todayLabel}, received ${live.subscription_date||'none'}`,live.ipo);
   }
  });
   const matched=new Set();
   setRows(previous=>{
    const updated=previous.map(row=>{
     const key=norm(row.ipo);
     const live=liveRows.find(item=>{const liveKey=norm(item.ipo);return liveKey===key||(key.length>6&&(liveKey.includes(key)||key.includes(liveKey)))});
     if(!live)return {...row,subscription_data:null,qib:null,nii:null,snii:null,bnii:null,retail:null,employee:null,shareholder:null,total:null};
     matched.add(norm(live.ipo));
     if(row.type&&row.type!==live.ipo_type)console.warn(`[IPO] Type mismatch for ${row.ipo}: seed ${row.type}, source ${live.ipo_type}`);
    const isStale=Boolean(live.closing_date&&live.closing_date>=todayLabel&&live.subscription_date<todayLabel);
    return {...row,type:live.ipo_type,subscription_data:live,subscription_is_stale:isStale,qib:live.qib,nii:live.nii,snii:live.snii,bnii:live.bnii,retail:live.retail,employee:live.employee,shareholder:live.shareholder,total:live.total};
    });
    const additions=liveRows.filter(item=>!matched.has(norm(item.ipo))).map(item=>({
     ipo:item.ipo,type:item.ipo_type,date:item.closing_date||'—',lastDate:item.closing_date?new Date(`${item.closing_date}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}):'—',gmp:null,price:null,listing:null,gain:null,qib:item.qib,nii:item.nii,snii:item.snii,bnii:item.bnii,retail:item.retail,employee:item.employee,shareholder:item.shareholder,total:item.total,subscription_data:item,listed:null
    }));
    return [...updated,...additions];
   });
  setLiveError(Boolean(result.errors?.length));
  setLiveSource(result.source||null);
   setLiveUpdatedAt(result.updatedAt||null);
  }catch(error){
   console.error('[IPO] Subscription refresh failed:',error);
  setLiveError(true);
  setLiveSource(null);
   setLiveUpdatedAt(null);
   setRows(previous=>previous.map(row=>({...row,subscription_data:null,qib:null,nii:null,snii:null,bnii:null,retail:null,employee:null,shareholder:null,total:null})));
  }
 };
 const maxG=Math.max(...rows.map(x=>Number(x.gmp)||0));
 return <div className="app"><header><div><div className="brand">Stock Investment Plan</div><div className="sub">Track IPOs. Compare GMP. Understand Subscription. Measure Listing Performance.</div></div><button onClick={refresh}>↻ Refresh Data</button></header>
 <section className="cards"><Card t="Total IPOs" v={rows.length}/><Card t="Mainboard" v={rows.filter(x=>x.type==='Mainboard').length}/><Card t="SME" v={rows.filter(x=>x.type==='SME').length}/><Card t="Highest Expected Gain" v={Math.max(...rows.map(x=>Number(x.gain)||0)).toFixed(2)+'%'}/></section>
 <section className="panel"><div className="toolbar"><input placeholder="Search IPO..." value={q} onChange={e=>setQ(e.target.value)}/><select value={type} onChange={e=>setType(e.target.value)}><option>All</option><option>Mainboard</option><option>SME</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="lastDate">Last Date ↓</option><option value="gmp">GMP high → low</option><option value="gain">Gain % high → low</option><option value="name">IPO name</option></select><button className={today?'today active':'today'} onClick={()=>setToday(!today)}>Show for Today</button><span className="updated">{liveError?'Some subscription data unavailable':liveUpdatedAt?`${liveSource||'Subscription'} · ${new Date(liveUpdatedAt).toLocaleTimeString()}`:'Loading subscription…'} · Showing {today?`subscription updates for ${todayLabel}`:type==='All'?'Mainboard + SME IPOs':type+' IPOs'}</span></div>
 <div className="tablewrap"><table><thead><tr>{['IPO','Type','Date Range','Last Date','Subscription Update','GMP','Price','Estimated Listing','Gain %','QIB (x)','NII (x)','sNII (x) (<10L)','bNII (x) (>10L)','Retail / Individual (x)','Employee (x)','Shareholder (x)','Total (x)','Listed Price (₹)'].map(h=><th>{h}</th>)}</tr></thead><tbody>{filtered.length?filtered.map(x=><tr><td className="ipo">{x.ipo}</td><td><span className={x.type==='SME'?'badge sme':'badge'}>{x.type}</span></td><td>{x.date}</td><td>{x.lastDate}</td><td>{x.subscription_is_stale?'STALE · ':''}{formatSubscriptionUpdate(x.subscription_data)}</td><td className={x.gmp>0?'positive':''}>{x.gmp==null?'—':`₹${x.gmp}`}</td><td>{x.price==null?'—':`₹${x.price}`}</td><td>{x.listing==null?'—':`₹${x.listing}`}</td><td className={x.gain>0?'positive':''}>{x.gain==null?'—':`${Number(x.gain).toFixed(2)}%`}</td><td>{x.qib??'—'}</td><td>{x.nii??'—'}</td><td>{x.snii??'—'}</td><td>{x.bnii??'—'}</td><td>{x.retail??'—'}</td><td>{x.employee??'—'}</td><td>{x.shareholder??'—'}</td><td>{x.total??'—'}</td><td>{x.listed??'—'}</td></tr>):<tr><td colSpan="18" className="empty">{today?'Data not available yet':'No IPOs found'}</td></tr>}</tbody></table></div></section>
 <section className="chart panel"><h2>Gain % by IPO</h2><ResponsiveContainer width="100%" height={340}><BarChart data={filtered}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="ipo" hide/><YAxis/><Tooltip formatter={(v)=>[v+'%','Gain %']}/><Bar dataKey="gain"/></BarChart></ResponsiveContainer></section>
 <footer>GMP is unofficial and may change frequently. Subscription figures are live/intraday. Information is for informational purposes only and is not investment advice.</footer></div>
}
function norm(s){return String(s).toLowerCase().replace(/ipo|limited|ltd|india|services|power|industries|private|pvt/g,'').replace(/[^a-z0-9]/g,'')}
function dateValue(v){const m=String(v).match(/(\d{1,2})\s*([A-Za-z]+)/);if(!m)return 0;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return (months[m[2]]||0)*100+Number(m[1])}
function formatSubscriptionUpdate(record){if(!record?.subscription_date)return 'Data not available yet';const date=new Date(`${record.subscription_date}T00:00:00Z`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'});const day=record.subscription_day?`Day ${record.subscription_day}`:'';const time=record.updated_at?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}).format(new Date(record.updated_at))+' IST':'';return [date,day,time].filter(Boolean).join(' · ')}
function Card(p){return <div className="card"><span>{p.t}</span><strong>{p.v}</strong></div>}
createRoot(document.getElementById('root')).render(<App/>);
