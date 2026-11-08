/** User-triggered read-only product reader. Never reads inputs, cookies or credentials. */
export function readProductsFromDocument() {
 const allowed=['meudropbrasil.com','www.meudropbrasil.com'];
 const sourceUrl=location.origin+location.pathname;
 const diagnostic={version:'0.2.0',origin:location.origin,jsonLdBlocks:0,microdataProducts:0,method:'none'};
 if(location.protocol!=='https:'||!allowed.includes(location.hostname))return {products:[],error:'Abra uma página HTTPS em meudropbrasil.com ou www.meudropbrasil.com.',diagnostic};
 const products=[];const seen=new Set();let visited=0;
 const text=v=>typeof v==='string'?v.replace(/\s+/g,' ').trim():'';
 const kind=v=>text(v).split(/[\/#]/).pop();
 const isType=(node,type)=>(Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']]).some(v=>kind(v)===type);
 const source=value=>{try{const u=new URL(typeof value==='string'?value:location.href,location.href);if(u.protocol!=='https:'||!allowed.includes(u.hostname)||u.username||u.password||u.port)throw Error();return u.origin+u.pathname;}catch{return sourceUrl;}};
 const price=v=>{const s=typeof v==='number'?String(v):text(v);if(!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(s))return null;const c=Math.round(Number(s)*100);return Number.isSafeInteger(c)&&c>0&&c<=100000000?c:null;};
 const localPrice=value=>{const s=text(value);if(/\b\d+\s*x\b|parcel|vezes|a partir/i.test(s))return null;const found=[...s.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})(?![0-9])/g)].map(m=>Math.round(Number(m[1].replace(/\./g,'').replace(',','.'))*100));const unique=[...new Set(found)];return unique.length===1&&unique[0]>0&&unique[0]<=100000000?unique[0]:null;};
 const availability=v=>kind(v)==='InStock'?'in_stock':kind(v)==='OutOfStock'?'out_of_stock':'unknown';
 const add=(p,method)=>{if(!p.title||products.length>=20)return;const key=p.sku+'|'+p.sourceUrl+'|'+p.title;if(seen.has(key))return;seen.add(key);products.push({...p,stock:null});diagnostic.method=method;};
 const graphs=new Map();const roots=[];
 function index(node,depth=0){if(!node||typeof node!=='object'||depth>12||++visited>5000)return;if(Array.isArray(node)){for(const item of node)index(item,depth+1);return;}if(typeof node['@id']==='string')graphs.set(node['@id'],node);for(const value of Object.values(node))index(value,depth+1);}
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){diagnostic.jsonLdBlocks++;if((script.textContent??'').length>1000000)continue;try{const parsed=JSON.parse(script.textContent);roots.push(parsed);index(parsed);}catch{}}
 visited=0;
 function visit(node,depth=0){if(!node||typeof node!=='object'||depth>12||++visited>5000||products.length>=20)return;if(Array.isArray(node)){for(const child of node)visit(child,depth+1);return;}
 if(isType(node,'Product')){const offers=Array.isArray(node.offers)?node.offers:(node.offers?[node.offers]:[]);let offer=offers.length===1?offers[0]:null;if(offer?.['@id']&&!offer.price)offer=graphs.get(offer['@id'])??offer;const currency=offer?text(offer.priceCurrency).toUpperCase():'';const cost=offer&&!isType(offer,'AggregateOffer')&&currency==='BRL'?price(offer.price):null;add({sku:text(node.sku),title:text(node.name),cost,availability:availability(offer?.availability),gtin:text(node.gtin13)||text(node.gtin14)||text(node.gtin12)||text(node.gtin8)||text(node.gtin),sourceUrl:source(node.url)},'json-ld');}
 for(const [key,value] of Object.entries(node))if(key!=='offers')visit(value,depth+1);
 }
 for(const root of roots)visit(root);
 const scopes=[...document.querySelectorAll('[itemscope][itemtype]')];
 const scopeType=(s,type)=>s.getAttribute('itemtype').split(/\s+/).some(t=>kind(t)===type);
 const prop=(s,name)=>{const el=[...s.querySelectorAll(`[itemprop~="${name}"]`)].find(e=>e.closest('[itemscope]')===s);return el?text(el.getAttribute('content')||el.getAttribute('href')||el.textContent):'';};
 if(!products.length)for(const scope of scopes.filter(s=>scopeType(s,'Product'))){diagnostic.microdataProducts++;const offers=[...scope.querySelectorAll('[itemscope][itemtype]')].filter(s=>scopeType(s,'Offer'));const offer=offers.length===1?offers[0]:null;add({sku:prop(scope,'sku'),title:prop(scope,'name'),cost:offer&&prop(offer,'priceCurrency')==='BRL'?price(prop(offer,'price')):null,availability:availability(offer?prop(offer,'availability'):''),gtin:prop(scope,'gtin13')||prop(scope,'gtin14')||prop(scope,'gtin'),sourceUrl:source(prop(scope,'url'))},'microdata');}
 const meta=name=>text(document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.getAttribute('content'));
 if(!products.length&&kind(meta('og:type'))?.toLowerCase()==='product'&&meta('og:title'))add({sku:'',title:meta('og:title'),cost:meta('product:price:currency')==='BRL'?price(meta('product:price:amount')):null,availability:'unknown',gtin:'',sourceUrl:source(meta('og:url'))},'open-graph');
 const visible=el=>el instanceof HTMLElement&&el.getClientRects().length>0&&!el.closest('header,nav,footer,script,style,input,textarea,select,[role="dialog"],[aria-hidden="true"],[data-smartdrop-picker]');
 const headings=[...document.querySelectorAll('h1')].filter(visible);
 const heading=headings.length===1?headings[0]:null;
 const collect=root=>{const values=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;let count=0;while((n=walker.nextNode())&&count++<2500){const parent=n.parentElement;if(!parent||!visible(parent)||parent.closest('del,s'))continue;let s=text(n.textContent);if(s==='R$')s=text(parent.textContent);if(s&&s.length<220)values.push(s);}return values;};
 if(!products.length&&heading){let cost=null;let region=heading.parentElement;for(let i=0;region&&i<4;i++,region=region.parentElement){const textValues=collect(region);const prices=[...new Set(textValues.map(localPrice).filter(p=>p!==null))];if(prices.length===1){cost=prices[0];break;}if(region===document.body)break;}add({sku:'',title:text(heading.textContent),cost,availability:'unknown',gtin:'',sourceUrl},'visible-page');}
 if(products.length===1&&heading){const snippets=collect(heading.closest('main')||document.querySelector('main')||document.body);let sku='';let gtin='';for(const s of snippets){if(!sku){const match=s.match(/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#]\s*([\p{L}\p{N}._/-]{1,80})$/u);if(match)sku=match[1];}if(!gtin){const match=s.match(/(?:EAN(?:\s+Principal)?|GTIN|C[oó]digo\s+de\s+Barras)\s*[:#]\s*([0-9]{8,14})\b/i);if(match&&[8,12,13,14].includes(match[1].length))gtin=match[1];}}
 // Some labels and codes are split into child nodes; inspect only bounded, visible label containers.
 if(!gtin||!sku)for(const el of document.querySelectorAll('li,p,dd,span')){if(!visible(el))continue;const s=text(el.textContent);if(s.length>220)continue;const m=s.match(/EAN(?:\s+Principal)?\s*[:#]\s*([0-9]{8,14})\b/i);if(m&&[8,12,13,14].includes(m[1].length))gtin=m[1];if(!sku){const match=s.match(/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#]\s*([\p{L}\p{N}._/-]{1,80})$/u);if(match)sku=match[1];}if(gtin&&sku)break;}
 products[0].sku||=sku;products[0].gtin||=gtin;}
 const missing=products.length===1?[!products[0].sku?'SKU':null,products[0].cost===null?'custo':null].filter(Boolean):[];
 return {products,error:products.length?(missing.length?`Produto encontrado. Confira ${missing.join(' e ')} na revisão ou use Selecionar campos na página.`:''):'Não identifiquei um produto único nesta página. Abra o produto detalhado ou use Selecionar campos na página.',sourceUrl,diagnostic};
}
