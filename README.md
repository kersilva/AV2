# Greencode

CLI de gestão para logística reversa de equipamentos eletrônicos. O sistema organiza organizações e contratos, lotes recebidos, equipamentos, triagem e movimentações, com autenticação por papéis, persistência cifrada e auditoria.

## Requisitos

- Node.js e npm instalados.
- Windows 10 ou superior, Ubuntu 24.04.3 ou superior, ou distribuição derivada do Ubuntu.

## Instalação e execução

Na pasta do projeto, instale as dependências:

```bash
npm install
```

Inicie em modo de desenvolvimento:

```bash
npm run dev
```

Na primeira execução, o Greencode solicita o nome e a senha do administrador inicial e cria a chave mestra. Nas próximas execuções, entre com as credenciais cadastradas. Depois do login, digite `ajuda` para ver os comandos disponíveis ao seu papel; use Tab para completar comandos e `sair` para encerrar a sessão.

Para compilar e executar a versão compilada:

```bash
npm run build
npm start
```

## Papéis

- **Administrador:** gerencia usuários e configurações, além de acessar as operações do sistema.
- **Operador de cadastro:** cadastra e consulta organizações.
- **Gestor de almoxarifado:** registra lotes, equipamentos, triagem e movimentações.
- **Auditor:** consulta organizações, journal, rastreabilidade e relatórios.

Os comandos de `ajuda` e as sugestões do autocomplete variam conforme o papel. O sistema também valida as permissões ao executar cada comando.

## Comandos

Os comandos usam palavras e parâmetros nomeados. Datas devem ser informadas como `AAAA-MM-DD`; valores numéricos usam ponto decimal.

```text
organizacao cadastrar <id> <razao-social> <cnpj> <endereco> --vencimento AAAA-MM-DD --valor NUM
organizacao listar
lote criar --org ID --nf NUMERO --transp NOME [--id ID] [--data AAAA-MM-DD]
lote processar <id>
equipamento cadastrar --lote ID --id ID --tipo TIPO --marca MARCA --modelo MODELO --ano AAAA --estado ESTADO --peso KG
equipamento rastrear <id-ou-codigo>
equipamento depreciacao <id> --valor-aquisicao NUM
equipamento atualizar-status <id> --status STATUS --justificativa TEXTO
equipamento atualizar-estado <id> --estado ESTADO [--justificativa TEXTO]
equipamento movimentar <id> --destino LOCAL --responsavel NOME [--observacao TEXTO]
config mostrar
config definir --aliquota-imposto 0.15 --coeficiente-depreciacao 0.20
relatorio gerar --tipo organizacao --org ID [--inicio AAAA-MM-DD --fim AAAA-MM-DD]
relatorio gerar --tipo status --status STATUS
relatorio gerar --tipo financeiro [--inicio AAAA-MM-DD --fim AAAA-MM-DD]
usuario cadastrar --usuario NOME --senha SENHA --papel PAPEL
journal listar
ajuda
sair
```

Os valores aceitos para `--tipo`, `--estado`, `--status` e `--papel` são os nomes dos enums do domínio. A ajuda do CLI apresenta os formatos de comando permitidos ao usuário autenticado.

## Dados e segurança

Os dados locais ficam em `data/`; mantenha essa pasta protegida e fora de repositórios compartilhados.

Os detalhes dos algoritmos, do armazenamento, da retenção do journal e dos cenários de falha estão em [Segurança e operação](docs/seguranca-e-operacao.md).

## Testes

Execute a compilação e os testes automatizados:

```bash
npm run build
npm run test:journey
npm run test:journal
npm run test:security
```

## Estrutura do projeto

- `src/domain`: entidades, enums, interfaces e validadores do domínio.
- `src/services`: regras de negócio, autenticação, relatórios e journal.
- `src/infrastructure`: criptografia e repositório de arquivos.
- `src/cli`: interface, comandos, permissões e persistência da aplicação.
- `tests`: testes automatizados em TypeScript.
- `docs/seguranca-e-operacao.md`: detalhes técnicos de segurança e cenários de falha.
