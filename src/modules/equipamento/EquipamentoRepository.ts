import type { Prisma } from "@/generated/prisma/client.js";
import { prisma } from "@infra/database.js";

export class EquipamentoRepository {
  criar(dados: Prisma.EquipamentoUncheckedCreateInput) {
    return prisma.equipamento.create({ data: dados });
  }

  listar() {
    return prisma.equipamento.findMany({ orderBy: [{ loteId: "asc" }, { posicaoNoLote: "asc" }] });
  }

  buscar(id: string) {
    return prisma.equipamento.findUnique({ where: { id } });
  }

  async atualizar(id: string, versao: number, dados: Prisma.EquipamentoUpdateManyMutationInput) {
    const resultado = await prisma.equipamento.updateMany({
      where: { id, versao },
      data: { ...dados, versao: { increment: 1 } },
    });
    if (resultado.count === 0) throw new Error("Conflito de versão ou equipamento não encontrado.");
    return this.buscar(id);
  }
}
