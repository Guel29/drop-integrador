# Retomada do ambiente

Use o checkout existente em `/workspace/drop-integrador`. Cada tarefa já está isolada; não crie worktrees sem solicitação explícita.

1. Use Node.js 24.22.1 e preserve proxy, CA e verificações TLS fornecidos pela plataforma.
2. Execute `docker compose -p workspace up -d --wait`. O daemon gerenciado precisa estar disponível. PostgreSQL e Redis guardam dados em volumes locais.
3. Execute `npm run db:migrate` e, somente em simulação, `npm run db:seed`. Ambos preservam dados existentes e podem ser repetidos.
4. Inicie `npm run dev` e `npm run worker` em processos separados, com o diretório acima. Processos não sobrevivem a snapshots.
5. Confirme `/api/health` com resposta `{"status":"ok"}`, `npm test`, `npm run build` (com o servidor parado), `npm run test:integration` e `npm run typecheck`. Para testes de navegador: `npm run test:e2e` (Chromium instalado; use CHROMIUM_PATH para outro caminho).
6. O dashboard é público somente no modo de simulação e contém exemplos. Não exponha dados reais sem autenticação. Configure administrador conforme README; nunca imprima credenciais.
7. A autorização Mercado Livre exige aplicação oficial, credenciais OAuth, URL de callback e domínios permitidos `auth.mercadolivre.com.br` e `api.mercadolibre.com`. Não crie tokens fictícios. O fornecedor continua simulado; compras/publicações reais estão bloqueadas.
8. Não gere links de prévia localhost no onboarding. Use requisições locais e relate os resultados em texto.

As instruções acima estão versionadas como alternativa local. A ferramenta de gravação do rascunho da plataforma retornou INVALID_ARGUMENT; a persistência em install_script/start_skill não foi confirmada, e o ambiente não foi publicado.
