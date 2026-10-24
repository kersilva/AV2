import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../infrastructure/database.js";

export class OrganizacaoRepository {
  criar(dados: Prisma.OrganizacaoCreateInput) {
    return prisma.organizacao.create({ data: dados });
  }

  listar() {
    return prisma.organizacao.findMany({
      orderBy: { razaoSocial: "asc" },
    });
  }
}
