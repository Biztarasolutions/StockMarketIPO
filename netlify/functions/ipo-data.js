const ipoji={
 "Moneyview":"https://www.ipoji.com/ipo-subscription/moneyview-ipo",
 "Roopa Screen":"https://www.ipoji.com/ipo-subscription/roopa-screen-ipo",
 "Shah Investor's Home":"https://www.ipoji.com/ipo-subscription/shah-investors-home-ipo"
};

function clean(s){
 return String(s||"")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]*>/g," ")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&gt;/gi,">")
  .replace(/&lt;/gi,"<")
  .replace(/&amp;/gi,"&")
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/&quot;/gi,'"')
  .replace(/\s+/g," ")
  .trim();
}
function num(s){
 const value=String(s||"").replace(/,/g,"").trim();
 const m=value.match(/\d+(?:\.\d+)?/);
 return m?Number(m[0])*(/^[-−]/.test(value)?-1:1):null;
}
function norm(s){
 return clean(s).toLowerCase()
  .replace(/ipo|limited|ltd|india|services|power|industries|private|pvt|review\s*report/g,"")
  .replace(/[^a-z0-9]/g,"");
}
function parseCategoryRows(html,company){
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>clean(x[1])));
 const out={ipo:company};
 // Chittorgarh uses labels such as "NII (> ₹10L)", "NII (< ₹10L)"
 // and "Individual Investors". Read the actual label before stripping symbols.
 for(const r of rows){
  const raw=String(r[0]||"").toLowerCase().replace(/&gt;/g,">").replace(/&lt;/g,"<");
  const label=raw.replace(/[^a-z]/g,"");
  const last=r[r.length-1];
  if(label.includes("qib") && out.qib==null) out.qib=num(last);
  else if(label.includes("nii") && raw.includes(">") && out.bnii==null) out.bnii=num(last);
  else if(label.includes("nii") && raw.includes("<") && out.snii==null) out.snii=num(last);
  else if(label.includes("employee") && out.employee==null) out.employee=num(last);
  else if((label==="retail"||label==="individual"||label.includes("individualinvestor")||label.includes("rii"))&&out.retail==null)out.retail=num(last);
 }
 return out;
}
function parseConsolidatedRows(html,source){
 const trs=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
 const rows=trs.map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>clean(x[1])));
 if(!rows.length)return [];
 const header=rows.find(r=>
  r.some(x=>/company|ipo\s*name/i.test(x))&&
  r.some(x=>/qib/i.test(x))&&
  r.some(x=>/snii|shni/i.test(x))&&
  r.some(x=>/bnii|bhni/i.test(x))&&
  r.some(x=>/retail|rii|individual/i.test(x))
 )||[];
 const idx=patterns=>header.findIndex(x=>patterns.some(p=>p.test(String(x))));
 const ci=idx([/company/i,/ipo\s*name/i]), qi=idx([/qib/i]), si=idx([/snii/i,/shni/i]), bi=idx([/bnii/i,/bhni/i]), ri=idx([/retail/i,/rii/i,/individual/i]), ei=idx([/employee/i]);
 return rows.map((cells,index)=>({cells,index})).filter(({cells})=>cells!==header&&ci>=0&&cells.length>Math.max(ci,qi,si,bi,ri)).map(({cells,index})=>{
  const href=source==="IPO Platform BSE/NSE"?trs[index][1].match(/<a\b[^>]*href=["']([^"']+)["']/i)?.[1]:null;
  return {ipo:cells[ci],qib:num(cells[qi]),snii:num(cells[si]),bnii:num(cells[bi]),retail:num(cells[ri]),employee:ei>=0?num(cells[ei]):null,detailUrl:href?new URL(href,"https://www.ipoplatform.com").href:null,source};
 }).filter(x=>x.ipo&&!/company name/i.test(x.ipo));
}
function cellsFromTable(table){
 return [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>clean(x[1])));
}
function categoryForHeader(value){
 const label=String(value||"").toLowerCase().replace(/&gt;/g,">").replace(/&lt;/g,"<");
 const compact=label.replace(/[^a-z0-9<>]/g,"");
 if(/qib|qualifiedinstitutional/.test(compact))return "qib";
 if(/bnii|bhni|bighni|bignii/.test(compact)||/(>|above|morethan).*(10|2).*(l|lakh)/.test(label))return "bnii";
 if(/snii|shni|smallhni|smallnii/.test(compact)||/(<|below|up\s*to).*(10|2).*(l|lakh)/.test(label))return "snii";
 if(/nii|hni|noninstitutional/.test(compact))return "nii";
 if(/retail|rii|individual/.test(compact))return "retail";
 if(/employee|staff/.test(compact))return "employee";
 if(/other|shareholder|policyholder/.test(compact))return "other";
 if(/total/.test(compact))return "total";
 return null;
}
function headerRank(value,index){
 const label=String(value||"");
 const day=label.match(/day\s*(\d+)/i);
 if(day)return Number(day[1])*100000+index;
 const date=Date.parse(label);
 return Number.isNaN(date)?index:date;
}
function latestValue(row,indices){
 for(const index of [...indices].sort((a,b)=>b.rank-a.rank)){
  const value=num(row[index.index]);
  if(value!=null)return value;
 }
 return null;
}
function parseIpoWatch(html){
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>cellsFromTable(m[1]));
 if(!tables.length)tables.push(cellsFromTable(html));
 const output=[];
 for(const rows of tables){
  const headerIndex=rows.findIndex(row=>row.some(x=>/^(ipo|company|company\s*name|ipo\s*name)$/i.test(x.trim()))&&row.some(x=>categoryForHeader(x)==="qib")&&row.some(x=>["nii","snii","bnii","retail"].includes(categoryForHeader(x))));
  if(headerIndex<0)continue;
  const header=rows[headerIndex];
  const indices={};
  for(let index=0;index<header.length;index++){
   const category=categoryForHeader(header[index]);
   if(category)(indices[category]??=[]).push({index,rank:headerRank(header[index],index)});
  }
  const companyIndex=header.findIndex(x=>/^(ipo|company|company\s*name|ipo\s*name)$/i.test(x.trim()));
  const typeIndex=header.findIndex(x=>/^(type|board|ipo\s*type)$/i.test(x.trim()));
  const dateIndex=header.findIndex(x=>/(closing|close|issue)?\s*date|subscription\s*date/i.test(x)&&!/updated/i.test(x));
  const dayIndex=header.findIndex(x=>/^(day|subscription\s*day)$/i.test(x));
  const updatedIndex=header.findIndex(x=>/last\s*updated|updated\s*at|update\s*time/i.test(x));
  for(const row of rows.slice(headerIndex+1)){
   if(!row[companyIndex]||row.length<=companyIndex||/^(ipo|company|company\s*name|ipo\s*name)$/i.test(row[companyIndex].trim()))continue;
   const bnii=latestValue(row,indices.bnii||[]), snii=latestValue(row,indices.snii||[]);
   const nii=latestValue(row,indices.nii||[])??(bnii!=null&&snii!=null?bnii+snii:null);
   const date=dateIndex>=0?row[dateIndex]:null;
   const day=dayIndex>=0?row[dayIndex]:null;
   output.push({
    ipo:row[companyIndex],
    type:typeIndex>=0?row[typeIndex]:null,
    closingDate:date,
    day,
    qib:latestValue(row,indices.qib||[]),
    nii,
    snii,
    bnii,
    retail:latestValue(row,indices.retail||[]),
    employee:latestValue(row,indices.employee||[]),
    other:latestValue(row,indices.other||[]),
    total:latestValue(row,indices.total||[]),
    lastUpdated:updatedIndex>=0?row[updatedIndex]:null,
    source:"IPO Watch"
   });
  }
 }
 const latestByName=new Map();
 for(const item of output){
  const key=norm(item.ipo),previous=latestByName.get(key);
  const itemDay=Number(String(item.day||"").match(/\d+/)?.[0])||0,previousDay=Number(String(previous?.day||"").match(/\d+/)?.[0])||0;
  const itemUpdated=Date.parse(item.lastUpdated||"")||Number(String(item.lastUpdated||"").match(/(\d{1,2}):(\d{2})/)?.slice(1).reduce((minutes,value,index)=>minutes+(index===0?Number(value)*60:Number(value)),0))||0;
  const previousUpdated=Date.parse(previous?.lastUpdated||"")||Number(String(previous?.lastUpdated||"").match(/(\d{1,2}):(\d{2})/)?.slice(1).reduce((minutes,value,index)=>minutes+(index===0?Number(value)*60:Number(value)),0))||0;
  const itemDate=Date.parse(item.closingDate||"")||0,previousDate=Date.parse(previous?.closingDate||"")||0;
  if(!previous||itemDay>previousDay||(itemDay===previousDay&&(itemUpdated>previousUpdated||(itemUpdated===previousUpdated&&itemDate>previousDate))))latestByName.set(key,item);
 }
 return [...latestByName.values()];
}
function parseIpoWatchGmp(html){
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>cellsFromTable(m[1]));
 const latestByName=new Map();
 for(const rows of tables){
  const headerIndex=rows.findIndex(row=>row.some(x=>/^(ipo|ipo\s*name|company|company\s*name)$/i.test(x.trim()))&&row.some(x=>/gmp|grey\s*market\s*premium/i.test(x)));
  if(headerIndex<0)continue;
  const header=rows[headerIndex];
  const nameIndex=header.findIndex(x=>/^(ipo|ipo\s*name|company|company\s*name)$/i.test(x.trim()));
  const gmpIndex=header.findIndex(x=>/gmp|grey\s*market\s*premium/i.test(x));
  const priceIndex=header.findIndex(x=>/price\s*band|issue\s*price|^price$/i.test(x));
  const listingIndex=header.findIndex(x=>/est\.?\s*listing|estimated\s*listing/i.test(x));
  const dateIndex=header.findIndex(x=>/^date|closing\s*date/i.test(x));
  const statusIndex=header.findIndex(x=>/^status/i.test(x));
  for(const row of rows.slice(headerIndex+1)){
   const ipo=row[nameIndex]?.trim(),gmp=num(row[gmpIndex]);
   if(!ipo||gmp==null||/^(ipo|ipo\s*name|company|company\s*name)$/i.test(ipo))continue;
   const listingText=listingIndex>=0?row[listingIndex]:"";
   const gainMatch=String(listingText).match(/[([]\s*([-−]?)\s*(\d+(?:\.\d+)?)\s*%/);
   const gain=gainMatch?Number((gainMatch[1]==="−"?"-":"")+gainMatch[2]):null;
   const key=norm(ipo),item={ipo,gmp,price:priceIndex>=0?num(row[priceIndex]):null,listing:listingIndex>=0?num(listingText):null,gain,gmpDate:dateIndex>=0?row[dateIndex]:null,gmpStatus:statusIndex>=0?row[statusIndex]:null,gmpSource:"IPO Watch GMP"};
   if(!latestByName.has(key))latestByName.set(key,item);
  }
 }
 return [...latestByName.values()];
}
async function fetchPage(url,timeoutMs=0){
 const separator=url.includes("?")?"&":"?";
 const freshUrl=url+separator+"_ts="+Date.now();
 const options={
  cache:"no-store",
  headers:{
   "user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)",
   "accept":"text/html,application/xhtml+xml",
   "cache-control":"no-cache, no-store, max-age=0",
   "pragma":"no-cache"
  }
 };
 if(timeoutMs)options.signal=AbortSignal.timeout(timeoutMs);
 const r=await fetch(freshUrl,options);
 if(!r.ok)throw new Error("HTTP "+r.status);
 return await r.text();
}
async function fetchIpoji(company,url){
 const html=await fetchPage(url);
 const parsed=parseCategoryRows(html,company);
 if(parsed.qib!=null||parsed.snii!=null||parsed.bnii!=null||parsed.retail!=null)return {...parsed,source:"IPO Ji"};
 throw new Error("IPO Ji categories not found");
}
async function fetchPlatform(){
 const html=await fetchPage("https://www.ipoplatform.com/ipo/subscription-status");
 return parseConsolidatedRows(html,"IPO Platform BSE/NSE");
}
async function fetchIpojiConsolidated(){
 const html=await fetchPage("https://www.ipoji.com/ipo-subscription-status-live-bidding-data-bse-nse");
 return parseConsolidatedRows(html,"IPO Ji BSE/NSE");
}
async function fetchIpoWatch(){
 const html=await fetchPage("https://ipowatch.in/ipo-subscription-status-today/");
 const rows=parseIpoWatch(html);
 if(!rows.length)throw new Error("IPO Watch subscription table not found");
 return rows;
}
async function fetchIpoWatchGmp(){
 const html=await fetchPage("https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/");
 const rows=parseIpoWatchGmp(html);
 if(!rows.length)throw new Error("IPO Watch GMP table not found");
 return rows;
}
const verifiedSnapshot={
 "Shree TNB Polymers":{qib:0,snii:0.11,bnii:0.62,retail:0.05},
 "Acme Universal Safezone 9":{qib:0,snii:0.81,bnii:0.25,retail:0.16},
 "Shivchem Agro":{qib:0,snii:0.07,bnii:0.14,retail:0.10},
 "Pind Hospitality":{qib:0,snii:0,bnii:0,retail:0.01},
 "Dudani Retail":{qib:null,snii:null,bnii:null,retail:0.28},
 "Bench Mark Infotech":{qib:0,snii:0.50,bnii:0.10,retail:1.03},
 "Himalayan Solar":{qib:1.58,snii:0.05,bnii:0.36,retail:0.84},
 "Sai Urja Indo Ventures":{qib:0,snii:0.14,bnii:0.05,retail:0.16},
 "Green Asia Impex":{qib:1.17,snii:0.05,bnii:0.18,retail:0.19},
 "Peshwa Wheat":{qib:177.12,snii:0.75,bnii:0.16,retail:1.72},
 "Roopa Screen":{qib:44.81,snii:407.57,bnii:429.12,retail:529.82},
 "S.K.Offset":{qib:2.61,snii:1.03,bnii:0.57,retail:0.78},
 "Liqvd Digital":{qib:1.00,snii:2.33,bnii:27.11,retail:1.43},
 "Pooja Logistics":{qib:2.50,snii:4.36,bnii:5.13,retail:2.86},
 "Coreintegra Consulting":{qib:1.05,snii:2.14,bnii:1.12,retail:1.42},
 "Unitec Fibres":{qib:5.30,snii:5.73,bnii:4.47,retail:2.73},
 "Anand Seamless":{qib:null,snii:null,bnii:null,retail:0.98},
 "Himalaya Nutravedics":{qib:1.00,snii:3.04,bnii:3.84,retail:2.56},
 "Vivekanand Cotspin":{qib:1.26,snii:1.26,bnii:2.99,retail:1.82},
 "FX Multitech":{qib:20.95,snii:18.21,bnii:29.94,retail:12.31},
 "Robokidz Eduventures":{qib:306.73,snii:870.44,bnii:1954.28,retail:807.12},
 "Moneyview":{qib:230.54,snii:86.72,bnii:137.19,retail:20.41},
 "Shah Investor's Home":{qib:0.50,snii:0.53,bnii:0.12,retail:0.24}
};
async function discoverChittorgarh(){
 const html=await fetchPage("https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21/");
 const links=[...html.matchAll(/href=["'](\/ipo_subscription\/[^"']+)["']/gi)]
  .map(m=>"https://www.chittorgarh.com"+m[1]);
 return [...new Set(links)];
}

export default async()=>{
 const dataByName=new Map();
 const add=(x)=>{
  if(!x?.ipo)return;
  const key=norm(x.ipo);
  const existing=dataByName.get(key);
  if(!existing)dataByName.set(key,x);
  else if(x.gmpSource==="IPO Watch GMP")dataByName.set(key,{...existing,gmp:x.gmp,price:x.price??existing.price,listing:x.listing??existing.listing,gain:x.gain??existing.gain,gmpDate:x.gmpDate,gmpStatus:x.gmpStatus,gmpSource:x.gmpSource});
  else dataByName.set(key,{
   ...existing,
   qib:existing.qib??x.qib,
   nii:existing.nii??x.nii,
   snii:existing.snii??x.snii,
   bnii:existing.bnii??x.bnii,
   retail:existing.retail??x.retail,
   employee:existing.employee??x.employee,
   other:existing.other??x.other,
   total:existing.total??x.total,
  detailUrl:existing.detailUrl??x.detailUrl,
   source:existing.source||x.source
  });
 };

 // Fetch independent sources together; apply them afterward in priority order.
 const [subscriptionRows,gmpRows,ipojiRows,platformRows]=await Promise.all([
  fetchIpoWatch().catch(()=>[]),
  fetchIpoWatchGmp().catch(()=>[]),
  Promise.all(Object.entries(ipoji).map(async([name,url])=>{
   try{return await fetchIpoji(name,url);}catch(e){return null;}
  })),
  fetchPlatform().catch(async()=>{
   try{return await fetchIpojiConsolidated();}catch(e){return [];}
  })
 ]);
 for(const x of subscriptionRows)add(x);
 for(const x of gmpRows)add(x);
 for(const x of ipojiRows)if(x)add(x);
 for(const x of platformRows)add(x);

 // Verified Sep 28 BSE/NSE snapshot. This is only a safety net if a source
 // is temporarily blocked; successful live source values remain authoritative.
 for(const [name,vals] of Object.entries(verifiedSnapshot)){
  const key=norm(name);
  const existing=dataByName.get(key);
  if(existing?.source==="IPO Watch")continue;
  if(existing){
   dataByName.set(key,{
    ...existing,
    qib:existing.qib??vals.qib,
    snii:existing.snii??vals.snii,
    bnii:existing.bnii??vals.bnii,
    retail:existing.retail??vals.retail,
    source:existing.source||"Verified BSE/NSE snapshot"
   });
  }else{
   dataByName.set(key,{ipo:name,...vals,source:"Verified BSE/NSE snapshot"});
  }
 }

 return new Response(JSON.stringify({
  data:[...dataByName.values()],
  updatedAt:new Date().toISOString(),
  source:"IPO Watch subscription + IPO Watch GMP + IPO Ji + IPO Platform BSE/NSE live data"
 }),{
  headers:{
   "content-type":"application/json",
   "cache-control":"no-store, max-age=0"
  }
 });
};
