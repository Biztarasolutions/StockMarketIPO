function clean(s){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\\s+/g," ").trim()}
function num(s){if(!s)return null;const m=s.replace(/,/g,"").match(/-?\\d+(?:\\.\\d+)?/);return m?Number(m[0]):null}
function norm(s){return clean(s).toLowerCase().replace(/[^a-z0-9]/g,"")}
async function fetchTable(url){
 const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)"}});
 if(!r.ok)throw new Error("source "+r.status);
 const html=await r.text(); const rows=[...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)];
 return rows.map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1]))).filter(r=>r.length>=10);
}
export default async()=>{try{
 const rows=await fetchTable("https://www.ipoplatform.com/ipo/subscription-status/sme");
 const data=rows.slice(1).map(r=>({ipo:r[0],type:"SME",qib:num(r[8]),snii:num(r[9]),bnii:num(r[10]),retail:num(r[12]),source:"IPO Platform"})).filter(x=>x.ipo&&x.ipo!=="Company Name");
 return new Response(JSON.stringify({data,updatedAt:new Date().toISOString(),source:"IPO Platform live SME subscription table"}),{headers:{"content-type":"application/json","cache-control":"public,max-age=300"}});
}catch(e){return new Response(JSON.stringify({data:[],error:String(e)}),{status:200,headers:{"content-type":"application/json"}})}}