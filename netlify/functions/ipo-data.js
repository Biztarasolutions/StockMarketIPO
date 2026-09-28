function clean(s){return s.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\\s+/g," ").trim()}
function norm(s){return clean(s).toLowerCase().replace(/ipo$/,"").replace(/limited|india|services|ltd|power/gi,"").replace(/[^a-z0-9]/g,"")}
function val(cells){const v=cells[cells.length-1]?.replace(/,/g,"").match(/-?\\d+(?:\\.\\d+)?/);return v?Number(v[0]):null}
function parseSection(company,html){
 const rows=[...html.matchAll(/<tr[^>]*>([\\s\\S]*?)<\\/tr>/gi)].map(m=>[...m[1].matchAll(/<t[dh][^>]*>([\\s\\S]*?)<\\/t[dh]>/gi)].map(x=>clean(x[1])));
 const out={ipo:company};
 for(const r of rows){const label=(r[0]||"").toLowerCase();if(label.includes("qib"))out.qib=val(r);else if(label.includes("bhni"))out.bnii=val(r);else if(label.includes("shni"))out.snii=val(r);else if(label==="retail"||label==="individual")out.retail=val(r);else if(label==="employee")out.employee=val(r);}
 return out;
}
async function fetchLive(){
 const r=await fetch("https://www.ipoji.com/ipo-subscription-status-live-bidding-data-bse-nse",{headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)","accept":"text/html"}});
 if(!r.ok)throw new Error("IPO Ji HTTP "+r.status);
 const html=await r.text();
 const sections=[...html.matchAll(/<h3[^>]*>([\\s\\S]*?)<\\/h3>([\\s\\S]*?)(?=<h3[^>]*>|$)/gi)];
 return sections.map(m=>{const heading=clean(m[1]);return parseSection(heading.replace(/ IPO.*$/i,"").trim(),m[2])}).filter(x=>x.qib!=null||x.snii!=null||x.bnii!=null||x.retail!=null);
}
export default async()=>{try{
 const data=await fetchLive();
 return new Response(JSON.stringify({data,updatedAt:new Date().toISOString(),source:"IPO Ji · BSE/NSE bid data"}),{headers:{"content-type":"application/json","cache-control":"public,max-age=120"}});
}catch(e){return new Response(JSON.stringify({data:[],error:String(e)}),{status:200,headers:{"content-type":"application/json"}})}}