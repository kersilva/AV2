import type { PapelUsuario } from "../generated/prisma/enums.js";
import { prisma } from "../infrastructure/database.js";

export class AutenticacaoRepository {
  buscarPorUsuario(usuario: string) {
    return prisma.usuario.findUnique({ where: { usuario } });
  }

  contarUsuarios() {
    return prisma.usuario.count();
  }

  criar(dados: { id: string; usuario: string; hashSenha: string; papel: PapelUsuario }) {
    return prisma.usuario.create({ data: dados });
  }

  atualizarUltimoAcesso(id: string) {
    return prisma.usuario.update({
      where: { id },
      data: { ultimoAcesso: new Date(), versao: { increment: 1 } },
      select: { id: true, usuario: true, papel: true, ativo: true },
    });
  }
}
