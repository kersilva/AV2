# Greencode — AV2

API REST para gerir organizações, contratos, lotes, equipamentos e movimentações de equipamentos eletrônicos.

## Requisitos

- Node.js e npm.
- Docker Desktop com Docker Compose.
- PostgreSQL fornecido pelo `compose.yaml` do projeto.

A API é executada no computador. O Docker executa apenas o banco de dados.

## Preparar o projeto

Na pasta do projeto, instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` a partir do exemplo.

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Linux ou macOS:

```bash
cp .env.example .env
```

Abra `.env` e defina os valores secretos:

- `DATABASE_URL`: endereço do banco. O valor do exemplo usa a porta `5433`.
- `JWT_SECRET`: segredo com pelo menos 32 bytes. Gere um valor aleatório. Por exemplo: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.
- `ADMIN_BOOTSTRAP_TOKEN`: token temporário para criar o primeiro administrador.
- `PORT`: porta da API. O padrão é `3000`.
- `SEED_PASSWORD`: senha dos usuários de demonstração, se você executar o seed.

Não compartilhe o `.env` nem envie esse arquivo para o Git.

Inicie o PostgreSQL:

```bash
docker compose up -d db
```

Crie as tabelas do banco e gere o cliente Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

## Iniciar a API

Para executar em modo de desenvolvimento:

```bash
npm run dev
```

A API inicia em `http://localhost:3000`, a menos que você defina outra porta em `PORT`.

Para compilar e iniciar a versão compilada:

```bash
npm run build
npm start
```

## Guia de usuário

Use o Swagger para enviar as requisições e consultar os campos obrigatórios de cada operação:

[http://localhost:3000/docs](http://localhost:3000/docs)

### 1. Criar o primeiro administrador

Faça isso somente quando ainda não existir nenhum usuário no banco. No Swagger, abra `POST /auth/primeiro-administrador` e envie:

```json
{
  "id": "admin-01",
  "usuario": "admin",
  "senha": "UmaSenhaSegura123!",
  "tokenBootstrap": "o-valor-de-ADMIN_BOOTSTRAP_TOKEN-no-seu-env"
}
```

Troque os valores de exemplo pelos seus. A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes. O token de bootstrap deve ser igual ao valor definido em `ADMIN_BOOTSTRAP_TOKEN` no `.env`.

Se preferir dados para demonstração, siga a seção [Carregar dados de demonstração](#carregar-dados-de-demonstracao). O seed cria usuários, incluindo um administrador. Nesse caso, não crie outro administrador inicial.

### 2. Fazer login

Abra `POST /auth/login` e envie o usuário e a senha:

```json
{
  "usuario": "admin",
  "senha": "UmaSenhaSegura123!"
}
```

Copie o valor de `token` da resposta. No Swagger, clique em **Authorize**, cole o token e confirme. O Swagger envia o token nas próximas requisições protegidas. O token expira em 30 minutos; faça login de novo quando isso acontecer.

### 3. Usar os recursos

Depois do login, abra a seção desejada no Swagger. Expanda a rota, clique em **Try it out**, preencha os dados e clique em **Execute**. O Swagger mostra os campos, os tipos e as respostas esperadas para cada rota.

Se você executou o seed, já existem registros de demonstração. Consulte GET /organizacoes, GET /lotes e GET /equipamentos antes de criar novos registros. Use os IDs retornados nas próximas requisições.

#### Cadastrar uma organização

Abra `POST /organizacoes` e use os dados de exemplo. Troque o CNPJ antes de cadastrar outra organização. O CNPJ abaixo também é usado pelos dados de demonstração.

```json
{
  "id": "org-exemplo",
  "razaoSocial": "Organização Exemplo Ltda.",
  "cnpj": "11222333000181",
  "inscricaoEstadual": "ISENTO",
  "enderecoCompleto": "Rua de Testes, 100 - Centro",
  "telefone": "11999990000",
  "email": "contato@exemplo.com"
}
```

Guarde o `id` retornado. Você vai usá-lo para criar o lote e o contrato.

#### Criar um contrato

Abra `POST /contratos`. O contrato precisa apontar para uma organização existente.

```json
{
  "id": "contrato-exemplo",
  "organizacaoId": "org-exemplo",
  "dataAssinatura": "2026-10-26T12:00:00.000Z",
  "dataVencimento": "2027-10-26T12:00:00.000Z",
  "clausulas": ["Destinação correta dos equipamentos recebidos."],
  "valorMensal": 1000,
  "renovacaoAutomatica": false
}
```

#### Criar um lote

Abra `POST /lotes`. Use o mesmo `organizacaoId` cadastrado acima.

```json
{
  "id": "lote-exemplo",
  "dataEntrada": "2026-10-26T12:00:00.000Z",
  "organizacaoId": "org-exemplo",
  "notaFiscal": "NF-1001",
  "transportadora": "Transportadora Exemplo",
  "observacoes": "Lote de demonstração."
}
```

#### Cadastrar um equipamento

Abra `POST /equipamentos`. Use o `loteId` do lote recém-criado. Os valores de enum devem corresponder às opções exibidas no Swagger.

```json
{
  "id": "equipamento-exemplo",
  "codigoBarrasInterno": "GC-EXEMPLO-001",
  "tipo": "NOTEBOOK",
  "marca": "Exemplo",
  "modelo": "Modelo A",
  "anoFabricacao": 2022,
  "estadoFisico": "BOM_ESTADO",
  "pesoQuilogramas": 2.5,
  "loteId": "lote-exemplo",
  "posicaoNoLote": 1
}
```

Para registrar uma movimentação, abra `POST /equipamentos/equipamento-exemplo/movimentacoes` e envie:

```json
{
  "destino": "Área de triagem",
  "observacao": "Recebido para avaliação."
}
```

Use a mesma lógica para as demais rotas: abra a operação no Swagger, confira o corpo e os parâmetros exigidos, clique em **Try it out**, preencha os dados e clique em **Execute**. Para datas, use o formato ISO 8601. Para os enums, use os valores exibidos pelo Swagger.

### Rotas disponíveis

- **Autenticação:** `POST /auth/primeiro-administrador`, `POST /auth/login`.
- **Usuários:** `GET` e `POST /usuarios`; `PATCH /usuarios/:id/ativo`; `PATCH /usuarios/:id/papel`; `DELETE /usuarios/:id`.
- **Organizações:** `GET` e `POST /organizacoes`; `GET`, `PATCH` e `DELETE /organizacoes/:id`; `PATCH /organizacoes/:id/reativar`.
- **Contratos:** `GET` e `POST /contratos`; `GET` e `DELETE /contratos/:id`; `PATCH /contratos/:id/reativar`; `PATCH /contratos/:id/renovacao`.
- **Lotes:** `GET` e `POST /lotes`; `GET` e `DELETE /lotes/:id`; `PATCH /lotes/:id/processar`; `PATCH /lotes/:id/reativar`.
- **Equipamentos:** `GET` e `POST /equipamentos`; `GET` e `DELETE /equipamentos/:id`; `PATCH /equipamentos/:id/estado`; `PATCH /equipamentos/:id/status`; `POST /equipamentos/:id/movimentacoes`; `GET /equipamentos/:id/movimentacoes`; `PATCH /equipamentos/:id/reativar`.
- **Configuração:** `GET` e `PUT /configuracao`.
- **Journal:** `GET /journal`.
- **Relatórios:** `GET /relatorios/organizacoes/:organizacaoId`, `GET /relatorios/status/:status`, `GET /relatorios/financeiro`.

As rotas protegidas exigem autenticação. O Swagger informa o papel necessário em cada rota. Os papéis disponíveis são `ADMINISTRADOR`, `OPERADOR_CADASTRO`, `GESTOR_ALMOXARIFADO` e `AUDITOR`.

### Versões e exclusão

Algumas operações de alteração, exclusão e reativação exigem o campo `versao` no corpo da requisição. Consulte o recurso antes de alterar e envie a versão atual. Se outra operação já tiver alterado o registro, a API retorna conflito; consulte o recurso novamente e tente com a nova versão.

Organizações, contratos, lotes e equipamentos usam exclusão lógica e podem ser reativados. A exclusão de usuário é física e pode falhar quando existem registros do journal ligados a esse usuário. Para preservar o histórico, prefira inativar o usuário por `PATCH /usuarios/:id/ativo`.

## Carregar dados de demonstração

O seed cria dados para testar os módulos e os estados dos enums. Defina `SEED_PASSWORD` no `.env` e execute:

```bash
npx prisma db seed
```

O seed pode ser executado novamente sem duplicar os registros que ele controla. Ele cria contas de demonstração com estes nomes:

- `seed.administrador`
- `seed.operador_cadastro`
- `seed.gestor_almoxarifado`
- `seed.auditor`

Use o valor de `SEED_PASSWORD` para entrar nessas contas. Esses dados e senhas são para desenvolvimento local. Não use em produção. Se `SEED_PASSWORD` não estiver definido, o seed usa a senha padrão `GreencodeSeed#2026`; defina sua própria senha antes de executar.

## Erros comuns

As respostas de erro usam este formato:

```json
{
  "codigo": "DADOS_INVALIDOS",
  "erro": "A requisição contém dados inválidos."
}
```

- `400`: dados inválidos.
- `401`: token ausente, expirado ou credenciais inválidas.
- `403`: papel sem permissão ou token de bootstrap inválido.
- `404`: registro não encontrado.
- `409`: conflito, como versão desatualizada ou valor único já usado.
- `422`: regra de negócio não atendida.

Confira a resposta do Swagger para ver o código e a mensagem específicos de cada rota.

## Desenvolvimento

As migrações ficam em `prisma/migrations` e o modelo do banco fica em `prisma/schema.prisma`. Depois de alterar o schema, crie e aplique uma migração com:

```bash
npx prisma migrate dev --name descricao_da_alteracao
npx prisma generate
```

Para parar o banco:

```bash
docker compose down
```

Para parar o banco e apagar também os dados locais do volume, use `docker compose down -v`. Esse comando apaga o banco de desenvolvimento.


---
<small>TERMINEI FINALMENTE !!!! NÃO AGUENTO MAIS !!!!!!</small>