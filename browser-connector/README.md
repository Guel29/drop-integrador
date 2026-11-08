# Catálogo assistido — MeuDropBrasil

Extensão Chrome Manifest V3 para o usuário ler metadados de produto na sessão normal do site do fornecedor e revisar no Smart Drop. Não automatiza login, compra, carrinho, checkout, CAPTCHA ou retirada de etiquetas. Nenhum endpoint privado do fornecedor foi presumido.

Permissões: `activeTab` e `scripting`, acionadas pelo clique do usuário; sem acesso a cookies, sem credenciais do fornecedor armazenadas. O leitor usa apenas blocos JSON-LD Product/Offer da página, com limites de tamanho/profundidade e origem HTTPS restrita ao fornecedor. Não lê inputs de senha, dados pessoais de checkout ou o HTML completo. Preço só é aproveitado de um Offer simples em BRL. Variantes múltiplas, preços agregados e campos ausentes exigem revisão. Quantidade não é inferida.

O destino é fixo em `https://drop.instara.com.br/fornecedor#dados=...`. Somente dados de produto são enviados no fragmento, que não vai ao servidor em requisições HTTP. O integrador requer login e confirmação explícita com CSRF para gravar. Login preserva a rota e o fragmento. As observações são persistidas separadamente dos produtos demonstrativos, sem ativar publicação, compras ou sincronização de estoque.

`node browser-connector/package.mjs` gera `php-hostinger/downloads/smartdrop-meudropbrasil-chrome.zip`, baixável pela tela do fornecedor. `npm run build:php` compila a tela. O fornecedor é acessado no navegador do usuário; a hospedagem PHP não precisa de Chrome ou Node em execução.

`node browser-connector/test.mjs` usa Chromium e o ambiente PHP/MySQL isolado já instalado com o administrador de teste. Cobre metadados sintéticos, dados ausentes, host inválido, não leitura de senha, popup, transferência para origem fixa, confirmação antes de persistência, API autenticada, download da extensão e mobile. `php php-hostinger/tests/supplier-catalog.php` deve rodar no ambiente PHP com banco de teste e verifica normalização, deduplicação e bloqueio de compras.

Não foi possível acessar o site real do fornecedor neste ambiente: o proxy negou a conexão HTTPS. Portanto, a extensão está preparada e testada com fixtures, mas sua compatibilidade com o catálogo real está pendente. Não considere importação assistida como conta automaticamente conectada. Se o site não fornecer JSON-LD suficiente, use revisão/cadastro manual até obter amostras autorizadas da página para adaptar a leitura sem presumir seletores ou APIs.
