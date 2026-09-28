const base=[["Peshwa Wheat","peshwa-wheat"],["Green Asia Impex","green-asia-impex"],["Roopa Screen","roopa-screen"],["Moneyview","moneyview"],["A-One Steels","a-one-steels"],["Coreintegra Consulting","coreintegra-consulting"],["Unitec Fibres","unitec-fibres"],["Pooja Logistics","pooja-logistics"],["Liqvd Digital","liqvd-digital"],["S.K.Offset","s-k-offset"],["Anand Seamless","anand-seamless"],["Himalaya Nutravedics","himalaya-nutravedics"],["Vivekanand Cotspin","vivekanand-cotspin"],["FX Multitech","fx-multitech"],["Robokidz Eduventures","robokidz-eduventures"]];

function clean(s){return s.replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim()}
function getValue(text,label){const re=new RegExp(label+"\\s+([0-9,.]+)x?","i");const m=text.match(re);return m?Number(m[1].replace(/,/g,"")):null}
async function subscription(name,slug){
 try{
  const res=await fetch("https://k2mstocks.com/subscription/?company="+encodeURIComponent(slug),{headers:{"user-agent":"Mozilla/5.0"}});
  if(!res.ok)return {};
  const text=clean(await res.text());
  return {
   qib:getValue(text,"QIB \\(Ex Anchor\\)"),
   snii:getValue(text,"sNII \\(< ₹10L\\)"),
   bnii:getValue(text,"bNII \\(> ₹10L\\)"),
   retail:getValue(text,"Individual Investors")
  };
 }catch{return {}}
}

export default async()=>{const results=await Promise.all(base.map(async([name,slug])=>({ipo:name,...await subscription(name,slug)})));return new Response(JSON.stringify({data:results,source:"K2M subscription pages",updatedAt:new Date().toISOString()}),{headers:{"content-type":"application/json","cache-control":"public,max-age=300"}})}