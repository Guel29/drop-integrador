# Smart Drop — edição PHP/MySQL para Hostinger

Leia **COMO-INSTALAR.txt**. Este diretório contém a variante autorizada para hospedagem compartilhada: SPA React compilada + API PHP 8.2+ / MySQL. O projeto Next.js original permanece na raiz do repositório.

A interface é compilada com `node scripts/build-php.mjs`. O ZIP de hospedagem contém somente os arquivos já compilados e o backend PHP. Não publique os diretórios frontend/ e tests/. Não inclua .private/ ou api/setup-key.php em pacotes.

Os adaptadores estão em `api/suppliers.php`. Nenhuma capacidade não documentada do MeuDropBrasil é assumida. A fila SQL é processada por cron com lock, deduplicação, até cinco tentativas e backoff. Não é equivalente a um worker contínuo de alto volume. O receptor considera notificações avisos não confiáveis e faz leitura oficial antes de atualizar pagamento/importar um pedido.

A configuração local usa PHP retornando um array em `.private/config.php`, protegido por bloqueio de acesso web e permissões 0600. O instalador exige código privado criado pelo operador, um banco vazio e exclusivo e HTTPS fora de localhost. Configurações OAuth e tokens usam AES-256-GCM. Sessões PHP HttpOnly/SameSite e verificação de origem/CSRF protegem a administração. Login tem limite por IP no banco, sem armazenar IP em claro.

APIs de administração: `/api/session`, `/api/catalog`, `/api/order-states`, `/api/orders/:id/approve`, `/api/orders/:id/simulate`, `/api/orders/:id/supplier-paid`, `/api/orders/:id/label-simulation`, `/api/drafts`, `/api/audit`, `/api/settings`, `/api/mappings` (JSON com sku/externalId), `/api/sales`, `/api/mercado-livre/connect`, `/api/mercado-livre/callback`, `/api/mercado-livre/read`.

O receptor público é `/api/webhooks/mercado-livre`; o processo é `php cron.php`. O retry administrativo é `POST /api/events/:id/retry`. O health exige login e retorna `status: ok` quando o MySQL responde. O download de etiqueta é `GET /api/orders/:id/label`; requer venda real paga e logística/fiscal validadas por `POST /api/orders/:id/validate` com ambos os campos booleanos verdadeiros. Verifica proprietário e estado do envio; não representa compatibilidade com todas as modalidades logísticas. Compras/publicações reais estão bloqueadas. Não foram realizados testes com credenciais reais.

## Testes de desenvolvimento

O Docker usado aqui é apenas um ambiente de teste, não é necessário na hospedagem compartilhada. Use uma cópia descartável e nunca um banco de produção:

1. `docker build -t smartdrop-php-test -f php-hostinger/tests/Dockerfile php-hostinger/tests`
2. `docker compose -f php-hostinger/tests/compose.yaml up -d --wait`
3. Garanta que o usuário PHP do contêiner tenha permissão de criar `.private/` na cópia descartável.
4. `docker compose -f php-hostinger/tests/compose.yaml exec -T web php /var/www/html/tests/core.php`
5. `node php-hostinger/tests/e2e.mjs` (banco vazio, app não configurado, Chromium instalado)
6. `docker compose -f php-hostinger/tests/compose.yaml exec -T web php /var/www/html/tests/persistence.php`

O teste de persistência se recusa a executar sem o marcador de administrador do ambiente isolado. O teste de instalação cria uma chave efêmera e a remove. Não redefine uma instalação existente. Credenciais fixas do Compose de testes destinam-se apenas ao contêiner descartável e não entram no ZIP de hospedagem.

## MeuDropBrasil: catálogo assistido e extensão

Acesse `/fornecedor` pelo botão em Integrações. A tela oferece o download da extensão em `/downloads/smartdrop-meudropbrasil-chrome.zip`, instruções para instalar manualmente em cada computador/perfil Chrome, revisão de produtos e registros importados. O login no integrador preserva o fragmento da revisão quando a sessão ainda não estava autenticada.

`GET/POST /api/supplier/catalog` exige administrador; o POST também exige CSRF, origem válida, `confirmed: true` e uma lista de até 20 produtos. Preços são centavos inteiros; estoque pode ser null e não se presume quantidade a partir da disponibilidade. Reimportar o mesmo SKU atualiza a observação. O conteúdo fica na configuração `supplier_catalog` no MySQL, separado dos exemplos e sem modificar anúncios/pedidos. Esta atualização não exige migração nem reinstalação.

A extensão usa somente `activeTab` e `scripting`. Não pede senha ou cookies, não efetua compras e só tenta ler metadados Product/Offer após clique do usuário. O download permanece disponível no site para novas instalações; não há instalação automática pelo site ou publicação na Chrome Web Store. Chrome de celular não suporta esse fluxo de extensão.

Dados ausentes são preenchidos manualmente na revisão. Testes usam páginas sintéticas, não uma sessão real do fornecedor; não foi possível acessar o site real a partir deste ambiente. Não declare conta automaticamente conectada ou estoque atualizado continuamente. A classe CatalogSupplierAdapter bloqueia criação de pedidos e falha ao consultar quantidade desconhecida. O adaptador padrão de compras simuladas não é substituído por estes registros.

## Importação direta por link, sem extensão

A tela `/fornecedor` agora oferece `Importar produto pelo link`. O endpoint autenticado `POST /api/supplier/read-link` recebe `{ "url": "https://meudropbrasil.com/produto/.../" }`, valida origem e CSRF e faz apenas GET público de HTML. A resposta é uma prévia; nada é gravado até o usuário confirmar a importação pelo endpoint de catálogo existente. Não há migração, senha do fornecedor, sessão de navegador ou compra automática.

A leitura admite somente os dois hostnames HTTPS conhecidos do fornecedor. Valida cada redirecionamento, recusa IPs privados/reservados e fixa o endereço público resolvido no cURL, mantendo a verificação TLS e a configuração de proxy herdada. Limita a 2 MiB, até três redirecionamentos, orçamento total de 20 segundos e seis buscas por minuto. Não baixa arquivos vinculados nem executa JavaScript. Não registra HTML, URLs com query, cookies ou credenciais em logs. Parâmetros de consulta e fragmentos do link são removidos; confira a variação do produto na revisão.

O parser usa JSON-LD Product/Offer, microdados, Open Graph de produto e título/preço/rótulos do HTML. Valores faltantes continuam vazios; quantidade continua null, e EAN não vira SKU. Não confirma disponibilidade atual do estoque. Preços parcelados/ambíguos não são escolhidos por suposição. Requer PHP DOM/libxml e cURL. Formatos, login ou bloqueios não suportados retornam mensagem explícita sem tentar burlar proteções.

`php tests/supplier-link.php` cobre HTML de exemplo semelhante ao print fornecido, JSON-LD, microdados, Open Graph, quantidade desconhecida, preço em reais, host/IP/redirecionamentos inválidos, login, formatos e tamanho. `node browser-connector/test-link-site.mjs` valida o formulário sem extensão com leitura de exemplo, confirmação e persistência reais no banco de teste. O acesso de rede ao link real fornecido foi negado pelo proxy do ambiente de desenvolvimento; a resposta real desse produto não foi validada aqui. O funcionamento na Hostinger depende de o fornecedor disponibilizar o produto publicamente para a hospedagem.
