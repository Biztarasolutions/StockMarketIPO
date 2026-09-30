const SOURCE="Chittorgarh";
const REPORT="https://www.chittorgarh.com/report/ipo-subscription-status-live-bidding-data-bse-nse/21";
const IST="Asia/Kolkata";

function decode(value){
 return String(value||"")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&gt;/gi,">").replace(/&lt;/gi,"<").replace(/&amp;/gi,"&")
  .replace(/&#39;|&apos;/gi,"'").replace(/&quot;/gi,'"')
  .replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number)))
  .replace(/&#x([\da-f]+);/gi,(_,number)=>String.fromCodePoint(parseInt(number,16)));
}
function clean(value){
 return decode(String(value||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")).replace(/\s+/g," ").trim();
}
function number(value){
 const text=clean(value).replace(/,/g,"");
 if(!text||/^(?:-|—|n\/?a|not available)$/i.test(text))return null;
 const match=text.match(/-?\d+(?:\.\d+)?/);
 return match?Number(match[0]):null;
}
function labelKey(value){
 const raw=clean(value).toLowerCase();
 const compact=raw.replace(/[^a-z0-9]+/g,"");
 if(/\bcategory\b/.test(raw))return "category";
 if(/company|ipo\s*name/.test(raw))return "ipo";
 if(/\bqib\b|qualified institutional buyer/.test(raw))return "qib";
 if(/\bnii\b/.test(raw)&&raw.includes(">"))return "bnii";
 if(/\bnii\b/.test(raw)&&raw.includes("<"))return "snii";
 if(/\b(bnii|bhni)\b|big\s*(?:hni|nii)|above\s*(?:₹|rs\.?\s*)?\s*10\s*(?:lakh|lac|l)/i.test(raw))return "bnii";
 if(/\b(snii|shni)\b|small\s*(?:hni|nii)|up to\s*(?:₹|rs\.?\s*)?\s*10\s*(?:lakh|lac|l)/i.test(raw))return "snii";
 if(/\bnii\b|non[\s-]*institutional|hni/.test(raw))return "nii";
 if(/retail|\brii\b|individual\s*(?:investor|buyer)/.test(raw))return "retail";
 if(/^emp\b|employee/.test(raw))return "employee";
 if(/shareholder/.test(raw))return "shareholder";
 if(/application/.test(raw))return "applications";
 if(/shares?\s*offered/.test(raw))return "shares_offered";
 if(/shares?\s*(?:bid|applied)/.test(raw))return "shares_bid";
 if(/subscription\s*(?:as\s*)?on|updated\s*(?:at|on)?/.test(raw))return "updated_at";
 if(/closing\s*date/.test(raw))return "closing_date";
 if(/\btotal\b/.test(raw))return "total";
 if(/\bothers?\b/.test(raw))return "other";
 if(/issue\s*amount/.test(raw))return "issue_amount";
 if(/\bdate\b|day\s*(?:no\.?|number)?/.test(raw))return "date";
 if(/subscription/.test(raw))return "subscription";
 return compact;
}
function tablesFromHtml(html){
 return [...String(html).matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table=>
  [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>({
   markup:row[1],cells:[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>clean(cell[1]))
  })).filter(row=>row.cells.length)
 );
}
function parseDate(value){
 const text=clean(value).replace(/\(.*?\)/g," ");
 const iso=text.match(/\b(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?Z)?/i);
 if(iso){
  const date=new Date(`${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]||"00"}:${iso[5]||"00"}:${iso[6]||"00"}Z`);
  return {date:iso[0].slice(0,10),updated_at:iso[4]?date.toISOString():null,year:Number(iso[1]),month:Number(iso[2]),day:Number(iso[3])};
 }
 let match=text.match(/\b(\d{1,2})[-/\s]+([A-Za-z]{3,9})[-/,\s]+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
 let monthFirst=false;
 if(!match){
  match=text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  monthFirst=Boolean(match);
 }
 if(!match)return null;
 const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
 const day=Number(monthFirst?match[2]:match[1]);
 const month=months[String(monthFirst?match[1]:match[2]).slice(0,3).toLowerCase()];
 const year=Number(match[3]);
 if(!month||!day||!year)return null;
 let hour=Number(match[4]||0),minute=Number(match[5]||0),second=Number(match[6]||0);
 const meridiem=String(match[7]||"").toUpperCase();
 if(meridiem){hour%=12;if(meridiem==="PM")hour+=12}
 const localDate=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
 const updatedAt=match[4]?new Date(Date.UTC(year,month-1,day,hour,minute,second)-330*60000).toISOString():null;
 return {date:localDate,updated_at:updatedAt,year,month,day};
}
function parseHistoryDate(value,yearHint,closingDate){
 const full=parseDate(value);
 if(full)return full;
 const match=clean(value).match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/i);
 if(!match)return null;
 const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
 const month=months[match[1].slice(0,3).toLowerCase()],day=Number(match[2]);
 if(!month||!day)return null;
 let year=Number(yearHint)||new Date().getUTCFullYear();
 const closing=parseDate(closingDate);
 if(closing&&Math.abs(Date.UTC(year-1,month-1,day)-Date.UTC(closing.year,closing.month-1,closing.day))<Math.abs(Date.UTC(year,month-1,day)-Date.UTC(closing.year,closing.month-1,closing.day)))year--;
 if(closing&&Math.abs(Date.UTC(year+1,month-1,day)-Date.UTC(closing.year,closing.month-1,closing.day))<Math.abs(Date.UTC(year,month-1,day)-Date.UTC(closing.year,closing.month-1,closing.day)))year++;
 const time=clean(value).match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?\b/i);
 let updatedAt=null;
 if(time){
  let hour=Number(time[1]);
  const meridiem=String(time[4]||"").toUpperCase();
  if(meridiem){hour%=12;if(meridiem==="PM")hour+=12}
  updatedAt=new Date(Date.UTC(year,month-1,day,hour,Number(time[2]),Number(time[3]||0))-330*60000).toISOString();
 }
 return {date:`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,year,month,day,updated_at:updatedAt};
}
function todayInIST(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:IST,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function makeRecord(base){
 return {ipo:base.ipo,ipo_type:base.ipo_type,ipo_id:base.ipo_id,subscription_date:base.subscription_date||null,subscription_day:base.subscription_day??null,updated_at:base.updated_at||null,qib:null,nii:null,bnii:null,snii:null,retail:null,employee:null,shareholder:null,total:null,applications:null,shares_offered:null,shares_bid:null,subscription_multiple:null,source:SOURCE,source_record:"latest",...base};
}
function parseListingPage(html,ipoType){
 const tables=tablesFromHtml(html).map(rows=>({rows,keys:rows[0]?.cells.map(labelKey)||[]}));
 const table=tables.find(item=>item.keys.includes("ipo")&&item.keys.includes("qib")&&item.keys.includes("closing_date")&&item.keys.includes("updated_at"));
 if(!table)throw new Error(`${ipoType} subscription table not found`);
 const index=key=>table.keys.indexOf(key);
 return table.rows.slice(1).map(row=>{
  const value=key=>index(key)>=0?row.cells[index(key)]:"";
  const detailLink=row.markup.match(/<a\b[^>]*href=["']([^"']*\/ipo_subscription\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
  if(!detailLink)return null;
  const detailUrl=new URL(decode(detailLink[1]),"https://www.chittorgarh.com").href;
  const id=detailUrl.match(/\/(\d+)\/?(?:\?.*)?$/)?.[1]||null;
  const ipoAnchor=row.markup.match(/<a\b[^>]*href=["'][^"']*\/ipo\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
  const ipo=clean(ipoAnchor?.[1]||detailLink[2]).replace(/\s+(?:O|CT|P)\s*$/i,"").trim();
  const closing=parseDate(value("closing_date")),update=parseDate(value("updated_at"));
  if(!ipo||!update)return null;
  const record=makeRecord({ipo,ipo_type:ipoType,ipo_id:id,detail_url:detailUrl,closing_date:closing?.date||null,subscription_date:update.date,updated_at:update.updated_at,source_record:"report-latest"});
  for(const field of ["qib","nii","bnii","snii","retail","employee","shareholder","total","other","applications"]){
   const column=index(field);
   if(column>=0)record[field]=number(row.cells[column]);
  }
  record.subscription_multiple=record.total;
  return record;
 }).filter(Boolean);
}
function parseApiRows(payload,ipoType){
 if(payload?.msg!==1||!Array.isArray(payload.reportTableData))throw new Error(`${ipoType} report API returned no IPO records`);
 return payload.reportTableData.map(row=>{
  const company=String(row.Company||"");
  const companyLink=company.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
  const ipo=clean(companyLink?.[1]||company).replace(/\s+(?:O|CT|P)\s*$/i,"").trim();
  const id=String(row["~id"]||"");
  const slug=String(row["~URLRewrite_Folder_Name"]||"");
  const closing=parseDate(row["Closing Date"]||row["~Issue_Close_Date"]);
  const update=parseDate(row["Subscription as on"]);
  if(!ipo||!id||!slug||!update)return null;
  const record=makeRecord({ipo,ipo_type:ipoType,ipo_id:id,detail_url:`https://www.chittorgarh.com/ipo_subscription/${slug}/${id}/`,closing_date:closing?.date||null,subscription_date:update.date,updated_at:update.updated_at,source_record:"api-latest"});
  for(const [header,value] of Object.entries(row)){
   const field=labelKey(header);
   if(["qib","nii","bnii","snii","retail","employee","shareholder","total","other","applications"].includes(field))record[field]=number(value);
  }
  record.subscription_multiple=record.total;
  return record;
 }).filter(Boolean);
}
async function fetchReport(ipoType,year){
 const fiscalYear=`${year}-${String(year+1).slice(-2)}`;
 const apiUrl=`https://webnodejs.chittorgarh.com/cloud/report/data-read/21/1/9/${year}/${fiscalYear}/0/${ipoType.toLowerCase()}/0?search=&v=11-05&_ts=${Date.now()}`;
 try{
  const response=await fetch(apiUrl,{cache:"no-store",headers:{accept:"application/json","cache-control":"no-cache, no-store, max-age=0",pragma:"no-cache"}});
  if(!response.ok)throw new Error(`HTTP ${response.status}${response.status===403||response.status===429?" (Chittorgarh access blocked)":""}`);
  const payload=await response.json();
  return {records:parseApiRows(payload,ipoType),totalRecords:payload.totalRecords,source:"Chittorgarh official API"};
 }catch(error){
  console.warn(`[IPO] ${ipoType} JSON endpoint unavailable; trying Chittorgarh HTML report fallback: ${error.message}`);
  const html=await fetchPage(`${REPORT}/${ipoType.toLowerCase()}/?year=${year}`);
  return {records:parseListingPage(html,ipoType).map(record=>({...record,source_record:"html-fallback"})),source:"Chittorgarh HTML fallback"};
 }
}
function extractPageUpdate(html){
 const text=clean(html);
 const updates=[...text.matchAll(/(?:by|as\s+of|as\s+on|updated(?:\s+at|\s+on)?)\s+((?:[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}[-/\s]+[A-Za-z]{3,9}[-/,\s]+\d{4})\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)(?:\s*\(\s*Day\s*(\d+)\s*\))?/gi)];
 const match=updates.at(-1);
 if(!match)return null;
 const parsed=parseDate(match[1]);
 return parsed?{...parsed,subscription_day:match[2]?Number(match[2]):null}:null;
}
function categoryTable(html){
 for(const rows of tablesFromHtml(html)){
  if(rows.length<2)continue;
  const keys=rows[0].cells.map(labelKey);
  const categoryIndex=keys.indexOf("category"),subscriptionIndex=keys.indexOf("subscription");
  if(categoryIndex>=0&&subscriptionIndex>=0)return {keys,rows:rows.slice(1),categoryIndex,subscriptionIndex};
 }
 return null;
}
function readCategoryValues(table){
 const values={qib:null,nii:null,bnii:null,snii:null,retail:null,employee:null,shareholder:null,total:null,applications:null,shares_offered:null,shares_bid:null};
 if(!table)return values;
 let totalRow=null;
 for(const row of table.rows){
  const category=labelKey(row.cells[table.categoryIndex]);
  if(Object.prototype.hasOwnProperty.call(values,category))values[category]=number(row.cells[table.subscriptionIndex]);
  if(category==="total")totalRow=row.cells;
 }
 if(totalRow){
  for(let index=0;index<table.keys.length;index++){
   if(["applications","shares_offered","shares_bid"].includes(table.keys[index]))values[table.keys[index]]=number(totalRow[index]);
  }
 }
 values.subscription_multiple=values.total;
 return values;
}
function historyRecords(html,base){
 const records=[];
 for(const rows of tablesFromHtml(html)){
  if(rows.length<2)continue;
  const keys=rows[0].cells.map(labelKey),dateIndex=keys.indexOf("date");
  if(dateIndex<0||!keys.some(key=>["qib","nii","bnii","snii","retail","total"].includes(key)))continue;
  for(const row of rows.slice(1)){
   const parsed=parseHistoryDate(row.cells[dateIndex],base.closing_date?.slice(0,4),base.closing_date);
   if(!parsed)continue;
   const dayMatch=row.cells[dateIndex].match(/day\s*(\d+)/i);
   const record=makeRecord({...base,subscription_date:parsed.date,updated_at:parsed.updated_at,subscription_day:dayMatch?Number(dayMatch[1]):null,source_record:"history"});
   for(let index=0;index<keys.length;index++){
    if(["qib","nii","bnii","snii","retail","employee","shareholder","total","applications"].includes(keys[index]))record[keys[index]]=number(row.cells[index]);
   }
   record.subscription_multiple=record.total;
   records.push(record);
  }
 }
 return records;
}
function parseDetailPage(html,base){
 const title=clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"").replace(/\s+Subscription Details?$/i,"");
 const ipo=title||base.ipo;
 const update=extractPageUpdate(html)||{date:base.subscription_date,updated_at:base.updated_at,subscription_day:base.subscription_day};
 const table=categoryTable(html),current=readCategoryValues(table);
 const records=historyRecords(html,{...base,ipo});
 if(table&&[current.qib,current.nii,current.bnii,current.snii,current.retail,current.total].some(value=>value!=null)){
  const available=Object.fromEntries(Object.entries(current).filter(([,value])=>value!=null));
  records.push(makeRecord({...base,...available,ipo,subscription_date:update.date||base.subscription_date,updated_at:update.updated_at||base.updated_at,subscription_day:update.subscription_day||base.subscription_day,source_record:"detail-latest"}));
 }
 return records;
}
async function fetchPage(url){
 const separator=url.includes("?")?"&":"?";
 const response=await fetch(`${url}${separator}_ts=${Date.now()}`,{cache:"no-store",headers:{"user-agent":"Mozilla/5.0 (compatible; StockInvestmentPlan/1.0)",accept:"text/html,application/xhtml+xml","cache-control":"no-cache, no-store, max-age=0",pragma:"no-cache"}});
 if(!response.ok)throw new Error(`HTTP ${response.status}${response.status===403||response.status===429?" (Chittorgarh access blocked)":""}`);
 const html=await response.text();
 if(/access denied|request rejected|robots\.txt|captcha/i.test(html.slice(0,5000)))throw new Error("Chittorgarh returned an access-denied page");
 return html;
}
function compareRecords(first,second){
 const dateCompare=String(first.subscription_date||"").localeCompare(String(second.subscription_date||""));
 if(dateCompare)return dateCompare;
 const timeCompare=String(first.updated_at||"").localeCompare(String(second.updated_at||""));
 if(timeCompare)return timeCompare;
 return Number(first.subscription_day||0)-Number(second.subscription_day||0);
}
function uniqueRecords(records){
 const unique=new Map();
 for(const record of records){
  const key=[record.ipo_id,record.subscription_date,record.updated_at||record.subscription_day||"unknown"].join("|");
  const prior=unique.get(key);
  if(!prior||record.source_record==="detail-latest"||record.updated_at)unique.set(key,{...prior,...record});
 }
 return [...unique.values()].sort(compareRecords);
}
async function fetchDetails(records,today){
 const toFetch=records.filter(record=>record.detail_url&&record.closing_date&&record.closing_date>=today);
 const output=[];
 for(let offset=0;offset<toFetch.length;offset+=12){
  const batch=toFetch.slice(offset,offset+12);
  output.push(...await Promise.all(batch.map(async base=>{
   try{return {base,records:parseDetailPage(await fetchPage(base.detail_url),base)}}
   catch(error){console.warn(`[IPO] ${base.ipo}: detail page unavailable; using Chittorgarh report fallback: ${error.message}`);return {base,records:[]}}
  })));
 }
 return output;
}
function logLatest(record,allRecords){
 const records=allRecords.filter(item=>item.ipo_id===record.ipo_id);
 if(records.length>1)console.info(`[IPO] ${record.ipo} records found: ${records.map(item=>`${item.subscription_date} / Day ${item.subscription_day??"?"}${item.updated_at?` / ${new Intl.DateTimeFormat("en-GB",{timeZone:IST,hour:"2-digit",minute:"2-digit"}).format(new Date(item.updated_at))}`:""}`).join("; ")}`);
 console.info(`[IPO] ${record.ipo}\n[IPO TYPE] ${record.ipo_type}\n[SOURCE] ${SOURCE}\n[DATE FOUND] ${record.subscription_date}\n[DAY] ${record.subscription_day??"unknown"}\n[UPDATED AT] ${record.updated_at||"not provided"}\n[QIB] ${record.qib??"n/a"}\n[NII] ${record.nii??"n/a"}\n[bNII] ${record.bnii??"n/a"}\n[sNII] ${record.snii??"n/a"}\n[RETAIL] ${record.retail??"n/a"}\n[TOTAL] ${record.total??"n/a"}\n[SOURCE RECORD] ${record.source_record}`);
}

export default async()=>{
 const year=Number(todayInIST().slice(0,4));
 const [mainboardResult,smeResult]=await Promise.allSettled([
  fetchReport("Mainboard",year),
  fetchReport("SME",year)
 ]);
 const errors=[],listed=[],sources=[];
 for(const [result,ipoType] of [[mainboardResult,"Mainboard"],[smeResult,"SME"]]){
  if(result.status==="rejected"){errors.push({ipo_type:ipoType,message:result.reason.message});continue}
  listed.push(...result.value.records);
  sources.push(result.value.source);
 }
 if(!listed.length){
  return new Response(JSON.stringify({error:"Chittorgarh subscription data is unavailable",errors}),{status:502,headers:{"content-type":"application/json","cache-control":"no-store, max-age=0"}});
 }
 const today=todayInIST(),detailResults=await fetchDetails(listed,today),allRecords=[];
 for(const result of detailResults)allRecords.push(...result.records);
 const latestDetailById=new Map(detailResults.map(result=>[
  result.base.ipo_id,
  result.records.filter(record=>record.source_record==="detail-latest").reduce((latest,record)=>!latest||compareRecords(record,latest)>0?record:latest,null)
 ]));
 const latestDayById=new Map();
 for(const result of detailResults){
  const match=result.records.filter(record=>record.subscription_date===result.base.subscription_date&&record.subscription_day).reduce((latest,record)=>!latest||record.subscription_day>latest.subscription_day?record:latest,null);
  if(match)latestDayById.set(result.base.ipo_id,match.subscription_day);
 }
 for(const record of listed){
  const detail=latestDetailById.get(record.ipo_id);
  allRecords.push({...record,subscription_day:record.subscription_day??latestDayById.get(record.ipo_id)??(detail?.subscription_date===record.subscription_date?detail.subscription_day:null),shares_offered:record.shares_offered??detail?.shares_offered??null,shares_bid:record.shares_bid??detail?.shares_bid??null});
 }
 const grouped=new Map();
 for(const record of uniqueRecords(allRecords)){
  const group=grouped.get(record.ipo_id)||[];
  group.push(record);grouped.set(record.ipo_id,group);
 }
 const records=[...grouped.values()].flat();
 const data=[...grouped.values()].map(group=>group.reduce((latest,record)=>compareRecords(record,latest)>0?record:latest));
 for(const record of data)logLatest(record,records);
 return new Response(JSON.stringify({data,records,updatedAt:new Date().toISOString(),timezone:IST,source:[...new Set(sources)].join(" + "),errors}),{headers:{"content-type":"application/json","cache-control":"no-store, max-age=0"}});
};
