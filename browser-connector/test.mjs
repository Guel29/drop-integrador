import {chromium} from '@playwright/test';
import {readProductsFromDocument} from './meudropbrasil/reader.js';
import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const sku='BROWSER-ASSISTED-TEST';
const fixture={ '@context':'https://schema.org','@type':'Product',name:'Produto de teste assistido',sku,url:'https://meudropbrasil.com/__fixture__?ignored=1',offers:{'@type':'Offer',price:'116.00',priceCurrency:'BRL',availability:'https://schema.org/InStock'}};
try{
 const page=await browser.newPage();
 await page.route('https://meudropbrasil.com/**',route=>route.fulfill({contentType:'text/html',body:`<script type="application/ld+json">${JSON.stringify(fixture)}</script><input type="password" value="DO-NOT-READ-THIS">`}));
 await page.goto('https://meudropbrasil.com/__fixture__');
 const parsed=await page.evaluate(readProductsFromDocument);assert.equal(parsed.products.length,1);assert.equal(parsed.products[0].cost,11600);assert.equal(parsed.products[0].stock,null);assert.equal(parsed.products[0].availability,'in_stock');assert.ok(!JSON.stringify(parsed).includes('DO-NOT-READ-THIS'));assert.ok(!parsed.products[0].sourceUrl.includes('?'));
 await page.evaluate(()=>{document.querySelector('script').textContent=JSON.stringify({'@type':'Product',name:'Sem preço confirmado',offers:{'@type':'AggregateOffer',lowPrice:'10.00',priceCurrency:'BRL'}});});
 assert.equal((await page.evaluate(readProductsFromDocument)).products[0].cost,null);
 await page.route('https://untrusted.example/**',route=>route.fulfill({body:'No supplier'}));await page.goto('https://untrusted.example/');assert.equal((await page.evaluate(readProductsFromDocument)).products.length,0);
 const manifest=JSON.parse(await readFile('browser-connector/meudropbrasil/manifest.json','utf8'));assert.deepEqual(manifest.permissions,['activeTab','scripting']);assert.equal(manifest.host_permissions,undefined);
 console.log('PASS reader: structured price, unknown quantity, no password extraction, missing price, wrong host and minimal permissions.');
 const popup=await browser.newPage();const html=await readFile('browser-connector/meudropbrasil/popup.html','utf8');
 await popup.route('https://extension-test.example/**',async route=>{const p=new URL(route.request().url()).pathname;if(p.endsWith('popup.js')||p.endsWith('reader.js'))return route.fulfill({contentType:'text/javascript',body:await readFile('browser-connector/meudropbrasil/'+p.split('/').pop(),'utf8')});return route.fulfill({contentType:'text/html',body:html});});
 await popup.addInitScript((product)=>{Object.defineProperty(window,'chrome',{value:{tabs:{query:async()=>[{id:1,url:'https://meudropbrasil.com/__fixture__'}],create:async options=>{window.__createdUrl=options.url;}},scripting:{executeScript:async()=>[{result:{products:[product],sourceUrl:product.sourceUrl,error:''}}]}}});},parsed.products[0]);
 await popup.goto('https://extension-test.example/popup.html');await popup.getByRole('button',{name:'Ler produtos desta página'}).click();await popup.getByRole('button',{name:'Revisar no integrador'}).click();const target=await popup.evaluate(()=>window.__createdUrl);assert.ok(target.startsWith('https://drop.instara.com.br/fornecedor#dados='));
 console.log('PASS extension popup: reviewed destination is fixed; product data transferred without account credentials.');
 const id=randomBytes(20).toString('hex');const code=`$c=require '/var/www/html/.private/config.php';if($c['admin_email']!=='test-admin@example.test')exit(2);session_name('smartdrop_session');session_id('${id}');session_start();$_SESSION['admin']=true;$_SESSION['expires']=time()+3600;$_SESSION['csrf']=bin2hex(random_bytes(32));session_write_close();`;
 const session=spawnSync('docker',['compose','-f','php-hostinger/tests/compose.yaml','exec','-T','--user','www-data','web','php','-r',code],{encoding:'utf8'});assert.equal(session.status,0,session.stderr);
 const ctx=await browser.newContext();await ctx.addCookies([{name:'smartdrop_session',value:id,domain:'localhost',path:'/'}]);const app=await ctx.newPage({viewport:{width:1440,height:1000}});await app.goto('http://localhost:8090/fornecedor'+new URL(target).hash);await app.getByRole('heading',{name:'Seu catálogo do fornecedor'}).waitFor();await app.getByLabel('SKU do fornecedor').waitFor();assert.equal(await app.getByLabel('SKU do fornecedor').inputValue(),sku);
 const prior=await(await ctx.request.get('http://localhost:8090/api/supplier/catalog')).json();assert.equal(prior.products.some(p=>p.sku===sku),false);
 await app.getByRole('checkbox',{name:'Conferi SKU'}).check();await app.getByRole('button',{name:'Confirmar importação'}).click();await app.getByRole('status').filter({hasText:'produto(s) salvo(s)'}).waitFor();
 const after=await(await ctx.request.get('http://localhost:8090/api/supplier/catalog')).json();assert.equal(after.automaticallyConnected,false);assert.equal(after.products.find(p=>p.sku===sku).stock,null);
 await app.reload();await app.getByRole('heading',{name:fixture.name,exact:true}).waitFor();const download=await ctx.request.get('http://localhost:8090/downloads/smartdrop-meudropbrasil-chrome.zip');assert.equal(download.status(),200);assert.equal((await download.body()).subarray(0,2).toString(),'PK');
 const csrf=(await(await ctx.request.get('http://localhost:8090/api/session')).json()).csrf;const bad=await ctx.request.post('http://localhost:8090/api/supplier/catalog',{headers:{Origin:'http://localhost:8090','X-CSRF-Token':csrf},data:{products:parsed.products,confirmed:false}});assert.equal(bad.status(),400);
 await app.screenshot({path:'/tmp/smartdrop-supplier-assist-desktop.png',fullPage:true});await app.setViewportSize({width:390,height:844});await app.reload();await app.getByRole('heading',{name:'Seu catálogo do fornecedor'}).waitFor();assert.equal(await app.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await app.screenshot({path:'/tmp/smartdrop-supplier-assist-mobile.png',fullPage:true});
 const anon=await browser.newContext();const unauthorized=await anon.request.get('http://localhost:8090/api/supplier/catalog');assert.equal(unauthorized.status(),401);await anon.close();
 console.log('PASS PHP/browser: explicit confirmation, persistence, unknown stock, protected API, downloadable extension and mobile layout.');
}finally{
 const cleanup=`$c=require '/var/www/html/.private/config.php';if($c['admin_email']!=='test-admin@example.test')exit(2);require '/var/www/html/api/lib.php';$rows=json_decode(setting('supplier_catalog','[]'),true);set_setting('supplier_catalog',json_encode(array_values(array_filter($rows,fn($p)=>$p['sku']!=='${sku}'))));`;
 spawnSync('docker',['compose','-f','php-hostinger/tests/compose.yaml','exec','-T','web','php','-r',cleanup]);await browser.close();
}
