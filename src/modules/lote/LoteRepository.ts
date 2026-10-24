import type { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@infra/database.js";

export class LoteRepository {
  criar(dados: Prisma.LoteUncheckedCreateInput) {
    return prisma.lote.create({ data: dados });
  }

  listar() {
    return prisma.lote.findMany({
      include: { _count: { select: { equipamentos: true } } },
      orderBy: { dataEntrada: "desc" },
    });
  }

  buscar(id: string) {
    return prisma.lote.findUnique({ where: { id }, include: { equipamentos: true } });
  }

  async atualizarStatus(id: string, versao: number, statusProcessamento: NonNullable<Prisma.LoteUpdateInput["statusProcessamento"]>) {
    const resultado = await prisma.lote.updateMany({
      where: { id, versao },
      data: { statusProcessamento, versao: { increment: 1 } },
    });
    if (resultado.count === 0) throw new Error("Conflito de versão ou lote não encontrado.");
    return this.buscar(id);
  }
}


