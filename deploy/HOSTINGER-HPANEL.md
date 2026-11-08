# Hostinger Node.js — drop.instara.com.br

Este pacote é para a opção **Aplicação Node.js / upload de ZIP do hPanel**, como na captura enviada. Não é instalação em public_html nem exige Docker para o servidor web.

## Criar a aplicação do subdomínio

Crie uma aplicação Node.js separada e associe **drop.instara.com.br**, preservando o site que já atende instara.com.br. Não substitua a implantação tvsmart-main do site principal.

Envie `smartdrop-hpanel.zip`. Se o painel pedir o diretório raiz, selecione **smartdrop-hpanel**, a pasta contendo `package.json`.

Use os seguintes valores quando os campos forem oferecidos pelo painel:

| Campo | Valor |
| --- | --- |
| Domínio | drop.instara.com.br |
| Framework | Next.js (não Nitro, usado pelo outro projeto) |
| Node.js | 22.x, revisão 22.21 ou superior; alternativamente 24.x, revisão 24.10 ou superior |
| Gerenciador | npm |
| Instalação | npm ci --include=dev |
| Build / compilação | npm run build |
| Inicialização | npm start |
| Saída Next.js, se solicitada | .next |

O build já executa `prisma generate` antes de compilar. Mantenha as dependências de desenvolvimento durante a instalação/compilação (Prisma CLI, TypeScript e Tailwind são necessários). O comando de inicialização usa a porta PORT fornecida pela hospedagem, ou 3000 se ausente. Não configure exportação estática. Se o painel oferecer somente detecção automática, mantenha Next.js detectado e confira os comandos no log.

## Variáveis de ambiente

Configure no hPanel, não no código-fonte:

| Nome | Valor/configuração |
| --- | --- |
| NODE_ENV | production |
| APP_URL | https://drop.instara.com.br |
| APP_MODE | simulation (fase inicial, com dados fictícios) |
| DATABASE_URL | URL PostgreSQL real, fornecida pelo serviço de banco, com TLS conforme exigido pelo provedor |
| REDIS_URL | URL Redis real; use rediss:// quando o provedor exigir TLS |
| ADMIN_EMAIL | Seu e-mail administrativo |
| ADMIN_PASSWORD_HASH | Hash scrypt da sua senha, conforme README.md |
| SESSION_SECRET | Segredo aleatório, pelo menos 32 caracteres |
| TOKEN_ENCRYPTION_KEY | 32 bytes aleatórios em base64 |
| MELI_CLIENT_ID | Somente quando configurar uma aplicação oficial |
| MELI_CLIENT_SECRET | Somente quando configurar uma aplicação oficial |
| MELI_REDIRECT_URI | https://drop.instara.com.br/api/mercado-livre/callback |
| MELI_USER_IDS | ID real da conta autorizada, quando conectado |

Use os comandos do README para criar hash/chaves em um terminal privado. Não use senha em texto em ADMIN_PASSWORD_HASH. Não envie segredos no ZIP ou em mensagens.

Configure DATABASE_URL antes do build: o Prisma exige uma URL PostgreSQL válida para gerar o cliente, mas o build não abre conexão com o banco. As telas do modo simulation usam dados fictícios; login, saúde e APIs persistentes só funcionarão com PostgreSQL e Redis acessíveis. Não interprete a demonstração visual como integração real funcionando. Não coloque URLs localhost de banco/Redis no painel: eles apontariam para o servidor da hospedagem.

## PostgreSQL e Redis

A imagem enviada confirma Node.js 22.x, mas o botão genérico “Banco de dados” não identifica o tipo disponível. Este projeto utiliza PostgreSQL; MySQL/MariaDB não são substitutos diretos. Se o plano não oferecer PostgreSQL e Redis, use serviços externos compatíveis, com acesso permitido a partir da aplicação.

Execute `npm run db:migrate` uma vez no ambiente com DATABASE_URL configurada, antes de usar persistência. Use o terminal/deployment hook da hospedagem, se disponível, ou uma máquina de administração autorizada com acesso ao banco e o mesmo código. Não execute migrações pelo navegador nem crie um endpoint público para isso. O build não altera o banco.

Seed opcional, apenas em simulação: `npm run db:seed`. Migrações e seed não precisam rodar em toda requisição.

## Worker separado

Para receber/processar vendas automaticamente, é necessário um processo persistente adicional com o mesmo código e variáveis de ambiente:

```bash
npm run worker
```

O comando aceita variáveis injetadas pelo painel, sem exigir arquivo .env. Se o plano não oferecer processo separado, hospede o worker em um serviço de background worker ou VPS com acesso ao mesmo PostgreSQL e Redis. Não use uma tarefa cron curta para substituir esse worker.

Sem worker, a interface pode abrir e a sincronização manual autenticada pode importar as últimas 50 vendas, mas notificações enfileiradas não serão processadas. Não coloque o worker dentro do processo web para contornar limites do plano.

## Conferência

1. Confira no log que a compilação terminou e a aplicação iniciou.
2. Ative/confirme SSL para drop.instara.com.br no painel.
3. Abra https://drop.instara.com.br e confira o aviso de simulação.
4. Depois de configurar PostgreSQL, Redis e migrações, https://drop.instara.com.br/api/health deve retornar `{"status":"ok"}`.
5. Teste /login com seu administrador. Inicie o worker e confira o log sem compartilhar credenciais.
6. OAuth exige aplicativo oficial e callback exato. O fornecedor segue simulado até documentação/autorização. Compras e publicações reais continuam bloqueadas.

O pacote foi compilado e iniciado com Node 22.23.4 fora da Hostinger. Os 8 testes de regras/segurança passaram nessa versão, incluindo validação de origem HTTPS atrás de proxy. Não houve acesso à sua conta nem implantação no domínio. Nomes e opções exatos do hPanel podem variar conforme o plano.
