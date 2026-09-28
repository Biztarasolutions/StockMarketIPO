const issues=[
["Green Asia Impex","https://ipoindex.in/ipo/green-asia-impex-sme-ipo-live-subscription-status/"],
["Peshwa Wheat","https://ipoindex.in/ipo/peshwa-wheat-sme-ipo-live-subscription-status/"],
["Roopa Screen","https://ipoindex.in/ipo/roopa-screen-sme-ipo/"]
];
function textOnly(html){return html.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\\s+/g," ").trim()}
function value(text,label){const m=text.match(new RegExp(label+"\\s+([0-9,.]+)\\s*[x×]","i"));return m?Number(m[1].replace(/,/g,"")):null}
async function fetchOne(name,url){try{const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0"}});if(!r.ok)return {ipo:name};const t=textOnly(await r.text());return {ipo:name,qib:value(t,"QIB"),snii:value(t,"S-HNI"),bnii:value(t,"B-HNI"),retail:value(t,"Individual"),source:url}}catch{return {ipo:name}}}
export default async()=>{const data=await Promise.all(issues.map(([n,u])=>fetchOne(n,u)));return new Response(JSON.stringify({data,updatedAt:new Date().toISOString()}),{headers:{"content-type":"application/json","cache-control":"public,max-age=300"}})}