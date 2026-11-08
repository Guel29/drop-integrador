> **Hospedagem por pasta/subdomínio (PHP/MySQL):** a variante autorizada está em [`php-hostinger/`](php-hostinger/README.md). O pacote `dist-hostinger/smartdrop-hostinger-php.zip` contém arquivos compilados para extrair diretamente em `public_html/drop`, sem Node ou Redis no servidor. Leia `COMO-INSTALAR.txt` dentro desse ZIP. O projeto Next.js abaixo foi preservado como variante separada.

# Smart Drop Integrador

Aplicativo de gestão de dropshipping entre Mercado Livre Brasil e um fornecedor, com Next.js, TypeScript, Tailwind CSS, PostgreSQL/Prisma e Redis/BullMQ. A primeira versão inicia **em simulação**.

O fluxo de negócio é: cliente compra no Mercado Livre → integrador recebe a notificação → consulta a venda oficial e verifica pagamento → vendedor confere disponibilidade e aprova → prepara compra ao fornecedor → vendedor paga o fornecedor → obtém a etiqueta elegível do Mercado Livre e encaminha ao fornecedor por canal autorizado → fornecedor despacha → vendedor acompanha a entrega.

## Escopo entregue e limites

| Componente | Estado |
| --- | --- |
| Dashboard responsivo, catálogo, pedidos, expedição, financeiro, auditoria e configurações | Telas implementadas, dados demonstrativos identificados |
| Busca, filtros, período, exportação CSV, simulador de preço | Funcionais em simulação |
| Fluxo de aprovação, pagamento ao fornecedor e etiqueta na interface | Simulação temporária na sessão do navegador; não envia pedidos ou arquivos |
| Criação de anúncio pela interface | Rascunho demonstrativo temporário; publicação e atualização reais não implementadas |
| Administrador | Senha com scrypt, sessão JWT HttpOnly de 8h, CSRF por Origin, limitação de tentativas em Redis |
| OAuth Mercado Livre | Código com state de uso único, PKCE, tokens AES-256-GCM, refresh serializado por bloqueio PostgreSQL; precisa de teste com aplicação e conta reais |
| Leitura Mercado Livre | Conta, IDs de anúncios, importação das últimas 50 vendas e novas vendas por notificações; não percorre todo o histórico |
| Notificações | Inbox persistente, deduplicação, fila com 5 tentativas exponenciais, recuperação do inbox pendente, reprocessamento administrativo |
| Importação de pedidos | IDs únicos, consulta oficial, propriedade da conta e confirmação de pagamento; produtos sem associação ficam bloqueados |
| Mapeamento SKU | Modelo e API administrativa implementados; configuração pela API nesta etapa |
| Compra no fornecedor | Serviço de simulação com bloqueio transacional e idempotência; compra real bloqueada |
| Etiqueta oficial | Download autenticado preparado para envio elegível; pagamento, logística e fiscal precisam estar validados. Nunca encaminha automaticamente ao fornecedor |
| MeuDropBrasil real | Não implementado: depende de documentação, autorização e validação do fornecedor |
| Indicadores financeiros reais / rastreamento contínuo | Estrutura de dados preparada; telas ainda demonstrativas |

O modo `live` exige sessão administrativa, permite OAuth/leitura/importação e remove exemplos. Não habilita compras, pagamentos, publicações ou atualizações reais. Não é uma entrega de produção validada com os marketplaces. Não há senha de Mercado Livre no sistema.

## Instalação

Requisitos: Node.js 24.22.1 (`.nvmrc`), npm, Docker com Compose. Use o checkout existente; tarefas de nuvem já são isoladas e não exigem worktrees.

```bash
cd /workspace/drop-integrador
npm ci --cache /tmp/smartdrop-npm-cache
node scripts/setup-local.mjs
npm run db:generate
docker compose -p workspace up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Em outro terminal, no mesmo diretório:

```bash
npm run worker
```

O script de preparação cria `.env` a partir de `.env.example` **somente quando não existe**, com chaves aleatórias locais para sessão e criptografia. Não cria senha administrativa conhecida. O dashboard demonstrativo é acessível sem login somente em simulação. Todas as APIs administrativas exigem login, inclusive em simulação.

Os dados PostgreSQL e Redis ficam em volumes. Nunca execute `docker compose down -v` para resolver problemas de inicialização: isso apaga dados. A senha padrão do banco é exclusiva para desenvolvimento, com portas limitadas ao loopback. Em produção, use PostgreSQL/Redis privados com autenticação/TLS e credenciais próprias.

### Administrador

Defina `ADMIN_EMAIL` em `.env`. Gere o hash da sua própria senha de pelo menos 6 caracteres em um terminal privado, sem colocá-la no histórico:

```bash
read -rs -p 'Senha administrativa: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
npm exec tsx scripts/hash-password.ts
unset ADMIN_PASSWORD
```

Copie o hash resultante para `ADMIN_PASSWORD_HASH` em `.env`, preservando as chaves existentes. Reinicie o app e abra `/login`. Não compartilhe a senha ou o hash em chat ou logs. O comando `node scripts/setup-local.mjs` também aceita `ADMIN_PASSWORD` já exportada para configurar o hash quando o campo estiver vazio, sem imprimir o valor. Nunca sobrescreve um hash existente.

Defina `APP_URL` com a origem externa correta; HTTPS é obrigatório fora do desenvolvimento. O cookie recebe `Secure` quando essa origem usa HTTPS. Redis precisa estar funcionando para o login. Não configure uma URL pública que exponha o modo de demonstração como operação real.

### Banco e migrações

O Prisma utiliza o query compiler JavaScript e `@prisma/adapter-pg`. O download do engine binário foi negado pela rede deste ambiente. Nenhuma assinatura, checksum ou verificação TLS foi desabilitada. A geração utiliza o engine JS oficial distribuído pelos pacotes npm.

O arquivo `prisma.config.ts` habilita o schema engine JS experimental da versão Prisma 6.19.3 para geração/diff. Seu comando `migrate deploy` apresenta incompatibilidade na desserialização do tipo PostgreSQL `name`. Por isso **`npm run db:migrate` utiliza `scripts/migrate.ts`**: aplica o SQL gerado pelo Prisma com transação, lock consultivo e verificação SHA-256 imutável na tabela `smartdrop_migrations`. Não misture esse controle com `prisma migrate deploy` no mesmo banco. Revise SQL de migrações futuras antes de aplicá-lo.

O seed é idempotente e só insere produtos demonstrativos ausentes; não substitui estoque ou dados existentes e recusa `APP_MODE=live`. Os valores monetários são inteiros em centavos; taxas são pontos-base (100 bps = 1%).

## Mercado Livre oficial

1. Crie/configure sua aplicação no portal oficial de desenvolvedores e confira a documentação vigente em `https://developers.mercadolivre.com.br/`.
2. Ative PKCE e cadastre exatamente `MELI_REDIRECT_URI`. Para produção, use um callback HTTPS registrado.
3. Configure `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET` e `MELI_REDIRECT_URI` de forma segura. Solicite apenas permissões de leitura e renovação necessárias à etapa atual na configuração da aplicação. Não solicite escrita antecipadamente.
4. Preserve `TOKEN_ENCRYPTION_KEY` (32 bytes em base64) entre reinicializações; sua perda impede descriptografar tokens. Preserve `SESSION_SECRET` com pelo menos 32 caracteres. Não utilize chaves de exemplo.
5. Nas configurações de rede da nuvem, permita `auth.mercadolivre.com.br` e `api.mercadolibre.com`, mantendo os domínios já existentes. Credenciais OAuth ficam fora do repositório. Os comandos Node usam o proxy herdado com `NODE_USE_ENV_PROXY=1`.
6. Faça login no integrador e use **Integrações → Conectar Mercado Livre**. A senha é digitada somente no site oficial. Use **Verificar leitura da conta** para validar conta, anúncios e importar as últimas 50 vendas.
7. Configure notificações oficiais para `/api/webhooks/mercado-livre` e tópicos `orders_v2`, `items` e `shipments`, conforme as permissões concedidas. Adicione o ID da conta em `MELI_USER_IDS`. O worker precisa estar ativo.

As notificações são **avisos não confiáveis**, não prova de pagamento. O receptor valida tópico, caminho e conta cadastrada, deduplica e persiste antes do enqueue. O worker consulta exclusivamente a API oficial usando o token da conta e verifica o proprietário do recurso. Apenas a resposta oficial de pedido pago com pagamentos aprovados pode marcar pagamento confirmado. A notificação nunca compra no fornecedor ou publica anúncios. Implemente também limite de requisições e tamanho de corpo no proxy de entrada da implantação.

Falhas são mantidas no banco e no Redis. Cinco tentativas usam atraso exponencial de 2 segundos. O endpoint administrativo de retry permite reprocessamento de um evento finalizado com falha. O inbox pendente é reenfileirado no início e a cada 30 segundos. O worker não registra payloads, cabeçalhos, tokens, endereço, nome de comprador ou resposta OAuth.

Limitações de leitura: a tela não pagina o histórico completo de vendas e não consulta todos os detalhes de anúncios. Os IDs e exemplos exibidos em simulação não representam uma conta real. O modo real lista pedidos importados após sincronização, mas a etapa de compra ao fornecedor permanece indisponível.

### Associação de SKUs

O catálogo possui SKU interno e SKU do fornecedor. Um anúncio existente pode ser associado a um produto via `POST /api/mappings`, com sessão administrativa, cabeçalho `Origin` correto e JSON:

```json
{"productId":"id-interno-do-produto","externalId":"MLB1234567890","price":15990}
```

Esse é apenas um exemplo de formato; substitua pelos seus identificadores reais. Em modo real a API verifica se o anúncio pertence à conta conectada. Não publica nem altera o anúncio no marketplace. Pedidos recebidos antes da associação ficam `unmapped`; faça a associação e prepare a reconciliação dos itens em tarefa posterior antes de permitir expedição. Nunca permita aprovação parcial de um pedido com itens não associados.

### Etiquetas e logística

O download preparado em `/api/orders/:id/label` consulta o envio oficial e só solicita PDF quando o remetente corresponde à conta e o envio está `ready_to_ship` com substatus `ready_to_print` ou `printed`. Outras modalidades e estados são recusados; não se presume compatibilidade com Full, Flex, coleta, entrega própria ou todas as configurações do Mercado Envios. A elegibilidade ainda precisa ser testada com uma venda real autorizada.

Não há etiqueta real nos exemplos. O app não a fabrica, não altera seu conteúdo nem a transmite ao MeuDropBrasil. Etiquetas contêm dados pessoais e devem ser compartilhadas somente com o responsável autorizado pelo envio, pelo canal acordado. Confirme origem de expedição, endereço, prazos, embalagem, responsabilidade por nota fiscal, regras tributárias e aceite do fornecedor antes de habilitar operação real. As validações não substituem orientação contábil/fiscal.

## Fornecedor

`SupplierAdapter` define `getProducts`, `getStock`, `getPrice`, `createOrder`, `getOrderStatus` e `getTracking`.

`MockSupplierAdapter` usa SKUs e produtos fictícios, valida quantidade/estoque e devolve IDs determinísticos para a mesma chave de idempotência. Não representa capacidade de reserva ou entrega do fornecedor. Em especial, não reduz estoque global nem processa pagamento.

`MeuDropBrasilAdapter` é um ponto de extensão que **falha fechado** sem implementação autorizada. Nenhuma API, token, campo de resposta ou suporte à etiqueta do fornecedor foi presumido. Uma implementação futura pode usar API oficial, CSV autorizado ou outro canal expressamente permitido; compra, destino da entrega, pagamento e encaminhamento de etiqueta precisam de contrato documentado e testes próprios. Uma integração de compra deve suportar idempotência e recuperação de resultado antes de habilitar retentativas.

O serviço `simulateDispatch` exige pagamento, aprovação, validação logística/fiscal, itens associados e estoque. Um lock de linha no PostgreSQL serializa duas solicitações concorrentes. A referência do pedido, a chave de envio e os eventos persistidos impedem duplicação. O serviço rejeita execução fora do modo simulado.

## APIs

Todas as operações administrativas exigem cookie de sessão. POSTs administrativos exigem `Origin` igual à origem da aplicação. Dados de demonstração do catálogo e `/api/health` são públicos; esta última informa apenas disponibilidade.

| Rota | Função |
| --- | --- |
| POST `/api/auth/login`, `/api/auth/logout` | Sessão administrativa |
| POST `/api/mercado-livre/connect` | Iniciar OAuth |
| GET `/api/mercado-livre/callback` | Consumir state e trocar código |
| GET `/api/mercado-livre/read` | Ler conta e IDs de anúncios |
| GET/POST `/api/sales` | Listar pedidos persistidos / importar últimas vendas oficiais |
| POST `/api/webhooks/mercado-livre` | Persistir e enfileirar notificações |
| POST `/api/events/:id/retry` | Reprocessar falha |
| GET `/api/catalog` | Catálogo simulado ou persistido |
| GET/POST `/api/mappings` | Consultar/criar associação SKU-anúncio |
| POST `/api/pricing` | Calcular preço sem alterar anúncio |
| POST `/api/orders/:id/approve` | Aprovar pedido simulado, com validação logística/fiscal |
| POST `/api/orders/:id/simulate` | Preparar compra simulada de forma idempotente |
| GET `/api/orders/:id/label` | Download de etiqueta oficial elegível, sem envio ao fornecedor |
| GET `/api/audit` | Eventos de auditoria persistidos |
| GET `/api/health` | Verificar PostgreSQL e Redis |

A interface demonstrativa de aprovação não chama as APIs de persistência: seu objetivo é permitir explorar o fluxo sem login ou alteração de registros. Os serviços e testes de persistência são independentes dessa demonstração.

## Verificação

```bash
npm run typecheck
npm test
npm run build
npm run test:integration
# Com o app iniciado em outro terminal e Chromium disponível:
npm run test:e2e
```

Testes unitários: preço, AES-GCM e adulteração, senha, fornecedor sem documentação, idempotência do mock, disponibilidade, bloqueios operacionais e proteção contra caminhos de notificação inválidos.

Integração (requer build prévio e porta 3001 livre): login/logout em servidor de produção isolado, cookies HttpOnly, rejeição de sessão falsificada; PostgreSQL real, dois pedidos simultâneos gerando uma única compra simulada/evento, importação oficial idempotente e bloqueio de pedido sem associação. Os testes criam e removem somente seus próprios pedidos; nunca rode testes contra um banco de produção.

Navegador: fluxo de pedido/pagamento/etiqueta simulados, busca, preço, autenticação obrigatória em API, rejeição de origem externa e navegação mobile. Configure `CHROMIUM_PATH` se o navegador não estiver em `/usr/bin/chromium`.

OAuth, refresh e etiquetas reais não foram validados com credenciais reais. Compras, anúncios e compartilhamento real de etiqueta não foram executados.

## Ambiente de nuvem

`.cloud/install.sh` e `.cloud/start.md` registram instalação e retomada. Dependências, migração, seed repetível, build, testes e saúde foram executados neste ambiente. A tentativa de salvar os campos `install_script` e `start_skill` pela ferramenta da plataforma retornou `INVALID_ARGUMENT`; **a persistência do rascunho não foi confirmada e não houve publicação**. As instruções locais não substituem a gravação/revisão do ambiente nas configurações da plataforma.

Para as integrações reais, ainda são necessários credenciais OAuth, liberação dos domínios oficiais, revisão dos requisitos fiscais/logísticos e documentação autorizada do MeuDropBrasil. Não inclua segredos em commits ou mensagens.
