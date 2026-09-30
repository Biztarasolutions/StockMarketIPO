const listingDateCache=new Map();

function clean(value){
 return String(value||"")
  .replace(/<script[\s\S]*?<\/script>/gi," ")
  .replace(/<style[\s\S]*?<\/style>/gi," ")
  .replace(/<[^>]*>/g," ")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/\s+/g," ")
  .trim();
}
function parseListingDate(html){
 const text=clean(html).replace(/,/g," ");
 const match=text.match(/(?:tentative\s+)?listing\s+date\s*:?\s*((?:\d{1,2}(?:st|nd|rd|th)?\s+[a-z]{3,9}\s+\d{4})|(?:[a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4}))/i);
 if(!match)return null;
 const value=match[1].replace(/(\d)(st|nd|rd|th)\b/i,"$1");
 const dayFirst=value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
 const monthFirst=value.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/i);
 const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
 const day=Number(dayFirst?.[1]??monthFirst?.[2]);
 const month=months[(dayFirst?.[2]??monthFirst?.[1]??"").slice(0,3).toLowerCase()];
 const year=Number(dayFirst?.[3]??monthFirst?.[3]);
 return day&&month&&year?`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
}
async function fetchListingDate(url){
 const cached=listingDateCache.get(url);
 if(cached&&cached.expiresAt>Date.now())return cached.value;
 try{
  const response=await fetch(url+"?_ts="+Date.now(),{
   cache:"no-store",
   signal:AbortSignal.timeout(5000),
   headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)","accept":"text/html,application/xhtml+xml"}
  });
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const value=parseListingDate(await response.text());
  listingDateCache.set(url,{value,expiresAt:Date.now()+(value?6:0.25)*60*60*1000});
  return value;
 }catch(error){
  listingDateCache.set(url,{value:null,expiresAt:Date.now()+5*60*1000});
  return null;
 }
}
async function mapConcurrent(items,limit,mapper){
 const results=new Array(items.length);
 let next=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(next<items.length){
   const index=next++;
   results[index]=await mapper(items[index]);
  }
 }));
 return results;
}

export default async(request)=>{
 if(request.method!=="POST")return new Response("Method not allowed",{status:405});
 try{
  const body=await request.json();
  const items=Array.isArray(body.items)?body.items.filter(item=>item?.ipo&&/^https:\/\/www\.ipoplatform\.com\//i.test(item.detailUrl)):[];
  const data=await mapConcurrent(items,8,async item=>({ipo:item.ipo,listingDate:await fetchListingDate(item.detailUrl)}));
  return new Response(JSON.stringify({data}),{headers:{"content-type":"application/json","cache-control":"no-store, max-age=0"}});
 }catch(error){
  return new Response(JSON.stringify({error:"Listing dates unavailable"}),{status:400,headers:{"content-type":"application/json"}});
 }
};