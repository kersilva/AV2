import { mkdir, readdir, rename, stat, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { JournalTransacao } from "../domain/entities/JournalTransacao.js";
import { CriptografiaArquivo } from "../infrastructure/CriptografiaArquivo.js";
import { RepositorioArquivo } from "../infrastructure/RepositorioArquivo.js";

type RegistroJournal = {
  id: string; timestamp: string | Date; operacao: string; entidade: string;
  dadosAntes: unknown; dadosDepois: unknown; usuarioResponsavel: string;
};

/** Mantém o journal cifrado, com retenção de 180 dias e rotação acima de 10 MiB. */
export class ServicoJournal {
  private readonly arquivoAtual: string;
  private readonly limiteBytes = 10 * 1024 * 1024;
  private readonly retencaoMs = 180 * 24 * 60 * 60 * 1000;

  constructor(private readonly diretorio: string, private readonly criptografia: CriptografiaArquivo) {
    this.arquivoAtual = join(diretorio, "journal.enc");
  }

  async inicializar(): Promise<void> {
    await mkdir(this.diretorio, { recursive: true });
    await this.limparExpirados();
  }

  async registrar(transacao: JournalTransacao): Promise<void> {
    transacao.registrar();
    const registros = await this.ler(this.arquivoAtual);
    registros.push(transacao.toJSON() as RegistroJournal);
    const mantidos = registros.filter((registro) => this.estaNaRetencao(registro));
    await this.gravar(this.arquivoAtual, mantidos);
    if ((await stat(this.arquivoAtual)).size > this.limiteBytes) await this.rotacionar();
    await this.limparExpirados();
  }

  async listar(): Promise<JournalTransacao[]> {
    const caminhos = (await readdir(this.diretorio)).filter((nome) => /^journal(?:-.+)?\.enc$/.test(nome));
    const registros: RegistroJournal[] = [];
    for (const nome of caminhos) registros.push(...await this.ler(join(this.diretorio, nome)));
    return registros.filter((registro) => this.estaNaRetencao(registro))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((item) => new JournalTransacao(item.id, new Date(item.timestamp), item.operacao,
        item.entidade, item.dadosAntes, item.dadosDepois, item.usuarioResponsavel));
  }

  private async rotacionar(): Promise<void> {
    const nome = `journal-${new Date().toISOString().replace(/[:.]/g, "-")}.enc`;
    await rename(this.arquivoAtual, join(this.diretorio, nome));
    await this.gravar(this.arquivoAtual, []);
  }

  private async limparExpirados(): Promise<void> {
    const arquivos = (await readdir(this.diretorio)).filter((nome) => /^journal(?:-.+)?\.enc$/.test(nome));
    for (const nome of arquivos) {
      const caminho = join(this.diretorio, nome);
      const registros = await this.ler(caminho);
      const mantidos = registros.filter((registro) => this.estaNaRetencao(registro));
      if (!mantidos.length) {
        await unlink(caminho);
      } else if (mantidos.length !== registros.length) {
        if (basename(caminho) === basename(this.arquivoAtual)) await this.gravar(caminho, mantidos);
        else {
          const temporario = `${caminho}.tmp`;
          await this.gravar(temporario, mantidos);
          await rename(temporario, caminho);
        }
      }
    }
  }

  private estaNaRetencao(registro: RegistroJournal): boolean {
    const timestamp = new Date(registro.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= Date.now() - this.retencaoMs;
  }

  private async ler(caminho: string): Promise<RegistroJournal[]> {
    const registros = await new RepositorioArquivo<RegistroJournal[]>(caminho, this.criptografia).carregar();
    return registros ?? [];
  }

  private async gravar(caminho: string, registros: RegistroJournal[]): Promise<void> {
    await new RepositorioArquivo<RegistroJournal[]>(caminho, this.criptografia).salvar(registros);
  }
}
