# Contexto da AV2 — Greencode

> Documento de orientação do projeto. Ele registra o objetivo, as razões das escolhas e o plano de trabalho para que o projeto possa ser retomado por você, por mim ou por outra pessoa sem depender do histórico desta conversa.

## 1. Como ler este documento

Este arquivo reúne três tipos de informação, que não devem ser confundidos:

- **Requisito da atividade:** algo solicitado na AV2 e que precisa ser atendido.
- **Decisão de planejamento:** uma forma recomendada de atender ao requisito, ainda sujeita a revisão antes da implementação.
- **Ponto em aberto:** uma pergunta ou escolha que precisa ser confirmada na atividade, com o professor ou durante o planejamento.

As escolhas descritas aqui são um plano, não uma afirmação de que já foram implementadas. A ideia é validar o entendimento e avançar por partes, explicando cada decisão. Isso é especialmente importante porque, na AV1, muito do código foi construído sem que você tivesse tempo de entender como as partes se relacionavam.

## 2. Objetivo do projeto

A AV2 dá continuidade ao sistema Greencode, usado para acompanhar equipamentos e lotes de equipamentos de organizações. O sistema precisa manter informações de organizações, contratos, lotes, equipamentos e movimentações, além de permitir que usuários autorizados operem essas informações.

O objetivo técnico central é mudar a forma de acesso e armazenamento do sistema. A AV1 era uma aplicação de linha de comando que persistia os dados em arquivos. A AV2 pede uma aplicação com servidor HTTP, uma API REST e banco de dados relacional. Uma interface web poderá consumir essa API depois; a API precisa ser uma fronteira clara entre o cliente e as regras do sistema.

O objetivo de aprendizagem é tão importante quanto o resultado: terminar com uma implementação que você consiga explicar, demonstrar e defender. Por isso, o plano favorece começar com uma base pequena e construir fluxos completos, em vez de gerar muitos arquivos sem compreender seu papel.

## 3. Relação entre AV1 e AV2

### O que pode ser aproveitado como referência

- O vocabulário do domínio: Organização, Contrato, Lote, Equipamento e Movimentação.
- Regras que ainda fizerem sentido para o enunciado da AV2, como estados de equipamento, rastreamento e histórico de movimentação.
- Conhecimentos adquiridos com os comandos e fluxos da AV1, para ajudar a escolher o que a API precisa oferecer.

### O que será reaproveitado

A decisão é começar a AV2 como uma nova fase da aplicação, mas aproveitar o máximo de código da AV1 que continuar correto. Não existe uma meta de limitar a cópia a uma porcentagem: até muitos arquivos podem ser reaproveitados se forem úteis e compatíveis. O critério é a responsabilidade de cada arquivo, não a quantidade copiada.

Podem ser candidatos a reaproveitamento, após revisão: entidades e enums do domínio, validações, cálculos, regras de transição de status, serviços de negócio, autenticação e autorização, hash de senha, validações de CNPJ e código de barras, e testes dessas regras. Uma classe existente pode precisar de pequenas adaptações para persistência relacional ou para receber a identidade do usuário autenticado.

### O que precisa mudar

- A entrada principal deixa de ser o CLI e passa a ser o servidor HTTP.
- O armazenamento por arquivos deixa de ser persistência principal e passa a ser PostgreSQL via Prisma.
- Serviços que hoje dependem diretamente de arquivos devem passar a depender de repositórios; a regra de negócio pode permanecer.
- O mecanismo de sessão do CLI precisa ser adaptado ao JWT exigido para a API, reaproveitando a verificação segura de senha quando compatível.
- Comandos e telas de terminal não fazem parte da API, salvo se forem úteis como ferramenta auxiliar de desenvolvimento.

Assim, “começar do zero” significa iniciar uma nova aplicação/arquitetura de AV2, não descartar o trabalho anterior. O plano é inspecionar os arquivos da AV1 e classificar cada um como reaproveitar sem alteração, reaproveitar com adaptação ou substituir. Nada será copiado às cegas.

## 4. O que a atividade pede, em termos práticos

O PDF descreve o direcionamento como princípios e sugestões, não como um roteiro rígido. Por isso, esta seção distingue o que o enunciado determina, o que recomenda e o que fica escolhido pelo projeto. Como o objetivo combinado é entregar algo muito bem feito, boas práticas também serão adotadas mesmo quando não forem exigências literais.

| Requisito da AV2 | Significado prático | Como demonstrar que foi atendido |
|---|---|---|
| Servidor monolítico HTTP | **Obrigatório:** migrar do CLI para um servidor monolítico que exponha API. Monolítico não significa um arquivo gigante. | Servidor inicia e atende requisições HTTP numa aplicação coesa. |
| API REST | **Obrigatório no objetivo da migração:** expor as funções do sistema como API para um futuro cliente SPA. | Rotas de recursos, métodos HTTP e respostas documentadas. |
| Banco relacional | **Obrigatório:** persistir em banco relacional; o PDF cita PostgreSQL ou MySQL. | Dados ficam no banco e relações são representadas por chaves e restrições. |
| Prisma ORM / Client | **Obrigatório no direcionamento da atividade:** schema Prisma, Prisma Client e uso de migrações/transações. | A camada de repositório usa Prisma Client. |
| Controller–Service–Repository | **Recomendação explícita do professor**, não imposição de roteiro rígido. **Escolha do projeto:** adotar as três camadas. | Controllers tratam HTTP; serviços concentram regras; repositórios consultam o banco. |
| Fastify ou Express | **Escolha aberta no PDF:** Fastify é recomendado; Express também é válido. **Escolha do projeto:** Fastify. | Servidor Fastify com validação, hooks e organização modular. |
| PostgreSQL ou MySQL | **Escolha aberta no PDF:** PostgreSQL é recomendado; MySQL também é citado como opção. **Escolha do projeto:** PostgreSQL. | Prisma configurado para PostgreSQL. |
| Porta configurável e graceful shutdown | **Orientação explícita do enunciado** para estruturar o servidor. | Porta por variável de ambiente e encerramento controlado do servidor/conexões. |
| Autenticação JWT | **Direcionamento explícito:** adaptar autenticação para JWT, com login, hash existente/compatível, id e papel no token, cabeçalho Authorization e validação em cada requisição protegida. | Login funciona e hooks validam token e disponibilizam usuário à aplicação. |
| Transações | **Obrigação de projeto expressa como “deve identificar” operações de negócio que precisam de transação.** | Fluxos com várias gravações confirmam tudo ou nada. |
| Concorrência otimista | O enunciado diz que **deve ser considerada** e descreve campo de versão em cada modelo e checagem antes de atualizar. Para seguir à risca e robustez, **escolha do projeto:** implementar versionamento otimista em todos os modelos persistidos atualizáveis. | Atualização com versão antiga é rejeitada como conflito. |
| Migração e seed | Migrações são capacidade recomendada do Prisma. Seed é descrito como opção interessante, não obrigação. **Escolha do projeto:** criar seed para facilitar ambiente e demonstração. | Outra pessoa consegue montar banco e popular dados de exemplo sem cadastrar tudo manualmente. |
| Restrições de unicidade e estados consistentes | O PDF recomenda unicidade para CNPJ e código de barras e constraints/triggers para evitar inconsistências. **Escolha do projeto:** usar restrições de banco adequadas e preferir constraints antes de triggers quando suficiente. | Duplicidade/inconsistência não é persistida nem sob concorrência. |
| API documentada e banco normalizado | O enunciado apresenta como resultado esperado da atividade. **Tratado como obrigatório para a entrega.** | Documentação utilizável e esquema relacional sem duplicação desnecessária. |
| Compatibilidade dos sistemas listados | **Obrigatório:** Windows 10 ou superior e Ubuntu 24.04.03 ou superior e derivados. | Aplicação e instruções não dependem de caminhos ou recursos exclusivos de um sistema. |

### Decisões já tomadas

- Framework HTTP: **Fastify**.
- Banco relacional: **PostgreSQL**.
- Organização do servidor: **Controller–Service–Repository**, conforme a recomendação do professor.
- Estratégia de migração: começar nova fase e reaproveitar o máximo viável da AV1 após análise, exceto CLI e persistência em arquivos como mecanismo principal.
- Qualidade: aplicar boas práticas do desenvolvimento, mesmo quando forem melhorias além do mínimo literal.
- Respostas HTTP: definir um padrão consistente para sucessos e erros, com códigos de estado adequados e mensagens úteis sem dados sensíveis.
- Seed: incluir dados de demonstração reproduzíveis.

### O que é seed?

Seed é um script que cadastra automaticamente dados iniciais no banco. Por exemplo, organizações, contratos, lotes e equipamentos com estados variados para experimentar os fluxos sem digitar tudo manualmente. Pode também preparar uma conta de desenvolvimento, mas sua senha deve vir de configuração local e não ser uma credencial fixa exposta no código. Seed não é dado real do sistema nem substitui migração: migração cria/altera tabelas; seed insere registros de exemplo.

O enunciado é a autoridade final. Se uma interpretação desta tabela divergir do PDF da AV2 ou de uma orientação do professor, deve-se corrigir este documento e seguir a fonte oficial.

## 5. Arquitetura planejada

O fluxo de uma requisição deve ser simples de acompanhar:

```text
Cliente (por exemplo, uma futura interface web)
  → rota HTTP
  → Controller: interpreta entrada e monta resposta HTTP
  → Service: aplica regras e coordena a operação
  → Repository: lê e grava com Prisma Client
  → banco relacional
```

### Controller

É a fronteira HTTP. Lê parâmetros, corpo e identidade fornecida pela autenticação; chama o serviço; transforma o resultado em resposta. Deve evitar conter regras de domínio ou consultas diretas ao banco. Assim, a mesma regra não fica presa a uma rota específica.

### Service

É onde as regras da aplicação são verificadas. Exemplos: impedir CNPJ duplicado, verificar se o lote existe antes de incluir equipamento e decidir se o papel do usuário permite a operação. O serviço coordena transações quando uma ação envolve várias gravações.

### Repository

É a camada de acesso aos dados. Encapsula consultas do Prisma Client para que os serviços expressem o que precisam sem ficarem acoplados aos detalhes de cada consulta. Deve evitar conter decisões de autorização ou regras de fluxo HTTP.

### Servidor e configuração

**Decisão tomada:** usar Fastify, PostgreSQL e Prisma, combinação recomendada no PDF e escolhida pelo projeto. Porta, URL do banco e segredos devem vir de variáveis de ambiente, não de valores secretos fixos no código. O servidor deve encerrar conexões de forma organizada ao receber um sinal de parada.

## 6. Modelo do domínio e relacionamentos

Os cinco modelos de negócio destacados na atividade são:

- **Organização:** empresa ou entidade atendida pelo sistema. Deve ter identificador e dados cadastrais; CNPJ deve ser único.
- **Contrato:** vínculo contratual com uma organização, com datas e condições previstas no enunciado.
- **Lote:** conjunto recebido ou administrado para uma organização. Guarda os dados de entrada, como nota fiscal e transportadora quando exigidos.
- **Equipamento:** item individual, identificado por código de barras ou outro identificador definido na atividade. Pertence a um lote e possui tipo, estado físico e estado de rastreamento.
- **Movimentação:** evento histórico ligado a um equipamento, como mudança de destino, responsável, data ou observação. O histórico explica o caminho do equipamento.

Relacionamentos indicados pelo enunciado:

```text
Organização 1 ── 0..1 Contrato
Organização 1 ── 0..N Lote
Lote         1 ── 1..N Equipamento (confirmar cardinalidade mínima no enunciado)
Equipamento  1 ── 0..N Movimentação
```

Uma relação `1 ── 0..1` significa que uma organização pode não ter contrato ou ter um; se o enunciado especificar outra cardinalidade, o esquema precisa acompanhar. Em relações de muitos itens, a chave estrangeira deve ficar no lado que pertence ao pai: por exemplo, o equipamento aponta para seu lote.

**Decisão de planejamento:** reaproveitar e adaptar o modelo/gestão de usuário da AV1 para sustentar login, senha com hash e papéis, verificando que os campos se ajustem ao banco e às necessidades da API. O conteúdo exato do papel deve vir da AV1 e dos fluxos definidos, sem inventar permissões sem necessidade.

Movimentação é naturalmente um registro de eventos. **Decisão recomendada:** permitir criação e consulta do histórico, sem edição ou remoção comum, para não apagar a trilha de auditoria. Confirmar se a atividade exige CRUD literal para todos os modelos.

## 7. API e operações

Os caminhos exatos ainda devem ser validados com o enunciado. Uma organização RESTful provável é:

```text
/auth/login
/organizacoes
/contratos
/lotes
/equipamentos
/equipamentos/{id}/movimentacoes
/movimentacoes
```

Em geral, `GET` consulta, `POST` cria, `PUT` ou `PATCH` atualiza e `DELETE` remove. Cada rota deve ter entrada validada, autenticação quando necessária, autorização por papel e respostas consistentes. Os nomes e métodos finais devem seguir o padrão escolhido e a documentação.

### CRUD e exclusão

O feedback da AV1 destacou que faltou a exclusão de usuários e houve uma pergunta sobre apagar a conta administradora. Para a AV2, CRUD precisa ser tratado como requisito explícito de planejamento, não como algo que se presume concluído porque existem operações de cadastro e listagem.

Para cada recurso, registrar quais operações são necessárias e quais são permitidas. Exclusões com dependências devem ter comportamento deliberado: por exemplo, impedir exclusão de um lote que ainda contém equipamentos, ou definir uma regra de exclusão lógica se o enunciado permitir.

**Decisão recomendada para usuário administrador:** não permitir que a operação deixe o sistema sem nenhum administrador ativo. A conta pode ser desativada em vez de apagada definitivamente, com regra também contra o próprio último administrador se desativar a si mesmo. Isso precisa ser demonstrado em serviço e protegido contra concorrência. Confirmar se esse comportamento atende aos critérios do professor.

### Respostas de erro

Planejar respostas previsíveis: entrada inválida (400), sem autenticação ou token inválido (401), usuário autenticado sem permissão (403), registro inexistente (404), conflito de unicidade ou versão desatualizada (409) e falha inesperada (500). As mensagens devem ajudar o cliente sem expor senha, hash, token ou detalhes internos.

## 8. Autenticação e autorização

1. O usuário envia identificador e senha à rota de login.
2. O servidor busca a conta e compara a senha enviada com o hash armazenado usando uma biblioteca apropriada (o enunciado sugere bcrypt como exemplo).
3. Se válido e ativo, o servidor emite um JWT contendo a identidade e o papel necessários.
4. O cliente envia o token no cabeçalho `Authorization: Bearer ...` nas rotas protegidas.
5. Um hook ou middleware valida assinatura e validade; a rota ou serviço verifica o papel exigido.

Hash de senha não é criptografia reversível: a aplicação não deve conseguir recuperar a senha original. A chave JWT e outras credenciais devem ser configuradas fora do repositório. Um usuário inativo não deve continuar conseguindo iniciar sessão. Como papéis podem mudar depois da emissão do token, deve-se decidir se o servidor revalida a conta/papel no banco em toda requisição ou usa expiração curta e outra estratégia permitida pelo escopo.

## 9. Integridade e regras de negócio

Validar dados em camadas complementares:

- **Na entrada HTTP:** formato e presença de campos, tipos, limites e datas.
- **No serviço:** regras que dependem do contexto, das permissões ou de outras entidades.
- **No banco:** unicidade, chaves estrangeiras e restrições que impedem estados estruturalmente inválidos.

Exemplos de proteção a confirmar no domínio: CNPJ não duplicado, identificador/barcode de equipamento único, contrato associado a uma organização existente, equipamento associado a um lote existente, e movimentação sempre ligada a equipamento existente. A validação na aplicação dá mensagens melhores; a restrição do banco protege contra duas requisições simultâneas que tentem gravar o mesmo valor.

Estados de lote, equipamento físico e rastreamento devem ser enums ou valores controlados, conforme o enunciado. Não misturar estados com conceitos diferentes. Mudanças de estado devem registrar quem fez, quando fez e, quando apropriado, a justificativa.

## 10. Transações e concorrência otimista

### Por que transações

Imagine criar um lote e importar vários equipamentos. Se o lote for salvo, mas a gravação do terceiro equipamento falhar, uma transação permite desfazer o conjunto e evitar um lote parcialmente importado. Outro exemplo é mudar o estado de um equipamento e registrar a movimentação correspondente: ambos devem ser confirmados juntos.

Com Prisma, o serviço coordena a transação (`$transaction`) quando várias escritas fazem parte de uma única ação. Não se deve abrir transação para qualquer consulta sem necessidade; ela representa uma unidade de negócio atômica.

### Por que versão

Se duas pessoas carregam a versão 3 de um equipamento e ambas tentam editar, a segunda não deve apagar silenciosamente a mudança da primeira. O registro inclui um número `version`. A atualização só é aceita quando a versão enviada/esperada ainda corresponde à atual; ao salvar, a versão aumenta. Caso não corresponda, a API retorna conflito e o cliente pode recarregar os dados.

O enunciado pede versionamento nos modelos; mapear essa exigência a todos os modelos persistidos, registrando como eventos imutáveis serão tratados. Para movimentação, se a regra for append-only, a versão só participa da criação ou das ações que a atividade realmente permita alterar.

## 11. Banco, seed e migrações

- **Migração** descreve uma mudança versionada no esquema do banco, para que outra pessoa possa criar a mesma estrutura sem depender de edição manual.
- **Seed** cria dados iniciais de demonstração de forma repetível, como uma organização, contrato, lote, equipamentos em estados variados e usuário administrativo.
- O seed não deve colocar uma senha de produção conhecida em código. A senha inicial, se necessária, deve vir de configuração local e ser trocada.
- Restrições importantes devem sobreviver a reinicializações e ser criadas pelas migrações.
- A equipe deve documentar como configurar o banco, aplicar migrações, executar seed e iniciar o servidor.

## 12. Documentação e operação

A API precisa ser compreensível por quem vai consumi-la. Planejar uma especificação OpenAPI/Swagger ou documentação equivalente com rotas, parâmetros, corpos, autenticação, respostas e exemplos. O README deve explicar instalação/configuração, banco, execução, testes e acesso à documentação da API. Decisões relevantes e seus motivos podem ficar em documentos separados ligados pelo README, evitando repetir o mesmo conteúdo em dois lugares.

O servidor deve ler a porta e configurações do ambiente, tratar inicialização e encerramento do banco, e não depender de caminhos absolutos do computador de desenvolvimento. A compatibilidade exigida inclui Windows 10 ou superior e Ubuntu 24.04.03 ou superior e derivados, conforme o PDF recebido; confirmar a versão exata no documento oficial se houver divergência de formatação.

## 13. Estratégia de trabalho para os cinco dias

Esta é uma sequência de foco, não uma promessa de que cada dia terá a mesma duração. Se um bloco atrasar, priorizar os requisitos obrigatórios e manter uma aplicação executável.

### Dia 1 — Entendimento e fundação

- Traduzir o PDF em uma lista de critérios verificáveis.
- Criar a nova base do servidor e validar que inicia.
- Configurar PostgreSQL e Prisma, definir o primeiro esquema e aplicar uma migração.
- Ter uma rota simples de saúde e comprovar a conexão ao banco.
- Garantir que você entende o caminho de uma requisição e o papel de cada camada.

### Dia 2 — Primeiro fluxo vertical

- Implementar uma operação completa de Organização passando por rota, controller, service, repository e banco.
- Incluir validação, tratamento de duplicidade e respostas HTTP.
- Documentar e demonstrar o fluxo antes de copiar o padrão para outros recursos.

### Dia 3 — Recursos e regras do domínio

- Completar operações exigidas para Contrato, Lote e Equipamento.
- Tratar relacionamentos e regras de exclusão.
- Implementar movimentações e histórico.
- Colocar cada fluxo de múltiplas gravações numa transação.

### Dia 4 — Segurança e concorrência

- Implementar usuário, hash de senha, login JWT e proteção de rotas.
- Aplicar autorização por papel.
- Implementar versão otimista e comportamento de conflito.
- Verificar a regra para proteger o último administrador, se adotada.

### Dia 5 — Fechamento e apresentação

- Revisar cada requisito contra evidência concreta.
- Executar os testes e corrigir falhas que bloqueiam os fluxos principais.
- Conferir documentação, seed, configuração, migrações e compatibilidade dos comandos.
- Preparar uma demonstração curta e praticar explicar arquitetura, exclusão, autenticação, transação e conflito de versão.

## 14. Critérios de conclusão e demonstração

Antes de considerar a entrega concluída, conferir estes pontos com o enunciado:

- [ ] O servidor inicia com a configuração documentada.
- [ ] A API consegue persistir e consultar dados no banco relacional.
- [ ] Os modelos e relacionamentos pedidos estão representados no esquema.
- [ ] Cada operação CRUD solicitada está implementada ou tem uma justificativa explícita quando a natureza do recurso não permite a operação.
- [ ] Usuários podem autenticar; senha não é armazenada em texto puro.
- [ ] Rotas verificam autenticação e papéis adequadamente.
- [ ] Nenhuma operação deixa o sistema sem administrador ativo, caso a decisão de proteger o último admin seja confirmada.
- [ ] Fluxos com várias gravações são atômicos.
- [ ] Atualizações concorrentes detectam versão desatualizada.
- [ ] Restrições e erros de conflito são tratados de modo previsível.
- [ ] Seed, migrações, instruções e documentação permitem que outra pessoa prepare e use o projeto.
- [ ] Os requisitos de sistema operacional do enunciado foram verificados.
- [ ] Você consegue explicar, com suas palavras, o caminho de uma requisição e as principais decisões.

O checklist final deve ser comparado linha por linha à atividade oficial. Um item marcado sem evidência ou sem saber explicá-lo não deve ser considerado concluído.

## 15. Decisões pendentes e pressupostos

Estas perguntas precisam ser resolvidas antes ou durante a implementação:

1. O PDF exige CRUD completo para usuário e para cada modelo, ou algumas operações podem ser restritas por regra de domínio?
2. Movimentação pode ser editada/removida, ou o histórico deve ser imutável?
3. A cardinalidade de Contrato por Organização é realmente zero-ou-um? Confirmar o texto e o diagrama da atividade.
4. Lote pode existir sem equipamentos? O diagrama e os critérios devem determinar a cardinalidade mínima.
5. Quais papéis e permissões precisam existir? Não adivinhar regras que a atividade não pede.
6. A proteção do último administrador será exclusão física proibida, desativação lógica ou outro comportamento exigido pelo professor?
7. A AV1 tem regras de domínio obrigatórias que a AV2 espera preservar? Reutilizar só depois de identificar essas regras.
8. Journal/auditoria adicional é desejável ou está fora do escopo? A AV2 precisa de Movimentação de equipamento; isso não significa automaticamente que precise de um journal genérico de todas as ações.
9. A atividade exige alguma biblioteca, estrutura de pastas, rota ou formato de documentação específico?

Fastify e PostgreSQL já foram escolhidos dentro das opções aceitas no PDF. Prisma faz parte do direcionamento da atividade. Reaproveitamento de código da AV1 e adoção de boas práticas também são decisões confirmadas do projeto. Permanecem em aberto as regras exatas de CRUD por recurso, a política de imutabilidade das movimentações e a política de proteção ao último administrador; devemos confrontá-las com os requisitos herdados da AV1 e com a rubrica da AV2.

## 16. Glossário curto

- **API:** conjunto de operações que permite a outro programa usar as funções do servidor.
- **REST:** estilo de organização de APIs em recursos e métodos HTTP.
- **Controller:** código que transforma uma requisição HTTP em chamada da aplicação e transforma o resultado em resposta.
- **Service:** código que aplica regras e coordena ações do sistema.
- **Repository:** código que esconde detalhes de leitura e escrita no banco.
- **ORM / Prisma Client:** ferramenta que permite consultar o banco usando modelos e código da aplicação.
- **JWT:** token assinado que comprova a identidade por um período limitado; não é a senha.
- **Hash de senha:** representação segura para verificar uma senha sem armazená-la diretamente.
- **Transação:** grupo de mudanças no banco que é confirmado por inteiro ou desfeito por inteiro.
- **Concorrência otimista:** detecção de que um dado foi alterado por outra pessoa desde que foi consultado.
- **Migração:** versão reproduzível de uma mudança no esquema do banco.
- **Seed:** rotina que insere dados iniciais para desenvolvimento ou demonstração.
- **DTO:** formato de dados que a API aceita ou devolve, separado do modelo interno do banco.

## 17. Fontes e estado deste documento

Este contexto foi preparado a partir do PDF da AV2 compartilhado nesta conversa, do histórico de planejamento do projeto Greencode e do feedback recebido sobre a AV1. Ele não substitui o enunciado. Se o PDF ou o professor esclarecer um ponto, atualize esta documentação para refletir a fonte oficial.

**Estado:** planejamento inicial da AV2, atualizado com as escolhas do projeto. Nenhum dos itens deste texto deve ser interpretado como implementação concluída. O PDF oficial e a rubrica do professor continuam sendo a fonte final dos requisitos; este documento registra como decidimos atendê-los.

**Cópia no Notion:** [Greencode AV2 — Contexto do Projeto](https://app.notion.com/p/3ff4d11c237681dc87d8c00d50495fd4?pvs=204) (rascunho privado).
