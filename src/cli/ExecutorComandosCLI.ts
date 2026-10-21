import { Contrato } from "../domain/entities/Contrato.js";
import { randomUUID } from "node:crypto";
import { Equipamento } from "../domain/entities/Equipamento.js";
import { JournalTransacao } from "../domain/entities/JournalTransacao.js";
import { Lote } from "../domain/entities/Lote.js";
import { Organizacao } from "../domain/entities/Organizacao.js";
import { PapelUsuario } from "../domain/enums/PapelUsuario.js";
import { EstadoFisico } from "../domain/enums/EstadoFisico.js";
import { StatusRastreamento } from "../domain/enums/StatusRastreamento.js";
import { TipoEquipamento } from "../domain/enums/TipoEquipamento.js";
import { ServicoAutenticacao } from "../services/ServicoAutenticacao.js";
import { ServicoEquipamento } from "../services/ServicoEquipamento.js";
import { ServicoLote } from "../services/ServicoLote.js";
import { ServicoOrganizacao } from "../services/ServicoOrganizacao.js";
import { ServicoRelatorio } from "../services/ServicoRelatorio.js";
import { ServicoJournal } from "../services/ServicoJournal.js";
import { ValidadorCNPJ } from "../domain/validators/ValidadorCNPJ.js";
import { ValidadorDataEntrada } from "../domain/validators/ValidadorDataEntrada.js";
import { ServicoConfiguracao } from "../services/ServicoConfiguracao.js";
import { analisarComando, comandosVisiveis, valorEnum } from "./SintaxeCLI.js";

interface ContextoComandos {
  usuario: string;
  credenciais: Map<
    string,
    import("../domain/entities/Credencial.js").Credencial
  >;
  organizacoes: Map<string, Organizacao>;
  lotes: Map<string, Lote>;
  equipamentos: Map<string, Equipamento>;
  autenticacao: ServicoAutenticacao;
  servicoOrganizacao: ServicoOrganizacao;
  servicoLote: ServicoLote;
  servicoEquipamento: ServicoEquipamento;
  servicoRelatorio: ServicoRelatorio;
  journal: ServicoJournal;
  servicoConfiguracao: ServicoConfiguracao;
  salvarDados(): Promise<void>;
}

export class ExecutorComandosCLI {
  constructor(private readonly contexto: ContextoComandos) {}

  async executar(linha: string): Promise<boolean> {
    const { nome, posicional, opcoes } = analisarComando(linha);
    const c = this.contexto;
    const papel = c.credenciais.get(c.usuario)!.papel;
    const valor = (chave: string, indice?: number, padrao?: string): string => {
      const recebido =
        opcoes.get(chave) ??
        (indice === undefined ? undefined : posicional[indice]) ??
        padrao;
      if (recebido === undefined || recebido === "")
        throw new Error(`Parâmetro obrigatório ausente: --${chave}.`);
      return recebido;
    };
    const exigirPapel = (...permitidos: PapelUsuario[]): void => {
      if (!permitidos.includes(papel))
        throw new Error("Seu papel não permite executar esse comando.");
    };
    const registrar = (operacao: string, entidade: string, antes: unknown, depois: unknown): Promise<void> =>
      c.journal.registrar(new JournalTransacao(randomUUID(), new Date(), operacao, entidade,
        antes === undefined ? null : JSON.parse(JSON.stringify(antes)),
        depois === undefined ? null : JSON.parse(JSON.stringify(depois)), c.usuario));

    if (nome === "ajuda") this.mostrarAjuda(papel);
    else if (nome === "secreto") {
      console.log("Se a AV1 é assim... Nem quero ver as próximas");
    }
    else if (nome === "sair") {
      await c.salvarDados();
      return false;
    } else if (nome === "organizacao listar") {
      exigirPapel(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.OPERADOR_CADASTRO,
        PapelUsuario.AUDITOR,
      );
      this.listarOrganizacoes();
    } else if (nome === "journal listar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR);
      const transacoes = await c.journal.listar();
      if (!transacoes.length) console.log("Nenhuma transação no período de retenção.");
      else {
        const cabecalho = ["Data/Hora", "Operação", "Entidade", "Responsável"];
        const linhas = transacoes.map((transacao) => [transacao.timestamp.toISOString(), transacao.operacao,
          transacao.entidade, transacao.usuarioResponsavel]);
        console.log([cabecalho, ...linhas].map((linha) => linha.join(" | ")).join("\n"));
      }
    } else if (nome === "config mostrar") {
      console.log(JSON.stringify({ aliquotaImposto: c.servicoConfiguracao.aliquotaImposto,
        coeficienteDepreciacao: c.servicoConfiguracao.coeficienteDepreciacao }, null, 2));
    } else if (nome === "config definir") {
      exigirPapel(PapelUsuario.ADMINISTRADOR);
      const aliquota = opcoes.has("aliquota-imposto") ? Number(valor("aliquota-imposto")) : c.servicoConfiguracao.aliquotaImposto;
      const depreciacao = opcoes.has("coeficiente-depreciacao") ? Number(valor("coeficiente-depreciacao")) : c.servicoConfiguracao.coeficienteDepreciacao;
      if (!opcoes.has("aliquota-imposto") && !opcoes.has("coeficiente-depreciacao"))
        throw new Error("Informe --aliquota-imposto e/ou --coeficiente-depreciacao.");
      if (!Number.isFinite(aliquota) || aliquota < 0 || aliquota > 1 || !Number.isFinite(depreciacao) || depreciacao < 0 || depreciacao > 1)
        throw new Error("Os parâmetros devem estar entre 0 e 1 (0% a 100%).");
      const antes = { aliquotaImposto: c.servicoConfiguracao.aliquotaImposto, coeficienteDepreciacao: c.servicoConfiguracao.coeficienteDepreciacao };
      const depois = { aliquotaImposto: aliquota, coeficienteDepreciacao: depreciacao };
      await registrar("ATUALIZAR", "Configuracao", antes, depois);
      c.servicoConfiguracao.definirAliquotaImposto(aliquota);
      c.servicoConfiguracao.definirCoeficienteDepreciacao(depreciacao);
      await c.salvarDados();
      console.log("[SUCESSO] Configuração global atualizada.");
    } else if (nome === "organizacao cadastrar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.OPERADOR_CADASTRO);
      const id = valor("id", 0);
      const vencimento = new Date(
        valor(
          "vencimento",
          undefined,
          new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        ),
      );
      const valorMensal = Number(valor("valor", undefined, "0"));
      if (Number.isNaN(vencimento.getTime()) || !Number.isFinite(valorMensal))
        throw new Error("Vencimento ou valor inválido.");
      const contrato = new Contrato(
        `CTR-${id}`,
        id,
        new Date(),
        vencimento,
        [],
        valorMensal,
        false,
      );
      const org = new Organizacao(
        id,
        valor("razao-social", 1),
        valor("cnpj", 2),
        opcoes.get("ie") ?? "",
        valor("endereco", 3),
        opcoes.get("telefone") ?? "",
        opcoes.get("email") ?? "",
        new Date(),
        true,
        contrato,
      );
      if (c.organizacoes.has(id)) throw new Error("Identificador de organização já cadastrado.");
      const validadorCNPJ = new ValidadorCNPJ();
      if (!validadorCNPJ.validar(org.cnpj)) throw new Error(validadorCNPJ.obterMensagemErro());
      if ([...c.organizacoes.values()].some((existente) => existente.cnpj.replace(/\D/g, "") === org.cnpj.replace(/\D/g, "")))
        throw new Error("Já existe uma organização cadastrada com esse CNPJ.");
      await registrar("CRIAR", "Organizacao", null, org);
      c.servicoOrganizacao.cadastrarOrganizacao(org);
      c.organizacoes.set(id, org);
      await c.salvarDados();
      console.log("[SUCESSO] Organização cadastrada.");
    } else if (nome === "lote criar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const id = opcoes.get("id") ?? `LOT-${Date.now()}`;
      const orgId = valor("org", 0);
      if (!c.organizacoes.has(orgId))
        throw new Error("Organização não encontrada.");
      const lote = new Lote(
        id,
        new Date(opcoes.get("data") ?? new Date().toISOString()),
        orgId,
        valor("nf", 1),
        valor("transp", 2),
      );
      if (c.lotes.has(id)) throw new Error("Identificador de lote já cadastrado.");
      const validadorData = new ValidadorDataEntrada();
      if (!validadorData.validar(lote.dataEntrada)) throw new Error(validadorData.obterMensagemErro());
      await registrar("CRIAR", "Lote", null, lote);
      c.servicoLote.criarLote(lote);
      c.lotes.set(id, lote);
      await c.salvarDados();
      console.log(`[SUCESSO] Lote ${id} criado para organização ${orgId}.`);
    } else if (nome === "lote processar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const id = valor("id", 0); const lote = c.lotes.get(id);
      if (!lote) throw new Error("Lote não encontrado.");
      const antes = lote.statusProcessamento;
      await registrar("PROCESSAR_TRIAGEM", "Lote", { id, statusProcessamento: antes },
        { id, statusProcessamento: Math.min(antes + 1, 4) });
      c.servicoLote.processarTriagem(id); await c.salvarDados();
      console.log(`[SUCESSO] Triagem do lote ${id} avançada.`);
    } else if (nome === "equipamento rastrear") {
      exigirPapel(
        PapelUsuario.ADMINISTRADOR,
        PapelUsuario.GESTOR_ALMOXARIFADO,
        PapelUsuario.AUDITOR,
      );
      this.rastrearEquipamento(valor("id", 0));
    } else if (nome === "equipamento depreciacao") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO, PapelUsuario.AUDITOR);
      const equipamento = c.servicoEquipamento.rastrearEquipamento(valor("id", 0));
      const valorAquisicao = Number(valor("valor-aquisicao"));
      if (!Number.isFinite(valorAquisicao) || valorAquisicao < 0) throw new Error("Valor de aquisição inválido.");
      const valorAtual = c.servicoConfiguracao.calcularDepreciacao(equipamento.anoFabricacao, valorAquisicao);
      console.log(JSON.stringify({ equipamentoId: equipamento.id, valorAquisicao,
        valorAtualEstimado: valorAtual, coeficienteAnual: c.servicoConfiguracao.coeficienteDepreciacao }, null, 2));
    } else if (nome === "equipamento cadastrar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const loteId = valor("lote", 0);
      const lote = c.lotes.get(loteId);
      if (!lote) throw new Error("Lote não encontrado.");
      const id = valor("id", 1);
      const tipo = valorEnum(TipoEquipamento, valor("tipo"));
      const estado = valorEnum(EstadoFisico, valor("estado"));
      const ano = Number(valor("ano"));
      const peso = Number(valor("peso"));
      if (!Number.isInteger(ano) || !Number.isFinite(peso) || peso <= 0)
        throw new Error("Ano ou peso inválido.");
      const codigo = c.servicoEquipamento.gerarCodigoBarras(
        tipo,
        c.equipamentos.size + 1,
      );
      const equipamento = new Equipamento(
        id,
        codigo,
        tipo,
        valor("marca"),
        valor("modelo"),
        ano,
        estado,
        peso,
        loteId,
        lote.equipamentos.length + 1,
        StatusRastreamento.AGUARDANDO_TRIAGEM,
      );
      if (c.equipamentos.has(id)) throw new Error("Identificador de equipamento já cadastrado.");
      await registrar("CRIAR", "Equipamento", null, equipamento);
      c.servicoEquipamento.cadastrar(equipamento);
      lote.adicionarEquipamento(equipamento);
      c.equipamentos.set(id, equipamento);
      await c.salvarDados();
      console.log(
        `[SUCESSO] Equipamento ${id} cadastrado. Código interno: ${codigo}`,
      );
    } else if (nome === "equipamento atualizar-status") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const equipamento = c.servicoEquipamento.rastrearEquipamento(valor("id", 0));
      const novoStatus = valorEnum(StatusRastreamento, valor("status"));
      const justificativa = valor("justificativa");
      const antes = equipamento.statusRastreamento;
      if (!justificativa.trim()) throw new Error("Informe a justificativa da mudança de status.");
      if (novoStatus === StatusRastreamento.EM_DESMONTE && antes < StatusRastreamento.AGUARDANDO_DESMONTE)
        throw new Error("O equipamento precisa concluir a triagem antes do desmonte.");
      await registrar("ATUALIZAR_STATUS", "Equipamento", { id: equipamento.id, status: StatusRastreamento[antes] },
        { id: equipamento.id, status: StatusRastreamento[novoStatus], justificativa });
      equipamento.atualizarStatus(novoStatus, justificativa); await c.salvarDados();
      console.log("[SUCESSO] Status do equipamento atualizado.");
    } else if (nome === "equipamento atualizar-estado") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const equipamento = c.servicoEquipamento.rastrearEquipamento(valor("id", 0));
      const novoEstado = valorEnum(EstadoFisico, valor("estado"));
      const justificativa = opcoes.get("justificativa") ?? "";
      if (novoEstado >= equipamento.estadoFisico + 2 && !justificativa.trim())
        throw new Error("Informe --justificativa para uma queda de duas categorias ou mais.");
      const antes = equipamento.estadoFisico;
      await registrar("ATUALIZAR_ESTADO_FISICO", "Equipamento", { id: equipamento.id, estadoFisico: EstadoFisico[antes] },
        { id: equipamento.id, estadoFisico: EstadoFisico[novoEstado], justificativa });
      c.servicoEquipamento.atualizarEstadoFisico(equipamento.id, novoEstado, justificativa);
      await c.salvarDados(); console.log("[SUCESSO] Estado físico atualizado.");
    } else if (nome === "equipamento movimentar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.GESTOR_ALMOXARIFADO);
      const equipamento = c.servicoEquipamento.rastrearEquipamento(valor("id", 0));
      const destino = valor("destino"); const responsavel = valor("responsavel");
      const movimentacao = { id: `${equipamento.id}-${Date.now()}`, equipamentoId: equipamento.id,
        dataHora: new Date(), origem: "", destino, responsavel, observacao: opcoes.get("observacao") ?? "" };
      await registrar("MOVIMENTAR", "Equipamento", null, movimentacao);
      equipamento.registrarMovimentacao(destino, responsavel); await c.salvarDados();
      console.log("[SUCESSO] Movimentação registrada.");
    } else if (nome === "relatorio gerar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR, PapelUsuario.AUDITOR);
      const tipo = valor("tipo", 0, "organizacao").toLowerCase();
      const inicio = new Date(valor("inicio", undefined, "2000-01-01"));
      const fim = new Date(valor("fim", undefined, new Date().toISOString()));
      if (tipo === "organizacao")
        console.log(
          c.servicoRelatorio.gerarRelatorioPorOrganizacao(
            valor("org", 1),
            { inicio, fim },
            [...c.lotes.values()],
          ),
        );
      else if (tipo === "status")
        console.log(
          c.servicoRelatorio.gerarRelatorioPorStatus(valor("status", 1), [
            ...c.lotes.values(),
          ]),
        );
      else if (tipo === "financeiro")
        {
          const relatorio = JSON.parse(c.servicoRelatorio.gerarRelatorioFinanceiro({ inicio, fim }, [...c.organizacoes.values()])) as { valorMensalTotal: number };
          const impostoEstimado = relatorio.valorMensalTotal * c.servicoConfiguracao.aliquotaImposto;
          console.log(JSON.stringify({ ...relatorio, aliquotaImposto: c.servicoConfiguracao.aliquotaImposto,
            impostoEstimado, valorLiquidoEstimado: relatorio.valorMensalTotal - impostoEstimado }, null, 2));
        }
      else throw new Error("Use --tipo organizacao, status ou financeiro.");
    } else if (nome === "usuario cadastrar") {
      exigirPapel(PapelUsuario.ADMINISTRADOR);
      const usuario = valor("usuario", 0);
      const senha = valor("senha");
      const papelNovo = valorEnum(PapelUsuario, valor("papel"));
      if (c.credenciais.has(usuario)) throw new Error("Usuário já cadastrado.");
      await registrar("CRIAR", "Credencial", null, { usuario, papel: PapelUsuario[papelNovo] });
      const credencial = c.autenticacao.criarCredencial(
        usuario,
        senha,
        papelNovo,
      );
      c.credenciais.set(usuario, credencial);
      await c.salvarDados();
      console.log("[SUCESSO] Usuário cadastrado.");
    } else console.log("[AVISO] Comando desconhecido. Digite 'ajuda'.");
    return true;
  }

  private mostrarAjuda(papel: PapelUsuario): void {
    const sintaxes: Record<string, string> = {
      "organizacao cadastrar": "organizacao cadastrar <id> <razao-social> <cnpj> <endereco> --vencimento AAAA-MM-DD --valor NUM",
      "organizacao listar": "organizacao listar",
      "journal listar": "journal listar",
      "config mostrar": "config mostrar",
      "config definir": "config definir --aliquota-imposto 0.15 --coeficiente-depreciacao 0.20",
      "lote criar": "lote criar --org ID --nf NUMERO --transp NOME [--id ID] [--data AAAA-MM-DD]",
      "lote processar": "lote processar <id>",
      "equipamento cadastrar": "equipamento cadastrar --lote ID --id ID --tipo TIPO --marca MARCA --modelo MODELO --ano AAAA --estado ESTADO --peso KG",
      "equipamento rastrear": "equipamento rastrear <id-ou-codigo>",
      "equipamento depreciacao": "equipamento depreciacao <id> --valor-aquisicao NUM",
      "equipamento atualizar-status": "equipamento atualizar-status <id> --status STATUS --justificativa TEXTO",
      "equipamento atualizar-estado": "equipamento atualizar-estado <id> --estado ESTADO [--justificativa TEXTO]",
      "equipamento movimentar": "equipamento movimentar <id> --destino LOCAL --responsavel NOME [--observacao TEXTO]",
      "relatorio gerar": "relatorio gerar --tipo organizacao|status|financeiro [opções do tipo]",
      "usuario cadastrar": "usuario cadastrar --usuario NOME --senha SENHA --papel PAPEL",
      ajuda: "ajuda",
      secreto: "secreto",
      sair: "sair",
    };
    const linhas = comandosVisiveis(papel).map((comando) => `  ${sintaxes[comando] ?? comando}`);
    console.log(`Comandos disponíveis para ${PapelUsuario[papel]}:\n${linhas.join("\n")}`);
  }

  private listarOrganizacoes(): void {
    const itens = [...this.contexto.organizacoes.values()];
    if (!itens.length) {
      console.log("Nenhuma organização cadastrada.");
      return;
    }
    const linhas = itens.map((org) => [
      org.id,
      org.razaoSocial,
      org.cnpj,
      org.ativo ? "ATIVA" : "INATIVA",
    ]);
    const titulos = ["ID", "Razão Social", "CNPJ", "Status"];
    const larguras = titulos.map((titulo, indice) =>
      Math.max(titulo.length, ...linhas.map((linha) => linha[indice]!.length)),
    );
    const formatarLinha = (linha: string[]): string =>
      linha.map((valor, indice) => valor.padEnd(larguras[indice]!)).join(" | ");

    console.log(formatarLinha(titulos));
    console.log(larguras.map((largura) => "-".repeat(largura)).join("-+-"));
    for (const linha of linhas) console.log(formatarLinha(linha));
  }

  private rastrearEquipamento(id: string): void {
    const equipamento = [...this.contexto.equipamentos.values()].find(
      (item) => item.id === id || item.codigoBarrasInterno === id,
    );
    if (!equipamento) throw new Error("Equipamento não encontrado.");
    console.log(
      JSON.stringify(
        {
          ...equipamento,
          tipo: TipoEquipamento[equipamento.tipo],
          estadoFisico: EstadoFisico[equipamento.estadoFisico],
          status: StatusRastreamento[equipamento.statusRastreamento],
        },
        null,
        2,
      ),
    );
  }
}
