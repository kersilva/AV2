import { PapelUsuario } from '@domain/enums/PapelUsuario.js';
import type { UsuarioRepository } from '@domain/repositories/UsuarioRepository.js';
import { Credencial } from '@domain/entities/Credencial.js';
import type { GeradorHash } from '@domain/services/GeradorHash.js';
import type { UnitOfWork } from '@domain/services/UnitOfWork.js';
import { ErroConflito, ErroValidacao } from '@/shared/errors/DomainError.js';

export type UsuarioAutenticado = {
  id: string;
  usuario: string;
  papel: PapelUsuario;
};

export class AutenticacaoService {
  constructor(
    private readonly repository: UsuarioRepository,
    private readonly geradorHash: GeradorHash,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async criarPrimeiroAdmin(
    dados: { id: string; usuario: string; senha: string },
    usuarioResponsavel = dados.usuario
  ) {
    const novo = await Credencial.criar(
      { ...dados, papel: PapelUsuario.ADMINISTRADOR },
      this.geradorHash
    );
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      if ((await usuarios.contar()) > 0)
        throw new ErroConflito('A configuração inicial já foi concluída.');
      const credencial = await usuarios.criar(novo);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Credencial',
        usuarioId: credencial.id,
        usuarioResponsavel,
        dadosDepois: {
          id: credencial.id,
          usuario: credencial.usuario,
          papel: credencial.papel,
          ativo: credencial.ativo,
        },
      });
      return credencial;
    });
  }

  async autenticar(usuario: string, senha: string): Promise<UsuarioAutenticado | null> {
    const credencial = await this.repository.buscarPorUsuario(usuario);
    if (
      !credencial ||
      !credencial.ativo ||
      !(await credencial.verificarSenha(senha, this.geradorHash))
    ) {
      return null;
    }

    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const atual = await usuarios.buscarPorId(credencial.id);
      if (!atual || !atual.ativo) return null;
      if (atual.versao !== credencial.versao)
        throw new ErroConflito('A credencial foi alterada durante o login. Tente novamente.');

      const antes = { ultimoAcesso: atual.ultimoAcesso, versao: atual.versao };
      await atual.migrarHash(senha, this.geradorHash);
      atual.atualizarUltimoAcesso();
      const salva = await usuarios.salvar(atual, credencial.versao);
      if (!salva) throw new ErroConflito('Não foi possível atualizar os dados da credencial.');
      await journal.registrar({
        operacao: 'AUTENTICAR',
        entidade: 'Credencial',
        usuarioId: salva.id,
        usuarioResponsavel: salva.usuario,
        dadosAntes: antes,
        dadosDepois: { ultimoAcesso: salva.ultimoAcesso, versao: salva.versao },
      });
      return { id: salva.id, usuario: salva.usuario, papel: salva.papel };
    });
  }

  async cadastrarUsuario(
    dados: { id: string; usuario: string; senha: string; papel: PapelUsuario },
    responsavel = dados.usuario
  ) {
    if (!dados.usuario.trim() || dados.senha.length < 8)
      throw new ErroValidacao('Informe um usuário e uma senha com pelo menos 8 caracteres.');
    const nova = await Credencial.criar(dados, this.geradorHash);
    return this.unitOfWork.executar(async ({ usuarios, journal }) => {
      const credencial = await usuarios.criar(nova);
      await journal.registrar({
        operacao: 'CRIAR',
        entidade: 'Credencial',
        usuarioId: credencial.id,
        usuarioResponsavel: responsavel,
        dadosDepois: {
          id: credencial.id,
          usuario: credencial.usuario,
          papel: credencial.papel,
          ativo: credencial.ativo,
        },
      });
      return credencial;
    });
  }
}
