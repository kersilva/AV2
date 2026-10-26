import type { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import { Credencial } from "@domain/entities/Credencial.js";
export type UsuarioSeguro = {
  id: string;
  usuario: string;
  papel: PapelUsuario;
  ativo: boolean;
  ultimoAcesso: Date | null;
  versao: number;
};
export type UsuarioAutorizacao = Pick<Credencial, "ativo" | "papel">;
export interface UsuarioRepository {
  buscarPorId(id: string): Promise<Credencial | null>;
  buscarPorUsuario(usuario: string): Promise<Credencial | null>;
  buscarDadosAutorizacao(id: string): Promise<UsuarioAutorizacao | null>;
  listar(): Promise<Credencial[]>;
  criar(credencial: Credencial): Promise<Credencial>;
  salvar(credencial: Credencial, versao: number): Promise<Credencial | null>;
  deletar(id: string, versao: number): Promise<boolean>;
  contar(): Promise<number>;
  contarAdministradoresAtivos(): Promise<number>;
  possuiHistoricoJournal(id: string): Promise<boolean>;
  transacao<T>(operacao: (repositorio: UsuarioRepository) => Promise<T>): Promise<T>;
}
