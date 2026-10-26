import type { Prisma } from "@/generated/prisma/client.js";
import type { UsuarioAutorizacao, UsuarioRepository as IUsuarioRepository } from "@domain/repositories/UsuarioRepository.js";
import type { PapelUsuario } from "@domain/enums/PapelUsuario.js";
import { Credencial } from "@domain/entities/Credencial.js";
import type { CredencialPersistida } from "@domain/entities/Credencial.js";
import { prisma } from "@infra/database.js";
const selecao = {
  id: true,
  usuario: true,
  hashSenha: true,
  ultimoAcesso: true,
  papel: true,
  ativo: true,
  versao: true,
} as const;
function entidade(row: CredencialPersistida | null): Credencial | null {
  return row ? Credencial.reconstituir(row) : null;
}
function dados(credencial: Credencial): Prisma.UsuarioUncheckedCreateInput {
  return credencial.toPrisma() as unknown as Prisma.UsuarioUncheckedCreateInput;
}
export class PrismaUsuarioRepository implements IUsuarioRepository {
  constructor(private readonly db: Pick<typeof prisma, "usuario"> = prisma) {}
  async buscarPorId(id: string): Promise<Credencial | null> {
    return entidade(
      (await this.db.usuario.findUnique({
        where: { id },
        select: selecao,
      })) as CredencialPersistida | null,
    );
  }
  async buscarPorUsuario(usuario: string): Promise<Credencial | null> {
    return entidade(
      (await this.db.usuario.findUnique({
        where: { usuario },
        select: selecao,
      })) as CredencialPersistida | null,
    );
  }
  async buscarDadosAutorizacao(id: string): Promise<UsuarioAutorizacao | null> {
    const usuario = await this.db.usuario.findUnique({
      where: { id },
      select: { ativo: true, papel: true },
    });
    return usuario
      ? { ativo: usuario.ativo, papel: usuario.papel as unknown as PapelUsuario }
      : null;
  }  async listar(): Promise<Credencial[]> {
    const rows = await this.db.usuario.findMany({
      select: selecao,
      orderBy: { usuario: "asc" },
    });
    return rows.map((row) =>
      Credencial.reconstituir(row as CredencialPersistida),
    );
  }
  async criar(credencial: Credencial): Promise<Credencial> {
    const row = await this.db.usuario.create({
      data: dados(credencial),
      select: selecao,
    });
    return Credencial.reconstituir(row as CredencialPersistida);
  }
  async salvar(
    credencial: Credencial,
    versao: number,
  ): Promise<Credencial | null> {
    const result = await this.db.usuario.updateMany({
      where: { id: credencial.id, versao },
      data: {
        usuario: credencial.usuario,
        hashSenha: credencial.hashSenha,
        ultimoAcesso: credencial.ultimoAcesso,
        papel: credencial.papel,
        ativo: credencial.ativo,
        versao: { increment: 1 },
      },
    });
    return result.count ? this.buscarPorId(credencial.id) : null;
  }
  async deletar(id: string, versao: number): Promise<boolean> {
    const result = await this.db.usuario.deleteMany({ where: { id, versao } });
    return result.count > 0;
  }
  contar(): Promise<number> {
    return this.db.usuario.count();
  }
  contarAdministradoresAtivos(): Promise<number> {
    return this.db.usuario.count({
      where: { ativo: true, papel: "ADMINISTRADOR" },
    });
  }
  transacao<T>(
    operacao: (repository: IUsuarioRepository) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(
      (tx) => operacao(new PrismaUsuarioRepository(tx)),
      { isolationLevel: "Serializable" },
    );
  }
}

