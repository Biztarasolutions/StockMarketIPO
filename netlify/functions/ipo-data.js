function clean(s){return s.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\\s+/g," ").trim()}
function num(s){if(!s||s==="-"||s==="—")return null;const m=String(s).replace(/,/g,"").match(/-?\\d+(?:\\.\\d+)?/);return m?Number(m[0]):null}
function norm(s){return clean(s).toLowerCase().replace(/ipo|limited|ltd|india|services|power|industries|private|pvt/g,"").replace(/[^a-z0-9]/g,"")}
async function fetchRows(){
 const r=await fetch("https://www.ipoplatform.com/ipo/subscription-status",{headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)","accept":"text/html"}});
 if(!r.ok)throw new Error("IPO Platform HTTP "+r.status);
 const html=await r.text();
 return [...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)]
  .map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])))
  .filter(r=>r.length>=12&&r[0]&&r[0]!=="Company Name");
}
export default async()=>{try{
 const rows=await fetchRows();
 const data=rows.map(r=>({ipo:r[0].replace(/\\s+IPO Review Report.*$/i,"").trim(),type:/SME/i.test(r[1])?"SME":"Mainboard",qib:num(r[8]),snii:num(r[9]),bnii:num(r[10]),retail:num(r[12]),employee:num(r[13]),source:"IPO Platform · BSE/NSE"}));
 return new Response(JSON.stringify({data,updatedAt:new Date().toISOString(),source:"IPO Platform live BSE/NSE subscription table"}),{headers:{"content-type":"application/json","cache-control":"no-store"}});
}catch(e){return new Response(JSON.stringify({data:[],error:String(e),updatedAt:new Date().toISOString()}),{status:200,headers:{"content-type":"application/json","cache-control":"no-store"}})}}