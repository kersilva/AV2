import type { PapelUsuario } from "@/generated/prisma/enums.js";
import { prisma } from "@infra/database.js";

const usuarioSeguro = {
  id: true, usuario: true, papel: true, ativo: true, ultimoAcesso: true, versao: true,
};

export class UsuarioRepository {
  listar() {
    return prisma.usuario.findMany({ select: usuarioSeguro, orderBy: { usuario: "asc" } });
  }

  criar(dados: { id: string; usuario: string; hashSenha: string; papel: PapelUsuario }) {
    return prisma.usuario.create({
      data: dados,
      select: { id: true, usuario: true, papel: true, ativo: true, versao: true },
    });
  }

  async alterarAtivo(id: string, ativo: boolean, versao: number) {
    return prisma.$transaction(async (tx) => {
      const atual = await tx.usuario.findUnique({ where: { id } });
      if (!atual) throw new Error("Usuário não encontrado.");
      if (atual.versao !== versao) throw new Error("Conflito de versão do usuário.");
      if (!ativo && atual.ativo && atual.papel === "ADMINISTRADOR") {
        const admins = await tx.usuario.count({ where: { ativo: true, papel: "ADMINISTRADOR" } });
        if (admins <= 1) throw new Error("Não é possível desativar o último administrador ativo.");
      }
      return tx.usuario.update({
        where: { id },
        data: { ativo, versao: { increment: 1 } },
        select: { id: true, usuario: true, papel: true, ativo: true, versao: true },
      });
    }, { isolationLevel: "Serializable" });
  }

  async alterarPapel(id: string, papel: PapelUsuario, versao: number) {
    return prisma.$transaction(async (tx) => {
      const atual = await tx.usuario.findUnique({ where: { id } });
      if (!atual) throw new Error("Usuário não encontrado.");
      if (atual.versao !== versao) throw new Error("Conflito de versão do usuário.");
      if (atual.ativo && atual.papel === "ADMINISTRADOR" && papel !== "ADMINISTRADOR") {
        const admins = await tx.usuario.count({ where: { ativo: true, papel: "ADMINISTRADOR" } });
        if (admins <= 1) throw new Error("Não é possível remover o papel do último administrador ativo.");
      }
      return tx.usuario.update({
        where: { id },
        data: { papel, versao: { increment: 1 } },
        select: { id: true, usuario: true, papel: true, ativo: true, versao: true },
      });
    }, { isolationLevel: "Serializable" });
  }

  async deletar(id: string, versao: number) {
    return prisma.$transaction(async (tx) => {
      const atual = await tx.usuario.findUnique({ where: { id } });
      if (!atual) throw new Error("Usuário não encontrado.");
      if (atual.versao !== versao) throw new Error("Conflito de versão do usuário.");
      if (atual.ativo && atual.papel === "ADMINISTRADOR") {
        const admins = await tx.usuario.count({ where: { ativo: true, papel: "ADMINISTRADOR" } });
        if (admins <= 1) throw new Error("Não é possível remover o último administrador ativo.");
      }
      return tx.usuario.delete({
        where: { id },
        select: { id: true, usuario: true, papel: true, ativo: true },
      });
    }, { isolationLevel: "Serializable" });
  }
}
