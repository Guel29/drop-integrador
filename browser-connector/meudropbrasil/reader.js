/** Runs only after a user click. Reads Product JSON-LD, never forms or passwords. */
export function readProductsFromDocument() {
 const allowed=['meudropbrasil.com','www.meudropbrasil.com'];
 if(location.protocol!=='https:'||!allowed.includes(location.hostname))return {products:[],error:'Abra uma página de produto ou catálogo em https://meudropbrasil.com, faça seu login normal no site e tente novamente.'};
 const products=[];const seen=new Set();let visited=0;
 const text=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():'';
 const source=value=>{try{const u=new URL(typeof value==='string'?value:location.href,location.href);if(u.protocol!=='https:'||!allowed.includes(u.hostname)||u.username||u.password||u.port)throw Error();return u.origin+u.pathname;}catch{return location.origin+location.pathname;}};
 const price=v=>{const s=typeof v==='number'?String(v):text(v);if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(s))return null;const c=Math.round(Number(s)*100);return Number.isSafeInteger(c)&&c>0&&c<=100000000?c:null;};
 function visit(node,depth=0){if(!node||typeof node!=='object'||depth>12||++visited>5000||products.length>=20)return;if(Array.isArray(node)){for(const child of node)visit(child,depth+1);return;}
 const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];
 if(types.includes('Product')){const offers=Array.isArray(node.offers)?node.offers:(node.offers?[node.offers]:[]);const offer=offers.length===1?offers[0]:null;const currency=offer?text(offer.priceCurrency).toUpperCase():'';const cost=currency==='BRL'?price(offer.price):null;const av=offer?text(offer.availability).split('/').pop():'';const availability=av==='InStock'?'in_stock':av==='OutOfStock'?'out_of_stock':'unknown';const sku=text(node.sku);const url=source(node.url);const title=text(node.name);const key=sku+'|'+url+'|'+title;if(title&&!seen.has(key)){seen.add(key);products.push({sku,title,cost,stock:null,availability,gtin:text(node.gtin13)||text(node.gtin14)||text(node.gtin12)||text(node.gtin8)||text(node.gtin),sourceUrl:url});}}
 for(const [key,value] of Object.entries(node))if(key!=='offers')visit(value,depth+1);
 }
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){if((script.textContent??'').length>1000000)continue;try{visit(JSON.parse(script.textContent));}catch{/* Invalid structured metadata is not executed or guessed. */}}
 return {products,error:products.length?'':'Esta página não forneceu dados estruturados suficientes. Você pode preencher um produto manualmente ou abrir a página detalhada do produto.',sourceUrl:location.origin+location.pathname};
}
