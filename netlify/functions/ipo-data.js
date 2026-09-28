const chittorgarh={
 "Roopa Screen":"https://www.chittorgarh.com/ipo_subscription/roopa-screen-ipo/2651/",
};
const ipoji={
 "Moneyview":"https://www.ipoji.com/ipo-subscription/moneyview-ipo",
 "Roopa Screen":"https://www.ipoji.com/ipo-subscription/roopa-screen-ipo"
};
function clean(s){return String(s||"").replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\\s+/g," ").trim()}
function num(s){const m=String(s||"").replace(/,/g,"").match(/-?\\d+(?:\\.\\d+)?/);return m?Number(m[0]):null}
function norm(s){return clean(s).toLowerCase().replace(/ipo|limited|ltd|india|services|power|industries|private|pvt/g,"").replace(/[^a-z0-9]/g,"")}
function parseCategoryRows(html,company){
 const rows=[...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
 const out={ipo:company};
 for(const r of rows){
   const label=(r[0]||"").toLowerCase().replace(/[^a-z]/g,"");
   const last=r[r.length-1];
   if(label.includes("qib"))out.qib=num(last);
   else if(label.includes("bhni")||label.includes("bnii"))out.bnii=num(last);
   else if(label.includes("shni")||label.includes("snii"))out.snii=num(last);
   else if(label==="retail"||label.includes("individualinvestor")||label==="rii")out.retail=num(last);
   else if(label.includes("employee"))out.employee=num(last);
 }
 return out;
}
async function fetchPage(url){
 const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)","accept":"text/html,application/xhtml+xml"}});
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
async function discoverChittorgarh(){const html=await fetchPage("https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21/");const links=[...html.matchAll(/href=["\'](\\/ipo_subscription\\/[^"\']+)["\']/gi)].map(m=>"https://www.chittorgarh.com"+m[1]);return [...new Set(links)];}
async function fetchConsolidated(){
 const html=await fetchPage("https://www.ipoji.com/ipo-subscription-status-live-bidding-data-bse-nse");
 const rows=[...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
 return rows.filter(r=>r.length>=13).map(r=>({ipo:r[0],qib:num(r[8]),snii:num(r[9]),bnii:num(r[10]),retail:num(r[12]),employee:num(r[13]),source:"IPO Ji BSE/NSE"}));
}
export default async()=>{const names=[...new Set([...Object.keys(chittorgarh),...Object.keys(ipoji)])];const data=[];
 for(const name of names){let x=null;try{x=await fetchChittorgarh(name,chittorgarh[name])}catch(e){} if(!x&&ipoji[name])try{x=await fetchIpoji(name,ipoji[name])}catch(e){} if(x)data.push(x)}
 try{const fallback=await fetchConsolidated();for(const x of fallback){const i=data.findIndex(d=>norm(d.ipo)===norm(x.ipo));if(i<0)data.push(x);else data[i]={...data[i],qib:data[i].qib??x.qib,snii:data[i].snii??x.snii,retail:data[i].retail??x.retail}}}catch(e){}
 return new Response(JSON.stringify({data,updatedAt:new Date().toISOString(),source:"Chittorgarh IPO pages + BSE/NSE live fallback"}),{headers:{"content-type":"application/json","cache-control":"no-store"}})}