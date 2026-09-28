const chittorgarh={
 "Roopa Screen":"https://www.chittorgarh.com/ipo_subscription/roopa-screen-ipo/2651/",
};
const ipoji={
 "Moneyview":"https://www.ipoji.com/ipo-subscription/moneyview-ipo",
 "Roopa Screen":"https://www.ipoji.com/ipo-subscription/roopa-screen-ipo"
};

function clean(s){
 return String(s||"")
  .replace(/<script[\s\S]*?<\\/script>/gi," ")
  .replace(/<style[\s\S]*?<\\/style>/gi," ")
  .replace(/<[^>]*>/g," ")
  .replace(/&nbsp;/g," ")
  .replace(/&amp;/g,"&")
  .replace(/&#39;/g,"'")
  .replace(/&quot;/g,'"')
  .replace(/\s+/g," ")
  .trim();
}
function num(s){
 const m=String(s||"").replace(/,/g,"").match(/-?\\d+(?:\\.\\d+)?/);
 return m?Number(m[0]):null;
}
function norm(s){
 return clean(s).toLowerCase()
  .replace(/ipo|limited|ltd|india|services|power|industries|private|pvt|reviewreport/g,"")
  .replace(/[^a-z0-9]/g,"");
}
function parseCategoryRows(html,company){
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
 const out={ipo:company};
 for(const r of rows){
  const label=(r[0]||"").toLowerCase().replace(/[^a-z]/g,"");
  const last=r[r.length-1];
  if(label.includes("qib"))out.qib=num(last);
  else if(label.includes("bhni")||label.includes("bnii"))out.bnii=num(last);
  else if(label.includes("shni")||label.includes("snii"))out.snii=num(last);
  else if(label==="retail"||label.includes("individualinvestor")||label.includes("rii"))out.retail=num(last);
  else if(label.includes("employee"))out.employee=num(last);
 }
 return out;
}
function parseConsolidatedRows(html,source){
 const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
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
 const r=await fetch(url,{
  headers:{
   "user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)",
   "accept":"text/html,application/xhtml+xml"
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
async function discoverChittorgarh(){
 const html=await fetchPage("https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21/");
 const links=[...html.matchAll(/href=["'](\\/ipo_subscription\\/[^"']+)["']/gi)]
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
