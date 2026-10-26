import { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import type { UsuarioRepository, UsuarioSeguro } from "@domain/repositories/UsuarioRepository.js";
import { Credencial } from "@domain/entities/Credencial.js";
import type { GeradorHash } from "@domain/services/GeradorHash.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import { ErroConflito, ErroNaoEncontrado, ErroRegraNegocio } from "@/shared/errors/DomainError.js";
export class UsuarioService {
  constructor(private readonly repository: UsuarioRepository, private readonly geradorHash: GeradorHash, private readonly journalWriter: JournalWriter) {}
  async listar(): Promise<UsuarioSeguro[]> { return (await this.repository.listar()).map(item => this.dtoSeguro(item)); }
  async cadastrar(dados: { id: string; usuario: string; senha: string; papel: PapelUsuario }, ator: { id: string; usuario: string }) {
    const novo = await this.repository.criar(await Credencial.criar(dados, this.geradorHash));
    const resultado = this.dtoSeguro(novo);
    await this.journalWriter.registrar({ operacao: "CRIAR", entidade: "Credencial", usuarioId: ator.id, usuarioResponsavel: ator.usuario, dadosDepois: resultado });
    return resultado;
  }
  async alterarAtivo(id: string, ativo: boolean, versao: number, ator: { id: string; usuario: string }) {
    const { antes, depois } = await this.repository.transacao(async repo => {
      const atual = await this.obter(repo, id, versao);
      const snapshot = this.dtoSeguro(atual);
      if (!ativo && atual.ativo && atual.papel === PapelUsuario.ADMINISTRADOR && await repo.contarAdministradoresAtivos() <= 1) throw new ErroRegraNegocio("Não é possível desativar o último administrador ativo.");
      if (ativo) atual.ativar(); else atual.desativar();
      const salvo = await repo.salvar(atual, versao);
      if (!salvo) throw new ErroConflito("Conflito de versão do usuário.");
      return { antes: snapshot, depois: this.dtoSeguro(salvo) };
    });
    await this.registrarNoJournal("ALTERAR_ATIVO", ator, antes, depois);
    return depois;
  }
  async alterarPapel(id: string, papel: PapelUsuario, versao: number, ator: { id: string; usuario: string }) {
    const { antes, depois } = await this.repository.transacao(async repo => {
      const atual = await this.obter(repo, id, versao); const snapshot = this.dtoSeguro(atual);
      if (atual.ativo && atual.papel === PapelUsuario.ADMINISTRADOR && papel !== PapelUsuario.ADMINISTRADOR && await repo.contarAdministradoresAtivos() <= 1) throw new ErroRegraNegocio("Não é possível remover o papel do último administrador ativo.");
      atual.alterarPapel(papel); const salvo = await repo.salvar(atual, versao);
      if (!salvo) throw new ErroConflito("Conflito de versão do usuário.");
      return { antes: snapshot, depois: this.dtoSeguro(salvo) };
    });
    await this.registrarNoJournal("ALTERAR_PAPEL", ator, antes, depois); return depois;
  }
  async deletar(id: string, versao: number, ator: { id: string; usuario: string }) {
    const removido = await this.repository.transacao(async repo => {
      const atual = await this.obter(repo, id, versao);
      if (atual.ativo && atual.papel === PapelUsuario.ADMINISTRADOR && await repo.contarAdministradoresAtivos() <= 1) throw new ErroRegraNegocio("Não é possível remover o último administrador ativo.");
      if (!await repo.deletar(id, versao)) throw new ErroConflito("Conflito de versão do usuário.");
      return this.dtoSeguro(atual);
    });
    await this.journalWriter.registrar({ operacao: "DELETAR", entidade: "Credencial", usuarioId: ator.id, usuarioResponsavel: ator.usuario, dadosAntes: removido });
    return removido;
  }
  private async obter(repo: UsuarioRepository, id: string, versao: number) { const atual = await repo.buscarPorId(id); if (!atual) throw new ErroNaoEncontrado("Usuário não encontrado."); if (atual.versao !== versao) throw new ErroConflito("Conflito de versão do usuário."); return atual; }
  private dtoSeguro(credencial: Credencial): UsuarioSeguro { return { id: credencial.id, usuario: credencial.usuario, papel: credencial.papel, ativo: credencial.ativo, ultimoAcesso: credencial.ultimoAcesso, versao: credencial.versao }; }
  private registrarNoJournal(operacao: string, ator: { id: string; usuario: string }, antes: UsuarioSeguro, depois: UsuarioSeguro) { return this.journalWriter.registrar({ operacao, entidade: "Credencial", usuarioId: ator.id, usuarioResponsavel: ator.usuario, dadosAntes: antes, dadosDepois: depois }); }
}







