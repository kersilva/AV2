# Segurança e operação

Este documento registra as decisões de segurança, persistência e auditoria do Greencode e os cenários de falha verificados. Para instalação, uso do CLI, papéis e sintaxe dos comandos, consulte o [README](../README.md).

## Chave mestra e provisionamento

No primeiro início, o sistema solicita o nome e a senha do administrador inicial e gera uma chave aleatória de 32 bytes. `data/mestre.json` guarda essa chave e o nome do administrador inicial; o arquivo é gravado por temporário e renomeação. A chave permite abrir os repositórios cifrados e, por isso, `data/` deve ser tratada como dado sensível e não compartilhada.

## Cifragem e gravação

Organizações, lotes, equipamentos (incluindo seu histórico de movimentações), credenciais, configuração, journal e histórico de comandos usam AES-256-GCM. O GCM autentica os dados: chave incorreta ou conteúdo adulterado faz a leitura falhar.

Cada repositório serializa os dados, cifra o conteúdo e o grava em arquivo temporário no mesmo diretório do destino. Em seguida, renomeia o temporário para substituir o arquivo final. Essa estratégia evita deixar um arquivo parcialmente escrito após interrupção durante a gravação.

O histórico do CLI fica em `cli-history.enc`, também cifrado e gravado atomicamente. Senhas informadas em comandos ou prompts não são adicionadas ao histórico. Instalações antigas com `cli-history.txt` carregam esse histórico e o convertem para o formato cifrado quando o CLI encerra normalmente; o arquivo legado só é removido depois da gravação cifrada.

## Senhas e sessões

Credenciais ficam em `credenciais.enc`, cifradas com a chave mestra. Cada senha é armazenada como hash SHA-256 combinado com salt aleatório de 128 bits; a comparação usa `timingSafeEqual`. O algoritmo segue a exigência desta atividade. Credenciais antigas em formato `scrypt` são migradas para SHA-256 após autenticação bem-sucedida.

Uma sessão expira após 30 minutos sem atividade. Comandos recebidos dentro do prazo renovam a sessão; uma sessão expirada exige novo login.

## Journal e ordem das alterações

O CLI valida a operação, grava a transação cifrada no journal e só então altera o estado em memória e persiste os dados da entidade. Se o registro no journal falhar, a alteração não é aplicada. O journal retém transações dos últimos 180 dias e gira `journal.enc` ao ultrapassar 10 MiB, mantendo os arquivos rotacionados dentro da mesma política de retenção.

## Verificações de falha

Os scripts abaixo estão na pasta `tests/` e podem ser executados pelos comandos documentados no [README](../README.md).

- **Jornada CLI:** percorre provisionamento, autenticação, cadastro, triagem, múltiplas movimentações e rastreabilidade; verifica também CNPJ inválido, data futura de lote, desmonte antes de concluir triagem, mudança de estado sem justificativa, permissões do auditor, ajuda filtrada por papel e histórico cifrado.
- **Journal:** confirma descarte de transações fora da retenção, rotação ao ultrapassar 10 MiB e rejeição de conteúdo adulterado.
- **Segurança:** verifica senha incorreta, formato SHA-256, migração de credencial `scrypt` e expiração de sessão sem esperar 30 minutos em tempo real.

Uma falha de autenticação de dados cifrados interrompe a leitura daquele arquivo e gera erro; o sistema não aceita silenciosamente o conteúdo adulterado. Falhas ao registrar no journal impedem a operação correspondente.
