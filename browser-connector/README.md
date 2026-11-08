# Catálogo assistido — MeuDropBrasil

Extensão Chrome Manifest V3 para o usuário ler metadados de produto na sessão normal do site do fornecedor e revisar no Smart Drop. Não automatiza login, compra, carrinho, checkout, CAPTCHA ou retirada de etiquetas. Nenhum endpoint privado do fornecedor foi presumido.

Permissões: `activeTab` e `scripting`, acionadas pelo clique do usuário; sem acesso a cookies, sem credenciais do fornecedor armazenadas. O leitor usa apenas blocos JSON-LD Product/Offer da página, com limites de tamanho/profundidade e origem HTTPS restrita ao fornecedor. Não lê inputs de senha, dados pessoais de checkout ou o HTML completo. Preço só é aproveitado de um Offer simples em BRL. Variantes múltiplas, preços agregados e campos ausentes exigem revisão. Quantidade não é inferida.

O destino é fixo em `https://drop.instara.com.br/fornecedor#dados=...`. Somente dados de produto são enviados no fragmento, que não vai ao servidor em requisições HTTP. O integrador requer login e confirmação explícita com CSRF para gravar. Login preserva a rota e o fragmento. As observações são persistidas separadamente dos produtos demonstrativos, sem ativar publicação, compras ou sincronização de estoque.

`node browser-connector/package.mjs` gera `php-hostinger/downloads/smartdrop-meudropbrasil-chrome.zip`, baixável pela tela do fornecedor. `npm run build:php` compila a tela. O fornecedor é acessado no navegador do usuário; a hospedagem PHP não precisa de Chrome ou Node em execução.

`node browser-connector/test.mjs` usa Chromium e o ambiente PHP/MySQL isolado já instalado com o administrador de teste. Cobre metadados sintéticos, dados ausentes, host inválido, não leitura de senha, popup, transferência para origem fixa, confirmação antes de persistência, API autenticada, download da extensão e mobile. `php php-hostinger/tests/supplier-catalog.php` deve rodar no ambiente PHP com banco de teste e verifica normalização, deduplicação e bloqueio de compras.

Não foi possível acessar o site real do fornecedor neste ambiente: o proxy negou a conexão HTTPS. Portanto, a extensão está preparada e testada com fixtures, mas sua compatibilidade com o catálogo real está pendente. Não considere importação assistida como conta automaticamente conectada. Se o site não fornecer JSON-LD suficiente, use revisão/cadastro manual até obter amostras autorizadas da página para adaptar a leitura sem presumir seletores ou APIs.

## Leitor v0.2.0

A v0.2 amplia a leitura para microdados, Open Graph de produto e uma página de produto com título semântico e preço visível em reais. Rótulos EAN/GTIN e SKU são lidos quando existentes; códigos de barras não são convertidos em SKU e preços múltiplos/parcelados exigem confirmação. A leitura continua read-only e limitada a páginas HTTPS do fornecedor.

O painel de seleção é acionado explicitamente pelo usuário. Permite escolher nome, preço, SKU e EAN clicando no texto, sem submeter botões da loja. Bloqueia coleta de campos de formulário e mantém somente dados do produto no mundo isolado da extensão naquela aba, sem cookies ou armazenamento persistente. A seleção pode ser enviada para revisão com o mesmo contrato anterior. Não habilita estoque contínuo ou compras.

`popup.bundle.js` é um arquivo JavaScript clássico autocontido, gerado com esbuild, para evitar dependência de módulos ausentes na instalação. A janela informa a versão e o progresso, mostra erros de execução e oferece diagnóstico sem payload da página. `node browser-connector/test-visible.mjs` verifica uma estrutura semelhante ao print recebido, microdados, ambiguidade de preço e seleção interativa, incluindo rejeição de input de senha e prevenção de clique de compra. Isso não substitui teste na página real do fornecedor.

O empacotador gera também `smartdrop-meudropbrasil-chrome-0.2.0.zip` no diretório público downloads. A instalação sem compactação deve ser atualizada manualmente no Chrome; publicar arquivos novos na Hostinger não atualiza uma extensão já instalada.
