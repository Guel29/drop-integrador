import {chromium} from '@playwright/test';
import {readProductsFromDocument} from './meudropbrasil/reader.js';
import {startProductPicker,getPickedProduct} from './meudropbrasil/picker.js';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{const page=await browser.newPage();const html='<main><section><h1 id="name">Aparador de Pelos · fixture</h1><p id="price">R$ 26,00</p><h2>Código EAN</h2><ul><li><strong>EAN Principal:</strong> <span id="ean">6955549365117</span></li></ul><p><strong>SKU:</strong> <span id="sku">FIXTURE-123</span></p><input id="password" type="password" value="NEVER-READ"><button id="buy" onclick="window.__purchase=true">Adicionar produto</button></section></main>';
await page.route('https://meudropbrasil.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:html}));await page.goto('https://meudropbrasil.com/__visible_fixture__');
let result=await page.evaluate(readProductsFromDocument);assert.equal(result.diagnostic.method,'visible-page');assert.equal(result.products[0].cost,2600);assert.equal(result.products[0].gtin,'6955549365117');assert.equal(result.products[0].sku,'FIXTURE-123');assert.equal(result.products[0].stock,null);assert.ok(!JSON.stringify(result).includes('NEVER-READ'));
await page.evaluate(()=>{document.querySelector('#price').textContent='R$ 26,00 ou 3x de R$ 9,00';});result=await page.evaluate(readProductsFromDocument);assert.equal(result.products[0].cost,null);await page.evaluate(()=>{document.querySelector('#price').textContent='R$ 26,00';});
await page.addInitScript(()=>{});await page.evaluate(()=>{const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){const root=original.call(this,options);window.__testPicker=root;return root;};window.open=url=>{window.__reviewUrl=url;return null;};});
assert.equal((await page.evaluate(startProductPicker,{})).started,true);
const select=async label=>page.evaluate(label=>{[...window.__testPicker.querySelectorAll('button')].find(b=>b.textContent===label).click();},label);
await select('Nome');await page.click('#password');assert.equal((await page.evaluate(getPickedProduct)),null);
await select('Nome');await page.click('#buy');assert.equal(await page.evaluate(()=>window.__purchase),undefined);
await select('Nome');await page.click('#name');await select('Preço em R$');await page.click('#price');await select('SKU');await page.click('#sku');await select('EAN');await page.click('#ean');
const picked=await page.evaluate(getPickedProduct);assert.equal(picked.title,'Aparador de Pelos · fixture');assert.equal(picked.cost,2600);assert.equal(picked.sku,'FIXTURE-123');assert.equal(picked.gtin,'6955549365117');assert.equal(picked.stock,null);
await select('Enviar para revisão');const url=await page.evaluate(()=>window.__reviewUrl);assert.ok(url.startsWith('https://drop.instara.com.br/fornecedor#dados='));assert.ok(!url.includes('NEVER-READ'));await select('Fechar');assert.equal(await page.locator('[data-smartdrop-picker]').count(),0);
console.log('PASS visible page: title, R$ 26,00, EAN/SKU, ambiguous prices, interactive selection, protected password inputs and no purchase click.');
// Standards-based microdata, without relying on supplier-specific private selectors.
await page.setContent('<main><div itemscope itemtype="https://schema.org/Product"><h1 itemprop="name">Microdata fixture</h1><meta itemprop="sku" content="MICRO-1"><div itemprop="offers" itemscope itemtype="https://schema.org/Offer"><meta itemprop="price" content="1234.56"><meta itemprop="priceCurrency" content="BRL"></div></div></main>');result=await page.evaluate(readProductsFromDocument);assert.equal(result.products[0].cost,123456);assert.equal(result.products[0].sku,'MICRO-1');assert.equal(result.diagnostic.method,'microdata');
console.log('PASS microdata and structured metadata fallback.');
}finally{await browser.close();}
