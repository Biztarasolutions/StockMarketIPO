import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid} from 'recharts';
import './style.css';
import './pagination.css';

const chartColors=['#078647','#3478a5','#d17b32','#a34d60','#568f91','#7a68a6','#8b7d33'];

function App(){
 const [rows,setRows]=useState([]),[q,setQ]=useState(''),[sort,setSort]=useState('lastDate'),[today,setToday]=useState(false),[type,setType]=useState('All'),[currentPage,setCurrentPage]=useState(1),[liveUpdatedAt,setLiveUpdatedAt]=useState(null),[liveError,setLiveError]=useState(false),[isLoading,setIsLoading]=useState(true);
 const listingDateRequests=useRef(new Set());
 const now=new Date();const todayLabel=`${now.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()]}`;
 useEffect(()=>{refresh();const id=setInterval(refresh,60000);return()=>clearInterval(id)},[]);
 const filtered=useMemo(()=>{
  let data=rows.filter(x=>isRecentOrUpcomingDeadline(x,now)&&x.ipo.toLowerCase().includes(q.toLowerCase())&&(type==='All'||x.type===type));
   if(today)data=data.filter(x=>x.lastDate===todayLabel);
   return [...data].sort((a,b)=>sort==='lastDate'?dateValue(b.lastDate)-dateValue(a.lastDate):sort==='gmp'?b.gmp-a.gmp:sort==='gain'?b.gain-a.gain:a.ipo.localeCompare(b.ipo));
 },[rows,q,sort,today,type,todayLabel]);
 useEffect(()=>setCurrentPage(1),[q,sort,today,type]);
 const pageSize=10,totalPages=Math.ceil(filtered.length/pageSize),page=Math.min(currentPage,Math.max(totalPages,1));
 const pageRows=filtered.slice((page-1)*pageSize,page*pageSize);
 const pageNumbers=getPageNumbers(page,totalPages);
 const pageStart=filtered.length?(page-1)*pageSize+1:0,pageEnd=Math.min(page*pageSize,filtered.length);
 const chartRows=filtered.filter(row=>isClosingWithinNextFiveDays(row.lastDate,now));
 const chartSeries=chartRows.map((row,index)=>({key:`ipo${index}`,ipo:row.ipo,lastDate:row.lastDate,gain:Number(row.gain)||0}));
 const chartData=[];
 for(const series of chartSeries){
  let deadline=chartData.find(item=>item.lastDate===series.lastDate);
  if(!deadline){deadline={lastDate:series.lastDate};chartData.push(deadline)}
  deadline[series.key]=series.gain;
 }
 chartData.sort((a,b)=>chartDateValue(a.lastDate,now)-chartDateValue(b.lastDate,now));
 const refresh=async()=>{
  try{
   const r=await fetch('/.netlify/functions/ipo-data?ts='+Date.now(),{cache:'no-store'});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const d=await r.json();
   setLiveError(false);
   if(d.updatedAt)setLiveUpdatedAt(d.updatedAt);
   if(Array.isArray(d.data)&&d.data.length)setRows(prev=>{
    const updated=prev.map(row=>{
     const live=matchLiveIpo(row.ipo,d.data);
     if(!live)return row;
     const primary=live.source==='IPO Watch';
     const category=field=>live[field]??(primary?'—':row[field]);
     const hasGmp=live.gmpSource==='IPO Watch GMP';
     const price=hasGmp?(live.price??row.price):row.price;
     const gmp=hasGmp?(live.gmp??row.gmp):row.gmp;
     const listing=hasGmp?(live.listing??(Number(price)+Number(gmp))):row.listing;
     const gain=hasGmp?(live.gain??(Number(price)?Number(gmp)/Number(price)*100:row.gain)):row.gain;
    return {...row,price,gmp,listing,gain,listingDate:live.listingDate??row.listingDate,qib:category('qib'),snii:category('snii'),bnii:category('bnii'),retail:category('retail'),employee:category('employee')};
    });
    const allRows=[...updated];
    for(const item of d.data){
     if(!['Mainboard','SME'].includes(item.type)||allRows.some(row=>matchLiveIpo(row.ipo,[item])))continue;
     allRows.push(toDashboardRow(item));
    }
    return allRows;
   });
   const listingItems=d.data.filter(item=>item.type&&item.detailUrl&&isRecentOrUpcomingDeadline(item,now)&&!listingDateRequests.current.has(item.detailUrl));
   if(listingItems.length){
    for(const item of listingItems)listingDateRequests.current.add(item.detailUrl);
    fetch('/.netlify/functions/ipo-listing-dates',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({items:listingItems.map(({ipo,detailUrl})=>({ipo,detailUrl}))})})
     .then(response=>{if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()})
     .then(result=>{
      const dates=new Map((result.data||[]).filter(item=>item.listingDate).map(item=>[norm(item.ipo),item.listingDate]));
      if(dates.size)setRows(prev=>prev.map(row=>({...row,listingDate:dates.get(norm(row.ipo))??row.listingDate})));
     })
     .catch(()=>{});
   }
  }catch(e){setLiveError(true)}
  finally{setIsLoading(false)}
 };
 const maxG=Math.max(...rows.map(x=>Number(x.gmp)||0));
 return <div className="app"><header><div><div className="brand">Stock Investment Plan</div><div className="sub">Track IPOs. Compare GMP. Understand Subscription. Measure Listing Performance.</div></div><button onClick={refresh}>↻ Refresh Data</button></header>
 <section className="cards"><Card t="Total IPOs" v={isLoading?'—':rows.length}/><Card t="Mainboard" v={isLoading?'—':rows.filter(x=>x.type==='Mainboard').length}/><Card t="SME" v={isLoading?'—':rows.filter(x=>x.type==='SME').length}/><Card t="Highest Expected Gain" v={isLoading?'—':Math.max(...rows.map(x=>Number(x.gain)||0)).toFixed(2)+'%'}/></section>
 <section className="panel"><div className="toolbar"><input placeholder="Search IPO..." value={q} onChange={e=>setQ(e.target.value)}/><select value={type} onChange={e=>setType(e.target.value)}><option>All</option><option>Mainboard</option><option>SME</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="lastDate">Last Date ↓</option><option value="gmp">GMP high → low</option><option value="gain">Gain % high → low</option><option value="name">IPO name</option></select><button className={today?'today active':'today'} onClick={()=>setToday(!today)}>Show for Today</button><span className="updated">{liveError?'Subscription update failed':liveUpdatedAt?`Subscription updated: ${new Date(liveUpdatedAt).toLocaleTimeString()}`:'Loading subscription…'} · Showing {today?'IPOs ending today':type==='All'?'Mainboard + SME IPOs':type+' IPOs'}</span></div>
 <div className="tablewrap"><table><thead><tr>{['IPO','Type','Date Range','Last Date','Listing Date','GMP','Price','Estimated Listing','Gain %','QIB (x)','sNII (x) (<10L)','bNII (x) (>10L)','Retail / Individual (x)','Employee (x)','Listed Price (₹)'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{isLoading?<tr><td colSpan={15}>Loading latest IPO data…</td></tr>:liveError&&!rows.length?<tr><td colSpan={15}>Latest IPO data is unavailable.</td></tr>:!filtered.length?<tr><td colSpan={15}>No IPOs match the selected filters.</td></tr>:pageRows.map(x=><tr key={x.ipo}><td className="ipo">{x.ipo}</td><td><span className={x.type==='SME'?'badge sme':'badge'}>{x.type}</span></td><td>{x.date}</td><td>{x.lastDate}</td><td>{x.listingDate?displayIpoDate(x.listingDate):'—'}</td><td className={Number(x.gmp)>0?'positive':''}>{x.gmp==null?'—':`₹${x.gmp}`}</td><td>{x.price==null?'—':`₹${x.price}`}</td><td>{x.listing==null?'—':`₹${x.listing}`}</td><td className={Number(x.gain)>0?'positive':''}>{x.gain==null?'—':`${Number(x.gain).toFixed(2)}%`}</td><td>{x.qib}</td><td>{x.snii}</td><td>{x.bnii}</td><td>{x.retail}</td><td>{x.employee}</td><td>{x.listed}</td></tr>)}</tbody></table></div>
 <div className="pagination"><span>Showing {pageStart}–{pageEnd} of {filtered.length}</span><nav aria-label="IPO list pages"><button className="page-nav" type="button" disabled={page<=1} onClick={()=>setCurrentPage(page-1)}>‹ Previous</button>{pageNumbers[0]>1&&<button className="page-ellipsis" type="button" aria-label="Jump back five pages" title="Jump back five pages" onClick={()=>setCurrentPage(Math.max(1,page-5))}>…</button>}{pageNumbers.map(pageNumber=><button type="button" key={pageNumber} className={`page-number${pageNumber===page?' active':''}`} aria-current={pageNumber===page?'page':undefined} onClick={()=>setCurrentPage(pageNumber)}>{pageNumber}</button>)}{pageNumbers[pageNumbers.length-1]<totalPages&&<button className="page-ellipsis" type="button" aria-label="Jump forward five pages" title="Jump forward five pages" onClick={()=>setCurrentPage(Math.min(totalPages,page+5))}>…</button>}<button className="page-nav" type="button" disabled={page>=totalPages} onClick={()=>setCurrentPage(page+1)}>Next ›</button></nav></div></section>
 <section className="chart panel"><h2>Gain % by IPO · Last application date</h2><ResponsiveContainer width="100%" height={340}><BarChart data={chartData} barCategoryGap={0} barGap={0}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="lastDate" tick={{fontSize:12}} interval={0}/><YAxis tickFormatter={value=>`${value}%`}/><Tooltip labelFormatter={label=>`Last date: ${label}`} formatter={(value,name)=>[`${value}%`,name]}/>{chartSeries.map((series,index)=><Bar key={series.key} dataKey={series.key} name={series.ipo} fill={chartColors[index%chartColors.length]} maxBarSize={64}/>)}</BarChart></ResponsiveContainer></section>
 <footer>GMP is unofficial and may change frequently. Subscription figures are live/intraday. Information is for informational purposes only and is not investment advice.</footer></div>
}
function matchLiveIpo(name,data){
 const key=norm(name),exact=data.filter(item=>norm(item.ipo)===key);
 const exactGmp=exact.find(item=>item.gmpSource==='IPO Watch GMP');
 if(exactGmp||exact.length)return exactGmp||exact[0];
 const tokens=value=>String(value).toLowerCase().replace(/\b(?:ipo|limited|ltd|private|pvt|industries|services|power)\b/g,' ').split(/[^a-z0-9]+/).filter(token=>token.length>1);
 const wanted=new Set(tokens(name));
 const ranked=data.map(item=>{
  const shared=tokens(item.ipo).filter(token=>wanted.has(token));
  return {item,shared:shared.length,score:shared.length+(item.gmpSource==='IPO Watch GMP'?0.25:0)};
 }).filter(candidate=>candidate.shared>=2).sort((a,b)=>b.score-a.score);
 return ranked[0]?.item;
}
function getPageNumbers(current,total){
 const visibleCount=Math.min(5,total);
 const first=Math.max(1,Math.min(current-Math.floor(visibleCount/2),total-visibleCount+1));
 return Array.from({length:visibleCount},(_,index)=>first+index);
}
function norm(s){return String(s).toLowerCase().replace(/\b(?:ipo|limited|ltd|private|pvt)\b/g,'').replace(/[^a-z0-9]/g,'')}
function toDashboardRow(item){
 const price=item.price??null,gmp=item.gmp??null;
 const listing=item.listing??(price!=null&&gmp!=null?price+gmp:null);
 const closingDate=displayIpoDate(item.closingDate);
 const date=item.gmpDate||closingDate||'—';
 const lastDate=closingDate||displayIpoDate(String(item.gmpDate||'').split(/[–-]/).pop())||'—';
 return {ipo:item.ipo,type:item.type,date,lastDate,closingDate:item.closingDate??null,listingDate:item.listingDate??null,gmp,price,listing,gain:item.gain??(price&&gmp!=null?gmp/price*100:null),qib:item.qib??'—',snii:item.snii??'—',bnii:item.bnii??'—',retail:item.retail??'—',employee:item.employee??'—',listed:'—'};
}
function displayIpoDate(value){
 const date=String(value||'').trim();
 const isoDate=date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(isoDate){const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return `${Number(isoDate[3])} ${months[Number(isoDate[2])-1]}`}
 const monthFirst=date.match(/^([A-Za-z]+)\s+(\d{1,2})/);
 if(monthFirst)return `${Number(monthFirst[2])} ${monthFirst[1].slice(0,3)}`;
 const dayFirst=date.match(/^(\d{1,2})\s*([A-Za-z]+)/);
 return dayFirst?`${Number(dayFirst[1])} ${dayFirst[2].slice(0,3)}`:null;
}
function isRecentOrUpcomingDeadline(row,today=new Date()){
 const cutoff=new Date(today.getFullYear(),today.getMonth(),today.getDate()-4);
 const closingTimestamp=Date.parse(row.closingDate||'');
 if(!Number.isNaN(closingTimestamp))return new Date(closingTimestamp)>=cutoff;
 const match=String(row.lastDate||'').match(/^(\d{1,2})\s*([A-Za-z]+)/);
 if(!match)return false;
 const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
 const month=months[match[2].slice(0,3).toLowerCase()];
 if(month==null)return false;
 let closing=new Date(today.getFullYear(),month,Number(match[1]));
 if(today.getMonth()===0&&month===11&&closing>today)closing.setFullYear(closing.getFullYear()-1);
 else if(today.getMonth()===11&&month===0&&closing<cutoff)closing.setFullYear(closing.getFullYear()+1);
 return closing>=cutoff;
}
function isClosingWithinNextFiveDays(value,today=new Date()){
 const match=String(value||'').match(/^(\d{1,2})\s*([A-Za-z]+)/);
 if(!match)return false;
 const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
 const month=months[match[2].slice(0,3).toLowerCase()];
 if(month==null)return false;
 const start=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 const end=new Date(start);
 end.setDate(end.getDate()+5);
 const closing=new Date(start.getFullYear(),month,Number(match[1]));
 if(closing<start&&start.getMonth()===11&&month===0)closing.setFullYear(closing.getFullYear()+1);
 return closing>=start&&closing<=end;
}
function chartDateValue(value,today){
 const match=String(value||'').match(/^(\d{1,2})\s*([A-Za-z]+)/);
 if(!match)return Number.MAX_SAFE_INTEGER;
 const months={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
 const month=months[match[2].slice(0,3).toLowerCase()];
 if(month==null)return Number.MAX_SAFE_INTEGER;
 const year=today.getFullYear()+(today.getMonth()===11&&month===0?1:0);
 return new Date(year,month,Number(match[1])).getTime();
}
function dateValue(v){const m=String(v).match(/(\d{1,2})\s*([A-Za-z]+)/);if(!m)return 0;const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};return (months[m[2]]||0)*100+Number(m[1])}
function Card(p){return <div className="card"><span>{p.t}</span><strong>{p.v}</strong></div>}
createRoot(document.getElementById('root')).render(<App/>);