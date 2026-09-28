const issues=[
["Green Asia Impex","https://ipoindex.in/ipo/green-asia-impex-sme-ipo-live-subscription-status/"],
["Peshwa Wheat","https://ipoindex.in/ipo/peshwa-wheat-sme-ipo-live-subscription-status/"],
["Roopa Screen","https://ipoindex.in/ipo/roopa-screen-sme-ipo/"],
["Shree TNB Polymers","https://ipoindex.in/ipo/shree-tnb-polymers-sme-ipo-live-subscription-status/"],
["Acme Universal Safezone 9","https://ipoindex.in/ipo/acme-universal-safezone-9-sme-ipo-live-subscription-status/"],
["Shivchem Agro","https://ipoindex.in/ipo/shivchem-agro-sme-ipo-live-subscription-status/"],
["Pind Hospitality","https://ipoindex.in/ipo/pind-hospitality-sme-ipo-live-subscription-status/"],
["Dudani Retail","https://ipoindex.in/ipo/dudani-retail-sme-ipo-live-subscription-status/"],
["Bench Mark Infotech","https://ipoindex.in/ipo/bench-mark-infotech-sme-ipo-live-subscription-status/"],
["Himalayan Solar","https://ipoindex.in/ipo/himalayan-solar-sme-ipo-live-subscription-status/"],
["Sai Urja Indo Ventures","https://ipoindex.in/ipo/sai-urja-indo-ventures-sme-ipo-live-subscription-status/"],
["Coreintegra Consulting","https://ipoindex.in/ipo/coreintegra-consulting-sme-ipo-live-subscription-status/"],
["Unitec Fibres","https://ipoindex.in/ipo/unitec-fibres-sme-ipo-live-subscription-status/"],
["Pooja Logistics","https://ipoindex.in/ipo/pooja-logistics-sme-ipo-live-subscription-status/"],
["Liqvd Digital","https://ipoindex.in/ipo/liqvd-digital-sme-ipo-live-subscription-status/"],
["S.K.Offset","https://ipoindex.in/ipo/s-k-offset-sme-ipo-live-subscription-status/"],
["Anand Seamless","https://ipoindex.in/ipo/anand-seamless-sme-ipo-live-subscription-status/"],
["Himalaya Nutravedics","https://ipoindex.in/ipo/himalaya-nutravedics-sme-ipo-live-subscription-status/"],
["Vivekanand Cotspin","https://ipoindex.in/ipo/vivekanand-cotspin-sme-ipo-live-subscription-status/"],
["FX Multitech","https://ipoindex.in/ipo/fx-multitech-sme-ipo-live-subscription-status/"],
["Robokidz Eduventures","https://ipoindex.in/ipo/robokidz-eduventures-sme-ipo-live-subscription-status/"]
];
function textOnly(html){return html.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\\s+/g," ").trim()}
function value(text,label){const m=text.match(new RegExp(label+"\\s+([0-9,.]+)\\s*[x×]","i"));return m?Number(m[1].replace(/,/g,"")):null}
async function fetchOne(name,url){try{const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0"}});if(!r.ok)return {ipo:name};const t=textOnly(await r.text());return {ipo:name,qib:value(t,"QIB"),snii:value(t,"S-HNI"),bnii:value(t,"B-HNI"),retail:value(t,"Individual"),source:url}}catch{return {ipo:name}}}
export default async()=>{const data=await Promise.all(issues.map(([n,u])=>fetchOne(n,u)));return new Response(JSON.stringify({data,updatedAt:new Date().toISOString()}),{headers:{"content-type":"application/json","cache-control":"public,max-age=300"}})}