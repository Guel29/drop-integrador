"use strict";
(() => {
  // browser-connector/meudropbrasil/reader.js
  function readProductsFromDocument() {
    const allowed = ["meudropbrasil.com", "www.meudropbrasil.com"];
    const sourceUrl2 = location.origin + location.pathname;
    const diagnostic = { version: "0.2.0", origin: location.origin, jsonLdBlocks: 0, microdataProducts: 0, method: "none" };
    if (location.protocol !== "https:" || !allowed.includes(location.hostname)) return { products: [], error: "Abra uma p\xE1gina HTTPS em meudropbrasil.com ou www.meudropbrasil.com.", diagnostic };
    const products2 = [];
    const seen = /* @__PURE__ */ new Set();
    let visited = 0;
    const text = (v) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
    const kind = (v) => text(v).split(/[\/#]/).pop();
    const isType = (node, type) => (Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]]).some((v) => kind(v) === type);
    const source = (value) => {
      try {
        const u = new URL(typeof value === "string" ? value : location.href, location.href);
        if (u.protocol !== "https:" || !allowed.includes(u.hostname) || u.username || u.password || u.port) throw Error();
        return u.origin + u.pathname;
      } catch {
        return sourceUrl2;
      }
    };
    const price = (v) => {
      const s = typeof v === "number" ? String(v) : text(v);
      if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/.test(s)) return null;
      const c = Math.round(Number(s) * 100);
      return Number.isSafeInteger(c) && c > 0 && c <= 1e8 ? c : null;
    };
    const localPrice = (value) => {
      const s = text(value);
      if (/\b\d+\s*x\b|parcel|vezes|a partir/i.test(s)) return null;
      const found = [...s.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})(?![0-9])/g)].map((m) => Math.round(Number(m[1].replace(/\./g, "").replace(",", ".")) * 100));
      const unique = [...new Set(found)];
      return unique.length === 1 && unique[0] > 0 && unique[0] <= 1e8 ? unique[0] : null;
    };
    const availability = (v) => kind(v) === "InStock" ? "in_stock" : kind(v) === "OutOfStock" ? "out_of_stock" : "unknown";
    const add = (p, method) => {
      if (!p.title || products2.length >= 20) return;
      const key = p.sku + "|" + p.sourceUrl + "|" + p.title;
      if (seen.has(key)) return;
      seen.add(key);
      products2.push({ ...p, stock: null });
      diagnostic.method = method;
    };
    const graphs = /* @__PURE__ */ new Map();
    const roots = [];
    function index(node, depth = 0) {
      if (!node || typeof node !== "object" || depth > 12 || ++visited > 5e3) return;
      if (Array.isArray(node)) {
        for (const item of node) index(item, depth + 1);
        return;
      }
      if (typeof node["@id"] === "string") graphs.set(node["@id"], node);
      for (const value of Object.values(node)) index(value, depth + 1);
    }
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      diagnostic.jsonLdBlocks++;
      if ((script.textContent ?? "").length > 1e6) continue;
      try {
        const parsed = JSON.parse(script.textContent);
        roots.push(parsed);
        index(parsed);
      } catch {
      }
    }
    visited = 0;
    function visit(node, depth = 0) {
      if (!node || typeof node !== "object" || depth > 12 || ++visited > 5e3 || products2.length >= 20) return;
      if (Array.isArray(node)) {
        for (const child of node) visit(child, depth + 1);
        return;
      }
      if (isType(node, "Product")) {
        const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
        let offer = offers.length === 1 ? offers[0] : null;
        if (offer?.["@id"] && !offer.price) offer = graphs.get(offer["@id"]) ?? offer;
        const currency = offer ? text(offer.priceCurrency).toUpperCase() : "";
        const cost = offer && !isType(offer, "AggregateOffer") && currency === "BRL" ? price(offer.price) : null;
        add({ sku: text(node.sku), title: text(node.name), cost, availability: availability(offer?.availability), gtin: text(node.gtin13) || text(node.gtin14) || text(node.gtin12) || text(node.gtin8) || text(node.gtin), sourceUrl: source(node.url) }, "json-ld");
      }
      for (const [key, value] of Object.entries(node)) if (key !== "offers") visit(value, depth + 1);
    }
    for (const root of roots) visit(root);
    const scopes = [...document.querySelectorAll("[itemscope][itemtype]")];
    const scopeType = (s, type) => s.getAttribute("itemtype").split(/\s+/).some((t) => kind(t) === type);
    const prop = (s, name) => {
      const el2 = [...s.querySelectorAll(`[itemprop~="${name}"]`)].find((e) => e.closest("[itemscope]") === s);
      return el2 ? text(el2.getAttribute("content") || el2.getAttribute("href") || el2.textContent) : "";
    };
    if (!products2.length) for (const scope of scopes.filter((s) => scopeType(s, "Product"))) {
      diagnostic.microdataProducts++;
      const offers = [...scope.querySelectorAll("[itemscope][itemtype]")].filter((s) => scopeType(s, "Offer"));
      const offer = offers.length === 1 ? offers[0] : null;
      add({ sku: prop(scope, "sku"), title: prop(scope, "name"), cost: offer && prop(offer, "priceCurrency") === "BRL" ? price(prop(offer, "price")) : null, availability: availability(offer ? prop(offer, "availability") : ""), gtin: prop(scope, "gtin13") || prop(scope, "gtin14") || prop(scope, "gtin"), sourceUrl: source(prop(scope, "url")) }, "microdata");
    }
    const meta = (name) => text(document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.getAttribute("content"));
    if (!products2.length && kind(meta("og:type"))?.toLowerCase() === "product" && meta("og:title")) add({ sku: "", title: meta("og:title"), cost: meta("product:price:currency") === "BRL" ? price(meta("product:price:amount")) : null, availability: "unknown", gtin: "", sourceUrl: source(meta("og:url")) }, "open-graph");
    const visible = (el2) => el2 instanceof HTMLElement && el2.getClientRects().length > 0 && !el2.closest('header,nav,footer,script,style,input,textarea,select,[role="dialog"],[aria-hidden="true"],[data-smartdrop-picker]');
    const headings = [...document.querySelectorAll("h1")].filter(visible);
    const heading = headings.length === 1 ? headings[0] : null;
    const collect = (root) => {
      const values = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      let count = 0;
      while ((n = walker.nextNode()) && count++ < 2500) {
        const parent = n.parentElement;
        if (!parent || !visible(parent) || parent.closest("del,s")) continue;
        let s = text(n.textContent);
        if (s === "R$") s = text(parent.textContent);
        if (s && s.length < 220) values.push(s);
      }
      return values;
    };
    if (!products2.length && heading) {
      let cost = null;
      let region = heading.parentElement;
      for (let i = 0; region && i < 4; i++, region = region.parentElement) {
        const textValues = collect(region);
        const prices = [...new Set(textValues.map(localPrice).filter((p) => p !== null))];
        if (prices.length === 1) {
          cost = prices[0];
          break;
        }
        if (region === document.body) break;
      }
      add({ sku: "", title: text(heading.textContent), cost, availability: "unknown", gtin: "", sourceUrl: sourceUrl2 }, "visible-page");
    }
    if (products2.length === 1 && heading) {
      const snippets = collect(heading.closest("main") || document.querySelector("main") || document.body);
      let sku = "";
      let gtin = "";
      for (const s of snippets) {
        if (!sku) {
          const match = s.match(/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#]\s*([\p{L}\p{N}._/-]{1,80})$/u);
          if (match) sku = match[1];
        }
        if (!gtin) {
          const match = s.match(/(?:EAN(?:\s+Principal)?|GTIN|C[oó]digo\s+de\s+Barras)\s*[:#]\s*([0-9]{8,14})\b/i);
          if (match && [8, 12, 13, 14].includes(match[1].length)) gtin = match[1];
        }
      }
      if (!gtin || !sku) for (const el2 of document.querySelectorAll("li,p,dd,span")) {
        if (!visible(el2)) continue;
        const s = text(el2.textContent);
        if (s.length > 220) continue;
        const m = s.match(/EAN(?:\s+Principal)?\s*[:#]\s*([0-9]{8,14})\b/i);
        if (m && [8, 12, 13, 14].includes(m[1].length)) gtin = m[1];
        if (!sku) {
          const match = s.match(/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#]\s*([\p{L}\p{N}._/-]{1,80})$/u);
          if (match) sku = match[1];
        }
        if (gtin && sku) break;
      }
      products2[0].sku ||= sku;
      products2[0].gtin ||= gtin;
    }
    const missing = products2.length === 1 ? [!products2[0].sku ? "SKU" : null, products2[0].cost === null ? "custo" : null].filter(Boolean) : [];
    return { products: products2, error: products2.length ? missing.length ? `Produto encontrado. Confira ${missing.join(" e ")} na revis\xE3o ou use Selecionar campos na p\xE1gina.` : "" : "N\xE3o identifiquei um produto \xFAnico nesta p\xE1gina. Abra o produto detalhado ou use Selecionar campos na p\xE1gina.", sourceUrl: sourceUrl2, diagnostic };
  }

  // browser-connector/meudropbrasil/picker.js
  function startProductPicker(initial = {}) {
    if (location.protocol !== "https:" || !["meudropbrasil.com", "www.meudropbrasil.com"].includes(location.hostname)) return { error: "Abra um produto no MeuDropBrasil." };
    if (globalThis.__smartdropPickerStop) globalThis.__smartdropPickerStop();
    const clean = (v) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
    const product = { sku: clean(initial.sku), title: clean(initial.title), cost: Number.isInteger(initial.cost) && initial.cost > 0 ? initial.cost : null, stock: null, availability: "unknown", gtin: clean(initial.gtin), sourceUrl: location.origin + location.pathname };
    const host = document.createElement("div");
    host.dataset.smartdropPicker = "true";
    host.style.cssText = "position:fixed;right:16px;top:16px;z-index:2147483647;width:min(390px,calc(100vw - 32px));";
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = "*{box-sizing:border-box}section{font:14px/1.6 Arial,sans-serif;background:#fff;color:#233e32;border:2px solid #147f6d;border-radius:10px;padding:16px;box-shadow:0 10px 40px #0005}h2{font-size:19px;margin:0 0 8px}p{margin:8px 0}button{font:600 13px Arial;padding:10px;border:1px solid #bdcfc1;background:#f4f8f3;color:#275e47;border-radius:6px;cursor:pointer;margin:3px 2px}button.active,button.send{background:#147f6d;color:#fff}.hint{color:#745b28;background:#fff7df;padding:8px;border-radius:5px}.details{font-size:13px;overflow-wrap:anywhere}";
    shadow.append(style);
    const box = document.createElement("section");
    const h = document.createElement("h2");
    h.textContent = "Smart Drop \xB7 selecionar campos";
    box.append(h);
    const instructions = document.createElement("p");
    instructions.textContent = "Escolha um campo abaixo e clique no texto correspondente do produto. Nenhum bot\xE3o do fornecedor ser\xE1 acionado.";
    box.append(instructions);
    const controls = document.createElement("div");
    const status2 = document.createElement("p");
    status2.className = "hint";
    status2.textContent = "Selecione Nome, Pre\xE7o ou SKU. EAN \xE9 opcional. Esc cancela a sele\xE7\xE3o.";
    const details = document.createElement("div");
    details.className = "details";
    let selected = null;
    let hovered = null;
    let oldOutline = "";
    const buttons = /* @__PURE__ */ new Map();
    const restore = () => {
      if (hovered) {
        hovered.style.outline = oldOutline;
        hovered = null;
      }
    };
    function render() {
      details.replaceChildren();
      for (const [label, value] of [["Nome", product.title], ["SKU", product.sku], ["Custo", product.cost === null ? "n\xE3o selecionado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.cost / 100)], ["EAN", product.gtin]]) {
        const line = document.createElement("p");
        line.textContent = label + ": " + (value || "n\xE3o selecionado");
        details.append(line);
      }
    }
    for (const [key2, label] of [["title", "Nome"], ["cost", "Pre\xE7o em R$"], ["sku", "SKU"], ["gtin", "EAN"]]) {
      const button = document.createElement("button");
      button.textContent = label;
      button.type = "button";
      button.onclick = () => {
        selected = key2;
        for (const [k, b] of buttons) b.classList.toggle("active", k === key2);
        status2.textContent = "Agora clique no texto de " + label + " na p\xE1gina.";
      };
      buttons.set(key2, button);
      controls.append(button);
    }
    const send = document.createElement("button");
    send.type = "button";
    send.className = "send";
    send.textContent = "Enviar para revis\xE3o";
    send.onclick = () => {
      if (!product.title || product.cost === null) {
        status2.textContent = "Selecione ao menos o nome e o pre\xE7o do produto. O SKU pode ser completado na revis\xE3o.";
        return;
      }
      const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, products: [product] }));
      const encoded = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      window.open("https://drop.instara.com.br/fornecedor#dados=" + encoded, "_blank", "noopener,noreferrer");
    };
    const close = document.createElement("button");
    close.textContent = "Fechar";
    close.type = "button";
    close.onclick = () => stop();
    box.append(controls, status2, details, send, close);
    shadow.append(box);
    document.documentElement.append(host);
    const eligible = (el2) => el2 instanceof HTMLElement && !host.contains(el2) && !el2.closest("input,textarea,select,[contenteditable],script,style");
    function move(e) {
      if (!selected || e.composedPath().includes(host)) return;
      const target = e.target;
      if (!eligible(target)) {
        restore();
        return;
      }
      if (hovered !== target) {
        restore();
        hovered = target;
        oldOutline = target.style.outline;
        target.style.outline = "3px solid #14a77c";
      }
    }
    function click(e) {
      if (!selected || e.composedPath().includes(host)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      restore();
      let target = e.target;
      if (!eligible(target)) {
        status2.textContent = "Selecione texto do produto, nunca campos de formul\xE1rio.";
        return;
      }
      let value = clean(target.innerText || target.textContent);
      if (value === "R$" && target.parentElement) value = clean(target.parentElement.innerText);
      if (!value || value.length > 500) {
        status2.textContent = "Clique no texto espec\xEDfico, sem selecionar a p\xE1gina inteira.";
        return;
      }
      if (selected === "cost") {
        if (/\b\d+\s*x\b|parcel|vezes|a partir/i.test(value)) {
          status2.textContent = "Selecione o pre\xE7o total, n\xE3o parcela ou faixa de pre\xE7os.";
          return;
        }
        const values = [...value.matchAll(/(?:R\$\s*)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+(?:\.[0-9]{2})?)(?![0-9])/g)].map((m) => Math.round(Number(m[1].includes(",") ? m[1].replace(/\./g, "").replace(",", ".") : m[1]) * 100));
        const unique = [...new Set(values)];
        if (unique.length !== 1 || unique[0] < 1 || unique[0] > 1e8) {
          status2.textContent = "Selecione somente um pre\xE7o completo, por exemplo R$ 26,00.";
          return;
        }
        product.cost = unique[0];
      } else if (selected === "gtin") {
        const m = value.match(/\b(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})\b/);
        if (!m) {
          status2.textContent = "Selecione o EAN/GTIN de 8, 12, 13 ou 14 d\xEDgitos.";
          return;
        }
        product.gtin = m[0];
      } else if (selected === "sku") {
        value = value.replace(/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#-]\s*/i, "");
        if (value.length > 80) {
          status2.textContent = "Selecione somente o c\xF3digo do produto.";
          return;
        }
        product.sku = value;
      } else {
        if (value.length > 255) {
          status2.textContent = "Selecione apenas o nome do produto.";
          return;
        }
        product.title = value;
      }
      globalThis.__smartdropPickedProduct = { ...product };
      selected = null;
      for (const b of buttons.values()) b.classList.remove("active");
      render();
      status2.textContent = "Campo selecionado. Escolha outro campo ou envie para revis\xE3o.";
    }
    function key(e) {
      if (e.key === "Escape") {
        selected = null;
        restore();
        for (const b of buttons.values()) b.classList.remove("active");
        status2.textContent = "Sele\xE7\xE3o cancelada; seus campos j\xE1 escolhidos foram mantidos.";
      }
    }
    function stop() {
      restore();
      document.removeEventListener("mousemove", move, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key, true);
      host.remove();
      delete globalThis.__smartdropPickerStop;
    }
    globalThis.__smartdropPickerStop = stop;
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key, true);
    render();
    return { started: true };
  }
  function getPickedProduct() {
    const p = globalThis.__smartdropPickedProduct;
    return p && p.sourceUrl === location.origin + location.pathname ? p : null;
  }

  // browser-connector/meudropbrasil/popup.js
  var products = [];
  var sourceUrl = "";
  var el = (id) => document.getElementById(id);
  var status = (s, error = false) => {
    el("status").textContent = s;
    el("status").className = error ? "error" : "";
  };
  async function currentTab() {
    if (!globalThis.chrome?.tabs || !chrome.scripting) throw Error("Abra esta janela pelo \xEDcone da extens\xE3o no Chrome, n\xE3o como arquivo HTML.");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw Error("Abra a p\xE1gina do produto e clique novamente no \xEDcone da extens\xE3o.");
    const u = new URL(tab.url);
    if (u.protocol !== "https:" || !["meudropbrasil.com", "www.meudropbrasil.com"].includes(u.hostname)) throw Error("Esta aba n\xE3o \xE9 do MeuDropBrasil. Confira o endere\xE7o e abra a extens\xE3o na aba do produto.");
    sourceUrl = u.origin + u.pathname;
    return tab;
  }
  function show() {
    el("products").replaceChildren();
    for (const p of products) {
      const row = document.createElement("li");
      row.textContent = p.title + (p.cost !== null ? " \xB7 R$ " + (p.cost / 100).toFixed(2).replace(".", ",") : " \xB7 custo a conferir") + (p.sku ? " \xB7 " + p.sku : " \xB7 SKU a conferir");
      el("products").append(row);
    }
    el("review").hidden = !products.length;
    if (products[0]) {
      el("sku").value = products[0].sku;
      el("title").value = products[0].title;
      el("cost").value = products[0].cost === null ? "" : String(products[0].cost / 100);
    }
  }
  el("read").onclick = async () => {
    el("read").disabled = true;
    status("Lendo a p\xE1gina\u2026");
    try {
      const tab = await currentTab();
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: readProductsFromDocument });
      const result = results[0]?.result;
      if (!result) throw Error("O Chrome n\xE3o retornou os dados. Recarregue a p\xE1gina do produto e tente novamente.");
      products = result.products ?? [];
      sourceUrl = result.sourceUrl || sourceUrl;
      show();
      el("diagnostic").value = JSON.stringify(result.diagnostic ?? { version: "0.2.0", result: "no diagnostic" }, null, 2);
      status(result.error || `${products.length} produto(s) encontrado(s). Revise os dados antes de salvar.`);
    } catch (e) {
      status("Falha na leitura: " + e.message, true);
      el("diagnostic").value = "Vers\xE3o: 0.2.0\nFalha de execu\xE7\xE3o no Chrome. Recarregue a extens\xE3o em chrome://extensions e a p\xE1gina do produto.";
    } finally {
      el("read").disabled = false;
    }
  };
  el("pick").onclick = async () => {
    try {
      const tab = await currentTab();
      const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: startProductPicker, args: [products[0] ?? {}] });
      const result = results[0]?.result;
      if (result?.error) throw Error(result.error);
      if (!result?.started) throw Error("N\xE3o foi poss\xEDvel abrir o seletor.");
      window.close();
    } catch (e) {
      status(e.message, true);
    }
  };
  el("manual").onclick = async () => {
    try {
      await currentTab();
      const sku = el("sku").value.trim();
      const title = el("title").value.trim();
      const cost = Math.round(Number(el("cost").value) * 100);
      if (!sku || !title || !Number.isSafeInteger(cost) || cost < 1) throw Error("Informe o SKU, nome e custo mostrados pelo fornecedor.");
      products = [{ sku, title, cost, stock: null, availability: "unknown", gtin: products[0]?.gtin ?? "", sourceUrl }];
      show();
      status("Produto preparado. Confira os dados na revis\xE3o.");
    } catch (e) {
      status(e.message, true);
    }
  };
  el("review").onclick = async () => {
    try {
      if (!products.length) return;
      const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, products }));
      if (bytes.length > 24e3) throw Error("Leia menos produtos por vez.");
      const encoded = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      await chrome.tabs.create({ url: "https://drop.instara.com.br/fornecedor#dados=" + encoded });
    } catch (e) {
      status(e.message, true);
    }
  };
  status("Vers\xE3o 0.2.0 pronta. Clique em Ler produtos ou Selecionar campos.");
  currentTab().then((tab) => chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getPickedProduct })).then((results) => {
    const picked = results[0]?.result;
    if (picked) {
      products = [picked];
      show();
      status("Campos selecionados recuperados desta aba. Envie para revis\xE3o.");
    }
  }).catch(() => {
  });
})();
