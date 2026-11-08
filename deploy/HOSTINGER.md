# Envio para a Hostinger

Este ZIP contém o código-fonte completo e a implantação para **VPS com Docker**, incluindo app, worker, PostgreSQL, Redis e HTTPS. Não contém senhas, tokens, banco da demonstração, node_modules ou arquivos de build.

## Antes de escolher a opção do painel

- **VPS com Docker:** execute o procedimento abaixo. É a opção que executa todos os componentes deste pacote juntos.
- **Aplicação Node.js no hPanel:** envie o código-fonte (a pasta que contém package.json). A aplicação precisa de Node.js 24, comando de build `npm run db:generate && npm run build` e inicialização `npm start`. Configure as variáveis de ambiente no painel. PostgreSQL e Redis precisam ser serviços acessíveis pelo app; o worker precisa de um processo persistente separado. Não presuma que o plano disponibiliza esses três recursos. A migração deve executar uma vez antes da inicialização. Use `node_modules/.bin/tsx src/worker/index.ts` para o worker com variáveis injetadas pelo painel; `npm run worker` espera um .env local. A disponibilidade de Node 24 e do processo separado depende do plano; essa modalidade não foi testada na Hostinger.
- **Gerenciador de arquivos / public_html:** enviar o ZIP e extrair não executa Next.js, PostgreSQL, Redis ou o worker. Este projeto não é um site HTML estático nem PHP. Use Node.js com serviços externos ou VPS.

## VPS: primeira instalação

Recomendação inicial: Linux, 2 vCPU e 4 GB de RAM para compilar e executar os serviços. É uma referência inicial, não um dimensionamento de produção. Tenha Docker e o plugin Compose instalados pelo fluxo oficial da Hostinger/Docker.

1. Aponte o registro DNS A do seu domínio/subdomínio para o IPv4 do VPS. Só mantenha registro AAAA se IPv6 estiver corretamente configurado. Libere as portas 80 e 443 para o proxy HTTPS. Preserve o acesso SSH.
2. Envie o ZIP por SFTP e extraia em uma pasta dedicada, por exemplo `/opt/smartdrop`. Abra o terminal nessa pasta, a que contém `package.json` e `deploy/`.
3. Gere a configuração privada usando Node.js 24 instalado no VPS:

```bash
bash deploy/configure.sh
```

O script solicita domínio, e-mail e senha sem exibi-la e cria `deploy/.env.production` com chaves aleatórias. Se Node não estiver instalado no host, a mesma configuração pode ser feita com Docker:

```bash
docker run --rm -it -v "$PWD:/app" -w /app node:24.22.1-bookworm-slim bash deploy/configure.sh
```

Não execute o gerador novamente em uma atualização. Preserve suas chaves, o arquivo privado e os volumes.

4. Compile e inicie os serviços:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.yaml up -d --build --wait
```

O banco fica disponível primeiro. A migração roda em um serviço separado antes do app e do worker. Caddy solicita o certificado HTTPS; domínio/DNS e portas devem estar corretos. Nenhuma porta de PostgreSQL ou Redis é publicada na Internet.

5. Verifique:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.yaml ps
docker compose --env-file deploy/.env.production -f deploy/compose.yaml logs --tail=60 app worker migrate proxy
```

Acesse `https://SEU-DOMINIO/api/health`: deve retornar `{"status":"ok"}`. Acesse o domínio e `/login` com o administrador configurado. Evite compartilhar logs sem revisão.

O modo inicial é **simulação**: o dashboard é demonstrativo e público nesse modo; APIs administrativas exigem login. O envio real ao fornecedor e a publicação real de anúncios continuam bloqueados. O seed é opcional (o catálogo da interface simulada não depende dele):

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.yaml exec app node_modules/.bin/tsx scripts/seed.ts
```

## Conexão real do Mercado Livre

Edite `deploy/.env.production` no servidor, configure as credenciais da sua aplicação oficial, o callback HTTPS exato e os IDs autorizados. Confira as permissões mínimas no portal oficial. Recrie app e worker para aplicar as variáveis:

```bash
docker compose --env-file deploy/.env.production -f deploy/compose.yaml up -d --force-recreate app worker
```

Conecte pela tela Integrações depois de fazer login. `APP_MODE=live` exige autenticação e permite a etapa de leitura; não libera operações de compra/publicação real. A integração MeuDropBrasil ainda depende de documentação e autorização. As etapas de compra, pagamento e etiqueta da interface atual são demonstrativas.

## Atualizações e dados

Guarde uma cópia privada de `deploy/.env.production` e backups consistentes de PostgreSQL antes de atualizar. Preserve os volumes do Compose. Nunca use `down -v` numa atualização. Não exponha o arquivo privado pelo servidor web nem o envie para Git.

A primeira versão contém uma migração SQL com checksum; não altere uma migração já aplicada. Faça novas migrações e revise antes de atualizar. Consulte README.md para o escopo e os limites do produto.

## O que foi validado

O projeto passou por build, TypeScript, testes de regras, PostgreSQL e navegador no ambiente de desenvolvimento. O arquivo Compose de implantação foi validado sintaticamente. O ZIP não instala automaticamente o projeto e não foi publicado nem testado dentro de uma conta Hostinger. São necessários o plano compatível, domínio, DNS e acesso ao servidor/painel.
