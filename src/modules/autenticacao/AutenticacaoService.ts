import { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import type { UsuarioRepository } from "@domain/repositories/UsuarioRepository.js";
import { Credencial } from "@domain/entities/Credencial.js";
import type { GeradorHash } from "@domain/services/GeradorHash.js";
import type { JournalWriter } from "@domain/services/JournalWriter.js";
import { ErroConflito, ErroValidacao } from "@/shared/errors/DomainError.js";
export type UsuarioAutenticado = { id: string; usuario: string; papel: PapelUsuario };
export class AutenticacaoService {
  constructor(private readonly repository: UsuarioRepository, private readonly geradorHash: GeradorHash, private readonly journalWriter: JournalWriter) {}
  async criarPrimeiroAdmin(dados: { id: string; usuario: string; senha: string }, usuarioResponsavel = dados.usuario) {
    const credencial = await this.repository.transacao(async repository => {
      if (await repository.contar() > 0) throw new ErroConflito("A configuração inicial já foi concluída.");
      return repository.criar(await Credencial.criar({ ...dados, papel: PapelUsuario.ADMINISTRADOR }, this.geradorHash));
    });
    await this.journalWriter.registrar({ operacao: "CRIAR", entidade: "Credencial", usuarioId: credencial.id, usuarioResponsavel, dadosDepois: { id: credencial.id, usuario: credencial.usuario, papel: credencial.papel, ativo: credencial.ativo } });
    return credencial;
  }
  async autenticar(usuario: string, senha: string): Promise<UsuarioAutenticado | null> {
    const credencial = await this.repository.buscarPorUsuario(usuario);
    if (!credencial || !credencial.ativo || !(await credencial.verificarSenha(senha, this.geradorHash))) return null;
    const antes = { ultimoAcesso: credencial.ultimoAcesso, versao: credencial.versao };
    const versao = credencial.versao;
    await credencial.migrarHash(senha, this.geradorHash);
    credencial.atualizarUltimoAcesso();
    const salva = await this.repository.salvar(credencial, versao);
    if (!salva) throw new ErroConflito("Não foi possível atualizar os dados da credencial.");
    await this.journalWriter.registrar({ operacao: "AUTENTICAR", entidade: "Credencial", usuarioId: salva.id, usuarioResponsavel: salva.usuario, dadosAntes: antes, dadosDepois: { ultimoAcesso: salva.ultimoAcesso, versao: salva.versao } });
    return { id: salva.id, usuario: salva.usuario, papel: salva.papel };
  }
  async cadastrarUsuario(dados: { id: string; usuario: string; senha: string; papel: PapelUsuario }, responsavel = dados.usuario) {
    if (!dados.usuario.trim() || dados.senha.length < 8) throw new ErroValidacao("Informe um usuário e uma senha com pelo menos 8 caracteres.");
    const credencial = await this.repository.criar(await Credencial.criar(dados, this.geradorHash));
    await this.journalWriter.registrar({ operacao: "CRIAR", entidade: "Credencial", usuarioId: credencial.id, usuarioResponsavel: responsavel, dadosDepois: { id: credencial.id, usuario: credencial.usuario, papel: credencial.papel, ativo: credencial.ativo } });
    return credencial;
  }
}



