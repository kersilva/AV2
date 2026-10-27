import { PapelUsuario } from '@domain/enums/PapelUsuario.js';
import type { UsuarioRepository, UsuarioSeguro } from '@domain/repositories/UsuarioRepository.js';
import { Credencial } from '@domain/entities/Credencial.js';
import type { GeradorHash } from '@domain/services/GeradorHash.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import { ErroConflito, ErroNaoEncontrado, ErroRegraNegocio } from '@/shared/errors/DomainError.js';

export class UsuarioService {
  constructor(
    private readonly repository: UsuarioRepository,
    private readonly geradorHash: GeradorHash,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async listar(): Promise<UsuarioSeguro[]> {
    return (await this.repository.listar()).map((item) => this.dtoSeguro(item));
  }

  async cadastrar(
    dados: { id: string; usuario: string; senha: string; papel: PapelUsuario },
    ator: { id: string; usuario: string }
  ): Promise<UsuarioSeguro> {
    const credencial = await Credencial.criar(dados, this.geradorHash);
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const novo = await usuarios.criar(credencial);
      const resultado = this.dtoSeguro(novo);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Credencial',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosDepois: resultado,
      });
      return resultado;
    });
  }

  async alterarAtivo(
    id: string,
    ativo: boolean,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<UsuarioSeguro> {
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const atual = await this.obter(usuarios, id, versao);
      const antes = this.dtoSeguro(atual);
      if (
        !ativo &&
        atual.ativo &&
        atual.papel === PapelUsuario.ADMINISTRADOR &&
        (await usuarios.contarAdministradoresAtivos()) <= 1
      ) {
        throw new ErroRegraNegocio('Não é possível desativar o último administrador ativo.');
      }
      if (ativo) atual.ativar();
      else atual.desativar();
      const salvo = await usuarios.salvar(atual, versao);
      if (!salvo) throw new ErroConflito('Conflito de versão do usuário.');
      const depois = this.dtoSeguro(salvo);
      await journal.registrar({
        operacao: 'ALTERAR_ATIVO',
        entidade: 'Credencial',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: antes,
        dadosDepois: depois,
      });
      return depois;
    });
  }

  async alterarPapel(
    id: string,
    papel: PapelUsuario,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<UsuarioSeguro> {
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const atual = await this.obter(usuarios, id, versao);
      const antes = this.dtoSeguro(atual);
      if (
        atual.ativo &&
        atual.papel === PapelUsuario.ADMINISTRADOR &&
        papel !== PapelUsuario.ADMINISTRADOR &&
        (await usuarios.contarAdministradoresAtivos()) <= 1
      ) {
        throw new ErroRegraNegocio('Não é possível remover o papel do último administrador ativo.');
      }
      atual.alterarPapel(papel);
      const salvo = await usuarios.salvar(atual, versao);
      if (!salvo) throw new ErroConflito('Conflito de versão do usuário.');
      const depois = this.dtoSeguro(salvo);
      await journal.registrar({
        operacao: 'ALTERAR_PAPEL',
        entidade: 'Credencial',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: antes,
        dadosDepois: depois,
      });
      return depois;
    });
  }

  async deletar(
    id: string,
    versao: number,
    ator: { id: string; usuario: string }
  ): Promise<UsuarioSeguro> {
    if (id === ator.id) {
      throw new ErroRegraNegocio(
        'Não é possível excluir a própria conta. Inative-a para preservar o histórico.'
      );
    }
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const atual = await this.obter(usuarios, id, versao);
      if (await usuarios.possuiHistoricoJournal(id)) {
        throw new ErroConflito(
          'Usuário possui histórico no journal. Inative a conta para preservar a trilha de auditoria.'
        );
      }
      if (
        atual.ativo &&
        atual.papel === PapelUsuario.ADMINISTRADOR &&
        (await usuarios.contarAdministradoresAtivos()) <= 1
      ) {
        throw new ErroRegraNegocio('Não é possível remover o último administrador ativo.');
      }
      if (!(await usuarios.deletar(id, versao)))
        throw new ErroConflito('Conflito de versão do usuário.');
      const removido = this.dtoSeguro(atual);
      await journal.registrar({
        operacao: 'DELETAR',
        entidade: 'Credencial',
        usuarioId: ator.id,
        usuarioResponsavel: ator.usuario,
        dadosAntes: removido,
      });
      return removido;
    });
  }

  private async obter(repository: UsuarioRepository, id: string, versao: number) {
    const atual = await repository.buscarPorId(id);
    if (!atual) throw new ErroNaoEncontrado('Usuário não encontrado.');
    if (atual.versao !== versao) throw new ErroConflito('Conflito de versão do usuário.');
    return atual;
  }

  private dtoSeguro(credencial: Credencial): UsuarioSeguro {
    return {
      id: credencial.id,
      usuario: credencial.usuario,
      papel: credencial.papel,
      ativo: credencial.ativo,
      ultimoAcesso: credencial.ultimoAcesso,
      versao: credencial.versao,
    };
  }
}
