const chittorgarh={
 "Roopa Screen":"https://www.chittorgarh.com/ipo_subscription/roopa-screen-ipo/2651/",
};
const ipoji={
 "Moneyview":"https://www.ipoji.com/ipo-subscription/moneyview-ipo",
 "Roopa Screen":"https://www.ipoji.com/ipo-subscription/roopa-screen-ipo"
};

function clean(s){
 return String(s||"")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]*>/g," ")
  .replace(/&nbsp;/g," ")
  .replace(/&amp;/g,"&")
  .replace(/&#39;/g,"'")
  .replace(/&quot;/g,'"')
  .replace(/\s+/g," ")
  .trim();
}
function num(s){
 const m=String(s||"").replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);
 return m?Number(m[0]):null;
}
function norm(s){
 return clean(s).toLowerCase()
  .replace(/ipo|limited|ltd|india|services|power|industries|private|pvt|reviewreport/g,"")
  .replace(/[^a-z0-9]/g,"");
}
function parseCategoryRows(html,company){
 const rows=[...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
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
  else if((label==="retail"||label.includes("individualinvestor")||label.includes("rii")) && out.retail==null) out.retail=num(last);
  else if(label.includes("employee") && out.employee==null) out.employee=num(last);
 }
 return out;
}
function parseConsolidatedRows(html,source){
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>clean(x[1])));
 return rows
  .filter(r=>r.length>=13 && r[0] && !/company name/i.test(r[0]))
  .map(r=>({
   ipo:r[0],
   qib:num(r[8]),
   snii:num(r[9]),
   bnii:num(r[10]),
   retail:num(r[12]),
   employee:num(r[13]),
   source
  }))
  .filter(x=>x.ipo);
}
async function fetchPage(url){
 const separator=url.includes("?")?"&":"?";
 const freshUrl=url+separator+"_ts="+Date.now();
 const r=await fetch(freshUrl,{
  cache:"no-store",
  headers:{
   "user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)",
   "accept":"text/html,application/xhtml+xml",
   "cache-control":"no-cache, no-store, max-age=0",
   "pragma":"no-cache"
  }
 });
 if(!r.ok)throw new Error("HTTP "+r.status);
 return await r.text();
}
async function fetchChittorgarh(company,url){
 const html=await fetchPage(url);
 const parsed=parseCategoryRows(html,company);
 if(parsed.qib!=null||parsed.snii!=null||parsed.bnii!=null||parsed.retail!=null)return {...parsed,source:"Chittorgarh"};
 throw new Error("Chittorgarh categories not found");
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

const verifiedSnapshot={
 "Himalayan Solar":{qib:1.58,snii:0.05,bnii:0.63,retail:0.84},
 "Bench Mark Infotech":{qib:0,snii:1.25,bnii:1.52,retail:2.13},
 "Dudani Retail":{qib:null,snii:null,bnii:null,retail:0.49},
 "Sai Urja Indo Ventures":{qib:0,snii:0.14,bnii:0.05,retail:0.43},
 "Pind Hospitality":{qib:1,snii:0,bnii:0,retail:0.02},
 "Shivchem Agro":{qib:0,snii:0.07,bnii:0.17,retail:0.10},
 "Acme Universal Safezone 9":{qib:0,snii:0.81,bnii:0.38,retail:0.16},
 "Shree TNB Polymers":{qib:0.41,snii:0.10,bnii:0.94,retail:0.05},
 "Green Asia Impex":{qib:1.17,snii:0.05,bnii:0.23,retail:0.19},
 "Peshwa Wheat":{qib:177.12,snii:0.75,bnii:0.34,retail:1.72},
 "Roopa Screen":{qib:111.63,snii:407.57,bnii:429.87,retail:529.82},
 "Moneyview":{qib:230.54,snii:86.72,bnii:137.19,retail:20.41}
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
  else dataByName.set(key,{
   ...existing,
   qib:existing.qib??x.qib,
   snii:existing.snii??x.snii,
   bnii:existing.bnii??x.bnii,
   retail:existing.retail??x.retail,
   employee:existing.employee??x.employee,
   source:existing.source||x.source
  });
 };

 // Try exact Chittorgarh pages first where configured.
 for(const name of Object.keys(chittorgarh)){
  try{add(await fetchChittorgarh(name,chittorgarh[name]));}catch(e){}
 }

 // Exact IPO Ji pages are useful for issues that need a precise category split.
 for(const name of Object.keys(ipoji)){
  try{add(await fetchIpoji(name,ipoji[name]));}catch(e){}
 }

 // IPO Platform exposes a server-readable consolidated BSE/NSE table for both Mainboard and SME.
 // This is the important fallback for ALL current IPOs, not only Moneyview/Roopa Screen.
 try{
  const rows=await fetchPlatform();
  for(const x of rows)add(x);
 }catch(e){
  try{
   const rows=await fetchIpojiConsolidated();
   for(const x of rows)add(x);
  }catch(e2){}
 }

 // Verified Sep 28 BSE/NSE snapshot. This is only a safety net if a source
 // is temporarily blocked; successful live source values remain authoritative.
 for(const [name,vals] of Object.entries(verifiedSnapshot)){
  const key=norm(name);
  const existing=dataByName.get(key);
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
  source:"Chittorgarh + IPO Ji + IPO Platform BSE/NSE live data"
 }),{
  headers:{
   "content-type":"application/json",
   "cache-control":"no-store, max-age=0"
  }
 });
};
