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
