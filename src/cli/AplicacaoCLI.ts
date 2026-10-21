import { readFile, unlink } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { resolve } from "node:path";
import { Credencial } from "../domain/entities/Credencial.js";
import { Equipamento } from "../domain/entities/Equipamento.js";
import { Lote } from "../domain/entities/Lote.js";
import { Organizacao } from "../domain/entities/Organizacao.js";
import { PapelUsuario } from "../domain/enums/PapelUsuario.js";
import { CriptografiaArquivo } from "../infrastructure/CriptografiaArquivo.js";
import { ServicoAutenticacao } from "../services/ServicoAutenticacao.js";
import { ServicoEquipamento } from "../services/ServicoEquipamento.js";
import { ServicoLote } from "../services/ServicoLote.js";
import { ServicoOrganizacao } from "../services/ServicoOrganizacao.js";
import { ServicoRelatorio } from "../services/ServicoRelatorio.js";
import { ServicoJournal } from "../services/ServicoJournal.js";
import { ServicoConfiguracao } from "../services/ServicoConfiguracao.js";
import { ExecutorComandosCLI } from "./ExecutorComandosCLI.js";
import { completarComando } from "./SintaxeCLI.js";
import { PersistenciaCLI } from "./PersistenciaCLI.js";
import { SegurancaCLI, type DadosMestre } from "./SegurancaCLI.js";
import { RepositorioArquivo } from "../infrastructure/RepositorioArquivo.js";

export class AplicacaoCLI {
  private readonly dadosDir = resolve(process.cwd(), "data");
  private readonly historico: string[] = [];
  private readonly io = createInterface({
    input: stdin,
    output: stdout,
    terminal: Boolean(stdin.isTTY && stdout.isTTY),
    history: this.historico,
    historySize: 200,
    removeHistoryDuplicates: true,
    completer: (linha) => completarComando(linha, this.papelAtual()),
  });
  private proximaEntradaSensivel = false;
  private mestre!: DadosMestre;
  private criptografia!: CriptografiaArquivo;
  private persistencia!: PersistenciaCLI;
  private credenciais = new Map<string, Credencial>();
  private organizacoes = new Map<string, Organizacao>();
  private lotes = new Map<string, Lote>();
  private equipamentos = new Map<string, Equipamento>();
  private autenticacao = new ServicoAutenticacao();
  private readonly servicoOrganizacao = new ServicoOrganizacao();
  private readonly servicoLote = new ServicoLote();
  private readonly servicoEquipamento = new ServicoEquipamento();
  private readonly servicoRelatorio = new ServicoRelatorio();
  private readonly servicoConfiguracao = new ServicoConfiguracao();
  private journal!: ServicoJournal;
  private usuarioAtual: string | undefined;
  private historicoPronto = false;

  constructor() {
    this.io.on("line", (linha) => {
      if (
        this.proximaEntradaSensivel ||
        /(?:^|\s)--senha(?:=|\s)/i.test(linha)
      ) {
        this.proximaEntradaSensivel = false;
        return;
      }
      if (linha.trim()) {
        this.historico.unshift(linha);
        this.historico.splice(200);
      }
    });
  }

  async iniciar(): Promise<void> {
    try {
      const seguranca = await new SegurancaCLI(
        this.dadosDir,
        (pergunta) => this.perguntarObrigatorio(pergunta),
        (pergunta) => this.lerSenha(pergunta),
      ).inicializar();
      this.mestre = seguranca.mestre;
      this.criptografia = seguranca.criptografia;
      await this.carregarHistorico();
      this.credenciais = seguranca.credenciais;
      this.autenticacao = seguranca.autenticacao;
      this.journal = new ServicoJournal(this.dadosDir, this.criptografia);
      await this.journal.inicializar();

      this.persistencia = new PersistenciaCLI(this.dadosDir, this.criptografia);
      const dados = await this.persistencia.carregar();
      this.organizacoes = dados.organizacoes;
      this.lotes = dados.lotes;
      this.equipamentos = dados.equipamentos;
      this.servicoConfiguracao.carregar(dados.configuracao);
      for (const org of this.organizacoes.values())
        this.servicoOrganizacao.cadastrarOrganizacao(org);
      for (const equipamento of this.equipamentos.values())
        this.servicoEquipamento.cadastrar(equipamento);
      for (const lote of this.lotes.values()) this.servicoLote.criarLote(lote);

      await this.loopLogin();
    } finally {
      if (this.historicoPronto) await this.salvarHistorico();
      this.io.close();
    }
  }

  private async loopLogin(): Promise<void> {
    while (true) {
      console.log("\n(digite 'sair' no campo usuário para encerrar)");
      const usuario = (await this.io.question("Usuário: ")).trim();
      if (usuario.toLowerCase() === "sair") return;
      if (!usuario) {
        console.log("[AVISO] Informe o usuário.");
        continue;
      }
      const senha = await this.lerSenha("Senha: ");
      if (!this.autenticacao.autenticar(usuario, senha)) {
        console.log("[ERRO] Usuário ou senha inválidos.");
        continue;
      }
      this.usuarioAtual = usuario;
      console.log(
        `Autenticado como ${usuario} (${PapelUsuario[this.credenciais.get(usuario)!.papel]}). Digite 'ajuda' para listar comandos.`,
      );
      await this.terminalComandos();
      const sessao = this.autenticacao.obterSessao(usuario);
      if (sessao) this.autenticacao.logout(sessao.token);
      this.usuarioAtual = undefined;
    }
  }

  private async terminalComandos(): Promise<void> {
    console.log("Digite 'ajuda' para ver comandos. Use Tab para completar.");
    while (this.usuarioAtual) {
      const linha = (await this.io.question("greencode> ")).trim();
      if (!linha) continue;
      if (!this.autenticacao.renovarSessaoPorAtividade(this.usuarioAtual)) {
        console.log("[AVISO] Sessão expirada por inatividade. Entre novamente.");
        return;
      }
      try {
        const executor = new ExecutorComandosCLI({
          usuario: this.usuarioAtual,
          credenciais: this.credenciais,
          organizacoes: this.organizacoes,
          lotes: this.lotes,
          equipamentos: this.equipamentos,
          autenticacao: this.autenticacao,
          servicoOrganizacao: this.servicoOrganizacao,
          servicoLote: this.servicoLote,
          servicoEquipamento: this.servicoEquipamento,
          servicoRelatorio: this.servicoRelatorio,
          journal: this.journal,
          servicoConfiguracao: this.servicoConfiguracao,
          salvarDados: () => this.salvarDados(),
        });
        if (!(await executor.executar(linha))) return;
      } catch (erro) {
        console.log(
          `[ERRO] ${erro instanceof Error ? erro.message : String(erro)}`,
        );
      }
    }
  }

  private async salvarDados(): Promise<void> {
    await this.persistencia.salvar(
      {
        organizacoes: this.organizacoes,
        lotes: this.lotes,
        equipamentos: this.equipamentos,
        configuracao: {
          aliquotaImposto: this.servicoConfiguracao.aliquotaImposto,
          coeficienteDepreciacao: this.servicoConfiguracao.coeficienteDepreciacao,
        },
      },
      this.mestre,
      this.credenciais,
    );
  }

  private papelAtual(): PapelUsuario | undefined {
    if (!this.usuarioAtual) return undefined;
    return this.credenciais.get(this.usuarioAtual)?.papel;
  }

  private async carregarHistorico(): Promise<void> {
    const arquivoCifrado = resolve(this.dadosDir, "cli-history.enc");
    const repositorio = new RepositorioArquivo<string[]>(arquivoCifrado, this.criptografia);
    const salvo = await repositorio.carregar();
    if (salvo !== null) {
      this.historico.push(...salvo.slice(0, 200));
    } else {
      const legado = resolve(this.dadosDir, "cli-history.txt");
      try {
        const conteudo = await readFile(legado, "utf8");
        this.historico.push(...conteudo.split(/\r?\n/).filter(Boolean).reverse().slice(0, 200));
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
      }
    }
    this.historicoPronto = true;
  }

  private async salvarHistorico(): Promise<void> {
    try {
      await new RepositorioArquivo<string[]>(
        resolve(this.dadosDir, "cli-history.enc"),
        this.criptografia,
      ).salvar(this.historico.slice(0, 200));
      try {
        await unlink(resolve(this.dadosDir, "cli-history.txt"));
      } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code !== "ENOENT") throw erro;
      }
    } catch (erro) {
      console.error(
        `[AVISO] Não foi possível salvar o histórico: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }
  }

  private async perguntarObrigatorio(pergunta: string): Promise<string> {
    const valor = (await this.io.question(pergunta)).trim();
    if (!valor) throw new Error("Este campo é obrigatório.");
    return valor;
  }

  private async lerSenha(pergunta: string): Promise<string> {
    this.proximaEntradaSensivel = true;
    return this.io.question(pergunta);
  }
}
